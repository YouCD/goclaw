package http

import (
	"bytes"
	"strings"
	"testing"
)

func TestRestoreDryRunProofMatchesUserAndDigestOnce(t *testing.T) {
	restoreDryRunProofs.Lock()
	restoreDryRunProofs.items = make(map[string]restoreDryRunProof)
	restoreDryRunProofs.Unlock()

	token := storeRestoreDryRunProof("root-user", "archive-digest")
	if !consumeRestoreDryRunProof("root-user", "archive-digest", token) {
		t.Fatal("valid dry-run proof rejected")
	}
	if consumeRestoreDryRunProof("root-user", "archive-digest", token) {
		t.Fatal("dry-run proof reused after consume")
	}

	token = storeRestoreDryRunProof("root-user", "archive-digest")
	if consumeRestoreDryRunProof("root-user", "other-digest", token) {
		t.Fatal("dry-run proof accepted for different archive digest")
	}

	token = storeRestoreDryRunProof("root-user", "archive-digest")
	if consumeRestoreDryRunProof("other-user", "archive-digest", token) {
		t.Fatal("dry-run proof accepted for different user")
	}
}

func TestCopyWithLimitReturnsStableDigest(t *testing.T) {
	var dst bytes.Buffer
	n, digest, err := copyWithLimit(&dst, strings.NewReader("archive"), 1024)
	if err != nil {
		t.Fatalf("copyWithLimit: %v", err)
	}
	if n != 7 || dst.String() != "archive" {
		t.Fatalf("copy mismatch: n=%d dst=%q", n, dst.String())
	}
	if digest != "0eb3e36bfb24dcd9bb1d1bece1531216b59539a8fde17ee80224af0653c92aa3" {
		t.Fatalf("digest = %q", digest)
	}
}
