'use client'

import { useLocale, useMessages, useTranslations } from 'next-intl'

// SSR-safe version of useLocale
export function useSafeLocale(fallback: string = 'en'): string {
  try {
    return useLocale()
  } catch (error) {
    console.warn('useLocale failed, using fallback:', error)
    return fallback
  }
}

// SSR-safe version of useMessages  
export function useSafeMessages(fallback: Record<string, any> = {}): Record<string, any> {
  try {
    return useMessages() as Record<string, any>
  } catch (error) {
    console.warn('useMessages failed, using fallback:', error)
    return fallback
  }
}

// SSR-safe version of useTranslations
export function useSafeTranslations(namespace: string = '', fallback: Record<string, any> = {}) {
  try {
    return useTranslations(namespace)
  } catch (error) {
    console.warn(`useTranslations(${namespace}) failed, using fallback:`, error)
    
    // Return a mock translation function
    const mockTranslation = (key: string, values?: any) => {
      const fallbackKey = namespace ? `${namespace}.${key}` : key
      console.warn(`Translation missing: ${fallbackKey}`)
      return fallbackKey // Return the key itself as fallback
    }
    
    mockTranslation.raw = (key: string) => {
      const fallbackKey = namespace ? `${namespace}.${key}` : key
      console.warn(`Translation raw missing: ${fallbackKey}`)
      return fallback[key] || []
    }
    
    mockTranslation.rich = (key: string, values?: any) => {
      const fallbackKey = namespace ? `${namespace}.${key}` : key
      console.warn(`Translation rich missing: ${fallbackKey}`)
      return fallbackKey
    }
    
    return mockTranslation
  }
}