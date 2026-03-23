import { Router } from '@ezstart/express-core'
import scanImageRoutes from './scan-image.js'
import getScansRoutes from './get-scans.js'
import getScanRoutes from './get-scan.js'
import deleteScanRoutes from './delete-scan.js'
import monsterRoutes from './import-monsters.js'
import benchOcrRoutes from './bench-ocr.js'

const router: any = Router()

export const globalRegistry: any[] = []

router
  .use('/scan', scanImageRoutes)
  .use('/scans', getScansRoutes)
  .use('/scans', getScanRoutes)
  .use('/scans', deleteScanRoutes)
  .use('/monsters', monsterRoutes)
  .use('/bench', benchOcrRoutes)

export default router
