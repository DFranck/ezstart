export function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Ez Billing
        </h1>
        <p className="text-muted-foreground mb-8">
          Gérez vos factures et devis simplement
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Factures</h3>
          <p className="text-sm text-muted-foreground">
            Créez et gérez vos factures
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Devis</h3>
          <p className="text-sm text-muted-foreground">
            Générez des devis professionnels
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Clients</h3>
          <p className="text-sm text-muted-foreground">
            Gérez votre base de clients
          </p>
        </div>
      </div>
    </div>
  );
}