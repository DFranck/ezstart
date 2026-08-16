export function ServiceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-md shadow-sm border bg-card text-card-foreground h-full">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  )
}
