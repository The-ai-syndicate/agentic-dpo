import { NextRequest } from 'next/server'
import { generateResponse, generateResponseStream, ChatMessage } from '@/lib/deepseek'
import { searchPinecone } from '@/lib/pinecone'
import { supabase, initializeDatabase } from '@/lib/supabase'
import { chatConcurrentLimiter, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

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

    let context = ''
    try {
      const searchResults = await searchPinecone(userMessage, 5)
      if (searchResults && Array.isArray(searchResults)) {
        context = searchResults
          .map((result: any) => result.payload?.text || '')
          .filter(Boolean)
          .join('\n\n')
      }
    } catch (error) {
      console.error('Pinecone search failed:', error)
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
    return new Response(JSON.stringify({ response, context: context ? context.substring(0, 500) : null }), {
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
