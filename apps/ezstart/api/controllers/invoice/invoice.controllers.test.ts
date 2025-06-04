/**
 * @file apps/ezstart/api/controllers/invoice/invoice.controller.test.ts
 */
import request from 'supertest';
import app from '../../index';
import * as services from '../../services/invoice';
jest.mock('../../services/invoice');

describe('Invoice Controller (integration)', () => {
  const validId = '4658c5d78904c1234567abcd';
  const createInvoiceInput = {
    clientId: validId,
    items: [{ label: 'T-shirt', quantity: 2, price: 20 }],
    currency: 'EUR',
    notes: 'Paiement sous 30 jours',
    status: 'draft',
    taxRate: 10,
  };
  const mockInvoice = {
    _id: validId,
    clientId: validId,
    items: [{ label: 'T-shirt', quantity: 2, price: 20 }],
    currency: 'EUR',
    notes: 'Paiement sous 30 jours',
    status: 'draft',
    taxRate: 10,
    subtotal: 40,
    taxAmount: 4,
    total: 44,
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/invoices - should create invoice', async () => {
    (services.createInvoiceService as jest.Mock).mockResolvedValue(mockInvoice);
    const response = await request(app)
      .post('/api/invoices')
      .send(createInvoiceInput);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockInvoice);
    expect(services.createInvoiceService).toHaveBeenCalledWith(
      createInvoiceInput
    );
  });
  it('POST /api/receipts - should return calculated totals (subtotal, taxAmount, total)', async () => {
    (services.createInvoiceService as jest.Mock).mockResolvedValue(mockInvoice);
    const response = await request(app)
      .post('/api/receipts')
      .send(createInvoiceInput);

    expect(response.status).toBe(201);
    expect(response.body.subtotal).toBe(40);
    expect(response.body.taxAmount).toBe(4);
    expect(response.body.total).toBe(44);
  });
  it('GET /api/invoices/:id - should get invoice by id', async () => {
    (services.getInvoiceByIdService as jest.Mock).mockResolvedValue(
      mockInvoice
    );
    const response = await request(app).get(`/api/invoices/${validId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockInvoice);
  });

  it('PUT /api/invoices/:id - should update invoice', async () => {
    (services.updateInvoiceService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      notes: 'Nouvelle note',
    });
    const response = await request(app)
      .put(`/api/invoices/${validId}`)
      .send({ notes: 'Nouvelle note' });

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe('Nouvelle note');
  });

  it('DELETE /api/invoices/:id - should soft delete invoice', async () => {
    (services.softDeleteInvoiceService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      deletedAt: '2024-06-01T13:00:00.000Z',
    });
    const response = await request(app).delete(`/api/invoices/${validId}`);
    expect(response.status).toBe(204);
    // pas de body normalement en 204, sauf si tu return quand même un json
  });

  it('POST /api/invoices/:id/restore - should restore soft-deleted invoice', async () => {
    (services.restoreInvoiceService as jest.Mock).mockResolvedValue(
      mockInvoice
    );
    const response = await request(app).post(
      `/api/invoices/${validId}/restore`
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockInvoice);
    expect(services.restoreInvoiceService).toHaveBeenCalledWith(validId);
  });

  it('DELETE /api/invoices/:id/hard-delete - should hard delete invoice', async () => {
    (services.hardDeleteInvoiceService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      deleted: true,
    });
    const response = await request(app).delete(
      `/api/invoices/${validId}/hard-delete`
    );
    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(true);
    expect(services.hardDeleteInvoiceService).toHaveBeenCalledWith(validId);
  });

  it('POST /api/invoices/:id/assign-client - should assign client to invoice', async () => {
    (services.assignClientToInvoiceService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      clientId: validId,
    });
    const response = await request(app)
      .post(`/api/invoices/${validId}/assign-client`)
      .send({ clientId: validId });
    expect(response.status).toBe(200);
    expect(response.body.clientId).toBe(validId);
  });

  it('POST /api/invoices/:id/add-line-item - should add line item', async () => {
    (services.addLineItemToInvoiceService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      items: [...mockInvoice.items, { label: 'Mug', quantity: 1, price: 10 }],
    });
    const response = await request(app)
      .post(`/api/invoices/${validId}/add-line-item`)
      .send({ label: 'Mug', quantity: 1, price: 10 });
    expect(response.status).toBe(200);
    expect(response.body.items.some((item: any) => item.label === 'Mug')).toBe(
      true
    );
  });

  it('POST /api/invoices/:id/remove-line-item - should remove line item', async () => {
    (services.removeLineItemToInvoiceService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      items: [],
    });
    const response = await request(app)
      .post(`/api/invoices/${validId}/remove-line-item`)
      .send({ itemId: 'item-1' });
    expect(response.status).toBe(200);
    expect(response.body.items.length).toBe(0);
  });

  it('POST /api/invoices/:id/mark-paid - should mark invoice as paid', async () => {
    (services.markInvoiceAsPaidService as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: 'paid',
    });
    const response = await request(app).post(
      `/api/invoices/${validId}/mark-paid`
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('paid');
  });

  it('GET /api/invoices - should list invoices', async () => {
    (services.getInvoicesService as jest.Mock).mockResolvedValue([mockInvoice]);
    const response = await request(app).get('/api/invoices');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(mockInvoice);
  });

  it('GET /api/invoices - should return empty array if no invoice', async () => {
    (services.getInvoicesService as jest.Mock).mockResolvedValue([]);
    const response = await request(app).get('/api/invoices');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /api/invoices/:id - should return 404 if not found', async () => {
    (services.getInvoiceByIdService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).get(`/api/invoices/${validId}`);
    expect(response.status).toBe(404);
  });

  it('DELETE /api/invoices/:id - should return 404 if not found', async () => {
    (services.softDeleteInvoiceService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).delete(`/api/invoices/${validId}`);
    expect(response.status).toBe(404);
  });
});
