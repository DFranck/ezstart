/**
 * Tests for purchase components: PurchaseButton, PurchaseCard, ProductCard, ProductGrid
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'
import { setupFetchMock, makePayment } from '../helpers.js'
import { PayProvider } from '../../react/pay-provider.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { PurchaseButton } = await import('../../components/PurchaseButton.js')
const { PurchaseCard } = await import('../../components/PurchaseCard.js')
const { ProductCard } = await import('../../components/ProductCard.js')
const { ProductGrid } = await import('../../components/ProductGrid.js')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999/api' }}>
      {children}
    </PayProvider>
  )
}

// ---------------------------------------------------------------------------
// PurchaseButton
// ---------------------------------------------------------------------------

describe('PurchaseButton', () => {
  beforeEach(() => {
    setupFetchMock([
      {
        url: '/purchase',
        method: 'POST',
        response: {
          success: true,
          data: {
            payment: makePayment({ type: 'purchase' }),
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        },
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders default trigger with product name and price', () => {
    render(
      <Wrapper>
        <PurchaseButton
          projectId="proj1"
          productId="prod1"
          productName="Premium License"
          amount={49.99}
          currency="USD"
        />
      </Wrapper>
    )
    expect(screen.getByText(/Premium License/)).toBeInTheDocument()
  })

  it('opens modal on click', async () => {
    render(
      <Wrapper>
        <PurchaseButton
          projectId="proj1"
          productId="prod1"
          productName="Widget"
          amount={10}
        />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Widget/))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('renders custom trigger', () => {
    render(
      <Wrapper>
        <PurchaseButton
          projectId="proj1"
          productId="prod1"
          productName="Widget"
          amount={10}
          trigger={<span data-testid="custom-trigger">Buy it</span>}
        />
      </Wrapper>
    )

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument()
  })

  it('displays custom texts in modal', async () => {
    render(
      <Wrapper>
        <PurchaseButton
          projectId="proj1"
          productId="prod1"
          productName="Widget"
          amount={10}
          texts={{ title: 'Get Widget', buyButton: 'Purchase' }}
        />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Widget/))

    await waitFor(() => {
      expect(screen.getByText('Get Widget')).toBeInTheDocument()
    })
  })

  it('shows user name when provided', async () => {
    render(
      <Wrapper>
        <PurchaseButton
          projectId="proj1"
          productId="prod1"
          productName="Widget"
          amount={10}
          userName="John"
        />
      </Wrapper>
    )

    fireEvent.click(screen.getByText(/Widget/))

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// PurchaseCard
// ---------------------------------------------------------------------------

describe('PurchaseCard', () => {
  beforeEach(() => {
    setupFetchMock([
      {
        url: '/purchase',
        method: 'POST',
        response: {
          success: true,
          data: {
            payment: makePayment({ type: 'purchase' }),
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        },
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders default variant with product info', () => {
    render(
      <Wrapper>
        <PurchaseCard
          appName="test-app"
          productId="prod1"
          productName="Pro License"
          amount={99}
          currency="EUR"
          description="Unlock all features"
        />
      </Wrapper>
    )
    expect(screen.getByText('Pro License')).toBeInTheDocument()
    expect(screen.getByText('Unlock all features')).toBeInTheDocument()
  })

  it('renders compact variant', () => {
    render(
      <Wrapper>
        <PurchaseCard
          appName="test-app"
          productId="prod1"
          productName="Widget"
          amount={10}
          variant="compact"
        />
      </Wrapper>
    )
    expect(screen.getByText('Widget')).toBeInTheDocument()
  })

  it('renders featured variant with badge', () => {
    render(
      <Wrapper>
        <PurchaseCard
          appName="test-app"
          productId="prod1"
          productName="Widget"
          amount={10}
          variant="featured"
        />
      </Wrapper>
    )
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('renders product image when provided', () => {
    render(
      <Wrapper>
        <PurchaseCard
          appName="test-app"
          productId="prod1"
          productName="Widget"
          amount={10}
          image="/product.jpg"
        />
      </Wrapper>
    )
    const img = screen.getByRole('img', { name: 'Widget' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/product.jpg')
  })
})

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------

describe('ProductCard', () => {
  beforeEach(() => {
    setupFetchMock([
      {
        url: '/purchase',
        method: 'POST',
        response: {
          success: true,
          data: {
            payment: makePayment({ type: 'purchase' }),
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        },
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders purchase type product', () => {
    render(
      <Wrapper>
        <ProductCard
          name="E-Book"
          price={19.99}
          priceId="price_1"
          projectId="proj1"
          type="purchase"
        />
      </Wrapper>
    )
    expect(screen.getByText('E-Book')).toBeInTheDocument()
    expect(screen.getByText(/Buy now/)).toBeInTheDocument()
  })

  it('renders subscription type product with interval', () => {
    render(
      <Wrapper>
        <ProductCard
          name="SaaS Pro"
          price={29}
          priceId="price_2"
          projectId="proj1"
          type="subscription"
          intervalCount={1}
        />
      </Wrapper>
    )
    expect(screen.getByText('SaaS Pro')).toBeInTheDocument()
    expect(screen.getByText(/Subscribe/)).toBeInTheDocument()
    // Check interval display
    expect(screen.getByText(/mo/)).toBeInTheDocument()
  })

  it('renders with badge', () => {
    render(
      <Wrapper>
        <ProductCard
          name="Widget"
          price={10}
          priceId="price_3"
          projectId="proj1"
          type="purchase"
          badge="New!"
        />
      </Wrapper>
    )
    expect(screen.getByText('New!')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(
      <Wrapper>
        <ProductCard
          name="Widget"
          price={10}
          description="A great widget"
          priceId="price_3"
          projectId="proj1"
          type="purchase"
        />
      </Wrapper>
    )
    expect(screen.getByText('A great widget')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ProductGrid
// ---------------------------------------------------------------------------

describe('ProductGrid', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows skeleton when products is undefined (loading)', () => {
    render(
      <Wrapper>
        <ProductGrid products={undefined} />
      </Wrapper>
    )
    // Should render skeleton cards
    const skeletons = screen.getAllByTestId('SkeletonCard')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when products is empty', () => {
    render(
      <Wrapper>
        <ProductGrid products={[]} />
      </Wrapper>
    )
    expect(screen.getByText('No products available.')).toBeInTheDocument()
  })

  it('renders grid of products', () => {
    setupFetchMock([]) // No fetch needed for static product list

    const products = [
      {
        name: 'Widget A',
        price: 10,
        priceId: 'p1',
        projectId: 'proj1',
        type: 'purchase' as const,
      },
      {
        name: 'Widget B',
        price: 20,
        priceId: 'p2',
        projectId: 'proj1',
        type: 'purchase' as const,
      },
    ]

    render(
      <Wrapper>
        <ProductGrid products={products} />
      </Wrapper>
    )

    expect(screen.getByText('Widget A')).toBeInTheDocument()
    expect(screen.getByText('Widget B')).toBeInTheDocument()
  })

  it('uses custom empty message', () => {
    render(
      <Wrapper>
        <ProductGrid products={[]} emptyMessage="Nothing here" />
      </Wrapper>
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})
