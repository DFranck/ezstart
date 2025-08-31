import { AddLineItem, Invoice, Receipt } from '@ez-billing/types';
import { InvoiceModel } from '../../models/billing/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function assignClientToInvoiceService(
  id: string,
  clientId: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { clientId },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function addLineItemToInvoiceService(
  id: string,
  item: AddLineItem
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $push: { items: item } },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function markInvoiceAsPaidService(
  id: string
): Promise<{ invoice: Invoice; receipt?: Receipt } | null> {
  // Get the invoice first to check current status
  const invoice = await InvoiceModel.findById(id);
  if (!invoice || invoice.deletedAt) {
    return null;
  }

  // Don't create receipt if already paid (to prevent duplicate receipts)
  if (invoice.status === 'paid') {
    return { invoice: toApiObject<Invoice>(invoice) };
  }

  // Update invoice status to paid
  const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
    id,
    { status: 'paid' },
    { new: true }
  );

  if (!updatedInvoice) {
    return null;
  }

  // Automatically generate a receipt
  try {
    const { ReceiptModel } = await import('../../models/billing/receipt');
    const { generateNextNumber } = await import('../../utils/generate-next-number');

    const receiptDocumentNumber = await generateNextNumber('receipt');
    const receiptData = {
      userId: updatedInvoice.userId,
      companyId: updatedInvoice.companyId,
      clientId: updatedInvoice.clientId,
      items: updatedInvoice.items,
      currency: updatedInvoice.currency,
      exchangeRate: updatedInvoice.exchangeRate,
      notes: `Receipt for invoice ${updatedInvoice.documentNumber}`,
      status: 'issued',
      invoiceId: updatedInvoice._id.toString(),
      paymentDate: new Date().toISOString(),
      documentNumber: receiptDocumentNumber,
      subtotal: updatedInvoice.subtotal,
      taxAmount: updatedInvoice.taxAmount,
      total: updatedInvoice.total,
    };

    const receiptDoc = new ReceiptModel(receiptData);
    const savedReceipt = await receiptDoc.save();

    return {
      invoice: toApiObject<Invoice>(updatedInvoice),
      receipt: toApiObject<Receipt>(savedReceipt),
    };
  } catch (error) {
    console.error('Failed to create receipt for invoice:', error);
    // Return the invoice even if receipt creation fails
    return { invoice: toApiObject<Invoice>(updatedInvoice) };
  }
}

export async function removeLineItemToInvoiceService(
  id: string,
  itemId: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
