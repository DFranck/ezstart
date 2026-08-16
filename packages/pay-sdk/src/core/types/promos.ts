// Promo Types
export type PromoDiscountType = 'percent' | 'fixed'

export type PromoDuration = 'once' | 'repeating' | 'forever'

export interface Promo {
  id: string
  code: string
  /**
   * @deprecated Read `applicationId` instead. Retained while the backend
   * dual-writes during the 90-day migration window.
   */
  appName: string
  /** Ezauth Application id this promo belongs to. */
  applicationId?: string
  discountType: PromoDiscountType
  discountValue: number
  currency?: string
  duration: PromoDuration
  durationInMonths?: number
  maxUses?: number
  usedCount: number
  active: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePromoRequest {
  code: string
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id this promo belongs to. Takes precedence over `appName`. */
  applicationId?: string
  discountType: PromoDiscountType
  discountValue: number
  currency?: string
  duration: PromoDuration
  durationInMonths?: number
  maxUses?: number
  active?: boolean
  expiresAt?: string
}

export interface UpdatePromoRequest {
  discountType?: PromoDiscountType
  discountValue?: number
  currency?: string
  duration?: PromoDuration
  durationInMonths?: number
  maxUses?: number | null
  active?: boolean
  expiresAt?: string | null
}

export interface PromoValidationResponse {
  success: boolean
  data: {
    valid: boolean
    reason?: string
    discountType?: PromoDiscountType
    discountValue?: number
    currency?: string
    duration?: PromoDuration
  }
}

export interface PromoResponse {
  success: boolean
  data: {
    promo: Promo
  }
}

export interface PromosListResponse {
  success: boolean
  data: Promo[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}
