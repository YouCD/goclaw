package methods

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/nextlevelbuilder/goclaw/internal/config"
)

type memoryConfigSecretsStore struct {
	values     map[string]string
	failKey    string
	failGetKey string
}

func (s *memoryConfigSecretsStore) Get(_ context.Context, key string) (string, error) {
	if key == s.failGetKey {
		return "", errors.New("decrypt failed")
	}
	if value, ok := s.values[key]; ok {
		return value, nil
	}
	return "", sql.ErrNoRows
}

func (s *memoryConfigSecretsStore) Set(_ context.Context, key, value string) error {
	if key == s.failKey {
		return errors.New("encrypt failed")
	}
	if s.values == nil {
		s.values = make(map[string]string)
	}
	s.values[key] = value
	return nil
}

func (s *memoryConfigSecretsStore) Delete(_ context.Context, key string) error {
	delete(s.values, key)
	return nil
}

func (s *memoryConfigSecretsStore) GetAll(context.Context) (map[string]string, error) {
	return s.values, nil
}

func TestSaveSecretsToStoreFailsClosed(t *testing.T) {
	cfg := config.Default()
	cfg.Providers.OpenAI.APIKey = "sk-config-file"
	store := &memoryConfigSecretsStore{failKey: "providers.openai.api_key"}
	methods := NewConfigMethods(cfg, "", store, nil)

	if err := methods.saveSecretsToStore(context.Background(), cfg); err == nil {
		t.Fatal("expected secret persistence failure")
	}
	if cfg.Providers.OpenAI.APIKey != "sk-config-file" {
		t.Fatal("secret should remain in config when persistence fails before stripping")
	}
}

func TestSaveSecretsToStoreRollsBackPartialWrites(t *testing.T) {
	cfg := config.Default()
	cfg.Audio = &config.AudioConfig{Stt: &config.AudioSTTConfig{APIKey: "new-audio"}}
	cfg.Providers.OpenAI.APIKey = "new-openai"
	store := &memoryConfigSecretsStore{
		values: map[string]string{
			"audio.stt.api_key": "old-audio",
		},
		failKey: "providers.openai.api_key",
	}
	methods := NewConfigMethods(cfg, "", store, nil)

	if err := methods.saveSecretsToStore(context.Background(), cfg); err == nil {
		t.Fatal("expected partial secret persistence failure")
	}
	if got := store.values["audio.stt.api_key"]; got != "old-audio" {
		t.Fatalf("saved secret was not rolled back: %q", got)
	}
	if _, ok := store.values["providers.openai.api_key"]; ok {
		t.Fatal("failed secret should not be present after rollback")
	}
}

func TestSaveSecretsToStoreRollsBackWhenLaterReadFails(t *testing.T) {
	cfg := config.Default()
	cfg.Audio = &config.AudioConfig{Stt: &config.AudioSTTConfig{APIKey: "new-audio"}}
	cfg.Providers.OpenAI.APIKey = "new-openai"
	store := &memoryConfigSecretsStore{
		values: map[string]string{
			"audio.stt.api_key": "old-audio",
		},
		failGetKey: "providers.openai.api_key",
	}
	methods := NewConfigMethods(cfg, "", store, nil)

	if err := methods.saveSecretsToStore(context.Background(), cfg); err == nil {
		t.Fatal("expected later read failure")
	}
	if got := store.values["audio.stt.api_key"]; got != "old-audio" {
		t.Fatalf("saved secret was not rolled back after read failure: %q", got)
	}
}

func TestSaveSecretsToStoreAllowsSecretFreeConfigWithoutStore(t *testing.T) {
	cfg := config.Default()
	methods := NewConfigMethods(cfg, "", nil, nil)

	if err := methods.saveSecretsToStore(context.Background(), cfg); err != nil {
		t.Fatalf("secret-free config should not require store: %v", err)
	}
}
