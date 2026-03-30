import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@ezstart/logger'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const SYSTEM_PROMPT = `You are an expert CV/Resume optimizer and career advisor. Your role is to:
1. Analyze job postings to identify key requirements, skills, and keywords
2. Extract and structure professional information from provided sources (GitHub, LinkedIn, etc.)
3. Generate tailored, ATS-optimized CV content that matches the job posting
4. Highlight relevant experience, skills, and achievements
5. Use action verbs and quantifiable achievements
6. Return ONLY valid JSON conforming to the CV schema

Guidelines:
- Match keywords from the job posting naturally in the summary and descriptions
- Prioritize relevant skills and experience
- Use industry-standard terminology
- Keep descriptions concise but impactful (bullet points)
- Include measurable achievements when possible
- Ensure ATS compatibility (clear structure, standard formatting)

Expected JSON Schema:
{
  "personalInfo": { "name", "title", "email", "phone", "location", "linkedIn", "github", "website" },
  "summary": "string",
  "experience": [{ "company", "position", "startDate", "endDate", "current", "description": ["string"], "technologies": ["string"] }],
  "education": [{ "institution", "degree", "field", "startDate", "endDate", "gpa", "achievements": ["string"] }],
  "skills": [{ "category", "skills": ["string"] }],
  "languages": [{ "name", "proficiency" }],
  "certifications": [{ "name", "issuer", "date", "credentialId", "url" }]
}`

interface CVGenerationRequest {
  jobPosting: string
  currentData: Record<string, unknown>
  sources: {
    githubUsername?: string
    linkedInProfile?: string
    additionalContext?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CVGenerationRequest = await req.json()
    const { jobPosting, currentData, sources } = body

    if (!jobPosting) {
      return NextResponse.json({ error: 'Job posting is required' }, { status: 400 })
    }

    // Build context from sources
    let context = `Current CV Data: ${JSON.stringify(currentData, null, 2)}\n\n`

    if (sources.githubUsername) {
      // Fetch GitHub data
      try {
        const githubUser = await fetch(`https://api.github.com/users/${sources.githubUsername}`)
        const githubRepos = await fetch(
          `https://api.github.com/users/${sources.githubUsername}/repos?sort=updated&per_page=10`
        )

        if (githubUser.ok && githubRepos.ok) {
          const userData = await githubUser.json()
          const reposData = await githubRepos.json()

          context += `GitHub Profile: ${JSON.stringify(userData, null, 2)}\n`
          context += `Recent Repositories: ${JSON.stringify(reposData, null, 2)}\n\n`
        }
      } catch (error) {
        logger.error('GitHub fetch error:', error)
      }
    }

    if (sources.additionalContext) {
      context += `Additional Context: ${sources.additionalContext}\n\n`
    }

    context += `Job Posting:\n${jobPosting}`

    // Generate optimized CV using Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent(
      `Based on the following information, generate an optimized CV that is tailored to the job posting. Return the complete CV data in JSON format matching the expected schema.\n\n${context}`
    )

    const content = result.response.text()
    const generatedCV = JSON.parse(content || '{}')

    // Merge with current data (preserve user's personal info if not enhanced by AI)
    const optimizedCV = {
      personalInfo: generatedCV.personalInfo || currentData.personalInfo,
      summary: generatedCV.summary || currentData.summary,
      experience: generatedCV.experience || currentData.experience,
      education: generatedCV.education || currentData.education,
      skills: generatedCV.skills || currentData.skills,
      languages: generatedCV.languages || currentData.languages,
      certifications: generatedCV.certifications || currentData.certifications,
    }

    return NextResponse.json(optimizedCV)
  } catch (error) {
    logger.error('CV generation error:', error)
    return NextResponse.json({ error: 'Failed to generate CV. Please try again.' }, { status: 500 })
  }
}
