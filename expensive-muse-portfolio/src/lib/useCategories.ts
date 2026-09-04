import { useEffect, useState } from 'react'
import { listCategories } from './api'
import type { Category } from './types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const data = await listCategories()
    setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return { categories, loading, refresh }
}
