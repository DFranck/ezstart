const STORAGE_KEY = 'fengshui-plans'
const ANALYSES_STORAGE_KEY = 'fengshui-analyses'
const STEPPER_STORAGE_KEY = 'fengshui-stepper-state'
const MAX_LOCAL_PLANS = 5
const MAX_LOCAL_ANALYSES = 10

export interface LocalPlan {
  id: string
  name: string
  imageData: string // base64 data URL (auto-cropped)
  width: number
  height: number
  aiValidation: {
    isValid: boolean
    score: number
    roomsDetected: number
    feedback: string
  } | null
  createdAt: string // ISO date
}

export function getLocalPlans(): LocalPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const plans = JSON.parse(raw) as LocalPlan[]
    // Sort newest first
    return plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function saveLocalPlan(plan: Omit<LocalPlan, 'id' | 'createdAt'>): LocalPlan {
  const plans = getLocalPlans()

  // Enforce max limit — remove oldest if full
  while (plans.length >= MAX_LOCAL_PLANS) {
    plans.pop()
  }

  const newPlan: LocalPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  plans.unshift(newPlan)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  } catch {
    // localStorage quota exceeded — throw so caller can handle
    throw new Error('QUOTA_EXCEEDED')
  }

  return newPlan
}

export function deleteLocalPlan(id: string): void {
  const plans = getLocalPlans().filter(p => p.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  } catch {
    // Silent fail on delete — data was already filtered
  }
}

export function clearLocalPlans(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silent fail
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Analyses (for non-authenticated users)
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalAnalysis {
  id: string
  planId: string | null
  name: string
  bearing: number
  results: Record<string, unknown>
  createdAt: string // ISO date
}

export function getLocalAnalyses(): LocalAnalysis[] {
  try {
    const raw = localStorage.getItem(ANALYSES_STORAGE_KEY)
    if (!raw) return []
    const analyses = JSON.parse(raw) as LocalAnalysis[]
    return analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function saveLocalAnalysis(analysis: Omit<LocalAnalysis, 'id' | 'createdAt'>): LocalAnalysis {
  const analyses = getLocalAnalyses()

  while (analyses.length >= MAX_LOCAL_ANALYSES) {
    analyses.pop()
  }

  const newAnalysis: LocalAnalysis = {
    ...analysis,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  analyses.unshift(newAnalysis)

  try {
    localStorage.setItem(ANALYSES_STORAGE_KEY, JSON.stringify(analyses))
  } catch {
    throw new Error('QUOTA_EXCEEDED')
  }

  return newAnalysis
}

export function deleteLocalAnalysis(id: string): void {
  const analyses = getLocalAnalyses().filter(a => a.id !== id)
  try {
    localStorage.setItem(ANALYSES_STORAGE_KEY, JSON.stringify(analyses))
  } catch {
    // Silent fail
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stepper State Persistence
// ─────────────────────────────────────────────────────────────────────────────

export interface StepperState {
  currentStep: number
  stepData: Record<string, Record<string, unknown>>
  savedAt: string // ISO date
}

/** Max total size in bytes before we skip persisting (4MB safety margin) */
const MAX_STEPPER_STATE_SIZE = 4 * 1024 * 1024

/**
 * Strips non-serializable properties (File objects, functions) from step data
 * before persisting to localStorage.
 */
function sanitizeStepDataForStorage(
  stepData: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const sanitized: Record<string, Record<string, unknown>> = {}
  for (const [stepId, data] of Object.entries(stepData)) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      // Skip File objects (non-serializable), function refs, editing state with callbacks
      if (value instanceof File) continue
      if (typeof value === 'function') continue
      if (key === '_editingState') continue
      cleaned[key] = value
    }
    sanitized[stepId] = cleaned
  }
  return sanitized
}

export function saveStepperState(state: Omit<StepperState, 'savedAt'>): void {
  try {
    const sanitizedData = sanitizeStepDataForStorage(state.stepData)
    const payload: StepperState = {
      currentStep: state.currentStep,
      stepData: sanitizedData,
      savedAt: new Date().toISOString(),
    }
    const json = JSON.stringify(payload)
    // Skip if too large (base64 images can be big)
    if (json.length > MAX_STEPPER_STATE_SIZE) return
    localStorage.setItem(STEPPER_STORAGE_KEY, json)
  } catch {
    // Quota exceeded — silently skip
  }
}

export function getStepperState(): StepperState | null {
  try {
    const raw = localStorage.getItem(STEPPER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StepperState
  } catch {
    return null
  }
}

export function clearStepperState(): void {
  try {
    localStorage.removeItem(STEPPER_STORAGE_KEY)
  } catch {
    // Silent fail
  }
}
