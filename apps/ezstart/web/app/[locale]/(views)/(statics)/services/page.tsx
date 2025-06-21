import { Button } from '@ezstart/ui/components';
import Link from 'next/link';

export default function ServicesPage() {
  return (
    <main className='max-w-4xl mx-auto py-20 px-6 space-y-12'>
      <h1 className='text-4xl font-bold text-center'>Mes services</h1>
      <p className='text-gray-600 text-center max-w-xl mx-auto'>
        Je propose plusieurs types d’interventions selon le besoin : audit de
        code, création de MVP, accompagnement stratégique ou refonte technique.
        Voici un aperçu des offres disponibles :
      </p>

      <div className='grid gap-10'>
        <Service
          title='⚙️ Audit technique'
          desc='Analyse complète de votre base existante (front + back + infra) avec livrable détaillé et call de restitution.'
        />
        <Service
          title='🚀 Création de MVP'
          desc='Stack technique moderne livrée clé en main (Next.js, Auth, API, CI/CD, tests). Idéal pour startups early.'
        />
        <Service
          title='♻️ Refonte & clean architecture'
          desc="Restructuration progressive ou from scratch d'une base instable ou obsolète, avec typage strict et tests."
        />
        <Service
          title='🧭 CTO as a Service'
          desc='Support à moyen/long terme : choix stratégiques, roadmap, dev review, mentoring et plus si besoin.'
        />
      </div>

      <div className='text-center pt-8'>
        <Link href='/contact'>
          <Button>Discutons ensemble</Button>
        </Link>
      </div>
    </main>
  );
}

function Service({ title, desc }: { title: string; desc: string }) {
  return (
    <div className='p-6 border rounded-md bg-white dark:bg-gray-900 shadow-sm'>
      <h2 className='text-xl font-semibold mb-2'>{title}</h2>
      <p className='text-gray-600'>{desc}</p>
    </div>
  );
}
