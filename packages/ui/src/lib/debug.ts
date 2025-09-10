export const isDebug = () => process.env.NEXT_PUBLIC_DEBUG === 'true';
export const isDevEnv = () => process.env.NODE_ENV === 'development';
