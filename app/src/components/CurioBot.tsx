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
    addBotMsg('🤖 Đang phân tích yêu cầu và tạo bounty bằng MiMo AI…')

    try {
      const result = await callMiMo([
        { role: 'system', content: `You are a smart bounty creation assistant for Curio on GenLayer blockchain.
Your job: Read the user's request carefully and generate SPECIFIC, DETAILED bounty form data based EXACTLY on what they describe.

IMPORTANT RULES:
- Extract ALL specific details from the user's message (names, amounts, deadlines, parties involved, documents, etc.)
- The title must reflect the EXACT topic the user described
- The brief must be a detailed description that includes ALL user-provided context
- The rubric must have specific scoring criteria relevant to the topic
- Generate a clean slug ID from the topic
- If the user mentions specific parties (companies, people), include them in the brief
- If the user mentions amounts, deadlines, or conditions, include them
- Write in the SAME LANGUAGE as the user (Vietnamese → Vietnamese, English → English)

Return ONLY valid JSON:
{
  "id": "slug-format-id",
  "title": "Specific title based on user's request",
  "brief": "Detailed description with ALL user-provided details, 100-500 chars",
  "rubric": "Specific scoring criteria relevant to the topic, 100-500 chars",
  "refUrl": "relevant reference URL or empty string"
}` },
        { role: 'user', content: userRequest }
      ], 800)

      // Parse the AI response
      let data: BountyFormData
      try {
        // Try to extract JSON from response
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : result
        const parsed = JSON.parse(jsonStr)
        data = {
          id: (parsed.id || `bounty-${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40),
          title: parsed.title || userRequest.slice(0, 100),
          brief: parsed.brief || '',
          rubric: parsed.rubric || 'Accuracy 30pts, Completeness 25pts, Clarity 25pts, Examples 20pts',
          refUrl: parsed.refUrl || '',
        }
      } catch {
        // If JSON parse fails, use the raw AI output as brief
        data = {
          id: `bounty-${Date.now().toString(36)}`,
          title: userRequest.slice(0, 100),
          brief: result.slice(0, 500),
          rubric: 'Accuracy 30pts, Completeness 25pts, Clarity 25pts, Examples 20pts',
          refUrl: '',
        }
      }

      // Show what was generated
      addBotMsg(`✅ Đã tạo xong! Form đã điền sẵn:

📄 **${data.title}**
📝 ${data.brief.slice(0, 200)}${data.brief.length > 200 ? '…' : ''}

Đang chuyển bạn sang trang Create Bounty…`)

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

    // Check if user wants to create/fill a bounty with specific details
    const isCreateRequest = lower.includes('tạo bounty') || lower.includes('create bounty') || lower.includes('điền') || lower.includes('fill')
    const hasSpecificDetails = text.length > 30 && (
      lower.includes('công ty') || lower.includes('company') || lower.includes('tranh chấp') || lower.includes('dispute') ||
      lower.includes('hợp đồng') || lower.includes('contract') || lower.includes('thanh toán') || lower.includes('payment') ||
      lower.includes('tutorial') || lower.includes('guide') || lower.includes('bài viết') || lower.includes('code') ||
      lower.includes('viết') || lower.includes('tạo') || lower.includes('làm') || lower.includes('xây dựng') ||
      lower.includes('phân tích') || lower.includes('đánh giá') || lower.includes('kiểm tra')
    )

    if (isCreateRequest || hasSpecificDetails) {
      await generateAndFillForm(text)
      return
    }

    // General chat — MiMo AI decides what to do
    try {
      const ctx = account ? `Wallet: ${account.slice(0,6)}...${account.slice(-4)} (connected)` : 'Wallet: NOT connected'
      const result = await callMiMo([
        { role: 'system', content: `You are CurioBot 🐱, a cute AI assistant for Curio Learning Bounties on GenLayer blockchain.
Help users create bounties. If they describe a specific task/topic, tell them to describe it in detail so you can fill the form.
Be concise, friendly, use emojis. Reply in the same language as the user.
If the user seems to want to create a bounty but hasn't given enough details, ask them what specific topic/task they want.
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
