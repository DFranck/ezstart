import { AddLineItem, Invoice, Receipt } from '@ezbill/types';
import { getInvoiceModel } from '../../models/billing/invoice.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';

export async function assignClientToInvoiceService(
  id: string,
  clientId: string
): Promise<Invoice | null> {
  const InvoiceModel = await getInvoiceModel();
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
  const InvoiceModel = await getInvoiceModel();
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $push: { items: item } },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function markInvoiceAsPaidService(
  id: string,
  options?: {
    companyId?: string;
    paymentDate?: string;
    notes?: string;
  }
): Promise<{ invoice: Invoice; receipt?: Receipt } | null> {
  const InvoiceModel = await getInvoiceModel();
  // Get the invoice first to check current status
  const invoice = await InvoiceModel.findById(id);
  if (!invoice || invoice.deletedAt) {
    return null;
  }

  // Check if receipt already exists for this invoice
  const { getReceiptModel } = await import('../../models/billing/receipt');
  const ReceiptModel = await getReceiptModel();
  const existingReceipt = await ReceiptModel.findOne({
    invoiceId: invoice._id.toString(),
    deletedAt: null
  });

  // Don't create receipt if already paid AND receipt exists (to prevent duplicate receipts)
  if (invoice.status === 'paid' && existingReceipt) {
    console.log(`⏭️  Invoice ${invoice.documentNumber} already paid with receipt ${existingReceipt.documentNumber}`);
    return {
      invoice: toApiObject<Invoice>(invoice),
      receipt: toApiObject<Receipt>(existingReceipt)
    };
  }

  // Update invoice status to paid and set paidAt date
  const paidAtDate = options?.paymentDate ? new Date(options.paymentDate).toISOString() : new Date().toISOString();
  const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
    id,
    { status: 'paid', paidAt: paidAtDate },
    { new: true }
  );

  if (!updatedInvoice) {
    return null;
  }

  // Automatically generate a receipt
  try {
    console.log(`🔄 Creating receipt for invoice ${updatedInvoice._id} for user ${updatedInvoice.userId}`);

    const { generateNextNumber } = await import('../../utils/generate-next-number');

    const receiptDocumentNumber = await generateNextNumber('receipt', updatedInvoice.userId);
    const receiptData = {
      userId: updatedInvoice.userId,
      companyId: options?.companyId || updatedInvoice.companyId,
      clientId: updatedInvoice.clientId,
      items: updatedInvoice.items,
      currency: updatedInvoice.currency,
      exchangeRate: updatedInvoice.exchangeRate,
      notes: options?.notes || `Receipt for invoice ${updatedInvoice.documentNumber}`,
      status: 'issued',
      invoiceId: updatedInvoice._id.toString(),
      paymentDate: options?.paymentDate ? new Date(options.paymentDate).toISOString() : new Date().toISOString(),
      documentNumber: receiptDocumentNumber,
      subtotal: updatedInvoice.subtotal,
      taxAmount: updatedInvoice.taxAmount,
      total: updatedInvoice.total,
    };

    console.log(`📄 Receipt data:`, {
      documentNumber: receiptData.documentNumber,
      userId: receiptData.userId,
      clientId: receiptData.clientId,
      invoiceId: receiptData.invoiceId,
      total: receiptData.total
    });

    // Reuse the ReceiptModel from above
    const receiptDoc = new ReceiptModel(receiptData);
    const savedReceipt = await receiptDoc.save();

    console.log(`✅ Receipt created successfully: ${savedReceipt._id} (${savedReceipt.documentNumber})`);

    return {
      invoice: toApiObject<Invoice>(updatedInvoice),
      receipt: toApiObject<Receipt>(savedReceipt),
    };
  } catch (error) {
    console.error('❌ Failed to create receipt for invoice:', error);
    console.error('📋 Invoice data:', {
      id: updatedInvoice._id,
      userId: updatedInvoice.userId,
      clientId: updatedInvoice.clientId,
      documentNumber: updatedInvoice.documentNumber
    });
    // Return the invoice even if receipt creation fails
    return { invoice: toApiObject<Invoice>(updatedInvoice) };
  }
}

export async function removeLineItemToInvoiceService(
  id: string,
  itemId: string
): Promise<Invoice | null> {
  const InvoiceModel = await getInvoiceModel();
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
