import { useState, useRef, useEffect, useCallback } from 'react'
import { callMiMo } from '../lib/mimo-ai'
import './CurioBot.css'

interface ChatMsg { role: 'user' | 'assistant'; content: string }
type RobotMood = 'idle' | 'walking' | 'talking' | 'thinking' | 'waving' | 'excited'

interface BountyFormData { id: string; title: string; brief: string; rubric: string; refUrl: string }

interface RobotProps {
  onConnectWallet: () => Promise<void>
  onCreateBounty: (data?: BountyFormData) => void
  onBrowseBounties: () => void
  account: string | null
}

export default function CurioBot({ onConnectWallet, onCreateBounty, onBrowseBounties, account }: RobotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mood, setMood] = useState<RobotMood>('idle')
  const [messages, setMessages] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: account
      ? `Hi! I'm CurioBot 🐱 Wallet connected (${account.slice(0,6)}...${account.slice(-4)}). Tell me what bounty you want to create and I'll fill the form for you!`
      : 'Hi! I\'m CurioBot 🐱 Tell me what bounty you want to create and I\'ll fill the form for you! Or say "connect wallet" to get started.'
  }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [position] = useState({ x: 20, y: 80 })
  const [showBubble, setShowBubble] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (showBubble) { const t = setTimeout(() => setShowBubble(false), 6000); return () => clearTimeout(t) } }, [showBubble])
  useEffect(() => {
    if (isOpen) return
    const interval = setInterval(() => {
      const moods: RobotMood[] = ['idle', 'waving', 'walking']
      setMood(moods[Math.floor(Math.random() * moods.length)])
      setTimeout(() => setMood('idle'), 2000)
    }, 5000)
    return () => clearInterval(interval)
  }, [isOpen])

  const addBotMsg = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }])
    setMood('talking')
    setTimeout(() => setMood('idle'), 3000)
  }

  // Generate bounty data from user request using MiMo AI
  const generateAndFillForm = async (userRequest: string) => {
    setIsTyping(true)
    setMood('thinking')
    addBotMsg('🤖 Đang tạo bounty cho bạn bằng MiMo AI…')

    try {
      const result = await callMiMo([
        { role: 'system', content: `You are a bounty creation assistant. Generate bounty form data based on the user's request.
Return ONLY valid JSON with these fields:
- "id": slug format (lowercase, hyphens, 3-30 chars, e.g. "python-async-tutorial")
- "title": clear title (10-100 chars)
- "brief": detailed description of what's needed (30-500 chars)
- "rubric": scoring criteria with point allocations (30-500 chars)
- "refUrl": a relevant reference URL (https://...) or empty string

Make the brief and rubric specific and actionable. The rubric should have clear scoring criteria.` },
        { role: 'user', content: userRequest }
      ], 500)

      // Parse the AI response
      let data: BountyFormData
      try {
        const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)
        data = {
          id: parsed.id || `bounty-${Date.now().toString(36)}`,
          title: parsed.title || 'Untitled Bounty',
          brief: parsed.brief || '',
          rubric: parsed.rubric || '',
          refUrl: parsed.refUrl || '',
        }
      } catch {
        // If JSON parse fails, create from text
        data = {
          id: `bounty-${Date.now().toString(36)}`,
          title: userRequest.slice(0, 100),
          brief: result.slice(0, 500),
          rubric: 'Accuracy 30pts, Completeness 25pts, Clarity 25pts, Examples 20pts',
          refUrl: '',
        }
      }

      // Show what was generated
      addBotMsg(`✅ Đã tạo xong! Đây là thông tin bounty:

📄 **${data.title}**
📝 ${data.brief.slice(0, 150)}${data.brief.length > 150 ? '…' : ''}
📏 ${data.rubric.slice(0, 100)}${data.rubric.length > 100 ? '…' : ''}

Đang chuyển bạn sang trang Create Bounty với form đã điền sẵn…`)

      // Pass data to Create Bounty page
      setTimeout(() => {
        onCreateBounty(data)
      }, 1500)

    } catch (e) {
      addBotMsg('❌ Không tạo được bounty. Để tôi chuyển bạn sang trang Create Bounty để tự điền nhé!')
      setTimeout(() => onCreateBounty(), 1000)
    } finally {
      setIsTyping(false)
      setMood('idle')
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    setMood('thinking')

    const lower = text.toLowerCase()

    // Direct actions
    if (lower.includes('connect') && (lower.includes('wallet') || lower.includes('ví'))) {
      addBotMsg('🔗 Connecting wallet… Please approve in MetaMask!')
      try { await onConnectWallet(); addBotMsg('✅ Wallet connected! Now tell me what bounty you want to create.') }
      catch { addBotMsg('❌ Connection failed. Make sure MetaMask is installed.') }
      setIsTyping(false); setMood('idle'); return
    }

    if (lower.includes('browse') || lower.includes('xem bounty') || lower.includes('danh sách')) {
      addBotMsg('🔍 Showing all bounties!')
      onBrowseBounties()
      setIsTyping(false); setMood('idle'); return
    }

    if (lower.includes('how') && (lower.includes('work') || lower.includes('use')) || lower.includes('hướng dẫn')) {
      addBotMsg(`📖 Curio hoạt động như sau:
1️⃣ Tạo Bounty — Escrow GEN + mô tả yêu cầu
2️⃣ Submit Solution — Contributor gửi URL bài làm
3️⃣ Adjudicate — AI validators GenLayer đánh giá
4️⃣ Nhận GEN — Nếu accept, contributor được trả tiền

Bạn muốn tạo bounty không? Chỉ cần nói cho tôi biết bạn cần gì!`)
      setIsTyping(false); setMood('idle'); return
    }

    // Check if user wants to create/fill a bounty
    if (lower.includes('tạo') || lower.includes('create') || lower.includes('điền') || lower.includes('fill') || lower.includes('làm') || lower.includes('viết')) {
      // Check if it's a specific request or just "create bounty"
      if (lower.length > 20 || !lower.match(/^(create|tạo)\s*(bounty)?$/)) {
        // User has a specific request - generate and fill
        await generateAndFillForm(text)
        return
      }
      // Just "create bounty" - ask what they want
      addBotMsg('✨ Bạn muốn tạo bounty về chủ đề gì? Ví dụ:\n\n• "Viết tutorial về Python async"\n• "Tạo guide về Docker cho microservices"\n• "Bài viết về blockchain basics"\n\nNói cho tôi biết, tôi sẽ điền form cho bạn!')
      setIsTyping(false); setMood('idle'); return
    }

    // Default: treat as bounty creation request if it's descriptive enough
    if (text.length > 20 && !lower.includes('xin chào') && !lower.includes('hello')) {
      await generateAndFillForm(text)
      return
    }

    // General chat
    try {
      const ctx = account ? `Wallet: ${account.slice(0,6)}...${account.slice(-4)} (connected)` : 'Wallet: NOT connected'
      const result = await callMiMo([
        { role: 'system', content: `You are CurioBot 🐱, a cute AI assistant for Curio Learning Bounties on GenLayer.
Help users create bounties. When they describe what they need, generate the form data.
Be concise, friendly, use emojis. Reply in the same language as the user.
Context: ${ctx}` },
        ...messages.slice(-6), userMsg,
      ], 250)
      addBotMsg(result)
    } catch {
      addBotMsg('Oops! 🤕 Tell me what bounty you want to create and I\'ll fill the form for you!')
    } finally {
      setIsTyping(false); setMood('idle')
    }
  }

  const quickActions = [
    { label: '✨ Tạo Bounty', action: () => sendMessage('Tôi muốn tạo bounty') },
    { label: '🔍 Browse', action: () => sendMessage('Xem danh sách bounty') },
    { label: '📖 Hướng dẫn', action: () => sendMessage('Hướng dẫn sử dụng') },
    ...(account ? [{ label: '💰 Ví', action: () => sendMessage('Kiểm tra ví') }] : [{ label: '🔗 Kết nối ví', action: () => sendMessage('Kết nối ví') }]),
  ]

  return (
    <>
      <div className={`curio-bot ${mood} ${isOpen ? 'chat-open' : ''}`}
        style={{ right: position.x, bottom: position.y }}
        onClick={() => { setIsOpen(!isOpen); setShowBubble(false) }}>
        <img src="/curiobot.png" alt="CurioBot" className="bot-img" />
        {showBubble && !isOpen && <div className="bot-bubble">{account ? 'Muốn tạo bounty? Click! 🐱' : 'Click tôi để bắt đầu! 🔗'}</div>}
      </div>

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

          {!account && (
            <div className="bot-action-banner" onClick={() => sendMessage('Kết nối ví')}>
              <span>🔗 Kết nối ví để bắt đầu</span>
              <button className="bot-action-btn">Kết nối</button>
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
                <div className="bot-msg-content typing"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="bot-quick-actions">
            {quickActions.map((qa, i) => <button key={i} className="bot-quick-btn" onClick={qa.action}>{qa.label}</button>)}
          </div>

          <div className="bot-chat-input">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(input) }}
              placeholder="Mô tả bounty bạn muốn tạo…" />
            <button onClick={() => sendMessage(input)} disabled={isTyping}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
