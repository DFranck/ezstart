import { getRequestConfig } from 'next-intl/server';
import { routing } from './i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This will be handled by i18n/request.ts
  // This file is just required by next-intl
  return {};
});
