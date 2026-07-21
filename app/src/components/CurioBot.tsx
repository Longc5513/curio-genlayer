import { useState, useRef, useEffect } from 'react'
import { callMiMo } from '../lib/mimo-ai'
import './CurioBot.css'

interface ChatMsg { role: 'user' | 'assistant'; content: string; actions?: ChatAction[] }
interface ChatAction { label: string; action: () => void; style?: string }
type RobotMood = 'idle' | 'walking' | 'talking' | 'thinking' | 'waving' | 'excited'
interface BountyFormData { id: string; title: string; brief: string; rubric: string; refUrl: string }
interface BountyInfo { bounty_id: string; title: string; status: string; quality_score: number; verdict: string; reward_wei: number; brief: string; rubric: string; submission_url: string }

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
      ? `Hi! I'm CurioBot 🐱 I can:\n\n• **Create bounties** — describe what you need\n• **Check status** — view all bounties\n• **Adjudge** — run AI evaluation and pick winner\n• **Browse** — list all bounties\n\nWhat would you like to do?`
      : 'Hi! I\'m CurioBot 🐱 I can create bounties, check status, and run AI adjudication. Connect your wallet or describe a bounty to get started!'
  }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const [adjudicating, setAdjudicating] = useState<string | null>(null)
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

  const addBotMsg = (content: string, actions?: ChatAction[]) => {
    setMessages(prev => [...prev, { role: 'assistant', content, actions }])
    setMood('talking')
    setTimeout(() => setMood('idle'), 3000)
  }

  // ── Generate bounty from user request ──
  const generateAndFill = async (userText: string) => {
    setIsTyping(true); setMood('thinking')
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
        data = { id: `bounty-${Date.now().toString(36)}`, title: userText.slice(0, 80) || 'New Bounty', brief: result.slice(0, 500), rubric: 'Accuracy 30pts, Completeness 25pts, Clarity 25pts, Examples 20pts', refUrl: '' }
      }
      addBotMsg(`✅ Done! Form pre-filled:\n\n📄 **${data.title}**\n📝 ${data.brief.slice(0, 150)}…\n\nTaking you to Create Bounty…`)
      setTimeout(() => onCreateBounty(data), 1500)
    } catch {
      addBotMsg('⚠️ Could not generate. Taking you to Create Bounty to fill manually.')
      setTimeout(() => onCreateBounty(), 1000)
    } finally { setIsTyping(false); setMood('idle') }
  }

  // ── Run adjudication on a specific bounty ──
  const runAdjudge = async (bountyId: string, bountyTitle: string) => {
    if (!account) { addBotMsg('🔗 Connect your wallet first.'); return }
    setAdjudicating(bountyId)
    addBotMsg(`⚖️ **Running AI Adjudication**\n\nBounty: **${bountyTitle}**\n\n5 GenLayer validators are evaluating the submission against the rubric. This may take a moment…`)

    try {
      await onAdjudicate(bountyId)
      // Get the result
      const bounty = bounties.find(b => b.bounty_id === bountyId)
      if (bounty) {
        const isAccept = bounty.verdict === 'accept'
        const score = bounty.quality_score
        addBotMsg(
          isAccept
            ? `✅ **ACCEPTED** — Score: ${score}/100\n\nThe submission meets the rubric criteria. Contributor receives the escrowed GEN.`
            : bounty.verdict === 'more_info'
              ? `🔄 **MORE INFO NEEDED** — Score: ${score}/100\n\nThe submission needs improvement. Contributor can revise and resubmit.`
              : `❌ **REJECTED** — Score: ${score}/100\n\nThe submission does not meet the rubric. Requester receives a refund.`,
          [{ label: '📋 View Details', action: () => onViewBounty(bountyId), style: 'primary' }]
        )
      } else {
        addBotMsg('✅ Adjudication complete! Check the bounty for results.', [{ label: '📋 View', action: () => onViewBounty(bountyId), style: 'primary' }])
      }
    } catch (e) {
      addBotMsg('❌ Adjudication failed. Make sure the bounty has a submitted solution and you are the requester or contributor.')
    } finally { setAdjudicating(null) }
  }

  // ── Check bounties and show adjudge options ──
  const checkBounties = () => {
    if (bounties.length === 0) { addBotMsg('📋 No bounties found. Want me to create one?'); return }

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

    const actions: ChatAction[] = []

    if (submitted.length > 0) {
      msg += `\n⚡ **${submitted.length} bounty(s) ready for adjudication!**\n`
      submitted.forEach(b => {
        actions.push({
          label: `⚖️ Adjudge: ${b.bounty_id}`,
          action: () => runAdjudge(b.bounty_id, b.title),
          style: 'adjudge'
        })
      })
    }

    addBotMsg(msg, actions)
  }

  // ── Adjudge all pending bounties ──
  const adjudgeAll = async () => {
    const submitted = bounties.filter(b => b.status === 'submitted')
    if (submitted.length === 0) {
      addBotMsg('📋 No bounties waiting for adjudication.')
      return
    }
    if (submitted.length === 1) {
      await runAdjudge(submitted[0].bounty_id, submitted[0].title)
      return
    }
    // Show list with individual adjudge buttons
    let msg = `⚖️ **${submitted.length} bounties ready for adjudication:**\n\n`
    submitted.forEach((b, i) => {
      msg += `${i + 1}. **${b.bounty_id}** — ${b.title}\n`
    })
    msg += `\nClick a button below to adjudge, or say "adjudge [id]"`
    const actions: ChatAction[] = submitted.map(b => ({
      label: `⚖️ Adjudge ${b.bounty_id}`,
      action: () => runAdjudge(b.bounty_id, b.title),
      style: 'adjudge'
    }))
    addBotMsg(msg, actions)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setIsTyping(true); setMood('thinking')

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
      addBotMsg('🔍 Here are all bounties!')
      onBrowseBounties()
      setIsTyping(false); setMood('idle'); return
    }

    // Check status
    if (lower.includes('check') || lower.includes('status') || lower.includes('how many')) {
      checkBounties()
      setIsTyping(false); setMood('idle'); return
    }

    // Adjudge specific bounty
    if (lower.includes('adjudge') || lower.includes('adjudicate') || lower.includes('judge') || lower.includes('evaluate')) {
      const idMatch = text.match(/(?:adjudge|adjudicate|judge|evaluate)\s+([a-z0-9-]+)/i)
      if (idMatch) {
        const bid = idMatch[1]
        const found = bounties.find(b => b.bounty_id === bid)
        if (found) {
          await runAdjudge(bid, found.title)
        } else {
          addBotMsg(`❌ Bounty "${bid}" not found. Say "check" to see all bounties.`)
        }
      } else {
        await adjudgeAll()
      }
      setIsTyping(false); setMood('idle'); return
    }

    // How it works
    if (lower.includes('how') || lower === 'help' || lower.includes('what is this')) {
      addBotMsg(`📖 How Curio works:

1️⃣ **Create Bounty** — Escrow GEN, describe your task
2️⃣ **Submit Solution** — Contributors submit work URLs
3️⃣ **Adjudge** — 5 GenLayer AI validators evaluate independently
4️⃣ **Get Paid** — Score ≥70 → contributor gets GEN. Score <70 → requester refund.

**Commands:**
• "create [description]" — fill bounty form
• "check" — show all bounty statuses
• "adjudge" — evaluate all pending bounties
• "adjudge [id]" — evaluate specific bounty`)
      setIsTyping(false); setMood('idle'); return
    }

    // View specific bounty
    const viewMatch = text.match(/(?:view|show|open|see)\s+([a-z0-9-]+)/i)
    if (viewMatch) {
      const bid = viewMatch[1]
      const found = bounties.find(b => b.bounty_id === bid)
      if (found) { addBotMsg(`📋 Opening **${found.title}**…`); onViewBounty(bid) }
      else { addBotMsg(`❌ Bounty "${bid}" not found.`) }
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
    ...(submittedCount > 0 ? [{ label: `⚖️ Adjudge (${submittedCount})`, action: () => adjudgeAll() }] : []),
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
            {submittedCount > 0 ? `${submittedCount} bounty ready for adjudication! ⚖️` : account ? 'I can create & adjudicate bounties! 🐱' : 'Click me to start! 🐱'}
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
                <div className="bot-msg-content">
                  {msg.content}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="bot-msg-actions">
                      {msg.actions.map((a, j) => (
                        <button key={j} className={`bot-msg-action-btn ${a.style || ''}`} onClick={a.action}>{a.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="bot-msg assistant">
                <span className="bot-msg-avatar"><img src="/curiobot-reviewer-avatar.png" alt="Bot" className="bot-msg-img" /></span>
                <div className="bot-msg-content typing"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
              </div>
            )}
            {adjudicating && (
              <div className="bot-msg assistant">
                <span className="bot-msg-avatar"><img src="/curiobot-reviewer-avatar.png" alt="Bot" className="bot-msg-img" /></span>
                <div className="bot-msg-content"><div className="adjudge-spinner"><div className="adjudge-spinner-icon">⚖️</div><span>Evaluating {adjudicating}…</span></div></div>
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
              placeholder="Describe bounty, adjudge, or check status…" />
            <button onClick={() => sendMessage(input)} disabled={isTyping}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
