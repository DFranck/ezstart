export declare enum BillingCurrency {
    EUR = "EUR",
    USD = "USD",
    VND = "VND",
    GBP = "GBP"
}
export declare enum BillingStatus {
    DRAFT = "DRAFT",
    SENT = "SENT",
    ACCEPTED = "ACCEPTED",
    PAID = "PAID",
    CANCELLED = "CANCELLED",
    OVERDUE = "OVERDUE"
}
export declare enum BillingType {
    QUOTE = "QUOTE",
    RECEIPT = "RECEIPT",
    INVOICE = "INVOICE"
}
export interface BillingItem {
    id: string;
    label: string;
    description?: string;
    unitPrice: number;
    quantity: number;
    total: number;
}
export interface BillingParty {
    name: string;
    address: string;
    email?: string;
    phone?: string;
    taxId?: string;
}
export interface BillingBase {
    id: string;
    type: BillingType;
    status: BillingStatus;
    date: string;
    dueDate?: string;
    currency: BillingCurrency;
    from: BillingParty;
    to: BillingParty;
    items: BillingItem[];
    subtotal: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Quote extends BillingBase {
    id: string;
    clientName: string;
    amount: number;
    type: BillingType.QUOTE;
    acceptedAt?: string;
}
export type QuoteCreateInput = {
    clientName: string;
    amount: number;
};
export interface Receipt extends BillingBase {
    type: BillingType.RECEIPT;
    paidAt: string;
    paymentMethod?: string;
    reference?: string;
}
export type BillingDocument = Quote | Receipt;
//# sourceMappingURL=billing.d.ts.map