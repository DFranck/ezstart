export function ServiceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className='p-6 rounded-md shadow-sm border bg-white dark:bg-gray-900 h-full'>
      <h3 className='text-lg font-semibold text-gray-800 dark:text-white'>
        {title}
      </h3>
      <p className='text-sm text-gray-600 dark:text-gray-400 mt-2'>
        {description}
      </p>
    </div>
  );
}
