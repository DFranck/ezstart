/**
 * `POST /api/contact` - public contact form.
 *
 *   - validates body (company, email, message, topic)
 *   - forwards to the internal inbox through the email service
 *   - honeypot answers 200 without sending
 *   - delivery failure -> 502 (no internal detail leaked)
 *   - HTML escaping of visitor-controlled fields
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

vi.mock('../../services/contact-email.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/contact-email.js')>()
  return { ...actual, sendContactEmail: vi.fn<typeof actual.sendContactEmail>() }
})

import contactRouter from '../../routes/contact/submitContact.js'
import { escapeHtml, sendContactEmail } from '../../services/contact-email.js'

const sendMock = vi.mocked(sendContactEmail)

let server: Server
let baseUrl: string

const validBody = {
  topic: 'pro',
  company: 'ACME Footwear',
  email: 'buyer@acme.example',
  message: 'We export to the EU and need export readiness support.',
}

async function post(body: unknown) {
  const res = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api', contactRouter)
  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  sendMock.mockReset()
  sendMock.mockResolvedValue(undefined)
})

describe('POST /api/contact', () => {
  it('forwards a valid request to the email service', async () => {
    const { status } = await post(validBody)
    expect(status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining(validBody))
  })

  it('rejects an invalid email', async () => {
    const { status } = await post({ ...validBody, email: 'not-an-email' })
    expect(status).toBe(422)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('rejects an empty message and an unknown topic', async () => {
    expect((await post({ ...validBody, message: '   ' })).status).toBe(422)
    expect((await post({ ...validBody, topic: 'spam' })).status).toBe(422)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('answers 200 but does not send when the honeypot is filled', async () => {
    const { status } = await post({ ...validBody, website: 'http://spam.example' })
    expect(status).toBe(200)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns 502 without internal details when delivery fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('resend: invalid api key re_secret'))
    const { status, json } = await post(validBody)
    expect(status).toBe(502)
    expect(JSON.stringify(json)).not.toContain('re_secret')
  })
})

describe('escapeHtml', () => {
  it('escapes markup so visitor input cannot inject HTML in the email', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;'
    )
  })
})
