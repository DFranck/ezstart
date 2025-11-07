import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
} from '@ezstart/express-core'
import { paramsMongoIdSchema } from '@tower-defense/types'
import { leaveGameController } from '../../controllers/leaveGameController.js'

export const leaveGameRegistry = new OpenAPIRegistry()
const router = Router()

const docRouter = createRouterWithDoc(leaveGameRegistry, router)

docRouter.post('/:id/leave', validateParams(paramsMongoIdSchema), leaveGameController, {
  summary: 'Leave a Game',
  tags: ['Games'],
  paramsSchema: paramsMongoIdSchema,
})

export { leaveGameRegistry as registry, router }
export default router
