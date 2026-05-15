import type { ReactNode } from 'react'

export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface-secondary/70 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs">
      <span className="font-medium text-text-secondary">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-4 text-text-muted">{hint}</span>}
    </label>
  )
}

const inputClass = 'h-9 w-full rounded-md border border-border bg-surface-primary px-3 text-xs text-text-primary outline-none transition-colors focus:border-accent'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[inputClass, props.className].filter(Boolean).join(' ')} />
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={[inputClass, props.className].filter(Boolean).join(' ')} />
}

export function TextAreaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={[inputClass, 'min-h-20 py-2', props.className].filter(Boolean).join(' ')} />
}

export function ActionButton({
  children,
  variant = 'secondary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variantClass = variant === 'primary'
    ? 'border-accent bg-accent text-white hover:bg-accent/90'
    : variant === 'danger'
      ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
      : 'border-border text-text-secondary hover:bg-surface-tertiary'
  return (
    <button
      {...props}
      className={[
        'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variantClass,
        props.className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  )
}
