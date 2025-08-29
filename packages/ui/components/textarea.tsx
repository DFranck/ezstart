import { ComponentProps, forwardRef } from 'react'

export interface TextAreaProps extends ComponentProps<'textarea'> {
  label?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical ${className || ''}`}
          {...props}
        />
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'