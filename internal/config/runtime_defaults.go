package config

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	DefaultGatewayPort = 18790
	DesktopGatewayPort = 18791

	DefaultDataDir      = "~/.goclaw/data"
	DesktopDataDir      = "~/.goclaw/v4"
	DefaultWorkspaceDir = "~/.goclaw/workspace"
	DesktopWorkspaceDir = "~/.goclaw/v4/workspace"

	SQLiteDBFilename        = "goclaw.db"
	DesktopSQLiteDBFilename = "goclaw-v4.db"

	DesktopReleaseTagPrefix = "lite-v4-"
	StandardPostgresDBName  = "goclaw_v4"
)

// DefaultSQLitePath returns the SQLite database path for the current runtime.
func DefaultSQLitePath(dataDir string) string {
	filename := SQLiteDBFilename
	if os.Getenv("GOCLAW_DESKTOP") == "1" {
		filename = DesktopSQLiteDBFilename
	}
	return filepath.Join(dataDir, filename)
}

// SQLiteDatabaseFilenames lists database filenames that must be treated as internal.
func SQLiteDatabaseFilenames() []string {
	return []string{SQLiteDBFilename, DesktopSQLiteDBFilename}
}

// DesktopDefaultPort returns the desktop gateway port as a string for env wiring.
func DesktopDefaultPort() string {
	return fmt.Sprintf("%d", DesktopGatewayPort)
}
