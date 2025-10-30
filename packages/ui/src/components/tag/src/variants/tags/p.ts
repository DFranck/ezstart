import { cva } from 'class-variance-authority'
import { intentText, sizeText, variantText } from '../../tokens/tokens'
import { createAlias } from '../../utils/create-alias'

export const pWeight = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const

export const pVariantConfig = {
  variant: variantText,
  size: sizeText,
  intent: intentText,
  weight: pWeight,
}

export const pVariants = cva('', {
  variants: pVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'default',
    intent: 'default',
  },
})

export const P = createAlias('p')

export const pVariantsMeta = Object.fromEntries(
  Object.entries(pVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[]
  size: string[]
}
