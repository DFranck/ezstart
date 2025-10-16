import { createRobots } from '@ezstart/seo-config/robots'

export default function robots() {
  return createRobots({
    domain: 'https://ezbill-web.vercel.app',
  })
}
