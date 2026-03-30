'use client'
import { logger } from '@ezstart/logger'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Icon } from '../components'

type ToastOptions = {
  message?: string | ReactNode
  duration?: number
  content?: ReactNode
}

type RunWithFeedbackParams<T> = {
  action: () => Promise<T>
  toastLoading?: ToastOptions | false
  toastSuccess?: ToastOptions | false
  toastError?: ToastOptions | false
  onSuccess?: () => void
  onError?: (e: unknown) => void
  onLoadingChange?: (isLoading: boolean) => void
  throwOnError?: boolean
}

export async function runWithFeedback<T>({
  action,
  toastLoading,
  toastSuccess,
  toastError,
  onSuccess,
  onError,
  onLoadingChange,
  throwOnError = false,
}: RunWithFeedbackParams<T>): Promise<T | undefined> {
  onLoadingChange?.(true)

  const isMinimal = (t: ToastOptions | false | undefined) => t !== false && t?.message === undefined

  const minimal = isMinimal(toastLoading)

  const toastId =
    toastLoading === false
      ? undefined
      : isMinimal(toastLoading)
        ? toast.custom(
            () => (
              <Icon
                name="fa:FaSpinner"
                className="w-auto p-2 !max-w-fit bg-background rounded-lg text-black"
                size={20}
              />
            ),
            {
              duration: toastLoading?.duration ?? 999_999,
              unstyled: true,
            }
          )
        : toast.loading(String(toastLoading?.message ?? ' '), {
            duration: toastLoading?.duration ?? 999_999,
          })

  try {
    const result = await action()

    if (toastId) toast.dismiss(toastId)

    if (toastSuccess !== false) {
      if (isMinimal(toastSuccess)) {
        // Minimal mode: show icon with success color
        toast.custom(
          () => (
            <Icon
              name="lucide:CircleCheck"
              className="w-auto p-2 !max-w-fit bg-success/10 text-success rounded-lg"
              size={20}
            />
          ),
          {
            duration: toastSuccess?.duration ?? 2000,
            unstyled: true,
          }
        )
      } else {
        // Standard mode: show message
        const successMessage = toastSuccess?.message || 'Success!'
        toast.success(String(successMessage), {
          duration: toastSuccess?.duration,
        })
      }
    }

    onSuccess?.()
    return result
  } catch (e) {
    if (toastId) toast.dismiss(toastId)

    if (toastError !== false) {
      // Extract error message from exception
      const errorMessage =
        toastError?.message ||
        (e instanceof Error ? e.message : undefined) ||
        (typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : undefined) ||
        'An error occurred'

      if (isMinimal(toastError)) {
        // Minimal mode: show icon with error color
        toast.custom(
          () => (
            <Icon
              name="lucide:CircleX"
              className="w-auto p-2 !max-w-fit bg-destructive/10 text-destructive rounded-lg"
              size={20}
            />
          ),
          {
            duration: toastError?.duration ?? 3000,
            unstyled: true,
          }
        )
      } else {
        // Standard mode: show message
        toast.error(String(errorMessage), {
          duration: toastError?.duration,
        })
      }
    }

    onError?.(e)
    if (!onError)
      logger.error(
        'Unhandled error in runWithFeedback:',
        e instanceof Error ? e.message : String(e)
      )

    if (throwOnError) throw e
    return undefined
  } finally {
    onLoadingChange?.(false)
  }
}
