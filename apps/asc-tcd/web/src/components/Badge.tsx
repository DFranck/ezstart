export function Badge({ label }: { label: string }) {
  return (
    <span className='inline-block text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-1 rounded-full'>
      {label}
    </span>
  );
}
