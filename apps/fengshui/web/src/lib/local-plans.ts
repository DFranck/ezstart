const STORAGE_KEY = 'fengshui-plans'
const MAX_LOCAL_PLANS = 5

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
