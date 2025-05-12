// ezstart/apps/web/next.config.mjs
import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ['@ezstart/ez-tag', '@workspace/ui'],
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(baseConfig);
