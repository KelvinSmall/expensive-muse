import { useEffect, useState, type FormEvent } from 'react'
import { getSettings, updateSettings } from '../../lib/api'
import type { Settings as SettingsType } from '../../lib/types'

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!settings) return <div className="px-6 md:px-10 py-8" />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    await updateSettings(settings)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fields: { key: keyof SettingsType; label: string; placeholder?: string }[] = [
    { key: 'studio_name', label: 'Studio Name' },
    { key: 'tagline', label: 'Studio Tagline' },
    { key: 'contact_email', label: 'Contact Email' },
    { key: 'website', label: 'Website', placeholder: 'https://…' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
    { key: 'whatsapp', label: 'WhatsApp', placeholder: '+60…' },
  ]

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-xl">
      <h1 className="font-display text-2xl text-ink mb-8">Portfolio Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map((f) => (
          <div key={f.key}>
            <p className="text-[12px] text-ink-dim mb-1.5">{f.label}</p>
            <input
              value={(settings[f.key] as string) ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            />
          </div>
        ))}

        <div>
          <p className="text-[12px] text-ink-dim mb-1.5">Footer Text</p>
          <textarea
            value={settings.footer_text ?? ''}
            onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
            rows={2}
            className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none resize-none"
          />
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-ink text-[14px] mb-1">Upload Limits</p>
          <p className="text-ink-dim text-[12px] mb-4">
            Enforced for real before any upload starts — a file over the limit is rejected with a clear message
            rather than silently accepted.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] text-ink-dim mb-1.5">Max video size (MB)</p>
              <input
                type="number"
                min={1}
                value={settings.max_video_size_mb}
                onChange={(e) =>
                  setSettings({ ...settings, max_video_size_mb: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
              />
            </div>
            <div>
              <p className="text-[12px] text-ink-dim mb-1.5">Max image size (MB)</p>
              <input
                type="number"
                min={1}
                value={settings.max_image_size_mb}
                onChange={(e) =>
                  setSettings({ ...settings, max_image_size_mb: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-bg text-sm px-5 py-2.5 hover:bg-brass transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
