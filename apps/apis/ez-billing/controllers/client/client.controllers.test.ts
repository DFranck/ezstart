/**
 * @file apps/ezstart/api/controllers/client/client.controller.test.ts
 */
import request from 'supertest';
import app from '../../index';
import * as services from '../../services/client';
jest.mock('../../services/client');

describe('Client Controller (integration)', () => {
  const validId = '6658c5d78904c1234567abcd';
  const createClientInput = {
    clientName: 'Test Corp',
    address: '123 Rue X',
    phone: '+33 1 23 45 67 89',
    notes: 'First client',
    taxNumber: 'FR123456789',
  };

  const mockClient = {
    _id: validId,
    clientName: 'Test Corp',
    address: '123 Rue X',
    phone: '+33 1 23 45 67 89',
    notes: 'First client',
    taxNumber: 'FR123456789',
    apps: ['billing'],
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  };
  const mockClientWithDeletedAt = {
    ...mockClient,
    deletedAt: '2024-06-01T13:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/clients - should create client', async () => {
    (services.createClientService as jest.Mock).mockResolvedValue(mockClient);
    const response = await request(app)
      .post('/api/clients')
      .send(createClientInput);
    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockClient);
    expect(services.createClientService).toHaveBeenCalledWith(
      createClientInput
    );
  });

  it('GET /api/clients/:id - should get client by id', async () => {
    (services.getClientByIdService as jest.Mock).mockResolvedValue(mockClient);
    const response = await request(app).get(`/api/clients/${validId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockClient);
  });

  it('PUT /api/clients/:id - should update client', async () => {
    (services.updateClientService as jest.Mock).mockResolvedValue({
      ...mockClient,
      clientName: 'Updated',
    });
    const response = await request(app)
      .put(`/api/clients/${validId}`)
      .send({ clientName: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.clientName).toBe('Updated');
  });

  it('DELETE /api/clients/:id - should delete client', async () => {
    (services.softDeleteClientService as jest.Mock).mockResolvedValue({
      ...mockClient,
      deletedAt: '2024-06-01T13:00:00.000Z',
    });
    const response = await request(app).delete(`/api/clients/${validId}`);
    expect(response.status).toBe(204);
  });

  it('DELETE /api/clients/:id - should return Not found', async () => {
    (services.softDeleteClientService as jest.Mock).mockResolvedValue(
      undefined
    );
    const response = await request(app).delete(`/api/clients/${validId}`);
    expect(response.status).toBe(404);
  });

  it('POST /api/clients/:id/restore - should restore a soft-deleted client', async () => {
    (services.restoreClientService as jest.Mock).mockResolvedValue(mockClient);
    const response = await request(app).post(`/api/clients/${validId}/restore`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockClient);
    expect(services.restoreClientService).toHaveBeenCalledWith(validId);
  });

  it('POST /api/clients/:id/restore - should return 404 if not found', async () => {
    (services.restoreClientService as jest.Mock).mockResolvedValue(undefined);
    const response = await request(app).post(`/api/clients/${validId}/restore`);
    expect(response.status).toBe(404);
  });

  it('DELETE /api/clients/:id/hard-delete - should hard delete a client', async () => {
    (services.hardDeleteClientService as jest.Mock).mockResolvedValue({
      _id: validId,
      deleted: true,
    });
    const response = await request(app).delete(
      `/api/clients/${validId}/hard-delete`
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      _id: validId,
      deleted: true,
    });
    expect(services.hardDeleteClientService).toHaveBeenCalledWith(validId);
  });

  it('DELETE /api/clients/:id/hard-delete - should return 404 if not found', async () => {
    (services.hardDeleteClientService as jest.Mock).mockResolvedValue(
      undefined
    );
    const response = await request(app).delete(
      `/api/clients/${validId}/hard-delete`
    );
    expect(response.status).toBe(404);
  });

  it('GET /api/clients - should list clients', async () => {
    (services.getClientsService as jest.Mock).mockResolvedValue([mockClient]);
    const response = await request(app).get('/api/clients');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(mockClient);
  });

  it('GET /api/clients - should return empty array if no client', async () => {
    (services.getClientsService as jest.Mock).mockResolvedValue([]);
    const response = await request(app).get('/api/clients');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /api/clients?includeDeleted=true - should list all clients (active + deleted)', async () => {
    (services.getClientsService as jest.Mock).mockResolvedValue([
      mockClient,
      mockClientWithDeletedAt,
    ]);
    const response = await request(app).get('/api/clients?includeDeleted=true');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(
      response.body.some((c: typeof mockClientWithDeletedAt) => !c.deletedAt)
    ).toBe(true);
    expect(
      response.body.some((c: typeof mockClientWithDeletedAt) => !!c.deletedAt)
    ).toBe(true);
  });

  it('GET /api/clients?deletedOnly=true - should list only deleted clients', async () => {
    (services.getClientsService as jest.Mock).mockResolvedValue([
      mockClientWithDeletedAt,
    ]);
    const response = await request(app).get('/api/clients?deletedOnly=true');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].deletedAt).toBeDefined();
  });

  it('GET /api/clients/:id - should return 404 if not found', async () => {
    (services.getClientByIdService as jest.Mock).mockResolvedValue(null);
    const response = await request(app).get(`/api/clients/${validId}`);
    expect(response.status).toBe(404);
  });
});
