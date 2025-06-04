/**
 * @file apps/ezstart/api/controllers/receipt/receipt.controller.test.ts
 */
import request from 'supertest';
import app from '../../index';
import * as services from '../../services/receipt';
jest.mock('../../services/receipt');

describe('Receipt Controller (integration)', () => {
  const validId = '4658c5d78904c1234567abcd';
  const createReceiptInput = {
    clientId: validId,
    items: [{ label: 'T-shirt', quantity: 2, price: 20 }],
    currency: 'EUR',
    notes: 'Paiement sous 30 jours',
    status: 'issued',
    taxRate: 10,
  };
  const mockReceipt = {
    _id: validId,
    clientId: validId,
    items: [{ label: 'T-shirt', quantity: 2, price: 20 }],
    currency: 'EUR',
    notes: 'Paiement sous 30 jours',
    status: 'issued',
    taxRate: 10,
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/receipts - should create receipt', async () => {
    (services.createReceiptService as jest.Mock).mockResolvedValue(mockReceipt);
    const response = await request(app)
      .post('/api/receipts')
      .send(createReceiptInput);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockReceipt);
    expect(services.createReceiptService).toHaveBeenCalledWith(
      createReceiptInput
    );
  });

  it('GET /api/receipts/:id - should get receipt by id', async () => {
    (services.getReceiptByIdService as jest.Mock).mockResolvedValue(
      mockReceipt
    );
    const response = await request(app).get(`/api/receipts/${validId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockReceipt);
  });

  it('PUT /api/receipts/:id - should update receipt', async () => {
    (services.updateReceiptService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      notes: 'Nouvelle note',
    });
    const response = await request(app)
      .put(`/api/receipts/${validId}`)
      .send({ notes: 'Nouvelle note' });

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe('Nouvelle note');
  });

  it('DELETE /api/receipts/:id - should soft delete receipt', async () => {
    (services.softDeleteReceiptService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      deletedAt: '2024-06-01T13:00:00.000Z',
    });
    const response = await request(app).delete(`/api/receipts/${validId}`);
    expect(response.status).toBe(204);
    // pas de body normalement en 204, sauf si tu return quand même un json
  });

  it('POST /api/receipts/:id/restore - should restore soft-deleted receipt', async () => {
    (services.restoreReceiptService as jest.Mock).mockResolvedValue(
      mockReceipt
    );
    const response = await request(app).post(
      `/api/receipts/${validId}/restore`
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockReceipt);
    expect(services.restoreReceiptService).toHaveBeenCalledWith(validId);
  });

  it('DELETE /api/receipts/:id/hard-delete - should hard delete receipt', async () => {
    (services.hardDeleteReceiptService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      deleted: true,
    });
    const response = await request(app).delete(
      `/api/receipts/${validId}/hard-delete`
    );
    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(true);
    expect(services.hardDeleteReceiptService).toHaveBeenCalledWith(validId);
  });

  it('POST /api/receipts/:id/assign-client - should assign client to receipt', async () => {
    (services.assignClientToReceiptService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      clientId: validId,
    });
    const response = await request(app)
      .post(`/api/receipts/${validId}/assign-client`)
      .send({ clientId: validId });
    expect(response.status).toBe(200);
    expect(response.body.clientId).toBe(validId);
  });

  it('POST /api/receipts/:id/add-line-item - should add line item', async () => {
    (services.addLineItemToReceiptService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      items: [...mockReceipt.items, { label: 'Mug', quantity: 1, price: 10 }],
    });
    const response = await request(app)
      .post(`/api/receipts/${validId}/add-line-item`)
      .send({ label: 'Mug', quantity: 1, price: 10 });
    expect(response.status).toBe(200);
    expect(response.body.items.some((item: any) => item.label === 'Mug')).toBe(
      true
    );
  });

  it('POST /api/receipts/:id/remove-line-item - should remove line item', async () => {
    (services.removeLineItemToReceiptService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      items: [],
    });
    const response = await request(app)
      .post(`/api/receipts/${validId}/remove-line-item`)
      .send({ itemId: 'item-1' });
    expect(response.status).toBe(200);
    expect(response.body.items.length).toBe(0);
  });

  it('POST /api/receipts/:id/mark-issued - should mark a receipt as issued', async () => {
    (services.markReceiptAsIssuedService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      status: 'issued',
    });

    const response = await request(app).post(
      `/api/receipts/${validId}/mark-issued`
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('issued');
    expect(services.markReceiptAsIssuedService).toHaveBeenCalledWith(validId);
  });

  it('POST /api/receipts/:id/mark-refunded - should mark a receipt as refunded', async () => {
    (services.markReceiptAsRefundedService as jest.Mock).mockResolvedValue({
      ...mockReceipt,
      status: 'refunded',
    });

    const response = await request(app).post(
      `/api/receipts/${validId}/mark-refunded`
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('refunded');
    expect(services.markReceiptAsRefundedService).toHaveBeenCalledWith(validId);
  });

  it('GET /api/receipts - should list receipts', async () => {
    (services.getReceiptsService as jest.Mock).mockResolvedValue([mockReceipt]);
    const response = await request(app).get('/api/receipts');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(mockReceipt);
  });

  it('GET /api/receipts - should return empty array if no receipt', async () => {
    (services.getReceiptsService as jest.Mock).mockResolvedValue([]);
    const response = await request(app).get('/api/receipts');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /api/receipts/:id - should return 404 if not found', async () => {
    (services.getReceiptByIdService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).get(`/api/receipts/${validId}`);
    expect(response.status).toBe(404);
  });

  it('DELETE /api/receipts/:id - should return 404 if not found', async () => {
    (services.softDeleteReceiptService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).delete(`/api/receipts/${validId}`);
    expect(response.status).toBe(404);
  });
});
