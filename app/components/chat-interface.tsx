'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Copy, ThumbsUp, ThumbsDown, Search, Focus, Grid3x3, Globe, Cpu, Paperclip, Mic, Sparkles, ArrowRight, MessageCircle, Lightbulb, Bot, Plus, Trash2 } from 'lucide-react'
import { AppMenu } from './app-menu'

// Use browser's crypto.randomUUID() instead of uuid package to avoid Webpack issues
const uuidv4 = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15)
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  context?: string
  timestamp: Date
}

/** Parse AI response text into styled HTML blocks */
function parseResponse(text: string) {
  // Extract "Want to explore?" / suggested topics section
  const suggestMatch = text.match(/💡\s*Want to explore\?([\s\S]*)$/i)
  const suggestions: string[] = []
  let mainText = text

  if (suggestMatch) {
    mainText = text.substring(0, suggestMatch.index).trim()
    // Parse suggestion items - each line with • or - or number
    const lines = suggestMatch[1].split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const cleaned = line.replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
      if (cleaned && cleaned.length > 3) suggestions.push(cleaned)
    }
  }

  // Parse main text into blocks
  const blocks: React.ReactNode[] = []
  const lines = mainText.split('\n')

  let inList = false
  let listItems: string[] = []
  let inCode = false
  let codeLines: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="space-y-1.5 my-3">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] md:text-[15px] leading-relaxed">
              <span className="text-teal-400 mt-1 flex-shrink-0">•</span>
              <span>{renderInlineContent(item)}</span>
            </li>
          ))}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  const flushCode = () => {
    if (codeLines.length > 0) {
      blocks.push(
        <pre key={`code-${blocks.length}`} className="bg-slate-900/80 border border-white/10 rounded-xl p-4 my-3 overflow-x-auto text-[13px] font-mono leading-relaxed text-teal-200">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      codeLines = []
      inCode = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Code block detection
    if (trimmed.startsWith('```')) {
      flushList()
      if (inCode) {
        flushCode()
      } else {
        inCode = true
        codeLines = []
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    // Empty line
    if (!trimmed) {
      flushList()
      flushCode()
      continue
    }

    // Header detection (lines that look like headers)
    if (trimmed.startsWith('#') || /^[A-Z][A-Z\s]+[A-Z]$/.test(trimmed) && trimmed.length < 60) {
      flushList()
      flushCode()
      const headerText = trimmed.replace(/^#+\s*/, '')
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="text-[15px] md:text-[16px] font-semibold text-white mt-5 mb-2">
          {renderInlineContent(headerText)}
        </h3>
      )
      continue
    }

    // List items
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+[.)]/.test(trimmed)) {
      flushCode()
      inList = true
      const cleanItem = trimmed.replace(/^[•\-*\d.)\s]+/, '').trim()
      listItems.push(cleanItem)
      continue
    } else {
      flushList()
      flushCode()
    }

    // Regular paragraph
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[14px] md:text-[15px] leading-relaxed text-white/90 mb-2">
        {renderInlineContent(trimmed)}
      </p>
    )
  }

  flushList()
  flushCode()

  return { blocks, suggestions }
}

