package methods

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/titanous/json5"

	"github.com/nextlevelbuilder/goclaw/internal/bus"
	"github.com/nextlevelbuilder/goclaw/internal/config"
	"github.com/nextlevelbuilder/goclaw/internal/gateway"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/pkg/protocol"
)

// ConfigMethods handles config.get, config.apply, config.patch, config.schema.
// Matching TS src/gateway/server-methods/config.ts.
type ConfigMethods struct {
	cfg          *config.Config
	cfgPath      string
	secretsStore store.ConfigSecretsStore
	syncFn       func(ctx context.Context, cfg *config.Config) // nil-safe; syncs non-secret settings to system_configs
	eventBus     bus.EventPublisher                            // nil-safe; broadcasts config change events
}

type previousSecret struct {
	value  string
	exists bool
}

func NewConfigMethods(cfg *config.Config, cfgPath string, secretsStore store.ConfigSecretsStore, eventBus bus.EventPublisher) *ConfigMethods {
	return &ConfigMethods{cfg: cfg, cfgPath: cfgPath, secretsStore: secretsStore, eventBus: eventBus}
}

// SetSystemConfigSync sets a callback to sync config to system_configs after save.
// The callback receives the final resolved config (with secrets + env applied).
func (m *ConfigMethods) SetSystemConfigSync(fn func(ctx context.Context, cfg *config.Config)) {
	m.syncFn = fn
}

func (m *ConfigMethods) Register(router *gateway.MethodRouter) {
	router.Register(protocol.MethodConfigGet, m.requireMasterScope(m.requireOwner(m.handleGet)))
	router.Register(protocol.MethodConfigApply, m.requireMasterScope(m.requireOwner(m.handleApply)))
	router.Register(protocol.MethodConfigPatch, m.requireMasterScope(m.requireOwner(m.handlePatch)))
	router.Register(protocol.MethodConfigSchema, m.requireMasterScope(m.requireOwner(m.handleSchema)))
	// config.defaults is read-only + secret-free (Go consts + agents.defaults overlay),
	// so it only needs requireMasterScope — owner gating would spam auth errors for
	// operators viewing agent detail pages.
	router.Register(protocol.MethodConfigDefaults, m.requireMasterScope(m.handleDefaults))
}

// requireOwner wraps a handler to only allow owner-role users.
func (m *ConfigMethods) requireOwner(next gateway.MethodHandler) gateway.MethodHandler {
	return func(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
		if !client.IsOwner() {
			locale := store.LocaleFromContext(ctx)
			client.SendResponse(protocol.NewErrorResponse(
				req.ID, protocol.ErrUnauthorized,
				i18n.T(locale, i18n.MsgPermissionDenied, req.Method),
			))
			return
		}
		next(ctx, client, req)
	}
}

// requireMasterScope rejects config.* calls when the caller's ctx is scoped to
// a non-master tenant. System owner callers (bypass-all) are allowed through.
//
// Background: config.* mutates the master in-memory *config.Config and the
// on-disk config.json. A non-master tenant admin calling config.patch would
// corrupt master state + leak master config to other tenants. This guard keeps
// config.* strictly master-scoped until a tenant-aware refactor lands.
//
// Shares the predicate with store.IsMasterScope so HTTP and WS layers can't
// drift — same rule, one source of truth.
func (m *ConfigMethods) requireMasterScope(next gateway.MethodHandler) gateway.MethodHandler {
	return func(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
		if !store.IsMasterScope(ctx) {
			locale := store.LocaleFromContext(ctx)
			client.SendResponse(protocol.NewErrorResponse(
				req.ID,
				protocol.ErrUnauthorized,
				i18n.T(locale, i18n.MsgConfigMasterScopeOnly),
			))
			return
		}
		next(ctx, client, req)
	}
}

func (m *ConfigMethods) handleGet(_ context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]any{
		"config": m.cfg.MaskedCopy(),
		"hash":   m.cfg.Hash(),
		"path":   m.cfgPath,
	}))
}

// handleApply replaces the entire config with the provided JSON5 raw content.
// Matching TS config.apply (src/gateway/server-methods/config.ts:435-486).
func (m *ConfigMethods) handleApply(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	var params struct {
		Raw      string `json:"raw"`
		BaseHash string `json:"baseHash"`
	}
	if req.Params != nil {
		json.Unmarshal(req.Params, &params)
	}

	if params.Raw == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRawConfigRequired)))
		return
	}

	// Optimistic concurrency: validate hash if provided
	if params.BaseHash != "" && params.BaseHash != m.cfg.Hash() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgConfigHashMismatch)))
		return
	}

	// Parse the new config
	newCfg := config.Default()
	if err := json5.Unmarshal([]byte(params.Raw), newCfg); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, err.Error())))
		return
	}

	// Extract secrets → save to config_secrets table, strip all from file
	if err := m.saveSecretsToStore(ctx, newCfg); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToSave, "config secrets", err.Error())))
		return
	}
	newCfg.StripSecrets()

	// Save to disk
	if err := config.Save(m.cfgPath, newCfg); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToSave, "config", err.Error())))
		return
	}

	// Update in-memory config and restore secrets
	m.cfg.ReplaceFrom(newCfg)
	if m.secretsStore != nil {
		if secrets, err := m.secretsStore.GetAll(ctx); err == nil {
			m.cfg.ApplyDBSecrets(secrets)
		}
	}
	m.cfg.ApplyEnvOverrides()
	m.syncToSystemConfigs(ctx)
	m.broadcastChanged()
	emitAudit(m.eventBus, client, "config.applied", "config", "gateway")

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]any{
		"ok":      true,
		"path":    m.cfgPath,
		"config":  m.cfg.MaskedCopy(),
		"hash":    m.cfg.Hash(),
		"restart": false,
	}))
}

