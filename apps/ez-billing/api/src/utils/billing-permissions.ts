import { Quote, Invoice, Receipt, QuoteStatus, InvoiceStatus, ReceiptStatus } from '@ez-billing/types';

export interface BillingPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canSend?: boolean;
  canAccept?: boolean;
  canReject?: boolean;
  canConvertToInvoice?: boolean;
  canMarkAsPaid?: boolean;
  canRefund?: boolean;
  reason?: string;
}

export function getQuotePermissions(quote: Quote): BillingPermissions {
  const status = quote.status as QuoteStatus;

  switch (status) {
    case 'draft':
      return {
        canEdit: true,
        canDelete: true,
        canSend: true
      };
    
    case 'sent':
      return {
        canEdit: false,
        canDelete: false,
        canAccept: true,
        canReject: true,
        reason: 'Quote has been sent to client. Awaiting response.'
      };
    
    case 'accepted':
      return {
        canEdit: false,
        canDelete: false,
        canConvertToInvoice: true,
        reason: 'Quote has been accepted by client. Can be converted to invoice.'
      };
    
    case 'rejected':
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Quote has been rejected by client.'
      };
    
    default:
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Unknown status'
      };
  }
}

export function getInvoicePermissions(invoice: Invoice): BillingPermissions {
  const status = invoice.status as InvoiceStatus;

  switch (status) {
    case 'draft':
      return {
        canEdit: true,
        canDelete: true,
        canSend: true
      };
    
    case 'sent':
      return {
        canEdit: false,
        canDelete: false,
        canMarkAsPaid: true,
        reason: 'Invoice has been sent to client. Awaiting payment.'
      };
    
    case 'paid':
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Invoice has been paid. Cannot be modified for financial compliance.'
      };
    
    default:
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Unknown status'
      };
  }
}

export function getReceiptPermissions(receipt: Receipt): BillingPermissions {
  const status = receipt.status as ReceiptStatus;

  switch (status) {
    case 'issued':
      return {
        canEdit: false,
        canDelete: false,
        canRefund: true,
        reason: 'Receipt issued. Cannot be modified for financial compliance.'
      };
    
    case 'refunded':
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Receipt has been refunded. Cannot be modified.'
      };
    
    default:
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Unknown status'
      };
  }
}

export function getBillingPermissions(
  document: Quote | Invoice | Receipt,
  type: 'quote' | 'invoice' | 'receipt'
): BillingPermissions {
  switch (type) {
    case 'quote':
      return getQuotePermissions(document as Quote);
    case 'invoice':
      return getInvoicePermissions(document as Invoice);
    case 'receipt':
      return getReceiptPermissions(document as Receipt);
    default:
      return {
        canEdit: false,
        canDelete: false,
        reason: 'Unknown document type'
      };
  }
}

export class BillingPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingPermissionError';
  }
}

export function validateBillingAction(
  document: Quote | Invoice | Receipt,
  type: 'quote' | 'invoice' | 'receipt',
  action: 'edit' | 'delete' | 'send' | 'accept' | 'reject' | 'convertToInvoice' | 'markAsPaid' | 'refund'
): void {
  const permissions = getBillingPermissions(document, type);
  
  switch (action) {
    case 'edit':
      if (!permissions.canEdit) {
        throw new BillingPermissionError(`Cannot edit ${type}: ${permissions.reason}`);
      }
      break;
    case 'delete':
      if (!permissions.canDelete) {
        throw new BillingPermissionError(`Cannot delete ${type}: ${permissions.reason}`);
      }
      break;
    case 'send':
      if (!permissions.canSend) {
        throw new BillingPermissionError(`Cannot send ${type}: ${permissions.reason}`);
      }
      break;
    case 'accept':
      if (!permissions.canAccept) {
        throw new BillingPermissionError(`Cannot accept ${type}: ${permissions.reason}`);
      }
      break;
    case 'reject':
      if (!permissions.canReject) {
        throw new BillingPermissionError(`Cannot reject ${type}: ${permissions.reason}`);
      }
      break;
    case 'convertToInvoice':
      if (!permissions.canConvertToInvoice) {
        throw new BillingPermissionError(`Cannot convert ${type} to invoice: ${permissions.reason}`);
      }
      break;
    case 'markAsPaid':
      if (!permissions.canMarkAsPaid) {
        throw new BillingPermissionError(`Cannot mark ${type} as paid: ${permissions.reason}`);
      }
      break;
    case 'refund':
      if (!permissions.canRefund) {
        throw new BillingPermissionError(`Cannot refund ${type}: ${permissions.reason}`);
      }
      break;
    default:
      throw new BillingPermissionError(`Unknown action: ${action}`);
  }
}