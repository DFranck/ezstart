/**
 * Get base API URL depending on the environment (Node or Browser).
 */
export const getApiUrl = (): string => {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    return process.env.API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
  }

  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'http://localhost:5000'
  );
};
