import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { DEPLOYMENT_CONFIGS } from '@ezstart/monitoring'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const deploymentRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(deploymentRegistry, router)
export const deploymentRoutes = router as ReturnType<typeof Router>

/**
 * GET /api/deployments
 * Get all deployment configurations and status
 */
router.get('/', async (_, res) => {
  try {
    const deployments = await Promise.all(
      Object.entries(DEPLOYMENT_CONFIGS).map(async ([id, config]) => {
        let lastCommit: {
          hash: string
          message: string
          author: string
          date: Date
        } | null = null

        try {
          const { stdout } = await execAsync(
            `git log -1 --format="%H|%s|%an|%ai" -- ${config.repositoryPath}`
          )
          if (stdout.trim()) {
            const parts = stdout.trim().split('|')
            const hash = parts[0] || ''
            const message = parts[1] || ''
            const author = parts[2] || ''
            const date = parts[3] || new Date().toISOString()

            lastCommit = {
              hash: hash.slice(0, 7),
              message,
              author,
              date: new Date(date),
            }
          }
        } catch (gitError) {
          console.warn(`Failed to get git info for ${id}:`, gitError)
        }

        return {
          id,
          ...config,
          lastCommit,
          status: 'active' as const,
          healthStatus: 'unknown' as const,
        }
      })
    )

    res.json({
      deployments,
      summary: {
        total: deployments.length,
        railway: deployments.filter(d => d.platform === 'railway').length,
        vercel: deployments.filter(d => d.platform === 'vercel').length,
        active: deployments.filter(d => d.status === 'active').length,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get deployments',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/deployments/:id
 * Get specific deployment details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const config = DEPLOYMENT_CONFIGS[id]

    if (!config) {
      return res.status(404).json({ error: 'Deployment not found' })
    }

    let commits: Array<{
      hash: string
      message: string
      author: string
      date: Date
    }> = []

    try {
      const { stdout } = await execAsync(
        `git log -10 --format="%H|%s|%an|%ai" -- ${config.repositoryPath}`
      )
      commits = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const parts = line.split('|')
          return {
            hash: (parts[0] || '').slice(0, 7),
            message: parts[1] || '',
            author: parts[2] || '',
            date: new Date(parts[3] || new Date().toISOString()),
          }
        })
    } catch (gitError) {
      console.warn(`Failed to get git history for ${id}:`, gitError)
    }

    res.json({
      id,
      ...config,
      commits,
      status: 'active',
      healthStatus: 'unknown',
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get deployment',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
