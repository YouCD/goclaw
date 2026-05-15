package config

import "testing"

func TestConfigSecretsRoundTripProviderAndChannelSecrets(t *testing.T) {
	cfg := Default()
	cfg.Providers.OpenAI.APIKey = "provider-secret"
	cfg.Providers.Novita.APIKey = "novita-secret"
	cfg.Channels.Telegram.Token = "telegram-secret"
	cfg.Channels.Telegram.STTAPIKey = "telegram-stt-secret"
	cfg.Channels.Feishu.AppSecret = "feishu-secret"
	cfg.Tts.Gemini.APIKey = "gemini-tts-secret"
	cfg.Audio = &AudioConfig{
		Stt:   &AudioSTTConfig{APIKey: "audio-stt-secret"},
		Music: &AudioMusicConfig{APIKey: "audio-music-secret"},
	}

	secrets := cfg.ExtractDBSecrets()
	for _, key := range []string{
		"providers.openai.api_key",
		"providers.novita.api_key",
		"channels.telegram.token",
		"channels.telegram.stt_api_key",
		"channels.feishu.app_secret",
		"tts.gemini.api_key",
		"audio.stt.api_key",
		"audio.music.api_key",
	} {
		if secrets[key] == "" {
			t.Fatalf("missing extracted secret %s", key)
		}
	}

	cfg.StripSecrets()
	if cfg.Providers.OpenAI.APIKey != "" || cfg.Channels.Telegram.Token != "" || cfg.Tts.Gemini.APIKey != "" || cfg.Audio.Stt.APIKey != "" {
		t.Fatal("StripSecrets left config-backed secrets in memory")
	}

	cfg.ApplyDBSecrets(secrets)
	if cfg.Providers.OpenAI.APIKey != "provider-secret" {
		t.Fatalf("provider secret not restored: %q", cfg.Providers.OpenAI.APIKey)
	}
	if cfg.Channels.Telegram.STTAPIKey != "telegram-stt-secret" {
		t.Fatalf("channel secret not restored: %q", cfg.Channels.Telegram.STTAPIKey)
	}
	if cfg.Tts.Gemini.APIKey != "gemini-tts-secret" {
		t.Fatalf("tts secret not restored: %q", cfg.Tts.Gemini.APIKey)
	}
	if cfg.Audio.Music.APIKey != "audio-music-secret" {
		t.Fatalf("audio secret not restored: %q", cfg.Audio.Music.APIKey)
	}
}

func TestMaskedCopyMasksAllConfigSecrets(t *testing.T) {
	cfg := Default()
	cfg.Providers.BytePlus.APIKey = "byteplus-secret"
	cfg.Channels.Slack.UserToken = "slack-user-secret"
	cfg.Tts.Gemini.APIKey = "gemini-tts-secret"
	cfg.Audio = &AudioConfig{Stt: &AudioSTTConfig{APIKey: "audio-stt-secret"}}

	masked := cfg.MaskedCopy()
	if masked.Providers.BytePlus.APIKey != secretMask {
		t.Fatalf("provider secret not masked: %q", masked.Providers.BytePlus.APIKey)
	}
	if masked.Channels.Slack.UserToken != secretMask {
		t.Fatalf("channel secret not masked: %q", masked.Channels.Slack.UserToken)
	}
	if masked.Tts.Gemini.APIKey != secretMask {
		t.Fatalf("tts secret not masked: %q", masked.Tts.Gemini.APIKey)
	}
	if masked.Audio.Stt.APIKey != secretMask {
		t.Fatalf("audio secret not masked: %q", masked.Audio.Stt.APIKey)
	}
}
