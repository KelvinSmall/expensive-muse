import { useRef, useState, type FormEvent } from 'react'
import { createCategory, renameCategory, deleteCategory, reorderCategories, setCategoryHidden } from '../../lib/api'
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

  async function toggleHidden(c: Category) {
    await setCategoryHidden(c.id, !c.hidden)
    refresh()
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-xl">
      <h1 className="font-display text-2xl text-ink mb-2">Categories</h1>
      <p className="text-ink-dim text-[13px] mb-8">
        Hide a category to instantly pull it — and everything filed under it — off the public site. Useful for
        curating a portfolio for one client at a time. Nothing is deleted; unhide it any time.
      </p>

      <div className="divide-y divide-border border-t border-b border-border mb-8">
        {categories.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            className="flex flex-wrap items-center gap-3 py-3"
          >
            <span className="text-ink-faint select-none shrink-0">☰</span>
            {editingId === c.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(c)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(c)}
                className="flex-1 min-w-[100px] bg-surface border border-brass px-2 py-1 text-sm text-ink outline-none"
              />
            ) : (
              <span className={`flex-1 min-w-[100px] truncate text-[14px] ${c.hidden ? 'text-ink-faint' : 'text-ink'}`}>
                {c.name}
                {c.hidden && <span className="text-ink-faint text-[11px] ml-2">(hidden)</span>}
              </span>
            )}
            <button
              onClick={() => toggleHidden(c)}
              title={c.hidden ? 'Hidden — click to show on public site' : 'Visible — click to hide from public site'}
              className={`text-[13px] transition-colors ${c.hidden ? 'text-ink-faint hover:text-ink' : 'text-ok hover:text-ink'}`}
            >
              {c.hidden ? '⊘ Hidden' : '◎ Visible'}
            </button>
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
