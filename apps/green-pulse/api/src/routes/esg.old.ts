import { Router, OpenAPIRegistry } from '@ezstart/express-core'
import { esgService } from '../services/esg.service.js'
import { ESGPayloadSchema } from '@green-pulse/types'

export const esgRegistry = new OpenAPIRegistry()
const router: any = Router()

// POST /api/esg/projects - Create or update ESG project
router.post('/projects', async (req, res) => {
  try {
    const validation = ESGPayloadSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ESG payload format',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const project = await esgService.createProject(validation.data)

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Project creation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create ESG project',
      timestamp: new Date().toISOString(),
    })
  }
})

// POST /api/esg/activity-data - Push activity data to ESG system
router.post('/activity-data', async (req, res) => {
  try {
    const { project_id, ...payload } = req.body

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'project_id is required',
        timestamp: new Date().toISOString(),
      })
    }

    const validation = ESGPayloadSchema.safeParse(payload)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ESG payload format',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const result = await esgService.pushActivityData(project_id, validation.data)

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Activity data error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to push activity data',
      timestamp: new Date().toISOString(),
    })
  }
})

// POST /api/esg/reports - Generate ESG report
router.post('/reports', async (req, res) => {
  try {
    const { project_id, standard = 'GHG-Protocol' } = req.body

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'project_id is required',
        timestamp: new Date().toISOString(),
      })
    }

    const report = await esgService.generateReport(project_id, standard)

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Report generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      timestamp: new Date().toISOString(),
    })
  }
})

// GET /api/esg/reports/:jobId/status - Get report generation status
router.get('/reports/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params

    const status = await esgService.getReportStatus(jobId)

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Report status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get report status',
      timestamp: new Date().toISOString(),
    })
  }
})

// POST /api/esg/process - Complete ESG workflow (project + data + report)
router.post('/process', async (req, res) => {
  try {
    const validation = ESGPayloadSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ESG payload format',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const result = await esgService.processESGData(validation.data)

    res.json({
      success: true,
      data: {
        message: 'ESG data processing initiated',
        ...result,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('ESG processing error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process ESG data',
      timestamp: new Date().toISOString(),
    })
  }
})

export default router