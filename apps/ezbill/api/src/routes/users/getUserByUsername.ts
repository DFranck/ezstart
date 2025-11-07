/**
 * GET /api/users/:username
 * Get User by Username
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  z,
} from '@ezstart/express-core';
import { userSchema } from '@ezbill/types';
import { getUserByUsername } from '../../controllers/user/index.js';

const usernameParamsSchema = z.object({
  username: z.string().min(1).describe('Username to search for')
});

export const getUserByUsernameRegistry = new OpenAPIRegistry();
const router = Router();
export const getUserByUsernameRouter = createRouterWithDoc(
  getUserByUsernameRegistry,
  router,
  '/users'
);

getUserByUsernameRouter.get('/:username', validateParams(usernameParamsSchema), getUserByUsername, {
  summary: 'Get User by Username',
  tags: ['Users'],
  paramsSchema: usernameParamsSchema,
  responseSchema: userSchema,
});

export default router;
