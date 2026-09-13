import { NextRequest } from 'next/server'
import { generateResponse, generateResponseStream, ChatMessage } from '@/lib/deepseek'
import { getGroundedContext } from '@/lib/pinecone'
import { supabase, initializeDatabase } from '@/lib/supabase'
import { chatConcurrentLimiter, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

// The local embedding model (@xenova/transformers + onnxruntime-node) requires
// the Node.js runtime — it cannot run on the Edge runtime. Cold starts also
// need time to load the model, hence the generous maxDuration.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_USER_MESSAGE_LENGTH = 8000
const MAX_MESSAGES_HISTORY = 50
const MAX_CONTEXT_CHARS = 200000
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(MAX_USER_MESSAGE_LENGTH),
    })
  ).min(1).max(MAX_MESSAGES_HISTORY),
  sessionId: z.string().regex(UUID_REGEX).optional(),
  stream: z.boolean().optional(),
})

let dbInitialized = false

async function ensureDb() {
  if (dbInitialized) return
  try {
    await supabase.from('chat_sessions').select('id').limit(1)
    dbInitialized = true
  } catch {
    console.log('⚙️ Initializing database tables...')
    await initializeDatabase()
    dbInitialized = true
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const acquireKey = `chat:${ip}`

  if (!chatConcurrentLimiter.tryAcquire(acquireKey)) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Concurrent Requests',
        message: 'Please wait for previous responses to complete.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      chatConcurrentLimiter.release(acquireKey)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const parsed = ChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      chatConcurrentLimiter.release(acquireKey)
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { messages, sessionId, stream: wantsStream } = parsed.data

    const userMessage = messages[messages.length - 1]?.content
    if (!userMessage || userMessage.trim().length === 0) {
      chatConcurrentLimiter.release(acquireKey)
      return new Response(JSON.stringify({ error: 'Message content cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0)
    if (totalChars > MAX_CONTEXT_CHARS) {
      chatConcurrentLimiter.release(acquireKey)
      return new Response(
        JSON.stringify({ error: 'Total message context too large. Please start a new conversation.' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve grounded context from the Pinecone knowledge base.
    // Responses are generated ONLY from this context (strict RAG grounding).
    let context = ''
    let sources: string[] = []
    let retrievalError: string | null = null
    try {
      const grounded = await getGroundedContext(userMessage, 5)
      context = grounded.context
      sources = grounded.sources
      retrievalError = grounded.retrievalError
    } catch (error) {
      // getGroundedContext normally does not throw, but guard anyway.
      retrievalError = error instanceof Error ? error.message : String(error)
      console.error('Pinecone search failed:', retrievalError)
    }

    // Distinguish an INFRASTRUCTURE failure (embedding model / Pinecone down)
    // from a genuinely EMPTY knowledge base. The former must surface as an
    // error — never as "I couldn't find anything…".
    if (retrievalError && !context) {
      chatConcurrentLimiter.release(acquireKey)
      const RETRIEVAL_ERROR_MESSAGE =
        'I’m having trouble reaching my knowledge base right now, so I can’t ' +
        'give you a reliable answer. Please try again in a moment. 🙏'

      if (wantsStream) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: RETRIEVAL_ERROR_MESSAGE })}\n\n`)
            )
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      return new Response(
        JSON.stringify({
          error: 'Retrieval unavailable',
          message: RETRIEVAL_ERROR_MESSAGE,
          detail: process.env.NODE_ENV !== 'production' ? retrievalError : undefined,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If the knowledge base has no relevant data, refuse instead of hallucinating.
    const NO_KB_FOUND_MESSAGE =
      "I couldn't find anything about that in the information I have access to. " +
      "My answers only come from the data stored in my knowledge base (currently the " +
      "Botswana Data Protection Act). Could you try rephrasing, or ask me something " +
      "about the Data Protection Act? 😊\n\n" +
      "💡 Want to explore?\n" +
      "• What are my rights as a data subject?\n" +
      "• What does the Act say about data security?\n" +
      "• What are the penalties for non-compliance?"

    if (!context || context.trim().length === 0) {
      if (sessionId) {
        try {
          await ensureDb()
          await supabase.from('chat_sessions').upsert({
            session_id: sessionId,
            updated_at: new Date().toISOString()
          }, { onConflict: 'session_id' }).select().single()

          await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'user',
            content: userMessage
          })

          await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: NO_KB_FOUND_MESSAGE
          })
        } catch (error) {
          console.error('Failed to store no-KB exchange:', error)
        }
      }

      chatConcurrentLimiter.release(acquireKey)

      if (wantsStream) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: NO_KB_FOUND_MESSAGE })}\n\n`)
            )
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      return new Response(
        JSON.stringify({ response: NO_KB_FOUND_MESSAGE, sources: [], grounded: false }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (sessionId) {
      try {
        await ensureDb()
        await supabase.from('chat_sessions').upsert({
          session_id: sessionId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'session_id' }).select().single()

        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage
        })
      } catch (error) {
        console.error('Failed to store user message:', error)
      }
    }

    if (wantsStream) {
      const deepseekStream = await generateResponseStream(
        messages as ChatMessage[],
        context
      )

      const encoder = new TextEncoder()
      let fullResponse = ''

      const stream = new ReadableStream({
        async start(controller) {
          const reader = deepseekStream.getReader()
          const decoder = new TextDecoder()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    if (sessionId && fullResponse) {
                      try {
                        await ensureDb()
                        await supabase.from('chat_messages').insert({
                          session_id: sessionId,
                          role: 'assistant',
                          content: fullResponse
                        })
                      } catch (error) {
                        console.error('Failed to store assistant response:', error)
                      }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    continue
                  }

                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content || ''
                    if (content) {
                      fullResponse += content
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                      )
                    }
                  } catch {
                  }
                }
              }
            }
          } catch (err) {
            console.error('Stream reading error:', err)
          } finally {
            reader.releaseLock()
            controller.close()
            chatConcurrentLimiter.release(acquireKey)
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    const response = await generateResponse(messages as ChatMessage[], context)

    if (sessionId) {
      try {
        await ensureDb()
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: response
        })
      } catch (error) {
        console.error('Failed to store assistant response:', error)
      }
    }

    chatConcurrentLimiter.release(acquireKey)
    return new Response(JSON.stringify({
      response,
      grounded: true,
      sources,
      context: context ? context.substring(0, 500) : null
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    chatConcurrentLimiter.release(acquireKey)
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
