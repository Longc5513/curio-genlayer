import { useState, useRef, useEffect, useCallback } from 'react'
import { callMiMo } from '../lib/mimo-ai'
import './CurioBot.css'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

type RobotMood = 'idle' | 'walking' | 'talking' | 'thinking' | 'waving' | 'excited'

interface RobotProps {
  onConnectWallet: () => Promise<void>
  onCreateBounty: () => void
  onBrowseBounties: () => void
  onSubmitSolution?: (url: string, note: string) => void
  onAdjudicate?: (bountyId: string) => void
  account: string | null
}

export default function CurioBot({ onConnectWallet, onCreateBounty, onBrowseBounties, account }: RobotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mood, setMood] = useState<RobotMood>('idle')
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: account
      ? `Hi! I'm CurioBot 🐱 Your wallet is connected (${account.slice(0,6)}...${account.slice(-4)}). I can help you create bounties, submit solutions, or navigate the platform. What would you like to do?`
      : 'Hi! I\'m CurioBot 🐱 Your AI assistant! I can help you connect your wallet, create bounties, submit solutions, and more. Want me to connect your wallet first?'
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const [awaitingAction, setAwaitingAction] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (showBubble) { const t = setTimeout(() => setShowBubble(false), 6000); return () => clearTimeout(t) } }, [showBubble])

  // Idle animations
  useEffect(() => {
    if (isOpen) return
    const interval = setInterval(() => {
      const moods: RobotMood[] = ['idle', 'waving', 'walking']
      setMood(moods[Math.floor(Math.random() * moods.length)])
      setTimeout(() => setMood('idle'), 2000)
    }, 5000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isOpen) return
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: position.x, posY: position.y }
  }, [isOpen, position])

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPosition({ x: dragRef.current.posX + (e.clientX - dragRef.current.startX), y: dragRef.current.posY + (e.clientY - dragRef.current.startY) })
    }
    const handleUp = () => { setIsDragging(false); dragRef.current = null }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp) }
  }, [isDragging])

  const addBotMsg = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }])
    setMood('talking')
    setTimeout(() => setMood('idle'), 3000)
  }

  const doAction = async (action: string) => {
    setMood('excited')
    setIsTyping(true)

    switch (action) {
      case 'connect_wallet':
        addBotMsg('🔗 Connecting your wallet now… Please approve the connection in MetaMask!')
        try {
          await onConnectWallet()
          addBotMsg('✅ Wallet connected successfully! You can now create bounties and submit solutions. What would you like to do next?')
        } catch (e) {
          addBotMsg('❌ Connection failed. Make sure MetaMask is installed and try again. Click "Connect Wallet" in the sidebar if needed.')
        }
        break

      case 'create_bounty':
        if (!account) {
          addBotMsg('🔗 You need to connect your wallet first! Let me do that for you…')
          await doAction('connect_wallet')
          return
        }
        addBotMsg('✨ Taking you to the Create Bounty page! I\'ll help you fill in the details using AI.')
        onCreateBounty()
        break

      case 'browse_bounties':
        addBotMsg('🔍 Showing all available bounties! You can filter by status or sort by reward.')
        onBrowseBounties()
        break

      case 'how_it_works':
        addBotMsg(`📖 Here's how Curio works:\n\n1️⃣ **Create Bounty** — Escrow GEN and describe what you need\n2️⃣ **Submit Solution** — Contributors submit their work URL\n3️⃣ **Adjudicate** — GenLayer AI validators evaluate the submission\n4️⃣ **Get Paid** — If accepted, contributor receives GEN automatically\n\nThe whole process is powered by GenLayer consensus — 5 AI validators independently evaluate each submission!`)
        break

      case 'check_wallet':
        if (account) {
          addBotMsg(`✅ Your wallet is connected: ${account.slice(0,6)}...${account.slice(-4)}\n\nYou can create bounties, submit solutions, and receive payments!`)
        } else {
          addBotMsg('❌ No wallet connected. Let me connect it for you…')
          await doAction('connect_wallet')
        }
        break
    }
    setIsTyping(false)
    setMood('idle')
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    setMood('thinking')

    const lower = text.toLowerCase()

    // Direct action detection
    if ((lower.includes('connect') && lower.includes('wallet')) || lower.includes('kết nối ví') || lower.includes('ket noi vi')) {
      await doAction('connect_wallet')
      setIsTyping(false)
      return
    }
    if ((lower.includes('create') && lower.includes('bounty')) || lower.includes('tạo bounty') || lower.includes('tao bounty')) {
      await doAction('create_bounty')
      setIsTyping(false)
      return
    }
    if (lower.includes('browse') || (lower.includes('find') && lower.includes('bounty')) || lower.includes('xem bounty')) {
      await doAction('browse_bounties')
      setIsTyping(false)
      return
    }
    if (lower.includes('how') && (lower.includes('work') || lower.includes('use')) || lower.includes('hướng dẫn') || lower.includes('huong dan')) {
      await doAction('how_it_works')
      setIsTyping(false)
      return
    }
    if (lower.includes('wallet') || lower.includes('ví')) {
      await doAction('check_wallet')
      setIsTyping(false)
      return
    }

    // MiMo AI response
    try {
      const ctx = account
        ? `User wallet: ${account.slice(0,6)}...${account.slice(-4)} (connected).`
        : 'User wallet: NOT connected. Suggest connecting first.'
      
      const result = await callMiMo([
        { role: 'system', content: `You are CurioBot, a cute robot cat AI assistant for Curio Learning Bounties on GenLayer blockchain.
Help users create bounties, submit solutions, understand adjudication, connect wallets.
Be concise, friendly, use emojis. Keep under 120 words.
Context: ${ctx}
Actions available: connect wallet, create bounty, browse bounties, how it works.
If user asks to do something, suggest the action clearly.` },
        ...messages.slice(-6),
        userMsg,
      ], 250)

      addBotMsg(result)
    } catch {
      addBotMsg('Oops, my brain glitched! 🤕 Try asking me to connect wallet, create bounty, or browse bounties.')
    } finally {
      setIsTyping(false)
    }
  }

  const quickActions = account
    ? [
        { label: '✨ Create Bounty', action: () => sendMessage('Create a bounty') },
        { label: '🔍 Browse Bounties', action: () => sendMessage('Browse bounties') },
        { label: '📖 How it works?', action: () => sendMessage('How does this work?') },
        { label: '💰 Check Wallet', action: () => sendMessage('Check my wallet') },
      ]
    : [
        { label: '🔗 Connect Wallet', action: () => doAction('connect_wallet') },
        { label: '📖 How it works?', action: () => sendMessage('How does this work?') },
        { label: '🔍 Browse Bounties', action: () => doAction('browse_bounties') },
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
            {account ? 'Click me to chat! 🐱' : 'Click me to connect wallet! 🔗'}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="bot-chat" style={{ right: position.x, bottom: position.y + 170 }}>
          <div className="bot-chat-header">
            <img src="/curiobot-reviewer-avatar.png" alt="Bot" className="bot-header-img" />
            <div className="bot-header-info">
              <span className="bot-chat-title">CurioBot</span>
              <span className="bot-chat-subtitle">MiMo AI · GenLayer Agent</span>
            </div>
            <button className="bot-chat-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* Action Banner */}
          {!account && (
            <div className="bot-action-banner" onClick={() => doAction('connect_wallet')}>
              <span>🔗 Connect your wallet to get started</span>
              <button className="bot-action-btn">Connect Now</button>
            </div>
          )}

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