/** Render inline content: handle inline code, simple emphasis */
function renderInlineContent(text: string) {
  // Replace inline code `code` with styled spans
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const codeRegex = /`([^`]+)`/g
  let match: RegExpExecArray | null

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    parts.push(
      <code key={`c-${match.index}`} className="bg-white/10 text-teal-300 px-1.5 py-0.5 rounded-md text-[13px] font-mono">
        {match[1]}
      </code>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? <>{parts}</> : text
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const messagesRef = useRef<Message[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Prevent iOS zoom on focus by ensuring font-size >= 16px
  useEffect(() => {
    const preventZoom = () => {
      if (inputRef.current) {
        inputRef.current.style.fontSize = '16px'
      }
    }
    preventZoom()
  }, [])

  // Quick suggestion chips — Data Protection Act focus
  const quickSuggestions = [
    "What is the Data Protection Act?",
    "Explain my rights under the DPA",
    "How do I handle a data breach?",
    "Give me DPA compliance tips"
  ]

  // Initialize session
  const initSession = useCallback((sessionOverride?: string) => {
    const newSessionId = sessionOverride || uuidv4()
    setSessionId(newSessionId)
    setMessages([])
    setInput('')
    setShowSuggestions(false)

    // Create session in database
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: newSessionId })
    }).catch(error => console.error('Failed to create session:', error))

    // Load previous messages if session exists
    fetch(`/api/history?sessionId=${newSessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at)
          }))
          setMessages(loadedMessages)
        }
      })
      .catch(error => console.error('Failed to load history:', error))
  }, [])

  useEffect(() => {
    initSession()
  }, [initSession])

  const startNewChat = useCallback(() => {
    // Immediately start new chat without confirmation
    // Delete current session from history
    if (sessionId) {
      fetch(`/api/history?sessionId=${sessionId}`, {
        method: 'DELETE',
      }).catch(error => console.error('Failed to delete session:', error))
    }
    initSession(uuidv4())
  }, [sessionId, initSession])

  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (text?: string) => {
    const messageText = text || input
    if (!messageText.trim() || loading) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }

    // Use a ref to track the latest messages for the API call
    const currentMessagesSnapshot = messagesRef.current

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsFocused(false)
    setShowSuggestions(false)
    setLoading(true)

    // Create a placeholder assistant message that will reveal text as it streams
    const assistantId = uuidv4()
    setStreamingId(assistantId)
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...currentMessagesSnapshot.map((m: Message) => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageText }
          ],
          sessionId,
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get response')
      }

      // Read the stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream available')

      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.content || ''
              if (content) {
                accumulatedContent += content

                // Update the message progressively for a smooth type reveal
                // Updating on every chunk gives that real-time streaming feel
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Replace the empty assistant message with an error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: 'Oops! 😅 Something went wrong on my end. Could you try asking that again? I\'m all ears! 👂' }
            : msg
        )
      )
    } finally {
      setLoading(false)
      setStreamingId(null)
    }
  }, [input, loading, sessionId])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(id)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (loading) return
    setInput(suggestion)
    handleSubmit(suggestion)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white min-h-0">
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm shrink-0">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-3 py-2.5 md:px-6 md:py-3">
          <AppMenu />
          <div className="flex flex-1 items-center justify-center gap-2">
            <span className="text-base font-bold tracking-tight text-white md:text-lg">
              Agentic DPO
            </span>
            <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white md:text-xs">
              pro
            </span>
          </div>
          <div className="w-9 md:w-10" />
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-3xl space-y-6 md:space-y-8 px-4 md:px-6">
              <header className="flex items-center justify-center">
                <div className="flex items-center gap-0">
                  <span className="text-2xl md:text-3xl font-bold tracking-tight text-white">Agentic DPO</span>
                  <span className="ml-1 rounded-full bg-teal-600 px-2 md:px-2.5 py-0.5 text-[10px] md:text-xs font-semibold text-white">
                    pro
                  </span>
                </div>
              </header>
              
              <div className="text-center space-y-2">
                <p className="text-sm md:text-base text-white/60">
                  Your AI Data Protection Expert
                </p>
                <p className="text-xs md:text-sm text-white/40 leading-relaxed max-w-lg mx-auto">
                  Helping you reduce compliance risk, protect sensitive data, and avoid the costly consequences of data protection mistakes.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="group flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-500/30 transition-all duration-200 text-left"
                  >
                    <Sparkles className="h-4 w-4 text-teal-400 flex-shrink-0" />
                    <span className="text-[13px] text-white/70 group-hover:text-white/90 leading-snug">{suggestion}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-teal-400 ml-auto flex-shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full py-6 px-4 md:px-6 space-y-5">
            {messages.map((message) => {
              const parsed = message.role === 'assistant' ? parseResponse(message.content) : null
              const isStreaming = message.id === streamingId
              
              return (
                <div key={message.id} className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${isStreaming ? 'type-reveal' : ''}`}>
                  <div className={`flex gap-3 md:gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {/* Assistant Avatar */}
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex flex-col gap-1.5 max-w-2xl ${message.role === 'user' ? 'items-end' : 'flex-1'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`${
                          message.role === 'user'
                            ? 'bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 md:px-5 py-3 md:py-3.5'
                            : 'bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 md:px-5 py-3 md:py-3.5'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="text-[14px] md:text-[15px] leading-relaxed text-white">{message.content}</p>
                        ) : parsed ? (
                          <div className={`space-y-0.5 ${isStreaming && message.content.length > 0 ? 'stream-cursor streaming-content' : ''}`}>
                            {message.content.length === 0 && isStreaming ? (
                              <div className="flex items-center gap-3">
                                <Spinner className="h-4 w-4 text-teal-500" />
                                <div className="flex items-center gap-1">
                                  <span className="text-[14px] text-white/50 font-medium">Thinking</span>
                                  <span className="flex gap-0.5">
                                    <span className="w-1 h-1 bg-teal-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1 h-1 bg-teal-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1 h-1 bg-teal-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                                {parsed.blocks}
                                
                                {/* Suggested Topics Section */}
                                {parsed.suggestions.length > 0 && (
                                  <div className="mt-5 pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Lightbulb className="h-4 w-4 text-amber-400" />
                                      <span className="text-[13px] font-medium text-amber-300/90">Keep exploring</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {parsed.suggestions.map((suggestion, sIdx) => (
                                        <button
                                          key={sIdx}
                                          onClick={() => handleSuggestionClick(suggestion)}
                                          disabled={loading}
                                          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-500/30 transition-all duration-200 text-left disabled:opacity-50"
                                        >
                                          <MessageCircle className="h-3 w-3 text-teal-400 flex-shrink-0" />
                                          <span className="text-[12px] text-white/60 group-hover:text-white/80 leading-snug">{suggestion}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : null}

                        {/* Sources */}
                        {message.context && message.role === 'assistant' && (
                          <div className="mt-3 pt-2 border-t border-white/5">
                            <details className="group">
                              <summary className="text-[11px] text-white/30 hover:text-white/50 cursor-pointer flex items-center gap-1 list-none">
                                <span className="inline-block transition-transform group-open:rotate-90">▶</span>
                                Sources
                              </summary>
                              <p className="text-[11px] text-white/30 mt-1 leading-relaxed">{message.context}</p>
                            </details>
                          </div>
                        )}
                      </div>

                      {/* Timestamp and actions */}
                      <div className={`flex items-center gap-1.5 px-1 ${
                        message.role === 'user' ? 'flex-row' : 'flex-row'
                      }`}>
                        <span className="text-[10px] text-white/20">{formatTime(message.timestamp)}</span>
                        
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10 rounded-md"
                            >
                              {copiedIndex === message.id ? (
                                <span className="text-[9px] text-teal-400 font-medium">Done!</span>
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10 rounded-md"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10 rounded-md"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Avatar - minimal dot */}
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center ring-2 ring-white/10">
                          <span className="text-xs font-semibold text-white/80">You</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-gradient-to-t from-slate-900/80 to-transparent shrink-0">
        <div className="flex items-center justify-center px-4 md:px-6 py-4 md:py-5">
          <div className="w-full max-w-3xl">
            {/* Active suggestions from input */}
            {showSuggestions && input.trim() && !loading && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  `DPA: "${input}"`,
                  `Data breach procedures`,
                  `GDPR vs DPA comparison`
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-teal-500/30 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <div
                className={`animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border-2 bg-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:shadow-[0_4px_30px_rgba(0,0,0,0.5)] ${
                  isFocused ? 'border-teal-500/50 ring-1 ring-teal-500/20 shadow-[0_0_30px_rgba(45,212,191,0.08)]' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Input */}
                <div className="px-4 md:px-5 py-3 md:py-3.5">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      setShowSuggestions(e.target.value.length > 0)
                    }}
                    onFocus={() => {
                      setIsFocused(true)
                      if (input.length > 0) setShowSuggestions(true)
                    }}
                    onBlur={() => {
                      setIsFocused(false)
                      setTimeout(() => setShowSuggestions(false), 150)
                    }}
                    placeholder="Ask anything..."
                    disabled={loading}
                    className="w-full border-0 bg-transparent text-[16px] md:text-[16px] text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
                    style={{ fontSize: '16px' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        handleSubmit()
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between px-2 md:px-2.5 py-2 gap-2">
                  <div className="relative flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startNewChat}
                      disabled={loading}
                      className={`h-8 w-8 md:h-9 md:w-9 rounded-md transition-all duration-300 border-2 border-white/10 text-white/40 hover:bg-white/10 hover:text-white hover:border-teal-500/30 disabled:opacity-50`}
                      title="Start new chat"
                    >
                      <Plus className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 md:h-9 md:w-9 rounded-md transition-all duration-300 border-2 border-teal-500/60 bg-slate-800 text-teal-500 shadow-sm hover:border-teal-500/70 hover:text-teal-400`}
                    >
                      <Search className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 md:h-9 md:w-9 rounded-md transition-all duration-300 border-2 border-transparent text-white/40 hover:bg-white/10 hover:text-white`}
                    >
                      <Focus className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 md:h-9 md:w-9 rounded-md transition-all duration-300 border-2 border-transparent text-white/40 hover:bg-white/10 hover:text-white`}
                    >
                      <Grid3x3 className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      className="hidden sm:flex h-9 w-9 rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <Globe className="h-[17px] w-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      className="hidden sm:flex h-9 w-9 rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <Cpu className="h-[17px] w-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      className="h-8 w-8 md:h-9 md:w-9 rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <Paperclip className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      className="h-8 w-8 md:h-9 md:w-9 rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <Mic className="h-4 w-4 md:h-[17px] md:w-[17px]" />
                    </Button>
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={loading || !input.trim()}
                      className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-teal-600 text-white transition-all hover:bg-teal-700 active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="icon"
                    >
                      <svg className="h-3.5 w-3.5 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="8" width="2" height="8" rx="1" fill="currentColor" />
                        <rect x="8" y="4" width="2" height="16" rx="1" fill="currentColor" />
                        <rect x="12" y="6" width="2" height="12" rx="1" fill="currentColor" />
                        <rect x="16" y="10" width="2" height="4" rx="1" fill="currentColor" />
                        <rect x="20" y="7" width="2" height="10" rx="1" fill="currentColor" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-center gap-1 pt-4">
              <p className="flex flex-wrap items-center justify-center gap-1 text-[11px] md:text-xs text-white/40 text-center">
                <span>Developed by</span>
                <a
                  href="https://obokengmakwati.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-medium hover:text-teal-400 transition-colors underline"
                >
                  OBK
                </a>
                <span>•</span>
                <span>Botswana Data Protection Act Expert</span>
                <span>•</span>
                <a
                  href="https://obokengmakwati.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-teal-400 transition-colors"
                >
                  © {new Date().getFullYear()} Agentic DPO
                </a>
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
