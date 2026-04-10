"use client"

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import * as React from "react"

import { cn } from "../../lib/utils"
import { buttonVariants } from "../button"
import { padding, gap } from "../../lib/design-system/tokens"
import { alertDialogVariantConfig } from "../../lib/design-system/variants"
import { DesignTokenProvider } from "../../lib/design-system/DesignTokenContext"

/**
 * AlertDialog Component - Enhanced with Variants
 *
 * Accessible alert dialogs with semantic variants for different alert types.
 * Built on Radix UI primitives for WCAG 2.1 AA compliance.
 *
 * @example
 * // Destructive alert (delete, remove)
 * <AlertDialog variant="destructive" open={open} onOpenChange={setOpen}>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Delete Account?</AlertDialogTitle>
 *       <AlertDialogDescription>
 *         This action cannot be undone.
 *       </AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>Cancel</AlertDialogCancel>
 *       <AlertDialogAction>Delete</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 *
 * @example
 * // Warning alert
 * <AlertDialog variant="warning">
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
 *       <AlertDialogDescription>
 *         You have unsaved changes. Continue?
 *       </AlertDialogDescription>
 *     </AlertDialogHeader>
 *   </AlertDialogContent>
 * </AlertDialog>
 */

export type AlertDialogVariant = 'default' | 'destructive' | 'warning' | 'info'

const AlertDialogContext = React.createContext<{ variant?: AlertDialogVariant }>({
  variant: 'default',
})

interface AlertDialogRootProps extends React.ComponentProps<typeof AlertDialogPrimitive.Root> {
  variant?: AlertDialogVariant
}

function AlertDialog({ variant = 'default', ...props }: AlertDialogRootProps) {
  return (
    <AlertDialogContext.Provider value={{ variant }}>
      <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
    </AlertDialogContext.Provider>
  )
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

interface AlertDialogContentProps extends React.ComponentProps<typeof AlertDialogPrimitive.Content> {
  /** Design token: density propagated to children */
  density?: string
}

function AlertDialogContent({
  className,
  density,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <DesignTokenProvider density={density}>
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg duration-200 sm:max-w-lg",
            padding.lg, // px-4 py-4 sm:px-6 py-3
            gap.relaxed, // gap-4 sm:gap-3
            className
          )}
          {...props}
        />
      </DesignTokenProvider>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col text-center sm:text-left", gap.default, className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end",
        gap.default,
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  const { variant } = React.useContext(AlertDialogContext)

  // Apply variant-specific styles to action button via design system config
  const buttonVariant = alertDialogVariantConfig.actionButtonVariant[variant || 'default']

  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ variant: buttonVariant }), className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  )
}

export {
  AlertDialog, AlertDialogAction,
  AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger
}

