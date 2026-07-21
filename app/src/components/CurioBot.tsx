import { useState, useRef, useEffect, useCallback } from 'react'
import { callMiMo } from '../lib/mimo-ai'
import './CurioBot.css'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

type RobotMood = 'idle' | 'walking' | 'talking' | 'thinking' | 'waving' | 'excited'

interface RobotProps {
  onConnectWallet: () => void
  onCreateBounty: () => void
  onBrowseBounties: () => void
  account: string | null
}

export default function CurioBot({ onConnectWallet, onCreateBounty, onBrowseBounties, account }: RobotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mood, setMood] = useState<RobotMood>('idle')
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi! I\'m CurioBot 🤖 Your AI assistant for Curio Learning Bounties. How can I help?' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Hide bubble after 5s
  useEffect(() => {
    if (showBubble) {
      const t = setTimeout(() => setShowBubble(false), 5000)
      return () => clearTimeout(t)
    }
  }, [showBubble])

  // Idle animations
  useEffect(() => {
    if (isOpen) return
    const interval = setInterval(() => {
      const moods: RobotMood[] = ['idle', 'waving', 'walking']
      setMood(moods[Math.floor(Math.random() * moods.length)])
      setTimeout(() => setMood('idle'), 2000)
    }, 6000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isOpen) return
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: position.x, posY: position.y }
  }, [isOpen, position])

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPosition({ x: dragRef.current.posX + dx, y: dragRef.current.posY + dy })
    }
    const handleUp = () => { setIsDragging(false); dragRef.current = null }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp) }
  }, [isDragging])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    setMood('thinking')

    // Check for action commands
    const lower = text.toLowerCase()
    if (lower.includes('connect') && lower.includes('wallet')) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Opening wallet connection for you! 🔗' }])
        setMood('excited')
        onConnectWallet()
        setTimeout(() => setMood('idle'), 2000)
        setIsTyping(false)
      }, 800)
      return
    }
    if (lower.includes('create') && lower.includes('bounty')) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Let me take you to the Create Bounty page! I can help you write a great brief using AI. ✨' }])
        setMood('excited')
        onCreateBounty()
        setTimeout(() => setMood('idle'), 2000)
        setIsTyping(false)
      }, 800)
      return
    }
    if (lower.includes('browse') || lower.includes('find') && lower.includes('bounty')) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Showing you all available bounties! 🔍' }])
        setMood('excited')
        onBrowseBounties()
        setTimeout(() => setMood('idle'), 2000)
        setIsTyping(false)
      }, 800)
      return
    }

    // Call MiMo AI
    try {
      const context = account
        ? `User wallet: ${account.slice(0,6)}...${account.slice(-4)}. They are connected.`
        : 'User has NOT connected a wallet yet. Suggest connecting first.'
      
      const sysPrompt = `You are CurioBot, a cute and helpful AI assistant for Curio Learning Bounties on GenLayer blockchain.
You help users: create bounties, submit solutions, understand adjudication, connect wallets, and navigate the platform.
Be concise, friendly, and use emojis. Keep responses under 150 words.
Platform context: ${context}
Available actions you can suggest:
- "connect wallet" - helps user connect MetaMask
- "create bounty" - navigates to bounty creation form
- "browse bounties" - shows all available bounties
Current bounties on platform: 10 (1 open, 1 submitted, 1 more_info, 1 paid, 4 refunded, 2 cancelled)`

      const result = await callMiMo([
        { role: 'system', content: sysPrompt },
        ...messages.slice(-6),
        userMsg,
      ], 300)

      setMessages(prev => [...prev, { role: 'assistant', content: result }])
      setMood('talking')
      setTimeout(() => setMood('idle'), 3000)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops, my brain glitched! 🤕 Try again or use the buttons to navigate.' }])
      setMood('idle')
    } finally {
      setIsTyping(false)
    }
  }

  const quickActions = [
    { label: '🔗 Connect Wallet', action: () => sendMessage('Help me connect my wallet') },
    { label: '✨ Create Bounty', action: () => sendMessage('I want to create a bounty') },
    { label: '🔍 Browse Bounties', action: () => sendMessage('Show me available bounties') },
    { label: '❓ How does this work?', action: () => sendMessage('How does Curio work? Explain the bounty lifecycle.') },
  ]

  return (
    <>
      {/* Robot Character */}
      <div
        className={`curio-bot ${mood} ${isOpen ? 'chat-open' : ''}`}
        style={{ right: position.x, bottom: position.y }}
        onClick={() => { if (!isDragging) { setIsOpen(!isOpen); setShowBubble(false) } }}
        onMouseDown={handleMouseDown}
      >
        <img src="/curiobot.png" alt="CurioBot" className="bot-img" />
        {showBubble && !isOpen && (
          <div className="bot-bubble">
            {account ? 'Click me to chat! 🤖' : 'Connect wallet first! 🔗'}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="bot-chat" style={{ right: position.x, bottom: position.y + 80 }}>
          <div className="bot-chat-header">
            <span className="bot-chat-title">🤖 CurioBot</span>
            <span className="bot-chat-subtitle">Powered by MiMo AI</span>
            <button className="bot-chat-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="bot-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`bot-msg ${msg.role}`}>
                {msg.role === 'assistant' && <span className="bot-msg-avatar"><img src="/curiobot-reviewer-avatar.png" alt="Bot" className="bot-msg-img" /></span>}
                <div className="bot-msg-content">{msg.content}</div>
              </div>
            ))}
            {isTyping && (
              <div className="bot-msg assistant">
                <span className="bot-msg-avatar"><img src="/curiobot-reviewer-avatar.png" alt="Bot" className="bot-msg-img" /></span>
                <div className="bot-msg-content typing">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="bot-quick-actions">
            {quickActions.map((qa, i) => (
              <button key={i} className="bot-quick-btn" onClick={qa.action}>{qa.label}</button>
            ))}
          </div>
          <div className="bot-chat-input">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(input) }}
              placeholder="Ask me anything…"
            />
            <button onClick={() => sendMessage(input)} disabled={isTyping}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
