// CRITICAL: must run BEFORE any import that reads JWT_SECRET / MONGO_URL at module eval time.
import { instrumentApi } from '@ezstart/config/server'
instrumentApi('ezpay')
