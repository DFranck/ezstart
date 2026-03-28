import { createCallApi } from '@ezstart/fetch-client'

export { parseApiError } from '@ezstart/fetch-client'
export type { ApiResponse, ApiError, HttpMethod } from '@ezstart/fetch-client'

export const callApi = createCallApi('fengshui')
