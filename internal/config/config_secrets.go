package config

import "encoding/json"

const secretMask = "***"

// MaskedCopy returns a deep copy of the config with all secret fields masked.
// Used by config.get to avoid exposing secrets to WebSocket clients.
func (c *Config) MaskedCopy() *Config {
	c.mu.RLock()
	defer c.mu.RUnlock()

	data, err := json.Marshal(c)
	if err != nil {
		return &Config{}
	}
	cp := Default()
	if err := json.Unmarshal(data, cp); err != nil {
		return &Config{}
	}

	forEachConfigSecret(cp, func(_ string, dst *string) {
		maskNonEmpty(dst)
	})
	return cp
}

// StripSecrets zeros out all secret fields in the config.
// Used before saving to disk to ensure secrets never persist in config.json.
func (c *Config) StripSecrets() {
	forEachConfigSecret(c, func(_ string, dst *string) {
		*dst = ""
	})
}

// StripMaskedSecrets strips only fields that still contain the mask value "***".
// Real values are preserved so UI-entered secrets can be extracted before save.
func (c *Config) StripMaskedSecrets() {
	forEachConfigSecret(c, func(_ string, dst *string) {
		if *dst == secretMask {
			*dst = ""
		}
	})
}

// ApplyDBSecrets overlays encrypted secrets from config_secrets onto config.
// Called before ApplyEnvOverrides() so env vars keep highest precedence.
func (c *Config) ApplyDBSecrets(secrets map[string]string) {
	forEachConfigSecret(c, func(key string, dst *string) {
		if v, ok := secrets[key]; ok && v != "" {
			*dst = v
		}
	})
}

// ExtractDBSecrets returns non-empty secret values for config_secrets storage.
func (c *Config) ExtractDBSecrets() map[string]string {
	secrets := make(map[string]string)
	forEachConfigSecret(c, func(key string, src *string) {
		if *src != "" && *src != secretMask {
			secrets[key] = *src
		}
	})
	return secrets
}

func forEachConfigSecret(c *Config, visit func(key string, field *string)) {
	visit("providers.anthropic.api_key", &c.Providers.Anthropic.APIKey)
	visit("providers.openai.api_key", &c.Providers.OpenAI.APIKey)
	visit("providers.openrouter.api_key", &c.Providers.OpenRouter.APIKey)
	visit("providers.groq.api_key", &c.Providers.Groq.APIKey)
	visit("providers.gemini.api_key", &c.Providers.Gemini.APIKey)
	visit("providers.deepseek.api_key", &c.Providers.DeepSeek.APIKey)
	visit("providers.mistral.api_key", &c.Providers.Mistral.APIKey)
	visit("providers.xai.api_key", &c.Providers.XAI.APIKey)
	visit("providers.minimax.api_key", &c.Providers.MiniMax.APIKey)
	visit("providers.cohere.api_key", &c.Providers.Cohere.APIKey)
	visit("providers.perplexity.api_key", &c.Providers.Perplexity.APIKey)
	visit("providers.dashscope.api_key", &c.Providers.DashScope.APIKey)
	visit("providers.bailian.api_key", &c.Providers.Bailian.APIKey)
	visit("providers.zai.api_key", &c.Providers.Zai.APIKey)
	visit("providers.zai_coding.api_key", &c.Providers.ZaiCoding.APIKey)
	visit("providers.ollama_cloud.api_key", &c.Providers.OllamaCloud.APIKey)
	visit("providers.novita.api_key", &c.Providers.Novita.APIKey)
	visit("providers.byteplus.api_key", &c.Providers.BytePlus.APIKey)
	visit("providers.byteplus_coding.api_key", &c.Providers.BytePlusCoding.APIKey)

	visit("gateway.token", &c.Gateway.Token)

	visit("channels.telegram.token", &c.Channels.Telegram.Token)
	visit("channels.telegram.stt_api_key", &c.Channels.Telegram.STTAPIKey)
	visit("channels.discord.token", &c.Channels.Discord.Token)
	visit("channels.discord.stt_api_key", &c.Channels.Discord.STTAPIKey)
	visit("channels.slack.bot_token", &c.Channels.Slack.BotToken)
	visit("channels.slack.app_token", &c.Channels.Slack.AppToken)
	visit("channels.slack.user_token", &c.Channels.Slack.UserToken)
	visit("channels.zalo.token", &c.Channels.Zalo.Token)
	visit("channels.zalo.webhook_secret", &c.Channels.Zalo.WebhookSecret)
	visit("channels.feishu.app_id", &c.Channels.Feishu.AppID)
	visit("channels.feishu.app_secret", &c.Channels.Feishu.AppSecret)
	visit("channels.feishu.encrypt_key", &c.Channels.Feishu.EncryptKey)
	visit("channels.feishu.verification_token", &c.Channels.Feishu.VerificationToken)
	visit("channels.feishu.stt_api_key", &c.Channels.Feishu.STTAPIKey)

	visit("tts.openai.api_key", &c.Tts.OpenAI.APIKey)
	visit("tts.elevenlabs.api_key", &c.Tts.ElevenLabs.APIKey)
	visit("tts.minimax.api_key", &c.Tts.MiniMax.APIKey)
	visit("tts.minimax.group_id", &c.Tts.MiniMax.GroupID)
	visit("tts.gemini.api_key", &c.Tts.Gemini.APIKey)

	if c.Audio != nil {
		if c.Audio.Stt != nil {
			visit("audio.stt.api_key", &c.Audio.Stt.APIKey)
		}
		if c.Audio.Music != nil {
			visit("audio.music.api_key", &c.Audio.Music.APIKey)
		}
	}

	visit("tailscale.auth_key", &c.Tailscale.AuthKey)
}

func maskNonEmpty(s *string) {
	if *s != "" {
		*s = secretMask
	}
}
