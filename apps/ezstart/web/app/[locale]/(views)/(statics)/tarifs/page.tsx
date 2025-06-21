import { Button } from '@ezstart/ui/components';
import Link from 'next/link';

export default function TarifsPage() {
  return (
    <main className='max-w-3xl mx-auto py-20 px-6 space-y-12'>
      <h1 className='text-4xl font-bold text-center'>Tarifs & engagements</h1>
      <p className='text-gray-600 text-center max-w-xl mx-auto'>
        Les prestations peuvent être facturées à la journée (TJM) ou au forfait,
        selon le format du projet. Chaque collaboration démarre par un échange
        clair pour définir les besoins, livrables et rythme de travail.
      </p>

      <section className='grid gap-8'>
        <Pricing title='🎯 Audit flash' price='À partir de 900€ HT'>
          <li>Analyse de codebase existante</li>
          <li>CI/CD, sécurité, tests, conventions</li>
          <li>Livrable PDF + call de restitution</li>
        </Pricing>

        <Pricing title='🚀 MVP complet' price='Forfait ou TJM (500–600€ HT)'>
          <li>Stack front/back prête à l’emploi</li>
          <li>Auth, API, dashboard, tests, CI/CD</li>
          <li>Livré avec doc technique et démo</li>
        </Pricing>

        <Pricing title='🧭 CTO externalisé' price='Sur devis / long-terme'>
          <li>Revue de code, mentoring, roadmap</li>
          <li>Stratégie d'équipe, choix techniques</li>
          <li>Disponible à temps partiel ou régulier</li>
        </Pricing>
      </section>

      <div className='text-center pt-8'>
        <Link href='/contact'>
          <Button variant='outline'>Parlons-en ensemble</Button>
        </Link>
      </div>
    </main>
  );
}

function Pricing({
  title,
  price,
  children,
}: {
  title: string;
  price: string;
  children: React.ReactNode;
}) {
  return (
    <div className='border rounded-lg p-6 shadow-sm bg-white dark:bg-gray-900'>
      <h2 className='text-xl font-semibold mb-1'>{title}</h2>
      <p className='text-cyan-600 mb-3'>{price}</p>
      <ul className='list-disc list-inside text-gray-600 space-y-1'>
        {children}
      </ul>
    </div>
  );
}
