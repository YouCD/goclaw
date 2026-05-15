package updater

import "testing"

func TestSelectAvailableUpdateRequiresDesktopV4Tag(t *testing.T) {
	releases := []githubRelease{
		{
			TagName: "lite-v9.9.9",
			HTMLURL: "https://example.test/v3",
			Assets: []githubAsset{{
				Name:               "goclaw-lite-9.9.9-darwin-arm64.tar.gz",
				BrowserDownloadURL: "https://example.test/v3.tar.gz",
			}},
		},
		{
			TagName: "lite-v4-0.2.0",
			HTMLURL: "https://example.test/v4",
			Assets: []githubAsset{{
				Name:               "goclaw-lite-0.2.0-darwin-arm64.tar.gz",
				BrowserDownloadURL: "https://example.test/v4.tar.gz",
			}},
		},
	}

	info := selectAvailableUpdate(releases, "0.1.0", "darwin", "arm64")
	if info == nil || !info.Available {
		t.Fatal("expected v4 update")
	}
	if info.Version != "0.2.0" {
		t.Fatalf("version: got %q, want %q", info.Version, "0.2.0")
	}
	if info.DownloadURL != "https://example.test/v4.tar.gz" {
		t.Fatalf("download URL: got %q", info.DownloadURL)
	}
}

func TestSelectAvailableUpdateSkipsPrereleaseAndDraft(t *testing.T) {
	releases := []githubRelease{
		{
			TagName:    "lite-v4-0.3.0",
			Prerelease: true,
			Assets: []githubAsset{{
				Name:               "goclaw-lite-0.3.0-windows-amd64.zip",
				BrowserDownloadURL: "https://example.test/prerelease.zip",
			}},
		},
		{
			TagName: "lite-v4-0.2.0",
			Draft:   true,
			Assets: []githubAsset{{
				Name:               "goclaw-lite-0.2.0-windows-amd64.zip",
				BrowserDownloadURL: "https://example.test/draft.zip",
			}},
		},
	}

	if info := selectAvailableUpdate(releases, "0.1.0", "windows", "amd64"); info != nil {
		t.Fatalf("expected no update, got %#v", info)
	}
}
