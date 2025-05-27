export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL || 'http://localhost:5001';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
};
