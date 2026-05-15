//go:build sqliteonly

package main

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/nextlevelbuilder/goclaw/internal/config"
	"github.com/zalando/go-keyring"
)

const (
	serviceName     = "goclaw-desktop-v4"
	keyEncKey       = "encryption_key"
	keyGwToken      = "gateway_token"
	keyAccessToken  = "access_token"
	keyRefreshToken = "refresh_token"
)

type AuthTokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// EnsureSecrets retrieves or generates the encryption key and gateway token.
// Primary storage: OS keyring. Fallback: file-based storage in the v4 data dir.
func EnsureSecrets() (encKey, gwToken string, err error) {
	encKey, err = getOrCreateSecret(keyEncKey, 32)
	if err != nil {
		return "", "", fmt.Errorf("encryption key: %w", err)
	}
	gwToken, err = getOrCreateSecret(keyGwToken, 32)
	if err != nil {
		return "", "", fmt.Errorf("gateway token: %w", err)
	}
	return encKey, gwToken, nil
}

func getOrCreateSecret(key string, numBytes int) (string, error) {
	var val string
	var err error

	// Try OS keyring first.
	if !keyringDisabled() {
		val, err = keyring.Get(serviceName, key)
		if err == nil && val != "" {
			return val, nil
		}
	}

	// Try file-based fallback.
	val, err = readSecretFile(key)
	if err == nil && val != "" {
		return val, nil
	}

	// Generate a new random secret.
	val = generateHex(numBytes)

	// Persist to keyring; fall back to file if keyring unavailable.
	if !keyringDisabled() {
		if kerr := keyring.Set(serviceName, key, val); kerr == nil {
			return val, nil
		} else {
			slog.Warn("keyring unavailable, using file fallback", "key", key, "error", kerr)
		}
	}
	if ferr := writeSecretFile(key, val); ferr != nil {
		return "", fmt.Errorf("failed to store secret: %w", ferr)
	}

	return val, nil
}

func GetAuthTokens() (AuthTokens, error) {
	access, err := readStoredSecret(keyAccessToken)
	if err != nil {
		return AuthTokens{}, fmt.Errorf("access token: %w", err)
	}
	refresh, err := readStoredSecret(keyRefreshToken)
	if err != nil {
		return AuthTokens{}, fmt.Errorf("refresh token: %w", err)
	}
	return AuthTokens{AccessToken: access, RefreshToken: refresh}, nil
}

func SaveAuthTokens(accessToken, refreshToken string) error {
	if accessToken == "" || refreshToken == "" {
		return fmt.Errorf("auth tokens must be non-empty")
	}
	if err := writeStoredSecret(keyAccessToken, accessToken); err != nil {
		return fmt.Errorf("access token: %w", err)
	}
	if err := writeStoredSecret(keyRefreshToken, refreshToken); err != nil {
		return fmt.Errorf("refresh token: %w", err)
	}
	return nil
}

func ClearAuthTokens() error {
	var errs []error
	for _, key := range []string{keyAccessToken, keyRefreshToken} {
		if !keyringDisabled() {
			if err := keyring.Delete(serviceName, key); err != nil && !errors.Is(err, keyring.ErrNotFound) {
				errs = append(errs, fmt.Errorf("keyring %s: %w", key, err))
			}
		}
		path := filepath.Join(secretsDir(), key)
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			errs = append(errs, fmt.Errorf("file %s: %w", key, err))
		}
	}
	return errors.Join(errs...)
}

func readStoredSecret(key string) (string, error) {
	if !keyringDisabled() {
		val, err := keyring.Get(serviceName, key)
		if err == nil && val != "" {
			return val, nil
		}
		if err != nil && !errors.Is(err, keyring.ErrNotFound) {
			slog.Warn("keyring read failed, using file fallback", "key", key, "error", err)
		}
	}
	val, err := readSecretFile(key)
	if os.IsNotExist(err) {
		return "", nil
	}
	return val, err
}

func writeStoredSecret(key, value string) error {
	if !keyringDisabled() {
		if err := keyring.Set(serviceName, key, value); err == nil {
			return nil
		} else {
			slog.Warn("keyring unavailable, using file fallback", "key", key, "error", err)
		}
	}
	return writeSecretFile(key, value)
}

func keyringDisabled() bool {
	return os.Getenv("GOCLAW_DISABLE_KEYRING") == "1"
}

func generateHex(numBytes int) string {
	b := make([]byte, numBytes)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand failed: " + err.Error())
	}
	return hex.EncodeToString(b)
}

func secretsDir() string {
	if dir := os.Getenv("GOCLAW_SECRETS_DIR"); dir != "" {
		dir = config.ExpandHome(dir)
		os.MkdirAll(dir, 0700)
		return dir
	}
	dataDir := os.Getenv("GOCLAW_DATA_DIR")
	if dataDir == "" {
		dataDir = config.DesktopDataDir
	}
	dir := filepath.Join(config.ExpandHome(dataDir), "secrets")
	os.MkdirAll(dir, 0700)
	return dir
}

func readSecretFile(key string) (string, error) {
	data, err := os.ReadFile(filepath.Join(secretsDir(), key))
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func writeSecretFile(key, value string) error {
	return os.WriteFile(filepath.Join(secretsDir(), key), []byte(value), 0600)
}
