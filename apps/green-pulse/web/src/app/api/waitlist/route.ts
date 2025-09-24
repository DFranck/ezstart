import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Use /tmp in production (Vercel), local file in development
const WAITLIST_FILE = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'waitlist.json')
  : path.join(process.cwd(), 'waitlist.json')

interface WaitlistData {
  waitlist: string[]
}

async function getWaitlistData(): Promise<WaitlistData> {
  try {
    const data = await fs.readFile(WAITLIST_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist yet, return empty structure
    return { waitlist: [] }
  }
}

async function saveWaitlistData(data: WaitlistData): Promise<void> {
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(data, null, 2))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Get existing data
    const data = await getWaitlistData()

    // Check if email already exists
    const exists = data.waitlist.some(e => e.toLowerCase() === email.toLowerCase())

    if (exists) {
      return NextResponse.json(
        { message: 'Email already registered', alreadyExists: true },
        { status: 200 }
      )
    }

    // Add new email
    data.waitlist.push(email)
    await saveWaitlistData(data)

    return NextResponse.json(
      {
        message: 'Successfully added to waitlist',
        count: data.waitlist.length
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving to waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to save email' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const data = await getWaitlistData()
    return NextResponse.json({
      count: data.waitlist.length,
      waitlist: data.waitlist
    })
  } catch (error) {
    console.error('Error reading waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to read waitlist' },
      { status: 500 }
    )
  }
}