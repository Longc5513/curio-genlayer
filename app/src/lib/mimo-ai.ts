// ── Xiaomi MiMo AI Integration ──────────────────────────────────────
// Provides AI-powered features for the Curio platform:
// - Generate bounty briefs and rubrics
// - Suggest improvements for submissions
// - Summarize content

const MIMO_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions'
const MIMO_API_KEY = import.meta.env.VITE_MIMO_API_KEY || ''
const MIMO_MODEL = 'mimo-v2.5-pro'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callMiMo(messages: ChatMessage[], maxTokens: number = 1024): Promise<string> {
  try {
    const response = await fetch(MIMO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'No response'
  } catch (e) {
    console.error('MiMo API error:', e)
    throw e
  }
}

// ── Bounty Brief Generator ─────────────────────────────────────────

export async function generateBountyBrief(topic: string): Promise<{ brief: string; rubric: string }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert at writing learning bounty specifications for a decentralized bounty platform called Curio on GenLayer.
Generate a clear, detailed brief and scoring rubric for a learning bounty.
Return ONLY valid JSON with keys "brief" and "rubric". No markdown, no explanation.

Brief: 200-500 characters describing what the deliverable should cover.
Rubric: 200-500 characters with specific scoring criteria (point allocations).`
    },
    {
      role: 'user',
      content: `Generate a bounty brief and rubric for this topic: ${topic}`
    }
  ]

  const result = await callMiMo(messages)
  try {
    const parsed = JSON.parse(result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return {
      brief: parsed.brief || result,
      rubric: parsed.rubric || '',
    }
  } catch {
    return { brief: result, rubric: '' }
  }
}

// ── Submission Quality Check ────────────────────────────────────────

export async function checkSubmissionQuality(
  brief: string,
  rubric: string,
  submissionUrl: string,
  submissionNote: string
): Promise<{ score: number; feedback: string; suggestions: string[] }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a pre-submission quality checker for learning bounties.
Evaluate if a submission is likely to pass the bounty's rubric BEFORE it goes to on-chain AI validators.
Return ONLY valid JSON with: "score" (0-100), "feedback" (brief assessment), "suggestions" (array of improvement tips).`
    },
    {
      role: 'user',
      content: `BOUNTY BRIEF:\n${brief}\n\nSCORING RUBRIC:\n${rubric}\n\nSUBMISSION URL:\n${submissionUrl}\n\nSUBMISSION NOTE:\n${submissionNote}`
    }
  ]

  const result = await callMiMo(messages)
  try {
    const parsed = JSON.parse(result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return {
      score: parsed.score || 0,
      feedback: parsed.feedback || result,
      suggestions: parsed.suggestions || [],
    }
  } catch {
    return { score: 0, feedback: result, suggestions: [] }
  }
}

// ── Content Summarizer ──────────────────────────────────────────────

export async function summarizeContent(content: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'Summarize the following content in 2-3 concise sentences. Focus on key points and actionable information.'
    },
    {
      role: 'user',
      content: content.slice(0, 3000)
    }
  ]

  return callMiMo(messages, 256)
}

// ── Bounty Description Improver ─────────────────────────────────────

export async function improveDescription(title: string, brief: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'Improve this bounty description to be clearer, more specific, and more attractive to potential contributors. Keep the same scope but add clarity. Return only the improved text, no JSON wrapper.'
    },
    {
      role: 'user',
      content: `Title: ${title}\n\nBrief: ${brief}`
    }
  ]

  return callMiMo(messages, 512)
}

export { callMiMo }
