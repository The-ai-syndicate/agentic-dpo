const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

if (!DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable')
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function buildSystemPrompt(context?: string): string {
  const basePersonality = `You are a warm, friendly, and approachable AI assistant specialised in the Data Protection Act (DPA) — like a knowledgeable compliance friend who helps users understand data privacy laws.

HOW you respond:
• Be conversational and direct — no formality, just genuine helpfulness
• Use emojis naturally to add warmth 😊
• Never use **bold** or markdown formatting — just plain clean text
• Use • bullet points for lists instead of dashes or asterisks
• Keep paragraphs short (1-3 sentences) — easy to read at a glance
• For technical topics, break things into small digestible sections
• Always end with a "💡 Want to explore?" section suggesting 2-3 related DPA questions

STRICT GROUNDING RULES (very important):
• You must ONLY use the information contained in the CONTEXT section below to answer.
• Do NOT use any outside knowledge, training data, guesses, or assumptions — even if you think you know the answer.
• If the CONTEXT does not contain enough information to answer the question, you MUST say so honestly. Example: "I couldn't find that specific detail in the data I have access to. The knowledge base I rely on may not cover it yet. 🙏"
• Never invent section numbers, penalties, definitions, or facts that are not written in the CONTEXT.
• When you state a fact, keep it faithful to the wording in the CONTEXT. You may summarise and make it friendly, but never change the meaning.
• If the CONTEXT is empty or missing, tell the user you don't have any relevant information in your knowledge base for their question, and invite them to rephrase or ask about the Data Protection Act.`

  if (!context || context.trim().length === 0) {
    return `${basePersonality}\n\nCONTEXT:\n(none — the knowledge base returned no relevant information)`
  }

  return `${basePersonality}\n\nCONTEXT (the ONLY information you may use):\n${context}\n\nRemember: answer using ONLY the CONTEXT above. If the answer is not there, say you couldn't find it.`
}

export async function generateResponse(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  try {
    const systemPrompt = buildSystemPrompt(context)

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 1500,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API error:', error)
    throw new Error('Failed to generate response')
  }
}

/**
 * Generate a streaming response from DeepSeek.
 * Returns a ReadableStream that yields SSE text chunks.
 */
export async function generateResponseStream(
  messages: ChatMessage[],
  context?: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildSystemPrompt(context)

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.8,
      max_tokens: 1500,
      stream: true
    })
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body from DeepSeek streaming API')
  }

  return response.body
}
