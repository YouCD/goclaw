//go:build sqliteonly

package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/nextlevelbuilder/goclaw/internal/config"
)

func TestConfigureDesktopRuntimeDefaults(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("GOCLAW_PORT", "")
	t.Setenv("GOCLAW_DATA_DIR", "")
	t.Setenv("GOCLAW_SQLITE_PATH", "")
	t.Setenv("GOCLAW_WORKSPACE", "")

	app := NewApp()
	dataDir := app.configureDesktopRuntime()

	wantDataDir := filepath.Join(home, ".goclaw", "v4")
	if dataDir != wantDataDir {
		t.Fatalf("data dir: got %q, want %q", dataDir, wantDataDir)
	}
	if app.gatewayPort != config.DesktopGatewayPort {
		t.Fatalf("gateway port: got %d, want %d", app.gatewayPort, config.DesktopGatewayPort)
	}
	if got := desktopSQLitePath(dataDir); got != filepath.Join(wantDataDir, config.DesktopSQLiteDBFilename) {
		t.Fatalf("desktop SQLite path: got %q", got)
	}
	if app.legacyNotice != nil {
		t.Fatalf("legacy notice should be empty without v3 data: %#v", app.legacyNotice)
	}
}

func TestConfigureDesktopRuntimeReportsLegacyData(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("GOCLAW_PORT", "")
	t.Setenv("GOCLAW_DATA_DIR", "")
	t.Setenv("GOCLAW_SQLITE_PATH", "")
	t.Setenv("GOCLAW_WORKSPACE", "")

	legacyDir := filepath.Join(home, ".goclaw", "data")
	if err := os.MkdirAll(legacyDir, 0755); err != nil {
		t.Fatal(err)
	}

	app := NewApp()
	dataDir := app.configureDesktopRuntime()
	if app.legacyNotice == nil {
		t.Fatal("expected legacy data notice")
	}
	if app.legacyNotice.LegacyDataDir != legacyDir {
		t.Fatalf("legacy data dir: got %q, want %q", app.legacyNotice.LegacyDataDir, legacyDir)
	}
	if app.legacyNotice.DataDir != dataDir {
		t.Fatalf("notice data dir: got %q, want %q", app.legacyNotice.DataDir, dataDir)
	}
}

func TestConfigureDesktopRuntimeNormalizesInvalidPort(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("GOCLAW_PORT", "bad")
	t.Setenv("GOCLAW_DATA_DIR", "")
	t.Setenv("GOCLAW_SQLITE_PATH", "")
	t.Setenv("GOCLAW_WORKSPACE", "")

	app := NewApp()
	app.configureDesktopRuntime()
	if app.gatewayPort != config.DesktopGatewayPort {
		t.Fatalf("gateway port: got %d, want %d", app.gatewayPort, config.DesktopGatewayPort)
	}
	if got := os.Getenv("GOCLAW_PORT"); got != config.DesktopDefaultPort() {
		t.Fatalf("GOCLAW_PORT: got %q, want %q", got, config.DesktopDefaultPort())
	}
}

func TestDesktopActiveSQLitePathHonorsOverride(t *testing.T) {
	home := t.TempDir()
	override := filepath.Join(home, "custom.db")
	t.Setenv("GOCLAW_SQLITE_PATH", override)

	if got := desktopActiveSQLitePath(filepath.Join(home, ".goclaw", "v4")); got != override {
		t.Fatalf("active SQLite path: got %q, want %q", got, override)
	}
}

func TestConfigureDesktopRuntimeExpandsSQLiteOverride(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("GOCLAW_PORT", "")
	t.Setenv("GOCLAW_DATA_DIR", "")
	t.Setenv("GOCLAW_SQLITE_PATH", "~/custom.db")
	t.Setenv("GOCLAW_WORKSPACE", "")

	app := NewApp()
	app.configureDesktopRuntime()

	want := filepath.Join(home, "custom.db")
	if got := os.Getenv("GOCLAW_SQLITE_PATH"); got != want {
		t.Fatalf("GOCLAW_SQLITE_PATH: got %q, want %q", got, want)
	}
	if got := desktopActiveSQLitePath(app.GetDataDir()); got != want {
		t.Fatalf("active SQLite path: got %q, want %q", got, want)
	}
}

func TestAuthTokensUseSecureFileFallback(t *testing.T) {
	secretsDir := t.TempDir()
	t.Setenv("GOCLAW_DISABLE_KEYRING", "1")
	t.Setenv("GOCLAW_SECRETS_DIR", secretsDir)

	if err := SaveAuthTokens("access.jwt", "refresh.token"); err != nil {
		t.Fatalf("save auth tokens: %v", err)
	}
	tokens, err := GetAuthTokens()
	if err != nil {
		t.Fatalf("get auth tokens: %v", err)
	}
	if tokens.AccessToken != "access.jwt" || tokens.RefreshToken != "refresh.token" {
		t.Fatalf("tokens: %#v", tokens)
	}

	info, err := os.Stat(filepath.Join(secretsDir, keyAccessToken))
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != 0600 {
		t.Fatalf("access token mode: got %v, want 0600", got)
	}

	if err := ClearAuthTokens(); err != nil {
		t.Fatalf("clear auth tokens: %v", err)
	}
	tokens, err = GetAuthTokens()
	if err != nil {
		t.Fatalf("get cleared auth tokens: %v", err)
	}
	if tokens.AccessToken != "" || tokens.RefreshToken != "" {
		t.Fatalf("cleared tokens: %#v", tokens)
	}
}
