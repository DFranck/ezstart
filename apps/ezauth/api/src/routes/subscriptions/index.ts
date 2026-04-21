import webhookRouter, { subscriptionWebhookRegistry } from './webhook.js'

export const subscriptionRegistries = [subscriptionWebhookRegistry]

export const subscriptionRouters = [webhookRouter]
