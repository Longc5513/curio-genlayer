import { useState, useRef, useEffect } from 'react'
import { callMiMo } from '../lib/mimo-ai'
import './CurioBot.css'

interface ChatMsg { role: 'user' | 'assistant'; content: string }
type RobotMood = 'idle' | 'walking' | 'talking' | 'thinking' | 'waving' | 'excited'
interface BountyFormData { id: string; title: string; brief: string; rubric: string; refUrl: string }
interface BountyInfo { bounty_id: string; title: string; status: string; quality_score: number; verdict: string; reward_wei: number }

interface RobotProps {
  onConnectWallet: () => Promise<void>
  onCreateBounty: (data?: BountyFormData) => void
  onBrowseBounties: () => void
  onAdjudicate: (bountyId: string) => Promise<void>
  onViewBounty: (bountyId: string) => void
  bounties: BountyInfo[]
  account: string | null
}

export default function CurioBot({ onConnectWallet, onCreateBounty, onBrowseBounties, onAdjudicate, onViewBounty, bounties, account }: RobotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mood, setMood] = useState<RobotMood>('idle')
  const [messages, setMessages] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: account
      ? `Hi! I'm CurioBot 🐱 Wallet connected (${account.slice(0,6)}...${account.slice(-4)}). I can:\n\n• **Create bounties** — describe what you need\n• **Check bounties** — show status and details\n• **Adjudicate** — run AI evaluation on submitted bounties\n• **Browse** — list all bounties\n\nWhat would you like to do?`
      : 'Hi! I\'m CurioBot 🐱 I can create bounties, check status, and run AI adjudication. Connect your wallet or describe a bounty to get started!'
  }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (showBubble) { const t = setTimeout(() => setShowBubble(false), 8000); return () => clearTimeout(t) } }, [showBubble])
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

  // ── Generate bounty from user request ──
  const generateAndFill = async (userText: string) => {
    setIsTyping(true)
    setMood('thinking')
    addBotMsg('🤖 Analyzing your request and generating bounty…')

    try {
      const result = await callMiMo([
        { role: 'system', content: `You are a bounty form filler for Curio on GenLayer blockchain.
Given ANY user message, extract or infer bounty details and generate form data.
Return ONLY valid JSON (no markdown): {"id":"slug","title":"title","brief":"description","rubric":"scoring","refUrl":""}
- id: lowercase, hyphens, 5-40 chars
- title: 10-100 chars
- brief: 50-500 chars, detailed description
- rubric: 50-500 chars, scoring criteria with points
- refUrl: URL or empty string
- Always respond in English
- If user gives no topic, create a reasonable example` },
        { role: 'user', content: userText }
      ], 800)

      let data: BountyFormData
      try {
        const jsonMatch = result.match(/\{[\s\S]*?\}/)
        if (!jsonMatch) throw new Error('No JSON')
        const parsed = JSON.parse(jsonMatch[0])
        data = {
          id: String(parsed.id || `bounty-${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40),
          title: String(parsed.title || userText.slice(0, 100)),
          brief: String(parsed.brief || ''),
          rubric: String(parsed.rubric || 'Accuracy 30pts, Completeness 25pts, Clarity 25pts, Examples 20pts'),
          refUrl: String(parsed.refUrl || ''),
        }
      } catch {
        data = {
          id: `bounty-${Date.now().toString(36)}`,
          title: userText.slice(0, 80) || 'New Learning Bounty',
          brief: result.slice(0, 500) || 'Describe your deliverable here.',
          rubric: 'Accuracy 30pts, Completeness 25pts, Clarity 25pts, Examples 20pts',
          refUrl: '',
        }
      }

      addBotMsg(`✅ Done! Form pre-filled:\n\n📄 **${data.title}**\n📝 ${data.brief.slice(0, 150)}${data.brief.length > 150 ? '…' : ''}\n📏 ${data.rubric.slice(0, 100)}…\n\nTaking you to Create Bounty…`)
      setTimeout(() => onCreateBounty(data), 1500)
    } catch {
      addBotMsg('⚠️ Could not generate. Taking you to Create Bounty to fill manually.')
      setTimeout(() => onCreateBounty(), 1000)
    } finally {
      setIsTyping(false)
      setMood('idle')
    }
  }

  // ── Adjudicate a bounty ──
  const runAdjudicate = async (bountyId: string) => {
    if (!account) {
      addBotMsg('🔗 Connect your wallet first to run adjudication.')
      return
    }
    addBotMsg(`⚖️ Running AI adjudication on **${bountyId}**…\n\nGenLayer validators will evaluate the submission against the rubric.`)
    try {
      await onAdjudicate(bountyId)
      addBotMsg(`✅ Adjudication complete! Check the bounty for results.`)
    } catch {
      addBotMsg('❌ Adjudication failed. Make sure the bounty has a submitted solution.')
    }
  }

  // ── Check bounties status ──
  const checkBounties = () => {
    if (bounties.length === 0) {
      addBotMsg('📋 No bounties found. Want me to create one for you?')
      return
    }
    const submitted = bounties.filter(b => b.status === 'submitted')
    const open = bounties.filter(b => b.status === 'open')
    const paid = bounties.filter(b => b.status === 'paid')
    const refunded = bounties.filter(b => b.status === 'refunded')
    const moreInfo = bounties.filter(b => b.status === 'more_info')

    let msg = `📊 **Bounty Status Report** (${bounties.length} total)\n\n`
    if (open.length) msg += `🟢 **Open** (${open.length}): ${open.map(b => b.title).join(', ')}\n`
    if (submitted.length) msg += `📩 **Submitted** (${submitted.length}): ${submitted.map(b => `**${b.bounty_id}** — ${b.title}`).join(', ')}\n`
    if (paid.length) msg += `✅ **Paid** (${paid.length}): ${paid.map(b => `${b.title} (${b.quality_score}/100)`).join(', ')}\n`
    if (refunded.length) msg += `↩️ **Refunded** (${refunded.length})\n`
    if (moreInfo.length) msg += `🔄 **Needs Revision** (${moreInfo.length})\n`

    if (submitted.length > 0) {
      msg += `\n⚡ **${submitted.length} bounty(s) waiting for adjudication!** Say "adjudicate ${submitted[0].bounty_id}" to run AI evaluation.`
    }

    addBotMsg(msg)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setIsTyping(true)
    setMood('thinking')

    const lower = text.toLowerCase().trim()

    // Connect wallet
    if (lower.includes('connect') && lower.includes('wallet')) {
      addBotMsg('🔗 Opening MetaMask… Please approve!')
      try { await onConnectWallet(); addBotMsg('✅ Wallet connected!') }
      catch { addBotMsg('❌ Connection failed.') }
      setIsTyping(false); setMood('idle'); return
    }

    // Browse
    if (lower === 'browse' || lower.includes('show bounties') || lower.includes('list bounties')) {
      addBotMsg('🔍 Showing all bounties!')
      onBrowseBounties()
      setIsTyping(false); setMood('idle'); return
    }

    // Check bounties / status
    if (lower.includes('check') || lower.includes('status') || lower.includes('how many')) {
      checkBounties()
      setIsTyping(false); setMood('idle'); return
    }

    // Adjudicate specific bounty
    if (lower.includes('adjudicate') || lower.includes('judge') || lower.includes('evaluate') || lower.includes('check result')) {
      // Try to extract bounty ID
      const idMatch = text.match(/(?:adjudicate|judge|evaluate|check)\s+([a-z0-9-]+)/i)
      if (idMatch) {
        await runAdjudicate(idMatch[1])
      } else {
        // Find submitted bounties
        const submitted = bounties.filter(b => b.status === 'submitted')
        if (submitted.length === 0) {
          addBotMsg('📋 No bounties waiting for adjudication. A bounty must have a submitted solution first.')
        } else if (submitted.length === 1) {
          await runAdjudicate(submitted[0].bounty_id)
        } else {
          addBotMsg(`📋 Found ${submitted.length} bounties waiting for adjudication:\n${submitted.map((b, i) => `${i + 1}. **${b.bounty_id}** — ${b.title}`).join('\n')}\n\nSay "adjudicate [id]" to run AI evaluation.`)
        }
      }
      setIsTyping(false); setMood('idle'); return
    }

    // How it works
    if (lower.includes('how') || lower === 'help' || lower.includes('what is this')) {
      addBotMsg(`📖 How Curio works:

1️⃣ **Create Bounty** — Escrow GEN, describe your task
2️⃣ **Submit Solution** — Contributors submit work URLs
3️⃣ **Adjudicate** — 5 GenLayer AI validators evaluate independently
4️⃣ **Get Paid** — Score ≥70 → contributor gets GEN. Score <70 → requester refund.

**Commands:**
• "create [description]" — fill bounty form
• "check" — show all bounty statuses
• "adjudicate [id]" — run AI evaluation on submitted bounty
• "adjudicate" — evaluate all pending bounties`)
      setIsTyping(false); setMood('idle'); return
    }

    // View specific bounty
    const viewMatch = text.match(/(?:view|show|open|see)\s+([a-z0-9-]+)/i)
    if (viewMatch) {
      const bid = viewMatch[1]
      const found = bounties.find(b => b.bounty_id === bid)
      if (found) {
        addBotMsg(`📋 Opening bounty **${found.title}**…`)
        onViewBounty(bid)
      } else {
        addBotMsg(`❌ Bounty "${bid}" not found. Say "check" to see all bounties.`)
      }
      setIsTyping(false); setMood('idle'); return
    }

    // DEFAULT: generate bounty
    await generateAndFill(text)
  }

  const submittedCount = bounties.filter(b => b.status === 'submitted').length
  const quickActions = [
    { label: '✨ Create Bounty', action: () => sendMessage('create a bounty') },
    { label: '🔍 Browse', action: () => sendMessage('browse') },
    { label: '📊 Check Status', action: () => sendMessage('check status') },
    ...(submittedCount > 0 ? [{ label: `⚖️ Adjudicate (${submittedCount})`, action: () => sendMessage('adjudicate') }] : []),
    ...(account ? [] : [{ label: '🔗 Connect Wallet', action: () => sendMessage('connect wallet') }]),
  ]

  return (
    <>
      <div className={`curio-bot ${mood} ${isOpen ? 'chat-open' : ''}`}
        style={{ right: 20, bottom: 80 }}
        onClick={() => { setIsOpen(!isOpen); setShowBubble(false) }}>
        <img src="/curiobot.png" alt="CurioBot" className="bot-img" />
        {showBubble && !isOpen && (
          <div className="bot-bubble">
            {submittedCount > 0 ? `${submittedCount} bounty awaiting adjudication! ⚖️` : account ? 'I can create & adjudicate bounties! 🐱' : 'Click me to start! 🐱'}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="bot-chat" style={{ right: 20, bottom: 250 }}>
          <div className="bot-chat-header">
            <img src="/curiobot-reviewer-avatar.png" alt="Bot" className="bot-header-img" />
            <div className="bot-header-info">
              <span className="bot-chat-title">CurioBot</span>
              <span className="bot-chat-subtitle">GenLayer Agent</span>
            </div>
            <button className="bot-chat-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {!account && (
            <div className="bot-action-banner" onClick={() => sendMessage('connect wallet')}>
              <span>🔗 Connect wallet to get started</span>
              <button className="bot-action-btn">Connect</button>
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
              placeholder="Describe bounty, adjudicate, or check status…" />
            <button onClick={() => sendMessage(input)} disabled={isTyping}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
