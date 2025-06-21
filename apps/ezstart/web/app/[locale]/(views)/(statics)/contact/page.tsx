export default function ContactPage() {
  return (
    <main className='max-w-2xl mx-auto px-6 py-24 space-y-10'>
      <h1 className='text-4xl font-bold'>Discutons de votre projet</h1>

      <p className='text-gray-700 text-lg'>
        Vous lancez un nouveau produit&nbsp;? Vous cherchez à consolider une
        base technique existante ou à refondre un projet complexe&nbsp;? Je
        propose un accompagnement structuré, en tant que développeur freelance
        ou CTO externalisé.
      </p>

      <ul className='space-y-2 text-gray-700'>
        <li>
          ✅ Création de socles techniques modernes (Next.js, TypeScript, CI/CD)
        </li>
        <li>
          ✅ Audit & refonte de codebases existantes (architecture, sécurité,
          tests)
        </li>
        <li>✅ Accompagnement CTO : stratégie, roadmap, choix de stack</li>
        <li>
          ✅ Développement de MVP ou outils internes (rapidité, qualité,
          maintenabilité)
        </li>
      </ul>

      <div className='space-y-4'>
        <p className='text-gray-600'>
          Pour toute demande de collaboration ou d'information complémentaire :
        </p>

        <ul className='space-y-1 text-cyan-700 underline'>
          <li>
            📧{' '}
            <a href='mailto:franck.dufournet@gmail.com'>
              franck.dufournet@gmail.com
            </a>
          </li>
          <li>
            💼{' '}
            <a
              href='https://www.linkedin.com/in/franck-dufournet-239446151/'
              target='_blank'
              rel='noopener noreferrer'
            >
              LinkedIn
            </a>
          </li>
          <li>
            🧑‍💻{' '}
            <a
              href='https://github.com/DFranck'
              target='_blank'
              rel='noopener noreferrer'
            >
              GitHub
            </a>
          </li>
          <li>
            🛠️{' '}
            <a
              href='https://en.malt.fr/profile/franckdufournet1'
              target='_blank'
              rel='noopener noreferrer'
            >
              Malt
            </a>{' '}
            |{' '}
            <a
              href='https://www.upwork.com/freelancers/~01193d57968b5d8131'
              target='_blank'
              rel='noopener noreferrer'
            >
              Upwork
            </a>
          </li>
        </ul>
      </div>

      <p className='text-sm text-gray-500'>
        📍 <strong>EzStart LLC</strong> – enregistrée dans le Wyoming (USA). Je
        travaille à distance avec des clients en France, Europe et Amérique du
        Nord.
      </p>
    </main>
  );
}
