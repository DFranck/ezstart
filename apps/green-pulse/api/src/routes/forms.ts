import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  FormConfigSchema,
  FormInstanceSchema,
  CreateFormInstanceRequestSchema,
  UpdateFormInstanceRequestSchema,
  SubmitFormInstanceRequestSchema,
  ExtractFormDataRequestSchema,
  ExtractFormDataResponseSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getFormConfigModel } from '../models/FormConfig.js'
import { getFormInstanceModel } from '../models/FormInstance.js'

export const formRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(formRegistry, router, '/forms')

// ==================== FORM CONFIGS ====================

// GET /api/forms/configs - List all form configurations
docRouter.get('/configs', async (req, res) => {
  try {
    const FormConfig = await getFormConfigModel()

    const { category, tags } = req.query

    const query: any = {}
    if (category) query.category = category
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] }

    // @ts-expect-error - Mongoose type inference issue
    const configs = await FormConfig.find(query).sort({ createdAt: -1 }).lean()

    res.json({
      success: true,
      data: configs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching form configs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form configurations',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'List all form configurations',
  tags: ['Forms'],
  responseSchema: ApiResponseSchema(FormConfigSchema.array()),
})

// GET /api/forms/configs/:id - Get form config by ID
docRouter.get('/configs/:id', async (req, res) => {
  try {
    const FormConfig = await getFormConfigModel()

    // @ts-expect-error - Mongoose type inference issue
    const config = await FormConfig.findOne({ id: req.params.id }).lean()

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Form configuration not found',
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching form config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form configuration',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Get form configuration by ID',
  tags: ['Forms'],
  responseSchema: ApiResponseSchema(FormConfigSchema),
})

// POST /api/forms/configs - Create new form config (admin only)
docRouter.post('/configs', async (req, res) => {
  try {
    const validation = FormConfigSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form configuration',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const FormConfig = await getFormConfigModel()

    const newConfig = new FormConfig(validation.data)
    await newConfig.save()

    res.status(201).json({
      success: true,
      data: newConfig,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating form config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create form configuration',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Create new form configuration',
  tags: ['Forms'],
  bodySchema: FormConfigSchema,
  responseSchema: ApiResponseSchema(FormConfigSchema),
})

// ==================== FORM INSTANCES ====================

// GET /api/forms/instances - List user's form instances
docRouter.get('/instances', async (req, res) => {
  try {
    const FormInstance = await getFormInstanceModel()

    const { userId, formConfigId, status } = req.query

    const query: any = {}
    if (userId) query.userId = userId
    if (formConfigId) query.formConfigId = formConfigId
    if (status) query.status = status

    // @ts-expect-error - Mongoose type inference issue
    const instances = await FormInstance.find(query).sort({ updatedAt: -1 }).lean()

    res.json({
      success: true,
      data: instances,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching form instances:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form instances',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'List form instances',
  tags: ['Forms'],
  responseSchema: ApiResponseSchema(FormInstanceSchema.array()),
})

// GET /api/forms/instances/:id - Get form instance by ID
docRouter.get('/instances/:id', async (req, res) => {
  try {
    const FormInstance = await getFormInstanceModel()

    // @ts-expect-error - Mongoose type inference issue
    const instance = await FormInstance.findById(req.params.id).lean()

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Form instance not found',
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: instance,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching form instance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form instance',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Get form instance by ID',
  tags: ['Forms'],
  responseSchema: ApiResponseSchema(FormInstanceSchema),
})

// POST /api/forms/instances - Create new form instance
docRouter.post('/instances', async (req, res) => {
  try {
    const validation = CreateFormInstanceRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const FormInstance = await getFormInstanceModel()

    const newInstance = new FormInstance({
      ...validation.data,
      fields: {},
      status: 'draft',
      history: [
        {
          timestamp: new Date(),
          action: 'created',
          userId: validation.data.userId,
        },
      ],
    })
    await newInstance.save()

    res.status(201).json({
      success: true,
      data: newInstance,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating form instance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create form instance',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Create new form instance',
  tags: ['Forms'],
  bodySchema: CreateFormInstanceRequestSchema,
  responseSchema: ApiResponseSchema(FormInstanceSchema),
})

// PUT /api/forms/instances/:id - Update form instance
docRouter.put('/instances/:id', async (req, res) => {
  try {
    const validation = UpdateFormInstanceRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const FormInstance = await getFormInstanceModel()

    // @ts-expect-error - Mongoose type inference issue
    const instance = await FormInstance.findByIdAndUpdate(
      req.params.id,
      validation.data,
      { new: true }
    )

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Form instance not found',
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: instance,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating form instance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update form instance',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Update form instance',
  tags: ['Forms'],
  bodySchema: UpdateFormInstanceRequestSchema,
  responseSchema: ApiResponseSchema(FormInstanceSchema),
})

// POST /api/forms/instances/:id/submit - Submit form instance
docRouter.post('/instances/:id/submit', async (req, res) => {
  try {
    const validation = SubmitFormInstanceRequestSchema.safeParse({
      instanceId: req.params.id,
      ...req.body,
    })
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const FormInstance = await getFormInstanceModel()

    // @ts-expect-error - Mongoose type inference issue
    const instance = await FormInstance.findById(req.params.id)

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Form instance not found',
        timestamp: new Date().toISOString(),
      })
    }

    // Update instance with submission data
    instance.status = 'submitted'
    instance.submittedAt = new Date()
    instance.submittedData = validation.data.finalData || instance.fields

    if (!instance.history) {
      instance.history = []
    }
    instance.history.push({
      timestamp: new Date(),
      action: 'submitted',
      userId: instance.userId,
    })

    await instance.save()

    // TODO: Send to submission endpoint if configured
    // const FormConfig = await getFormConfigModel()
    // const config = await FormConfig.findOne({ id: instance.formConfigId })
    // if (config?.submitEndpoint) {
    //   await fetch(config.submitEndpoint, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(instance.submittedData)
    //   })
    // }

    res.json({
      success: true,
      data: instance,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error submitting form instance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit form instance',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Submit form instance',
  tags: ['Forms'],
  bodySchema: SubmitFormInstanceRequestSchema,
  responseSchema: ApiResponseSchema(FormInstanceSchema),
})

// DELETE /api/forms/instances/:id - Delete form instance
docRouter.delete('/instances/:id', async (req, res) => {
  try {
    const FormInstance = await getFormInstanceModel()

    // @ts-expect-error - Mongoose type inference issue
    const instance = await FormInstance.findByIdAndDelete(req.params.id)

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Form instance not found',
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error deleting form instance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete form instance',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Delete form instance',
  tags: ['Forms'],
  responseSchema: ApiResponseSchema(FormInstanceSchema),
})

// ==================== AI EXTRACTION ====================

// POST /api/forms/extract - Extract form data from conversation
docRouter.post('/extract', async (req, res) => {
  try {
    const validation = ExtractFormDataRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    // Use AI extraction service
    const { extractFormData } = await import('../services/formExtractor.service.js')
    const result = await extractFormData(
      validation.data.formConfigId,
      validation.data.conversationHistory
    )

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error extracting form data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to extract form data',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Extract form data from conversation using AI',
  tags: ['Forms', 'AI'],
  bodySchema: ExtractFormDataRequestSchema,
  responseSchema: ApiResponseSchema(ExtractFormDataResponseSchema),
})

export default router
