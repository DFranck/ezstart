'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  H2,
  H3,
  Icon,
  Main,
  P,
  Div,
  Section,
  Span,
} from '@ezstart/ui/components'

/**
 * EZBill Colors Showcase Page
 *
 * Visual reference for all EZBill semantic colors defined in @ezstart/ui/globals.css
 * Access at: http://localhost:5025/dashboard/colors-showcase
 */

export default function ColorsShowcasePage() {
  return (
    <Main>
      <Div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        <Div>
          <H2>🎨 EZBill Color System</H2>
          <P className="text-muted-foreground">
            Complete visual reference of all semantic colors. Test in both light and dark modes.
          </P>
        </Div>

        {/* Entity Colors */}
        <Section>
          <H3 className="mb-6">🏢 Entity Colors</H3>
          <Div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Client */}
            <Card>
              <CardHeader>
                <Div className="flex items-center justify-between">
                  <Span className="font-semibold">Client</Span>
                  <Div className="bg-gradient-client rounded-xl w-12 h-12 flex items-center justify-center">
                    <Icon name="lucide:User" className="text-ezbill-client-foreground" />
                  </Div>
                </Div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Div className="p-3 bg-ezbill-client rounded text-ezbill-client-foreground">
                  Cyan-Blue · Professional
                </Div>
                <Badge className="bg-ezbill-client/10 text-ezbill-client border-ezbill-client/30">
                  Individual Client
                </Badge>
                <Button className="w-full bg-ezbill-client hover:bg-ezbill-client/90 text-ezbill-client-foreground">
                  View Client
                </Button>
              </CardContent>
            </Card>

            {/* Company */}
            <Card>
              <CardHeader>
                <Div className="flex items-center justify-between">
                  <Span className="font-semibold">Company</Span>
                  <Div className="bg-gradient-company rounded-xl w-12 h-12 flex items-center justify-center">
                    <Icon name="lucide:Building" className="text-ezbill-company-foreground" />
                  </Div>
                </Div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Div className="p-3 bg-ezbill-company rounded text-ezbill-company-foreground">
                  Purple · Corporate
                </Div>
                <Badge className="bg-ezbill-company/10 text-ezbill-company border-ezbill-company/30">
                  Business Entity
                </Badge>
                <Button className="w-full bg-ezbill-company hover:bg-ezbill-company/90 text-ezbill-company-foreground">
                  View Company
                </Button>
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardHeader>
                <Div className="flex items-center justify-between">
                  <Span className="font-semibold">Payment</Span>
                  <Div className="bg-gradient-payment rounded-xl w-12 h-12 flex items-center justify-center">
                    <Icon name="lucide:CreditCard" className="text-ezbill-payment-foreground" />
                  </Div>
                </Div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Div className="p-3 bg-ezbill-payment rounded text-ezbill-payment-foreground">
                  Green-Emerald · Financial
                </Div>
                <Badge className="bg-ezbill-payment/10 text-ezbill-payment border-ezbill-payment/30">
                  Payment Method
                </Badge>
                <Button className="w-full bg-ezbill-payment hover:bg-ezbill-payment/90 text-ezbill-payment-foreground">
                  Add Payment
                </Button>
              </CardContent>
            </Card>
          </Div>
        </Section>

        {/* Document Type Colors */}
        <Section>
          <H3 className="mb-6">📄 Document Types</H3>
          <Div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invoice */}
            <Card>
              <CardHeader>
                <Div className="flex items-center justify-between">
                  <Span className="font-semibold">Invoice</Span>
                  <Div className="bg-gradient-invoice rounded-xl w-12 h-12 flex items-center justify-center">
                    <Icon name="lucide:FileEdit" className="text-ezbill-invoice-foreground" />
                  </Div>
                </Div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Div className="p-3 bg-ezbill-invoice rounded text-ezbill-invoice-foreground">
                  Blue-Indigo · Official
                </Div>
                <Badge className="bg-ezbill-invoice/10 text-ezbill-invoice border-ezbill-invoice/30">
                  INV-2025-001
                </Badge>
                <Button className="w-full bg-ezbill-invoice hover:bg-ezbill-invoice/90 text-ezbill-invoice-foreground">
                  Create Invoice
                </Button>
              </CardContent>
            </Card>

            {/* Quote */}
            <Card>
              <CardHeader>
                <Div className="flex items-center justify-between">
                  <Span className="font-semibold">Quote</Span>
                  <Div className="bg-gradient-quote rounded-xl w-12 h-12 flex items-center justify-center">
                    <Icon name="lucide:FileText" className="text-ezbill-quote-foreground" />
                  </Div>
                </Div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Div className="p-3 bg-ezbill-quote rounded text-ezbill-quote-foreground">
                  Green · Opportunity
                </Div>
                <Badge className="bg-ezbill-quote/10 text-ezbill-quote border-ezbill-quote/30">
                  QUO-2025-001
                </Badge>
                <Button className="w-full bg-ezbill-quote hover:bg-ezbill-quote/90 text-ezbill-quote-foreground">
                  Create Quote
                </Button>
              </CardContent>
            </Card>

            {/* Receipt */}
            <Card>
              <CardHeader>
                <Div className="flex items-center justify-between">
                  <Span className="font-semibold">Receipt</Span>
                  <Div className="bg-gradient-receipt rounded-xl w-12 h-12 flex items-center justify-center">
                    <Icon name="lucide:Receipt" className="text-ezbill-receipt-foreground" />
                  </Div>
                </Div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Div className="p-3 bg-ezbill-receipt rounded text-ezbill-receipt-foreground">
                  Purple-Pink · Complete
                </Div>
                <Badge className="bg-ezbill-receipt/10 text-ezbill-receipt border-ezbill-receipt/30">
                  REC-2025-001
                </Badge>
                <Button className="w-full bg-ezbill-receipt hover:bg-ezbill-receipt/90 text-ezbill-receipt-foreground">
                  View Receipt
                </Button>
              </CardContent>
            </Card>
          </Div>
        </Section>

        {/* Status States */}
        <Section>
          <H3 className="mb-6">📊 Document Status States</H3>
          <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Draft */}
            <Card>
              <CardContent className="pt-6">
                <Div className="space-y-3 text-center">
                  <Div className="bg-ezbill-draft/10 rounded-lg p-4">
                    <Icon name="lucide:Edit3" className="w-8 h-8 text-ezbill-draft mx-auto" />
                  </Div>
                  <Badge className="bg-ezbill-draft/10 text-ezbill-draft border-ezbill-draft/30">
                    Draft
                  </Badge>
                  <P size="xs" className="text-muted-foreground">
                    In Progress
                  </P>
                </Div>
              </CardContent>
            </Card>

            {/* Sent */}
            <Card>
              <CardContent className="pt-6">
                <Div className="space-y-3 text-center">
                  <Div className="bg-ezbill-sent/10 rounded-lg p-4">
                    <Icon name="lucide:Send" className="w-8 h-8 text-ezbill-sent mx-auto" />
                  </Div>
                  <Badge className="bg-ezbill-sent/10 text-ezbill-sent border-ezbill-sent/30">
                    Sent
                  </Badge>
                  <P size="xs" className="text-muted-foreground">
                    In Transit
                  </P>
                </Div>
              </CardContent>
            </Card>

            {/* Pending */}
            <Card>
              <CardContent className="pt-6">
                <Div className="space-y-3 text-center">
                  <Div className="bg-ezbill-pending/10 rounded-lg p-4">
                    <Icon name="lucide:Clock" className="w-8 h-8 text-ezbill-pending mx-auto" />
                  </Div>
                  <Badge className="bg-ezbill-pending/10 text-ezbill-pending border-ezbill-pending/30">
                    Pending
                  </Badge>
                  <P size="xs" className="text-muted-foreground">
                    Awaiting
                  </P>
                </Div>
              </CardContent>
            </Card>

            {/* Accepted */}
            <Card>
              <CardContent className="pt-6">
                <Div className="space-y-3 text-center">
                  <Div className="bg-ezbill-accepted/10 rounded-lg p-4">
                    <Icon name="lucide:ThumbsUp" className="w-8 h-8 text-ezbill-accepted mx-auto" />
                  </Div>
                  <Badge className="bg-ezbill-accepted/10 text-ezbill-accepted border-ezbill-accepted/30">
                    Accepted
                  </Badge>
                  <P size="xs" className="text-muted-foreground">
                    Approved
                  </P>
                </Div>
              </CardContent>
            </Card>

            {/* Paid */}
            <Card>
              <CardContent className="pt-6">
                <Div className="space-y-3 text-center">
                  <Div className="bg-ezbill-paid/10 rounded-lg p-4">
                    <Icon name="lucide:CheckCircle" className="w-8 h-8 text-ezbill-paid mx-auto" />
                  </Div>
                  <Badge className="bg-ezbill-paid/10 text-ezbill-paid border-ezbill-paid/30">
                    Paid
                  </Badge>
                  <P size="xs" className="text-muted-foreground">
                    Complete
                  </P>
                </Div>
              </CardContent>
            </Card>

            {/* Rejected */}
            <Card>
              <CardContent className="pt-6">
                <Div className="space-y-3 text-center">
                  <Div className="bg-ezbill-rejected/10 rounded-lg p-4">
                    <Icon name="lucide:XCircle" className="w-8 h-8 text-ezbill-rejected mx-auto" />
                  </Div>
                  <Badge className="bg-ezbill-rejected/10 text-ezbill-rejected border-ezbill-rejected/30">
                    Rejected
                  </Badge>
                  <P size="xs" className="text-muted-foreground">
                    Declined
                  </P>
                </Div>
              </CardContent>
            </Card>
          </Div>
        </Section>

        {/* Usage Examples */}
        <Section>
          <H3 className="mb-6">💡 Usage Examples</H3>
          <Div className="space-y-6">
            {/* Gradient Backgrounds */}
            <Card>
              <CardHeader>
                <H3 size="h4">Gradient Backgrounds</H3>
              </CardHeader>
              <CardContent>
                <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Div className="bg-gradient-client rounded-xl p-6 text-ezbill-client-foreground">
                    <Icon name="lucide:User" className="w-8 h-8 mb-2" />
                    <P>Client Gradient</P>
                  </Div>
                  <Div className="bg-gradient-invoice rounded-xl p-6 text-ezbill-invoice-foreground">
                    <Icon name="lucide:FileEdit" className="w-8 h-8 mb-2" />
                    <P>Invoice Gradient</P>
                  </Div>
                  <Div className="bg-gradient-to-r from-ezbill-paid to-ezbill-paid/80 rounded-xl p-6 text-ezbill-paid-foreground">
                    <Icon name="lucide:CheckCircle" className="w-8 h-8 mb-2" />
                    <P>Paid Gradient</P>
                  </Div>
                </Div>
              </CardContent>
            </Card>

            {/* Border Accents */}
            <Card>
              <CardHeader>
                <H3 size="h4">Border Accents</H3>
              </CardHeader>
              <CardContent>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-l-4 border-ezbill-invoice">
                    <CardContent className="pt-6">
                      <P className="font-semibold">Invoice #2025-001</P>
                      <P size="sm" className="text-muted-foreground">
                        $1,250.00 · Due Jan 31
                      </P>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-ezbill-quote">
                    <CardContent className="pt-6">
                      <P className="font-semibold">Quote #2025-001</P>
                      <P size="sm" className="text-muted-foreground">
                        $850.00 · Valid until Feb 15
                      </P>
                    </CardContent>
                  </Card>
                </Div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <H3 size="h4">Action Buttons</H3>
              </CardHeader>
              <CardContent>
                <Div className="flex flex-wrap gap-3">
                  <Button className="bg-ezbill-sent hover:bg-ezbill-sent/90 text-ezbill-sent-foreground">
                    <Icon name="lucide:Send" className="w-4 h-4 mr-2" />
                    Send Invoice
                  </Button>
                  <Button className="bg-ezbill-paid hover:bg-ezbill-paid/90 text-ezbill-paid-foreground">
                    <Icon name="lucide:CheckCircle" className="w-4 h-4 mr-2" />
                    Mark Paid
                  </Button>
                  <Button className="bg-ezbill-invoice hover:bg-ezbill-invoice/90 text-ezbill-invoice-foreground">
                    <Icon name="lucide:FileEdit" className="w-4 h-4 mr-2" />
                    Convert to Invoice
                  </Button>
                </Div>
              </CardContent>
            </Card>
          </Div>
        </Section>

        {/* Documentation Link */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <Div className="flex items-start gap-4">
              <Icon name="lucide:BookOpen" className="w-8 h-8 text-primary flex-shrink-0" />
              <Div className="space-y-2">
                <H3 size="h4">Complete Documentation</H3>
                <P className="text-muted-foreground">
                  For detailed usage guidelines, OKLCH values, and accessibility information, see:
                </P>
                <code className="block bg-muted px-3 py-2 rounded text-sm">
                  packages/ui/EZBILL-COLORS.md
                </code>
              </Div>
            </Div>
          </CardContent>
        </Card>
      </Div>
    </Main>
  )
}
