'use client'
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
      toast.success(String(toastSuccess?.message ?? ''), {
        duration: toastSuccess?.duration,
        unstyled: isMinimal(toastSuccess),
        className: isMinimal(toastSuccess)
          ? 'w-auto p-2 !max-w-fit bg-background rounded-lg'
          : undefined,
      })
    }

    onSuccess?.()
    return result
  } catch (e) {
    if (toastId) toast.dismiss(toastId)

    if (toastError !== false) {
      toast.error(String(toastError?.message ?? ''), {
        duration: toastError?.duration,
        unstyled: isMinimal(toastError),
        className: isMinimal(toastError)
          ? 'w-auto p-2 !max-w-fit bg-background rounded-lg'
          : undefined,
      })
    }

    onError?.(e)
    if (!onError) console.error('Unhandled error in runWithFeedback:', e)

    if (throwOnError) throw e
    return undefined
  } finally {
    onLoadingChange?.(false)
  }
}
