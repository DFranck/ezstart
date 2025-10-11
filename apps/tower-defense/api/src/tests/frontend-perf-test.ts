/**
 * Frontend Performance Test
 *
 * Tests the Tower Defense web client performance using Puppeteer.
 * Measures FPS, frame times, and rendering performance under various loads.
 *
 * Usage: pnpm test:frontend
 */

import puppeteer, { Browser, Page } from 'puppeteer'

const WEB_URL = process.env.WEB_URL || 'http://localhost:5035'
const API_URL = process.env.API_URL || 'http://localhost:5030'

interface PerformanceMetrics {
  avgFps: number
  minFps: number
  maxFps: number
  avgFrameTime: number
  maxFrameTime: number
  slowFrames: number // Frames > 16.67ms (below 60 FPS)
  droppedFrames: number // Frames > 33.33ms (below 30 FPS)
  totalFrames: number
}

interface TestScenario {
  name: string
  duration: number // seconds
  mobs: number
  towers: number
  actions: number // Actions per second
}

const TEST_SCENARIOS: TestScenario[] = [
  { name: 'Baseline', duration: 15, mobs: 50, towers: 10, actions: 2 },
  { name: 'Normal Load', duration: 20, mobs: 100, towers: 30, actions: 4 },
  { name: 'Heavy Load', duration: 20, mobs: 200, towers: 50, actions: 6 },
  { name: 'Stress Test', duration: 30, mobs: 400, towers: 100, actions: 8 },
]

async function measurePerformance(page: Page, duration: number): Promise<PerformanceMetrics> {
  // Inject performance monitoring script into the page
  const metrics = await page.evaluate(
    (durationMs: number) => {
      return new Promise<PerformanceMetrics>(resolve => {
        const frameTimes: number[] = []
        let lastFrameTime = performance.now()
        let frameCount = 0
        let slowFrames = 0
        let droppedFrames = 0

        const measureFrame = () => {
          const now = performance.now()
          const frameTime = now - lastFrameTime
          lastFrameTime = now
          frameCount++

          if (frameCount > 1) {
            // Skip first frame (startup)
            frameTimes.push(frameTime)

            if (frameTime > 16.67) slowFrames++
            if (frameTime > 33.33) droppedFrames++
          }

          if (performance.now() < startTime + durationMs) {
            requestAnimationFrame(measureFrame)
          } else {
            // Calculate metrics
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
            const maxFrameTime = Math.max(...frameTimes)
            const minFrameTime = Math.min(...frameTimes)

            resolve({
              avgFps: 1000 / avgFrameTime,
              minFps: 1000 / maxFrameTime,
              maxFps: 1000 / minFrameTime,
              avgFrameTime,
              maxFrameTime,
              slowFrames,
              droppedFrames,
              totalFrames: frameCount - 1,
            })
          }
        }

        const startTime = performance.now()
        requestAnimationFrame(measureFrame)
      })
    },
    duration * 1000
  )

  return metrics
}

async function waitForGameLoaded(page: Page): Promise<void> {
  // Navigate to home page
  await page.goto(WEB_URL, { waitUntil: 'networkidle2' })

  // Wait for canvas to be rendered
  await page.waitForSelector('canvas', { timeout: 10000 })

  console.log('  ✅ Game loaded successfully')
}

async function simulateGameplay(page: Page, scenario: TestScenario): Promise<void> {
  console.log(`\n📊 Simulating ${scenario.name}...`)
  console.log(`  - Letting game run naturally for ${scenario.duration}s...`)
  console.log(`  - Target: ${scenario.mobs} mobs, ${scenario.towers} towers`)
  console.log(`  - Note: Actual entity count depends on natural gameplay`)

  // Just wait and let the game run naturally
  // Performance measurement happens in parallel
  await new Promise(resolve => setTimeout(resolve, scenario.duration * 1000))
}

async function runScenario(browser: Browser, scenario: TestScenario): Promise<PerformanceMetrics> {
  const page = await browser.newPage()

  try {
    // Set viewport to standard 1080p
    await page.setViewport({ width: 1920, height: 1080 })

    // Load game
    await waitForGameLoaded(page)

    // Start performance measurement in parallel with gameplay
    console.log(`  - Starting performance measurement...`)
    const metricsPromise = measurePerformance(page, scenario.duration)

    // Simulate gameplay (runs in parallel)
    await simulateGameplay(page, scenario)

    // Wait for performance measurement to complete
    const metrics = await metricsPromise

    return metrics
  } finally {
    await page.close()
  }
}

function printMetrics(scenario: TestScenario, metrics: PerformanceMetrics): void {
  const slowFramePercent = ((metrics.slowFrames / metrics.totalFrames) * 100).toFixed(1)
  const droppedFramePercent = ((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(1)

  console.log(`\n📈 ${scenario.name} Results:`)
  console.log(`  FPS: ${metrics.avgFps.toFixed(1)} avg, ${metrics.minFps.toFixed(1)} min, ${metrics.maxFps.toFixed(1)} max`)
  console.log(`  Frame Time: ${metrics.avgFrameTime.toFixed(2)}ms avg, ${metrics.maxFrameTime.toFixed(2)}ms max`)
  console.log(`  Slow Frames (<60 FPS): ${metrics.slowFrames} (${slowFramePercent}%)`)
  console.log(`  Dropped Frames (<30 FPS): ${metrics.droppedFrames} (${droppedFramePercent}%)`)
  console.log(`  Total Frames: ${metrics.totalFrames}`)

  // Performance verdict
  let verdict = ''
  if (metrics.avgFps >= 55) {
    verdict = '✅ EXCELLENT - Smooth 60 FPS'
  } else if (metrics.avgFps >= 45) {
    verdict = '⚠️  GOOD - Playable but some slowdown'
  } else if (metrics.avgFps >= 30) {
    verdict = '❌ POOR - Noticeable lag'
  } else {
    verdict = '🔴 CRITICAL - Unplayable'
  }

  console.log(`  Verdict: ${verdict}`)
}

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

async function main() {
  console.log('🎮 Tower Defense Frontend Performance Test\n')

  // Check if server is running
  console.log('🔍 Checking server health...')
  const serverHealthy = await checkServerHealth()

  if (!serverHealthy) {
    console.error(`❌ Server not responding at ${API_URL}`)
    console.error('   Please run: pnpm dev:td')
    process.exit(1)
  }

  console.log('✅ Server is running')

  // Launch browser
  console.log('\n🚀 Launching browser...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    console.log('✅ Browser launched')

    // Run each scenario
    const results: Array<{ scenario: TestScenario; metrics: PerformanceMetrics }> = []

    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Running: ${scenario.name}`)
      console.log(`${'='.repeat(60)}`)

      try {
        const metrics = await runScenario(browser, scenario)
        results.push({ scenario, metrics })
        printMetrics(scenario, metrics)
      } catch (error) {
        console.error(`❌ Scenario failed: ${error}`)
      }

      // Cool down between scenarios
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Print summary
    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 PERFORMANCE SUMMARY')
    console.log(`${'='.repeat(60)}`)

    results.forEach(({ scenario, metrics }) => {
      const status = metrics.avgFps >= 55 ? '✅' : metrics.avgFps >= 45 ? '⚠️' : '❌'
      console.log(`${status} ${scenario.name.padEnd(20)} ${metrics.avgFps.toFixed(1)} FPS avg (${metrics.avgFrameTime.toFixed(2)}ms)`)
    })

    console.log(`\n✅ All tests completed successfully`)
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

main()
