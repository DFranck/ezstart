'use client'

import { BillingClient, billingClientSchema, Client } from '@ez-billing/types'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@ezstart/ui/components'
import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

type ClientModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSuccess: () => void
}

export const ClientModal = ({ open, onOpenChange, client, onSuccess }: ClientModalProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!client

  const form = useForm<BillingClient>({
    resolver: zodResolver(billingClientSchema),
    defaultValues: client
      ? {
          clientName: client.clientName,
          email: client.email || '',
          phone: client.phone || '',
          isCompany: client.isCompany,
          address: client.address || '',
          city: client.city || '',
          postalCode: client.postalCode || '',
          country: client.country || '',
          companyRegistrationNumber: client.companyRegistrationNumber || '',
          taxNumber: client.taxNumber || '',
          website: client.website || '',
          notes: client.notes || '',
        }
      : {
          clientName: '',
          email: '',
          phone: '',
          isCompany: false,
          address: '',
          city: '',
          postalCode: '',
          country: '',
          companyRegistrationNumber: '',
          taxNumber: '',
          website: '',
          notes: '',
        },
  })

  const isCompany = form.watch('isCompany')

  const onSubmit = useCallback(
    async (data: BillingClient) => {
      const endpoint = isEditing ? `/api/clients/${client!._id}` : '/api/clients'
      const method = isEditing ? 'PUT' : 'POST'

      await runWithFeedback({
        action: () => callApi(endpoint, { method, body: data }),
        toastLoading: { message: isEditing ? 'Updating client...' : 'Creating client...' },
        toastSuccess: {
          message: isEditing ? 'Client updated successfully!' : 'Client created successfully!',
        },
        toastError: { message: isEditing ? 'Failed to update client' : 'Failed to create client' },
        onLoadingChange: setIsLoading,
        onSuccess: () => {
          onSuccess()
          onOpenChange(false)
          form.reset()
        },
      })
    },
    [isEditing, client, onSuccess, onOpenChange, form]
  )

  const handleClose = useCallback(() => {
    onOpenChange(false)
    form.reset()
  }, [onOpenChange, form])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'Create New Client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update client information below.'
              : 'Fill in the details to create a new client.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Type */}
            <FormField
              control={form.control}
              name="isCompany"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel>This is a company (not an individual)</FormLabel>
                </FormItem>
              )}
            />

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isCompany ? 'Company Name' : 'Full Name'}{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isCompany ? 'Enter company name' : 'Enter full name'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 1 23 45 67 89" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="75001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Company-specific fields */}
            {isCompany && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyRegistrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="SIRET, Company Number, etc." {...field} />
                        </FormControl>
                        <FormDescription>Company registration number (SIRET, etc.)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT/Tax Number</FormLabel>
                        <FormControl>
                          <Input placeholder="FR12345678901" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Any additional information about this client..."
                      className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Internal notes about this client (not visible to client)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Client' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