// handlePatch merges a partial config update into the current config.
// Matching TS config.patch (src/gateway/server-methods/config.ts:321-434).
func (m *ConfigMethods) handlePatch(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	var params struct {
		Raw      string `json:"raw"`
		BaseHash string `json:"baseHash"`
	}
	if req.Params != nil {
		json.Unmarshal(req.Params, &params)
	}

	if params.Raw == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRawPatchRequired)))
		return
	}

	// Optimistic concurrency
	if params.BaseHash != "" && params.BaseHash != m.cfg.Hash() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgConfigHashMismatch)))
		return
	}

	// Merge strategy: serialize current -> deserialize patch on top -> save
	currentJSON, err := json.Marshal(m.cfg)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgInternalError, "failed to serialize current config")))
		return
	}

	// Start from current config as base
	merged := config.Default()
	if err := json.Unmarshal(currentJSON, merged); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgInternalError, "failed to clone config")))
		return
	}

	// Apply patch on top
	if err := json5.Unmarshal([]byte(params.Raw), merged); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, err.Error())))
		return
	}

	// Extract secrets → save to config_secrets table, strip all from file
	if err := m.saveSecretsToStore(ctx, merged); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToSave, "config secrets", err.Error())))
		return
	}
	merged.StripSecrets()

	// Save to disk
	if err := config.Save(m.cfgPath, merged); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToSave, "config", err.Error())))
		return
	}

	// Update in-memory config and restore secrets
	m.cfg.ReplaceFrom(merged)
	if m.secretsStore != nil {
		if secrets, err := m.secretsStore.GetAll(ctx); err == nil {
			m.cfg.ApplyDBSecrets(secrets)
		}
	}
	m.cfg.ApplyEnvOverrides()
	m.syncToSystemConfigs(ctx)
	m.broadcastChanged()
	emitAudit(m.eventBus, client, "config.patched", "config", "gateway")

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]any{
		"ok":      true,
		"path":    m.cfgPath,
		"config":  m.cfg.MaskedCopy(),
		"hash":    m.cfg.Hash(),
		"restart": false,
	}))
}

// syncToSystemConfigs syncs the resolved config to system_configs table for the given tenant.
func (m *ConfigMethods) syncToSystemConfigs(ctx context.Context) {
	if m.syncFn != nil {
		m.syncFn(ctx, m.cfg)
	}
}

// broadcastChanged notifies subscribers that config has been updated.
func (m *ConfigMethods) broadcastChanged() {
	if m.eventBus != nil {
		m.eventBus.Broadcast(bus.Event{Name: bus.TopicConfigChanged, Payload: m.cfg})
	}
}

// handleSchema returns the config JSON schema for UI form generation.
// Matching TS config.schema (src/gateway/server-methods/config.ts:276-289).
func (m *ConfigMethods) handleSchema(_ context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"agents": map[string]any{
				"type":        "object",
				"description": "Agent configuration (defaults + per-agent overrides)",
			},
			"channels": map[string]any{
				"type":        "object",
				"description": "Channel configuration (telegram, discord, slack, etc.)",
			},
			"providers": map[string]any{
				"type":        "object",
				"description": "AI provider API keys and settings",
			},
			"gateway": map[string]any{
				"type":        "object",
				"description": "Gateway server settings (host, port, token)",
			},
			"tools": map[string]any{
				"type":        "object",
				"description": "Tool configuration (browser, exec, web search)",
			},
			"sessions": map[string]any{
				"type":        "object",
				"description": "Session storage configuration",
			},
		},
	}

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]any{
		"json": schema,
	}))
}

// saveSecretsToStore extracts config-backed secrets and persists them to the
// encrypted config_secrets table before config.json is written without secrets.
func (m *ConfigMethods) saveSecretsToStore(ctx context.Context, cfg *config.Config) error {
	secrets := cfg.ExtractDBSecrets()
	if len(secrets) == 0 {
		return nil
	}
	if m.secretsStore == nil {
		return fmt.Errorf("config secrets store is not configured")
	}
	keys := make([]string, 0, len(secrets))
	for key := range secrets {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	previous := make(map[string]previousSecret, len(keys))
	saved := make([]string, 0, len(keys))
	for _, key := range keys {
		old, err := m.secretsStore.Get(ctx, key)
		switch {
		case err == nil:
			previous[key] = previousSecret{value: old, exists: true}
		case errors.Is(err, sql.ErrNoRows):
			previous[key] = previousSecret{}
		default:
			m.rollbackSavedSecrets(ctx, previous, saved)
			return fmt.Errorf("read existing %s: %w", key, err)
		}
		value := secrets[key]
		if err := m.secretsStore.Set(ctx, key, value); err != nil {
			m.rollbackSavedSecrets(ctx, previous, saved)
			return fmt.Errorf("%s: %w", key, err)
		}
		saved = append(saved, key)
	}
	return nil
}

func (m *ConfigMethods) rollbackSavedSecrets(ctx context.Context, previous map[string]previousSecret, saved []string) {
	for i := len(saved) - 1; i >= 0; i-- {
		key := saved[i]
		prev := previous[key]
		if prev.exists {
			_ = m.secretsStore.Set(ctx, key, prev.value)
		} else {
			_ = m.secretsStore.Delete(ctx, key)
		}
	}
}
