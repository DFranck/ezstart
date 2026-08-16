export function SimpleBadge({ label }: { label: string }) {
  return (
    <span className="inline-block text-sm bg-muted text-muted-foreground px-3 py-1 rounded-full">
      {label}
    </span>
  )
}
