/**
 * @file apps/ezstart/api/controllers/client/client.controller.test.ts
 */

import request from 'supertest';
import app from '../../index';
import * as services from '../../services';
jest.mock('../../services');

app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log('Route:', r.route.path);
  }
});

describe('Client Controller (integration)', () => {
  const createClientInput = {
    companyName: 'Test Corp',
    address: '123 Rue X',
    phone: '+33 1 23 45 67 89',
    notes: 'First client',
    taxNumber: 'FR123456789',
  };

  const mockClient = {
    _id: '123',
    companyName: 'Test Corp',
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
    (services.createClient as jest.Mock).mockResolvedValue(mockClient);
    const response = await request(app)
      .post('/api/clients')
      .send(createClientInput);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockClient);
    expect(services.createClient).toHaveBeenCalledWith(createClientInput);
  });

  it('GET /api/clients/:id - should get client by id', async () => {
    (services.getClientById as jest.Mock).mockResolvedValue(mockClient);
    const response = await request(app).get('/api/clients/123');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockClient);
  });

  it('PUT /api/clients/:id - should update client', async () => {
    (services.updateClient as jest.Mock).mockResolvedValue({
      ...mockClient,
      name: 'Updated',
    });
    const response = await request(app)
      .put('/api/clients/123')
      .send({ name: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated');
  });

  it('DELETE /api/clients/:id - should delete client', async () => {
    (services.softDeleteClient as jest.Mock).mockResolvedValue({ id: '123' });
    const response = await request(app).delete('/api/clients/123');
    expect(response.status).toBe(204);
  });

  it('DELETE /api/clients/:id - should return Not found', async () => {
    (services.softDeleteClient as jest.Mock).mockResolvedValue(undefined);
    const response = await request(app).delete('/api/clients/123');
    expect(response.status).toBe(404);
  });
  it('POST /api/clients/:id/restore - should restore a soft-deleted client', async () => {
    (services.restoreClient as jest.Mock).mockResolvedValue(mockClient);
    const response = await request(app).post('/api/clients/123/restore');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockClient);
    expect(services.restoreClient).toHaveBeenCalledWith('123');
  });

  it('POST /api/clients/:id/restore - should return 404 if not found', async () => {
    (services.restoreClient as jest.Mock).mockResolvedValue(undefined);
    const response = await request(app).post('/api/clients/unknown/restore');
    expect(response.status).toBe(404);
  });

  it('DELETE /api/clients/:id/hard-delete - should hard delete a client', async () => {
    (services.hardDeleteClient as jest.Mock).mockResolvedValue({
      id: '123',
      deleted: true,
    });
    const response = await request(app).delete('/api/clients/123/hard-delete');
    expect(response.status).toBe(200); // ou 204 selon ta convention (ici, 200 pour renvoyer un body)
    expect(response.body).toEqual({ id: '123', deleted: true });
    expect(services.hardDeleteClient).toHaveBeenCalledWith('123');
  });

  it('DELETE /api/clients/:id/hard-delete - should return 404 if not found', async () => {
    (services.hardDeleteClient as jest.Mock).mockResolvedValue(undefined);
    const response = await request(app).delete(
      '/api/clients/unknown/hard-delete'
    );
    expect(response.status).toBe(404);
  });

  it('GET /api/clients - should list clients', async () => {
    (services.getClients as jest.Mock).mockResolvedValue([mockClient]);
    const response = await request(app).get('/api/clients');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(mockClient);
  });

  it('GET /api/clients - should return empty array if no client', async () => {
    (services.getClients as jest.Mock).mockResolvedValue([]);
    const response = await request(app).get('/api/clients');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /api/clients?includeDeleted=true - should list all clients (active + deleted)', async () => {
    (services.getClients as jest.Mock).mockResolvedValue([
      mockClient,
      { ...mockClient, _id: '456', deletedAt: '2024-06-01T13:00:00.000Z' },
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
    (services.getClients as jest.Mock).mockResolvedValue([
      { ...mockClient, _id: '456', deletedAt: '2024-06-01T13:00:00.000Z' },
    ]);
    const response = await request(app).get('/api/clients?deletedOnly=true');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].deletedAt).toBeDefined();
  });

  it('GET /api/clients/:id - should return 404 if not found', async () => {
    (services.getClientById as jest.Mock).mockResolvedValue(null);
    const response = await request(app).get('/api/clients/unknown');
    expect(response.status).toBe(404);
  });
});
