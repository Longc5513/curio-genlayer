import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { shortAddr, weiToGen, scoreColor, verdictColor, cleanError, timeAgo, formatNumber, truncate } from './lib/format'
import { generateBountyBrief, checkSubmissionQuality, improveDescription } from './lib/mimo-ai'
import CurioBot from './components/CurioBot'
import {
  connectWallet, getConnectedWallet, subscribeWallet,
  getContractHealth, listBounties, getBounty, listRequesterBounties, listContributorBounties,
  createBounty, submitSolution, adjudicate, cancelBounty,
  transactionUrl, contractAddress, networkName, studioImportUrl,
  type LearningBounty, type ContractHealth, type TxState,
} from './lib/genlayer'
import { STATUS_META, VERDICT_META, type View } from './lib/types'

// ── Activity Feed Types ─────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'created' | 'submitted' | 'adjudicated' | 'paid' | 'refunded' | 'more_info'
  bountyId: string
  message: string
  timestamp: number
}

// ── Terminal Lines for Hero ─────────────────────────────────────────

const TERMINAL_LINES = [
  { delay: 0,    text: '$ curio create --title "Python Async Tutorial" --reward 5GEN', type: 'cmd' as const },
  { delay: 800,  text: '> Connecting wallet 0x1234...abcd', type: 'info' as const },
  { delay: 1500, text: '> Escrowing 5 GEN on GenLayer studionet...', type: 'info' as const },
  { delay: 2300, text: '> ✓ Bounty "python-async-tut" created', type: 'success' as const },
  { delay: 3000, text: '', type: 'spacer' as const },
  { delay: 3100, text: '$ curio submit --bounty python-async-tut --url https://my-tutorial.dev', type: 'cmd' as const },
  { delay: 3900, text: '> Submitting deliverable URL...', type: 'info' as const },
  { delay: 4600, text: '> ✓ Solution submitted for review', type: 'success' as const },
  { delay: 5300, text: '', type: 'spacer' as const },
  { delay: 5400, text: '$ curio adjudicate python-async-tut', type: 'cmd' as const },
  { delay: 6200, text: '> GenLayer validators evaluating deliverable...', type: 'info' as const },
  { delay: 7000, text: '> 5/5 validators AGREE — Score: 87/100', type: 'success' as const },
  { delay: 7800, text: '> ✓ Verdict: ACCEPT — 5 GEN paid to contributor', type: 'success' as const },
]

// ── Terminal Card Component ─────────────────────────────────────────

function TerminalCard() {
  const [visibleCount, setVisibleCount] = useState(0)
  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setVisibleCount(i + 1), line.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="terminal-card">
      <div className="terminal-bar">
        <span className="terminal-dot red" /><span className="terminal-dot yellow" /><span className="terminal-dot green" />
        <span className="terminal-title">curio — zsh</span>
      </div>
      <div className="terminal-body">
        {TERMINAL_LINES.slice(0, visibleCount).map((line, i) => {
          if (line.type === 'spacer') return <div key={i} className="terminal-spacer" />
          return (
            <div key={i} className={`terminal-line terminal-${line.type}`}>
              <span className="terminal-prompt">{line.type === 'cmd' ? '$' : '>'}</span>
              <span>{line.text.replace(/^[>$] /, '')}</span>
            </div>
          )
        })}
        {visibleCount < TERMINAL_LINES.length && <span className="terminal-cursor" />}
      </div>
    </div>
  )
}

