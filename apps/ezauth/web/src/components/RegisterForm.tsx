'use client'

import type { RegisterRequest } from '@ezstart/auth-sdk'
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@ezstart/ui/components'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface RegisterFormProps {
  app: string
  redirect_uri?: string | null
}

interface FormData {
  email: string
  username: string
  password: string
  firstName: string
  lastName: string
}

export function RegisterForm({ app, redirect_uri }: RegisterFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  })

  const onSubmit = async (formData: FormData) => {
    setLoading(true)
    setError('')

    try {
      const registerData: RegisterRequest = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        app,
        redirect_uri: redirect_uri || undefined,
      }

      const apiUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://ezauth-oblm.onrender.com/api/auth/register'
          : 'http://localhost:8081/api/auth/register'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      // Redirect with authorization code
      if (redirect_uri) {
        console.log('🔀 Redirecting to:', redirect_uri)
        const url = new URL(redirect_uri)
        url.searchParams.set('code', result.code)
        window.location.href = url.toString()
      } else {
        console.error('❌ No redirect_uri provided! Cannot redirect after registration.')
        throw new Error('No redirect URL configured. Please provide redirect_uri parameter.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" required placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username *</FormLabel>
              <FormControl>
                <Input type="text" required placeholder="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <Input type="password" required minLength={6} placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
              <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters</p>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full" variant={'ezstart'}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  )
}
