import { useEffect, useState } from 'react'
import { getSettings, listCategories } from './api'
import type { Category, Settings } from './types'

export function usePublicShell() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getSettings(), listCategories()])
      .then(([s, c]) => {
        if (cancelled) return
        setSettings(s)
        setCategories(c)
      })
      .catch((e) => !cancelled && setError(e.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return { settings, categories, loading, error }
}
