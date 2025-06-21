export function ProjectCard({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <div className='p-6 rounded-lg shadow-sm border bg-white dark:bg-gray-900 flex flex-col justify-between h-full'>
      <div>
        <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
          {title}
        </h3>
        <p className='text-gray-600 dark:text-gray-400 text-sm'>
          {description}
        </p>
      </div>
      <div className='mt-4'>
        <a
          href={link}
          target='_blank'
          rel='noopener noreferrer'
          className='text-cyan-600 text-sm hover:underline'
        >
          Voir le projet →
        </a>
      </div>
    </div>
  );
}
