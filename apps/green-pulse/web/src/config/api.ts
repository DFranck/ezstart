import { createCallApi } from '@ezstart/fetch-client'

export { runWithFeedback } from '@ezstart/ui/utils'
export { parseApiError } from '@ezstart/fetch-client'
export type { ApiResponse, ApiError, HttpMethod } from '@ezstart/fetch-client'

export const callApi = createCallApi('green-pulse')
