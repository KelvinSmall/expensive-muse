export default function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <p className="font-display text-2xl md:text-3xl text-ink mb-2">{title}</p>
      {subtitle && <p className="text-ink-dim text-sm max-w-sm">{subtitle}</p>}
    </div>
  )
}
