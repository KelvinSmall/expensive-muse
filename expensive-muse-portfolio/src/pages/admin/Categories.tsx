import { useRef, useState, type FormEvent } from 'react'
import { createCategory, renameCategory, deleteCategory, reorderCategories } from '../../lib/api'
import { useCategories } from '../../lib/useCategories'
import type { Category } from '../../lib/types'

export default function Categories() {
  const { categories, refresh } = useCategories()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const dragIndex = useRef<number | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await createCategory(newName.trim())
    setNewName('')
    refresh()
  }

  async function handleRename(c: Category) {
    if (!editingName.trim()) return
    await renameCategory(c.id, editingName.trim())
    setEditingId(null)
    refresh()
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete category "${c.name}"? Projects in it will become uncategorised.`)) return
    await deleteCategory(c.id)
    refresh()
  }

  function onDrop(targetIndex: number) {
    if (dragIndex.current === null) return
    const next = [...categories]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(targetIndex, 0, moved)
    dragIndex.current = null
    reorderCategories(next.map((c) => c.id)).then(refresh)
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-xl">
      <h1 className="font-display text-2xl text-ink mb-8">Categories</h1>

      <div className="divide-y divide-border border-t border-b border-border mb-8">
        {categories.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            className="flex items-center gap-3 py-3"
          >
            <span className="text-ink-faint select-none">☰</span>
            {editingId === c.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(c)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(c)}
                className="flex-1 bg-surface border border-brass px-2 py-1 text-sm text-ink outline-none"
              />
            ) : (
              <span className="flex-1 text-ink text-[14px]">{c.name}</span>
            )}
            <button
              onClick={() => {
                setEditingId(c.id)
                setEditingName(c.name)
              }}
              className="text-[12px] text-ink-dim hover:text-ink transition-colors"
            >
              Rename
            </button>
            <button onClick={() => handleDelete(c)} className="text-[12px] text-danger hover:underline">
              Delete
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 bg-surface border border-border px-3 py-2 text-sm text-ink focus:border-brass outline-none"
        />
        <button type="submit" className="bg-ink text-bg text-sm px-4 hover:bg-brass transition-colors">
          Add
        </button>
      </form>
    </div>
  )
}
