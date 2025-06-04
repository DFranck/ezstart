/**
 * @file apps/ezstart/api/controllers/quote/quote.controller.test.ts
 */
import request from 'supertest';
import app from '../../index';
import * as services from '../../services/quote';
jest.mock('../../services/quote');

describe('Quote Controller (integration)', () => {
  const validId = '4658c5d78904c1234567abcd';
  const createQuoteInput = {
    clientId: validId,
    items: [{ label: 'T-shirt', quantity: 2, price: 20 }],
    currency: 'EUR',
    notes: 'Paiement sous 30 jours',
    status: 'draft',
    taxRate: 10,
  };
  const mockQuote = {
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

  it('POST /api/quotes - should create quote', async () => {
    (services.createQuoteService as jest.Mock).mockResolvedValue(mockQuote);
    const response = await request(app)
      .post('/api/quotes')
      .send(createQuoteInput);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockQuote);
    expect(services.createQuoteService).toHaveBeenCalledWith(createQuoteInput);
  });
  it('POST /api/receipts - should return calculated totals (subtotal, taxAmount, total)', async () => {
    (services.createQuoteService as jest.Mock).mockResolvedValue(mockQuote);
    const response = await request(app)
      .post('/api/receipts')
      .send(createQuoteInput);

    expect(response.status).toBe(201);
    expect(response.body.subtotal).toBe(40);
    expect(response.body.taxAmount).toBe(4);
    expect(response.body.total).toBe(44);
  });
  it('GET /api/quotes/:id - should get quote by id', async () => {
    (services.getQuoteByIdService as jest.Mock).mockResolvedValue(mockQuote);
    const response = await request(app).get(`/api/quotes/${validId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockQuote);
  });

  it('PUT /api/quotes/:id - should update quote', async () => {
    (services.updateQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      notes: 'Nouvelle note',
    });
    const response = await request(app)
      .put(`/api/quotes/${validId}`)
      .send({ notes: 'Nouvelle note' });

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe('Nouvelle note');
  });

  it('DELETE /api/quotes/:id - should soft delete quote', async () => {
    (services.softDeleteQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      deletedAt: '2024-06-01T13:00:00.000Z',
    });
    const response = await request(app).delete(`/api/quotes/${validId}`);
    expect(response.status).toBe(204);
    // pas de body normalement en 204, sauf si tu return quand même un json
  });

  it('POST /api/quotes/:id/restore - should restore soft-deleted quote', async () => {
    (services.restoreQuoteService as jest.Mock).mockResolvedValue(mockQuote);
    const response = await request(app).post(`/api/quotes/${validId}/restore`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockQuote);
    expect(services.restoreQuoteService).toHaveBeenCalledWith(validId);
  });

  it('DELETE /api/quotes/:id/hard-delete - should hard delete quote', async () => {
    (services.hardDeleteQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      deleted: true,
    });
    const response = await request(app).delete(
      `/api/quotes/${validId}/hard-delete`
    );
    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(true);
    expect(services.hardDeleteQuoteService).toHaveBeenCalledWith(validId);
  });

  it('POST /api/quotes/:id/assign-client - should assign client to quote', async () => {
    (services.assignClientToQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      clientId: validId,
    });
    const response = await request(app)
      .post(`/api/quotes/${validId}/assign-client`)
      .send({ clientId: validId });
    expect(response.status).toBe(200);
    expect(response.body.clientId).toBe(validId);
  });

  it('POST /api/quotes/:id/add-line-item - should add line item', async () => {
    (services.addLineItemToQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      items: [...mockQuote.items, { label: 'Mug', quantity: 1, price: 10 }],
    });
    const response = await request(app)
      .post(`/api/quotes/${validId}/add-line-item`)
      .send({ label: 'Mug', quantity: 1, price: 10 });
    expect(response.status).toBe(200);
    expect(response.body.items.some((item: any) => item.label === 'Mug')).toBe(
      true
    );
  });

  it('POST /api/quotes/:id/remove-line-item - should remove line item', async () => {
    (services.removeLineItemToQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      items: [],
    });
    const response = await request(app)
      .post(`/api/quotes/${validId}/remove-line-item`)
      .send({ itemId: 'item-1' });
    expect(response.status).toBe(200);
    expect(response.body.items.length).toBe(0);
  });

  it('POST /api/quotes/:id/accept - should accept a quote', async () => {
    (services.acceptQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      status: 'accepted',
    });
    const response = await request(app).post(`/api/quotes/${validId}/accept`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('accepted');
    expect(services.acceptQuoteService).toHaveBeenCalledWith(validId);
  });

  it('POST /api/quotes/:id/reject - should reject a quote', async () => {
    (services.rejectQuoteService as jest.Mock).mockResolvedValue({
      ...mockQuote,
      status: 'rejected',
    });
    const response = await request(app).post(`/api/quotes/${validId}/reject`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('rejected');
    expect(services.rejectQuoteService).toHaveBeenCalledWith(validId);
  });

  it('GET /api/quotes - should list quotes', async () => {
    (services.getQuotesService as jest.Mock).mockResolvedValue([mockQuote]);
    const response = await request(app).get('/api/quotes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(mockQuote);
  });

  it('GET /api/quotes - should return empty array if no quote', async () => {
    (services.getQuotesService as jest.Mock).mockResolvedValue([]);
    const response = await request(app).get('/api/quotes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /api/quotes/:id - should return 404 if not found', async () => {
    (services.getQuoteByIdService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).get(`/api/quotes/${validId}`);
    expect(response.status).toBe(404);
  });

  it('DELETE /api/quotes/:id - should return 404 if not found', async () => {
    (services.softDeleteQuoteService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).delete(`/api/quotes/${validId}`);
    expect(response.status).toBe(404);
  });
});
