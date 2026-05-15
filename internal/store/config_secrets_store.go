package store

import "context"

// ConfigSecretsStore manages encrypted config secrets.
// Used for config-backed secrets that must be encrypted instead of persisted in config.json.
type ConfigSecretsStore interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string) error
	Delete(ctx context.Context, key string) error
	GetAll(ctx context.Context) (map[string]string, error)
}
