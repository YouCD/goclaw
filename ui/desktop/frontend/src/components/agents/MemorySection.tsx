import { useTranslation } from 'react-i18next'
import type { MemoryConfig } from '../../types/agent'

interface MemorySectionProps {
  config: MemoryConfig | null | undefined
  onChange: (config: MemoryConfig | null) => void
}

const defaults: Required<MemoryConfig> = {
  enabled: false,
  embedding_provider: '',
  embedding_model: '',
  max_results: 5,
  max_chunk_len: 512,
  chunk_overlap: 50,
  vector_weight: 0.7,
  text_weight: 0.3,
  min_score: 0.3,
}

export function MemorySection({ config, onChange }: MemorySectionProps) {
  const { t } = useTranslation('agents')
  const enabled = config?.enabled ?? false

  const update = (field: keyof MemoryConfig, value: unknown) => {
    onChange({ ...defaults, ...config, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('configSections.memory.title')}</h3>
          <p className="text-[11px] text-text-muted">{t('configSections.memory.description')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ ...defaults, ...config, enabled: true })
              } else {
                onChange(null)
              }
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-surface-tertiary peer-focus:ring-1 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent" />
        </label>
      </div>

      {enabled && (
        <div className="rounded-lg border border-border p-3 space-y-4">
          {/* Search results */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label={t('configSections.memory.maxResults')}
              hint={t('configSections.memory.maxResultsTip')}
              value={config?.max_results ?? defaults.max_results}
              onChange={(v) => update('max_results', v)}
            />
            <NumberField
              label={t('configSections.memory.minScore')}
              hint={t('configSections.memory.minScoreTip')}
              value={config?.min_score ?? defaults.min_score}
              onChange={(v) => update('min_score', v)}
              step={0.05}
            />
          </div>

          {/* Chunking */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label={t('configSections.memory.maxChunkLen')}
              hint={t('configSections.memory.maxChunkLenTip')}
              value={config?.max_chunk_len ?? defaults.max_chunk_len}
              onChange={(v) => update('max_chunk_len', v)}
            />
            <NumberField
              label={t('configSections.memory.chunkOverlap')}
              hint={t('configSections.memory.chunkOverlapTip')}
              value={config?.chunk_overlap ?? defaults.chunk_overlap}
              onChange={(v) => update('chunk_overlap', v)}
            />
          </div>

          {/* Weights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label={t('configSections.memory.vectorWeight')}
              hint={t('configSections.memory.vectorWeightTip')}
              value={config?.vector_weight ?? defaults.vector_weight}
              onChange={(v) => update('vector_weight', v)}
              step={0.1}
            />
            <NumberField
              label={t('configSections.memory.textWeight')}
              hint={t('configSections.memory.textWeightTip')}
              value={config?.text_weight ?? defaults.text_weight}
              onChange={(v) => update('text_weight', v)}
              step={0.1}
            />
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-[11px] text-text-muted italic">{t('config.usingGlobalDefaults')}</p>
      )}
    </div>
  )
}

function NumberField({ label, hint, value, onChange, step }: {
  label: string; hint: string; value: number
  onChange: (v: number) => void; step?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-base md:text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <p className="text-[10px] text-text-muted">{hint}</p>
    </div>
  )
}
