import { Router } from '@ezstart/api-core'
import type { Router as ExpressRouter } from 'express'
import scanImageRoutes from './scan-image.js'
import getScansRoutes from './get-scans.js'
import getScanRoutes from './get-scan.js'
import deleteScanRoutes from './delete-scan.js'
import reanalyzeScanRoutes from './reanalyze-scan.js'
import monsterRoutes from './import-monsters.js'
import benchOcrRoutes from './bench-ocr.js'
import getGameConfigRoutes from './get-game-config.js'
import putGameConfigRoutes from './put-game-config.js'
import deleteGameConfigRoutes from './delete-game-config.js'
import feedbackScanRoutes from './feedback-scan.js'
import reportScanRoutes from './report-scan.js'
import { scansRegistry, monstersRegistry, configRegistry, benchRegistry } from './openapi.js'
import { authMiddleware } from '../middleware/auth.js'

const router: ExpressRouter = Router()

export const globalRegistry = [scansRegistry, monstersRegistry, configRegistry, benchRegistry]

router
  .use('/scan', scanImageRoutes)
  .use('/scans', getScansRoutes)
  .use('/scans', getScanRoutes)
  .use('/scans', authMiddleware, deleteScanRoutes)
  .use('/scans', reanalyzeScanRoutes)
  .use('/scans', feedbackScanRoutes)
  .use('/scans', reportScanRoutes)
  .use('/monsters', monsterRoutes)
  .use('/bench', benchOcrRoutes)
  .use('/config', getGameConfigRoutes)
  .use('/config', authMiddleware, putGameConfigRoutes)
  .use('/config', authMiddleware, deleteGameConfigRoutes)

export default router
