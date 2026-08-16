/**
 * Payment Provider Registry
 * Register providers at startup, retrieve by name or use the default.
 */
import type { IPaymentProvider } from './types.js'

export class PaymentProviderRegistry {
  private providers = new Map<string, IPaymentProvider>()
  private defaultProvider: string | null = null

  /** Register a provider instance */
  register(provider: IPaymentProvider): void {
    this.providers.set(provider.name, provider)

    // First registered provider becomes default
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name
    }
  }

  /** Get provider by name */
  get(name: string): IPaymentProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Payment provider "${name}" not registered`)
    }
    return provider
  }

  /** Get the default provider */
  getDefault(): IPaymentProvider {
    if (!this.defaultProvider) {
      throw new Error('No payment providers registered')
    }
    return this.get(this.defaultProvider)
  }

  /** Set which provider is the default */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Cannot set default: provider "${name}" not registered`)
    }
    this.defaultProvider = name
  }

  /** Check if a provider is registered */
  has(name: string): boolean {
    return this.providers.has(name)
  }

  /** List all registered provider names */
  list(): string[] {
    return [...this.providers.keys()]
  }
}