// ── Activity Feed Component ─────────────────────────────────────────

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return (
    <div className="activity-feed-empty">
      <span className="feed-icon">📡</span>
      <p>Activity will appear here when bounties are created and processed.</p>
    </div>
  )
  return (
    <div className="activity-feed">
      {items.map(item => (
        <div key={item.id} className={`activity-item activity-${item.type}`}>
          <span className="activity-dot" />
          <div className="activity-content">
            <span className="activity-msg">{item.message}</span>
            <span className="activity-time">{timeAgo(new Date(item.timestamp).toISOString())}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Main App
// ══════════════════════════════════════════════════════════════════════

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [health, setHealth] = useState<ContractHealth>({ configured: true, reachable: false, version: '', stats: null, error: '' })
  const [bounties, setBounties] = useState<LearningBounty[]>([])
  const [selected, setSelected] = useState<LearningBounty | null>(null)
  const [myRequester, setMyRequester] = useState<LearningBounty[]>([])
  const [myContributor, setMyContributor] = useState<LearningBounty[]>([])
  const [tx, setTx] = useState<TxState>({ phase: 'idle', label: '' })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'reward' | 'score'>('newest')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [role, setRole] = useState<'requester' | 'contributor'>('requester')
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const activityRef = useRef<ActivityItem[]>([])

  const addActivity = useCallback((type: ActivityItem['type'], bountyId: string, message: string) => {
    const item: ActivityItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type, bountyId, message, timestamp: Date.now() }
    activityRef.current = [item, ...activityRef.current].slice(0, 50)
    setActivityFeed([...activityRef.current])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const h = await getContractHealth()
      setHealth(h)
      if (h.reachable) {
        const b = await listBounties()
        setBounties(b)
        if (account) {
          // Filter by connected account as primary method
          const addr = account.toLowerCase()
          const requester = b.filter(bounty => bounty.requester?.toLowerCase() === addr)
          const contributor = b.filter(bounty => bounty.contributor?.toLowerCase() === addr)
          setMyRequester(requester)
          setMyContributor(contributor)
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [account])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    void getConnectedWallet().then(setAccount).catch(() => setAccount(null))
    return subscribeWallet(setAccount, () => void refresh())
  }, [refresh])

  const txDismiss = () => setTx({ phase: 'idle', label: '' })

  const withTx = async (label: string, fn: (onHash: (h: string) => void) => Promise<string | void>, activityType?: ActivityItem['type'], bountyId?: string) => {
    if (!account) return setTx({ phase: 'error', label: 'Connect wallet first' })
    setTx({ phase: 'submitting', label })
    try {
      await fn((h) => setTx({ phase: 'consensus', label: `${label} — confirming on-chain…`, hash: h }))
      setTx({ phase: 'success', label: `${label} — done!` })
      if (activityType && bountyId) addActivity(activityType, bountyId, `${label} succeeded`)
      // Wait for blockchain to sync
      await new Promise(r => setTimeout(r, 2000))
      await refresh()
    } catch (e) { setTx({ phase: 'error', label: `${label} failed`, error: cleanError(e) }) }
  }

  const handleConnect = async () => {
    setTx({ phase: 'wallet', label: 'Connecting wallet…' })
    try { const a = await connectWallet(); setAccount(a); setTx({ phase: 'success', label: 'Wallet connected' }) }
    catch (e) { setTx({ phase: 'error', label: 'Connection failed', error: cleanError(e) }) }
  }

  const viewBounty = async (b: LearningBounty) => {
    try { setSelected(await getBounty(b.bounty_id)); setView('bounty') }
    catch { setSelected(b); setView('bounty') }
  }

  const filtered = useMemo(() => {
    let result = [...bounties]
    if (filterStatus !== 'all') result = result.filter(b => b.status === filterStatus)
    switch (sortBy) {
      case 'reward': result.sort((a, b) => b.reward_wei - a.reward_wei); break
      case 'score': result.sort((a, b) => b.quality_score - a.quality_score); break
      default: result.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return result
  }, [bounties, filterStatus, sortBy])

  const nav = (v: View) => { setView(v); setSelected(null); setMobileMenuOpen(false) }

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { open: 0, submitted: 0, paid: 0, refunded: 0, more_info: 0, cancelled: 0 }
    bounties.forEach(b => { if (b.status in c) c[b.status]++ })
    return c
  }, [bounties])

  const topBounties = useMemo(() => [...bounties].sort((a, b) => b.reward_wei - a.reward_wei).slice(0, 5), [bounties])

  return (
    <div className="app">
      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? '✕' : '☰'}</button>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-icon">C</div><div><strong>Curio</strong><small>Learning Bounties · GenLayer</small></div></div>
        <nav>
          {([['dashboard','📊','Dashboard'],['browse','🔍','Browse Bounties'],['create','✨','Create Bounty'],['my-bounties','📋','My Bounties'],['my-submissions','📩','My Submissions']] as [View,string,string][]).map(([v,icon,label]) =>
            <button key={v} className={view===v||(view==='bounty'&&v==='browse')?'active':''} onClick={()=>nav(v)}>{icon} {label}</button>
          )}
        </nav>
        <div className="sidebar-filters">
          <h4>By Status</h4>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button key={key} className="filter-link" onClick={() => { setFilterStatus(key); nav('browse') }}>
              {meta.icon} {meta.label}{' '}<span className="filter-count">{statusCounts[key]||0}</span>
            </button>
          ))}
          <button className="filter-link" onClick={() => { setFilterStatus('all'); nav('browse') }}>📋 All</button>
        </div>
        <div className="sidebar-footer">
          <div className="network-badge">{networkName}</div>
          <button className="wallet-btn" onClick={handleConnect}>
            <span className={account?'dot on':'dot'}/>{account?shortAddr(account):'Connect Wallet'}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}/>}

      <main>
        <header className="topbar">
          <div className="topbar-left"><h1>{view==='dashboard'?'Dashboard':view==='browse'?'Browse Bounties':view==='create'?'Create Bounty':view==='my-bounties'?'My Bounties':view==='my-submissions'?'My Submissions':'Bounty Detail'}</h1></div>
          <div className="topbar-right">
            {health.stats && <div className="topbar-stats"><span>📋 {formatNumber(health.stats.bounty_count)}</span><span>🔒 {weiToGen(health.stats.total_escrowed_wei)}</span><span>✅ {weiToGen(health.stats.total_paid_wei)}</span></div>}
          </div>
        </header>

        {tx.phase!=='idle' && (
          <div className={`tx-panel tx-${tx.phase}`}>
            <strong>{tx.label}</strong>{tx.hash && <a href={transactionUrl(tx.hash)} target="_blank" rel="noreferrer">{tx.hash.slice(0,16)}… ↗</a>}{tx.error && <p>{tx.error}</p>}<button onClick={txDismiss}>×</button>
          </div>
        )}

        {!health.reachable && !loading && <div className="alert alert-danger"><strong>⚠ Contract not reachable</strong><p>{health.error||'Check network'}</p><button onClick={()=>void refresh()}>Retry</button></div>}
        {loading && <div className="loading-screen"><div className="loading-spinner"/><p>Loading Curio…</p></div>}

        {/* ═══ DASHBOARD ═══ */}
        {view==='dashboard' && health.reachable && !loading && health.stats && (
          <div className="dashboard-view">
            {/* Terminal Hero */}
            <section className="hero-terminal">
              <div className="hero-content">
                <div className="hero-badge"><span className="pulse-dot"/>Live on GenLayer</div>
                <h2>Consensus-backed<br/>learning bounties.</h2>
                <p>Escrow GEN, submit deliverables, and let AI validators decide — no human reviewers needed.</p>
                <div className="hero-pills">
                  <span className="pill">📝 Submit Deliverable</span>
                  <span className="pill">🤖 AI Evaluation</span>
                  <span className="pill">⚖️ Consensus</span>
                  <span className="pill">💰 Instant Payout</span>
                </div>
              </div>
              <TerminalCard />
            </section>

            {/* Role Toggle */}
            <div className="role-toggle-container">
              <div className="role-toggle">
                <button className={role==='requester'?'active':''} onClick={()=>setRole('requester')}>📋 Requester</button>
                <button className={role==='contributor'?'active':''} onClick={()=>setRole('contributor')}>📩 Contributor</button>
              </div>
              <p className="role-desc">{role==='requester'?'Create bounties and fund learning challenges':'Browse open bounties and submit deliverables to earn GEN'}</p>
            </div>

            {/* Stats */}
            <div className="metric-grid">
              <div className="metric-card"><span className="metric-val">{formatNumber(health.stats.bounty_count)}</span><span className="metric-label">Total Bounties</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_escrowed_wei)}</span><span className="metric-label">GEN Escrowed</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_paid_wei)}</span><span className="metric-label">GEN Paid</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_refunded_wei)}</span><span className="metric-label">GEN Refunded</span></div>
            </div>

            {/* State Machine */}
            <div className="card state-machine">
              <h3>🔄 Bounty Lifecycle</h3>
              <div className="flow-diagram">
                <div className="flow-node flow-open">🟢 Open<small>Requester escrows GEN</small></div>
                <div className="flow-arrow">→</div>
                <div className="flow-node flow-submitted">📩 Submitted<small>Contributor submits URL</small></div>
                <div className="flow-arrow">→</div>
                <div className="flow-node flow-consensus">⚖️ Consensus<small>Validators evaluate</small></div>
                <div className="flow-arrow-group">
                  <div className="flow-branch"><span className="flow-arrow">→</span><div className="flow-node flow-paid">✅ Paid<small>Contributor receives GEN</small></div></div>
                  <div className="flow-branch"><span className="flow-arrow">→</span><div className="flow-node flow-refunded">↩️ Refunded<small>Requester gets GEN back</small></div></div>
                  <div className="flow-branch"><span className="flow-arrow">→</span><div className="flow-node flow-moreinfo">🔄 More Info<small>Contributor revises</small></div></div>
                </div>
              </div>
            </div>

            {/* Two Column: Top Bounties + Activity Feed */}
            <div className="dashboard-grid-2">
              <div className="card">
                <h3>💰 Top Bounties by Reward</h3>
                {topBounties.length > 0 ? topBounties.map(b => (
                  <div key={b.bounty_id} className="top-bounty-row" onClick={() => void viewBounty(b)}>
                    <span className="top-bounty-reward">{weiToGen(b.reward_wei)} GEN</span>
                    <span className="top-bounty-title">{truncate(b.title, 50)}</span>
                    <span className="bounty-status-pill sm" style={{color:STATUS_META[b.status]?.color,background:STATUS_META[b.status]?.color+'18'}}>{STATUS_META[b.status]?.label}</span>
                  </div>
                )) : <div className="empty-sm">No bounties yet. Create the first one!</div>}
              </div>
              <div className="card">
                <h3>📡 Live Activity</h3>
                <ActivityFeed items={activityFeed} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              {role === 'requester' ? (
                <button className="action-card" onClick={() => nav('create')}>
                  <span className="action-icon">✨</span><strong>Create Bounty</strong><p>Escrow GEN for a learning deliverable</p>
                </button>
              ) : (
                <button className="action-card" onClick={() => nav('browse')}>
                  <span className="action-icon">🔍</span><strong>Browse Bounties</strong><p>Find open bounties to contribute to</p>
                </button>
              )}
              <button className="action-card" onClick={() => nav('browse')}>
                <span className="action-icon">📋</span><strong>All Bounties</strong><p>View all bounties on the platform</p>
              </button>
              <a className="action-card" href={studioImportUrl} target="_blank" rel="noreferrer">
                <span className="action-icon">🔧</span><strong>GenLayer Studio ↗</strong><p>View contract on-chain</p>
              </a>
            </div>

            <div className="contract-info-bar">
              <span>Contract: <code>{shortAddr(contractAddress)}</code></span>
              <span>v{health.version}</span>
              <span>{networkName}</span>
              <a href={studioImportUrl} target="_blank" rel="noreferrer">Studio ↗</a>
            </div>
          </div>
        )}

        {/* ═══ BROWSE ═══ */}
        {view==='browse' && !loading && (
          <div className="browse-view">
            <div className="browse-filters">
              <div className="filter-group"><label>Status</label><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">All</option>{Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
              <div className="filter-group"><label>Sort</label><select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}><option value="newest">Newest</option><option value="reward">Highest Reward</option><option value="score">Highest Score</option></select></div>
              <span className="results-count">{filtered.length} bount{filtered.length!==1?'ies':'y'}</span>
            </div>
            <div className="bounty-list">{filtered.map(b=><BountyRow key={b.bounty_id} bounty={b} onClick={()=>void viewBounty(b)}/>)}</div>
            {filtered.length===0 && (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <h3>No bounties found</h3>
                <p>{filterStatus!=='all'?'Try a different filter. ':''}Be the first to create a learning bounty!</p>
                <button className="btn primary" onClick={()=>nav('create')}>✨ Create Bounty</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ BOUNTY DETAIL ═══ */}
        {view==='bounty' && selected && (
          <BountyDetailView bounty={selected} account={account} activityFeed={activityFeed} addActivity={addActivity}
            onRefresh={async()=>{setSelected(await getBounty(selected.bounty_id));await refresh()}}
            onSubmit={(url,note)=>void withTx('Submitting solution',h=>submitSolution(account!,selected.bounty_id,url,note,h))}
            onAdjudicate={()=>void withTx('Running adjudication',h=>adjudicate(account!,selected.bounty_id,h))}
            onCancel={()=>void withTx('Cancelling bounty',h=>cancelBounty(account!,selected.bounty_id,h))}
            onBack={()=>nav('browse')}
          />
        )}

        {/* ═══ CREATE ═══ */}
        {view==='create' && <CreateBountyView account={account} onSubmit={(id,title,brief,rubric,refUrl,gen)=>void withTx('Creating bounty',h=>createBounty(account!,id,title,brief,rubric,refUrl,BigInt(Math.floor(parseFloat(gen)*1e18)),h))} />}

        {/* ═══ MY BOUNTIES ═══ */}
        {view==='my-bounties' && !loading && (
          <div className="my-view">
            {!account && <div className="empty-lg"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><p>Connect to see your bounties.</p></div>}
            {account && (<>
              <h2>Bounties I Created ({myRequester.length})</h2>
              <div className="bounty-list">{myRequester.map(b=><BountyRow key={b.bounty_id} bounty={b} onClick={()=>void viewBounty(b)}/>)}</div>
              {myRequester.length===0 && <div className="empty-state"><span className="empty-icon">📋</span><h3>No bounties yet</h3><p>Escrow GEN and publish a learning challenge.</p><button className="btn primary" onClick={()=>nav('create')}>✨ Create First Bounty</button></div>}
            </>)}
          </div>
        )}

        {/* ═══ MY SUBMISSIONS ═══ */}
        {view==='my-submissions' && !loading && (
          <div className="my-view">
            {!account && <div className="empty-lg"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><p>Connect to see your submissions.</p></div>}
            {account && (<>
              <h2>My Submissions ({myContributor.length})</h2>
              <div className="bounty-list">{myContributor.map(b=><BountyRow key={b.bounty_id} bounty={b} onClick={()=>void viewBounty(b)}/>)}</div>
              {myContributor.length===0 && <div className="empty-state"><span className="empty-icon">📩</span><h3>No submissions yet</h3><p>Browse open bounties and submit deliverables.</p><button className="btn primary" onClick={()=>nav('browse')}>🔍 Browse Bounties</button></div>}
            </>)}
          </div>
        )}
      </main>

      {/* CurioBot AI Assistant */}
      <CurioBot
        account={account}
        onConnectWallet={handleConnect}
        onCreateBounty={() => nav('create')}
        onBrowseBounties={() => nav('browse')}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// BountyRow
// ══════════════════════════════════════════════════════════════════════

function BountyRow({ bounty, onClick }: { bounty: LearningBounty; onClick: () => void }) {
  const s = STATUS_META[bounty.status]; const v = VERDICT_META[bounty.verdict]
  return (
    <div className="bounty-row" onClick={onClick}>
      <div className="bounty-row-left">
        <div className="bounty-status-dot" style={{ background: s?.color }} />
        <div className="bounty-row-info">
          <strong>{truncate(bounty.title, 80)}</strong>
          <span className="bounty-brief">{truncate(bounty.brief, 120)}</span>
        </div>
      </div>
      <div className="bounty-row-right">
        <span className="bounty-reward">💰 {weiToGen(bounty.reward_wei)} GEN</span>
        <span className="bounty-status-pill" style={{ color: s?.color, background: s?.color + '18' }}>{s?.icon} {s?.label}</span>
        {bounty.quality_score > 0 && <span className="bounty-score" style={{ color: scoreColor(bounty.quality_score) }}>{bounty.quality_score}/100</span>}
        {bounty.verdict !== 'pending' && <span className="bounty-verdict" style={{ color: v?.color }}>{v?.label}</span>}
        <span className="bounty-time">{timeAgo(bounty.created_at)}</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// BountyDetailView
// ══════════════════════════════════════════════════════════════════════

function BountyDetailView({ bounty, account, activityFeed, addActivity, onRefresh, onSubmit, onAdjudicate, onCancel, onBack }: {
  bounty: LearningBounty; account: string | null; activityFeed: ActivityItem[]; addActivity: (t: ActivityItem['type'], id: string, msg: string) => void
  onRefresh: () => Promise<void>; onSubmit: (url: string, note: string) => void; onAdjudicate: () => void; onCancel: () => void; onBack: () => void
}) {
  const [submitUrl, setSubmitUrl] = useState(''); const [submitNote, setSubmitNote] = useState(''); const [showSubmit, setShowSubmit] = useState(false)
  const s = STATUS_META[bounty.status]; const v = VERDICT_META[bounty.verdict]
  const isRequester = account && bounty.requester === account
  const isContributor = account && bounty.contributor === account
  const canSubmit = account && !isRequester && (bounty.status === 'open' || (bounty.status === 'more_info' && isContributor))
  const canAdjudicate = account && bounty.status === 'submitted' && (isRequester || isContributor)
  const canCancel = account && isRequester && (bounty.status === 'open' || bounty.status === 'more_info')

  // Related activity for this bounty
  const relatedActivity = activityFeed.filter(a => a.bountyId === bounty.bounty_id)

  return (
    <div className="bounty-detail">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="bounty-detail-header">
        <div className="bounty-detail-meta">
          <span className="bounty-status-pill lg" style={{ color: s?.color, background: s?.color + '18' }}>{s?.icon} {s?.label}</span>
          {bounty.review_round > 0 && <span className="round-badge">Round {bounty.review_round}</span>}
          <span className="bounty-time">{timeAgo(bounty.created_at)}</span>
        </div>
        <h1>{bounty.title}</h1>
        <div className="bounty-reward-lg">💰 {weiToGen(bounty.reward_wei)} GEN</div>
      </div>

      <div className="detail-columns">
        <div className="card"><h3>📝 Brief</h3><p className="detail-text">{bounty.brief}</p></div>
        <div className="card"><h3>📏 Rubric</h3><p className="detail-text">{bounty.rubric}</p></div>
      </div>

      {bounty.reference_url && <div className="card"><h3>📎 Reference</h3><a href={bounty.reference_url} target="_blank" rel="noreferrer" className="ref-link">{bounty.reference_url} ↗</a></div>}

      {/* Submission */}
      {bounty.status !== 'open' && bounty.submission_url && (
        <div className="card submission-card">
          <h3>📩 Submission</h3>
          <div className="submission-info">
            <div><strong>Contributor:</strong> <span className="addr">{shortAddr(bounty.contributor)}</span></div>
            <a href={bounty.submission_url} target="_blank" rel="noreferrer" className="ref-link">{bounty.submission_url} ↗</a>
            {bounty.submission_note && <p className="submission-note">{bounty.submission_note}</p>}
          </div>
        </div>
      )}

      {/* Enhanced Adjudication Panel */}
      {bounty.verdict !== 'pending' && (
        <div className={`adjudication-panel adjudication-${bounty.verdict}`}>
          <div className="adj-header">
            <strong>⚖️ GenLayer AI Verdict</strong>
            <span className="adj-verdict" style={{ color: v?.color }}>{v?.label}</span>
          </div>
          <div className="adj-scores">
            <div className="adj-score">
              <span className="adj-score-label">Quality Score</span>
              <div className="adj-score-bar"><div className="adj-score-fill" style={{ width: `${bounty.quality_score}%`, background: scoreColor(bounty.quality_score) }} /></div>
              <span className="adj-score-val" style={{ color: scoreColor(bounty.quality_score) }}>{bounty.quality_score}/100</span>
            </div>
            <div className="adj-score">
              <span className="adj-score-label">Criteria Met</span>
              <span className="adj-score-val">{bounty.criteria_met}/10</span>
            </div>
            <div className="adj-score">
              <span className="adj-score-label">Payout Threshold</span>
              <span className="adj-score-val" style={{ color: bounty.quality_score >= 70 ? '#3fb950' : '#f85149' }}>{bounty.quality_score >= 70 ? 'PASS (≥70)' : 'FAIL (<70)'}</span>
            </div>
          </div>
          {bounty.reasoning && <div className="adj-reasoning"><strong>Reasoning:</strong> {bounty.reasoning}</div>}
          {bounty.missing_evidence && <div className="adj-missing"><strong>Missing Evidence:</strong> {bounty.missing_evidence}</div>}
          <div className="adj-info"><span>Round {bounty.review_round}</span><span>Reviewed {timeAgo(bounty.updated_at)}</span></div>
        </div>
      )}

      {/* Actions */}
      <div className="bounty-actions">
        {canSubmit && !showSubmit && <button className="btn primary" onClick={() => setShowSubmit(true)}>📩 Submit Solution</button>}
        {canSubmit && showSubmit && (
          <SubmitForm bounty={bounty} onSubmit={onSubmit} onCancel={() => setShowSubmit(false)} />
        )}
        {canAdjudicate && (
          <div className="adj-prompt">
            <div className="adj-prompt-text">⚖️ Solution submitted! Run AI adjudication to evaluate it.</div>
            <button className="btn primary lg" onClick={onAdjudicate}>⚖️ Run Adjudication Now</button>
          </div>
        )}
        {canCancel && <button className="btn danger" onClick={onCancel}>❌ Cancel & Refund</button>}
        <button className="btn secondary" onClick={() => void onRefresh()}>🔄 Refresh</button>
      </div>

      {/* Activity for this bounty */}
      {relatedActivity.length > 0 && (
        <div className="card"><h3>📡 Activity</h3><ActivityFeed items={relatedActivity} /></div>
      )}

      <div className="card parties-card">
        <h3>👥 Parties</h3>
        <div className="parties-grid">
          <div><strong>Requester:</strong> <span className="addr">{shortAddr(bounty.requester)}</span>{isRequester && <span className="you-badge">You</span>}</div>
          {bounty.contributor && bounty.contributor !== '0x0000000000000000000000000000000000000000' && <div><strong>Contributor:</strong> <span className="addr">{shortAddr(bounty.contributor)}</span>{isContributor && <span className="you-badge">You</span>}</div>}
          <div><strong>Bounty ID:</strong> <code>{bounty.bounty_id}</code></div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// SubmitForm (AI-enhanced)
// ══════════════════════════════════════════════════════════════════════

function SubmitForm({ bounty, onSubmit, onCancel }: {
  bounty: LearningBounty; onSubmit: (url: string, note: string) => void; onCancel: () => void
}) {
  const [url, setUrl] = useState(''); const [note, setNote] = useState('')
  const [aiCheck, setAiCheck] = useState<{ score: number; feedback: string; suggestions: string[] } | null>(null)
  const [checking, setChecking] = useState(false)

  const handleAICheck = async () => {
    if (!url.trim() || !note.trim()) return
    setChecking(true)
    try {
      const result = await checkSubmissionQuality(bounty.brief, bounty.rubric, url, note)
      setAiCheck(result)
    } catch { setAiCheck(null) }
    finally { setChecking(false) }
  }

  return (
    <div className="card submit-form">
      <h3>Submit Your Solution</h3>
      <div className="form">
        <div className="form-group"><label>Solution URL (HTTPS)</label><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-deliverable.com" /></div>
        <div className="form-group"><label>Note to Requester</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Describe your deliverable…" rows={4} /></div>
        <div className="form-actions">
          <button className="btn ai" onClick={handleAICheck} disabled={checking || !url.trim() || !note.trim()}>{checking ? '🤖 Checking…' : '🤖 AI Pre-Check'}</button>
          <button className="btn primary" onClick={() => onSubmit(url, note)}>Submit</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
        {aiCheck && (
          <div className={`ai-check-result ${aiCheck.score >= 70 ? 'good' : aiCheck.score >= 40 ? 'ok' : 'low'}`}>
            <strong>🤖 AI Score: {aiCheck.score}/100</strong>
            <p>{aiCheck.feedback}</p>
            {aiCheck.suggestions.length > 0 && (
              <ul>{aiCheck.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// CreateBountyView
// ══════════════════════════════════════════════════════════════════════

function CreateBountyView({ account, onSubmit }: {
  account: string | null; onSubmit: (id: string, title: string, brief: string, rubric: string, refUrl: string, genAmount: string) => void
}) {
  const [id, setId] = useState(''); const [title, setTitle] = useState(''); const [brief, setBrief] = useState('')
  const [rubric, setRubric] = useState(''); const [refUrl, setRefUrl] = useState(''); const [genAmount, setGenAmount] = useState('1')
  const [aiLoading, setAiLoading] = useState(false); const [aiMsg, setAiMsg] = useState('')

  const handleAIGenerate = async () => {
    if (!title.trim()) { setAiMsg('Enter a title first'); return }
    setAiLoading(true); setAiMsg('🤖 Generating with MiMo AI…')
    try {
      const result = await generateBountyBrief(title)
      setBrief(result.brief); setRubric(result.rubric)
      setAiMsg('✓ AI generated brief & rubric — review and edit as needed')
    } catch (e) { setAiMsg('⚠ AI generation failed — fill in manually') }
    finally { setAiLoading(false) }
  }

  const handleAIImprove = async () => {
    if (!title.trim() || !brief.trim()) { setAiMsg('Enter title and brief first'); return }
    setAiLoading(true); setAiMsg('🤖 Improving description…')
    try {
      const improved = await improveDescription(title, brief)
      setBrief(improved); setAiMsg('✓ Description improved by AI')
    } catch (e) { setAiMsg('⚠ AI improvement failed') }
    finally { setAiLoading(false) }
  }

  if (!account) return <div className="create-view"><div className="empty-lg"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><p>Connect to create bounties.</p></div></div>

  return (
    <div className="create-view">
      <div className="card">
        <h3>✨ Create a Learning Bounty</h3>
        <p className="create-desc">Escrow GEN and describe the deliverable you need. GenLayer validators will evaluate submissions against your rubric using AI consensus.</p>
        <div className="form">
          <div className="form-group"><label>Bounty ID (slug)</label><input type="text" value={id} onChange={e=>setId(e.target.value)} placeholder="python-async-tutorial"/><small>Letters, numbers, hyphens, underscores</small></div>
          <div className="form-group">
            <label>Title</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Write a Python async/await tutorial"/>
            <div className="ai-buttons">
              <button className="btn ai" onClick={handleAIGenerate} disabled={aiLoading}>🤖 AI Generate Brief & Rubric</button>
            </div>
          </div>
          <div className="form-group">
            <label>Brief (30-2500 chars)</label>
            <textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe what you need in detail…" rows={5}/>
            {brief && <button className="btn ai small" onClick={handleAIImprove} disabled={aiLoading}>✨ AI Improve</button>}
          </div>
          <div className="form-group"><label>Scoring Rubric (30-2500 chars)</label><textarea value={rubric} onChange={e=>setRubric(e.target.value)} placeholder="How should the deliverable be evaluated? What criteria matter?" rows={5}/></div>
          <div className="form-group"><label>Reference URL (optional)</label><input type="url" value={refUrl} onChange={e=>setRefUrl(e.target.value)} placeholder="https://example.com/reference"/></div>
          <div className="form-group"><label>Reward (GEN)</label><input type="number" step="0.01" min="0.01" value={genAmount} onChange={e=>setGenAmount(e.target.value)}/><small>This GEN will be escrowed in the contract</small></div>
          {aiMsg && <div className="ai-message">{aiMsg}</div>}
          <button className="btn primary lg" onClick={()=>onSubmit(id,title,brief,rubric,refUrl,genAmount)}>🔒 Escrow {genAmount} GEN & Create Bounty</button>
        </div>
      </div>
    </div>
  )
}
