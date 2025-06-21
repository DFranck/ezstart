import Link from 'next/link';

export default function BlogPage() {
  return (
    <main className='max-w-4xl mx-auto py-20 px-6 space-y-12'>
      <h1 className='text-4xl font-bold'>Blog technique</h1>
      <p className='text-gray-600'>
        Analyses, bonnes pratiques et retours d’expérience sur la construction
        d’architectures web modernes avec React, Next.js, Express, CI/CD et bien
        plus.
      </p>

      <div className='grid gap-8'>
        <ArticlePreview
          title='Structurer un projet fullstack moderne avec Next.js + Express'
          slug='/blog/structure-fullstack'
          description='Comment organiser un projet hybride front/back de manière modulaire, testable et évolutive.'
          date='21 juin 2025'
          tags={['Next.js', 'Express', 'Architecture']}
        />

        <ArticlePreview
          title="Mise en place d'un monorepo TypeScript propre avec Turborepo"
          slug='/blog/monorepo-turborepo'
          description='Gestion de packages, build, lint, tests, et CI dans un seul monorepo optimisé.'
        />
      </div>
    </main>
  );
}

function ArticlePreview({
  title,
  slug,
  description,
  date,
  tags,
}: {
  title: string;
  slug: string;
  description: string;
  date?: string;
  tags?: string[];
}) {
  return (
    <Link
      href={slug}
      className='block border rounded-lg p-6 hover:shadow-md transition duration-200 bg-white dark:bg-gray-900'
    >
      <h2 className='text-2xl font-semibold text-cyan-700 hover:underline'>
        {title}
      </h2>
      {date && <p className='text-sm text-gray-400 mt-1'>{date}</p>}
      <p className='mt-2 text-gray-600'>{description}</p>
      {tags && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {tags.map((tag) => (
            <span
              key={tag}
              className='text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full'
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
