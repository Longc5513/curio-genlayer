import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { shortAddr, weiToGen, scoreColor, verdictColor, cleanError, timeAgo, formatNumber, truncate } from './lib/format'
import { generateBountyBrief, checkSubmissionQuality, improveDescription } from './lib/mimo-ai'
import CurioBot from './components/CurioBot'
import {
  connectWallet, getConnectedWallet, subscribeWallet,
  getContractHealth, listBounties, getBounty,
  createBounty, submitSolution, adjudicate, cancelBounty,
  transactionUrl, contractAddress, networkName, studioImportUrl,
  type LearningBounty, type ContractHealth, type TxState,
} from './lib/genlayer'
import { STATUS_META, VERDICT_META, type View } from './lib/types'

interface ActivityItem { id: string; type: string; bountyId: string; message: string; timestamp: number }
interface BountyFormData { id: string; title: string; brief: string; rubric: string; refUrl: string }

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
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [browsePage, setBrowsePage] = useState(1)
  const [prefilled, setPrefilled] = useState<BountyFormData | null>(null)
  const PER_PAGE = 5
  const actRef = useRef<ActivityItem[]>([])

  const addAct = (type: string, bid: string, msg: string) => {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type, bountyId: bid, message: msg, timestamp: Date.now() }
    actRef.current = [item, ...actRef.current].slice(0, 50)
    setActivityFeed([...actRef.current])
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const h = await getContractHealth(); setHealth(h)
      if (h.reachable) {
        const b = await listBounties(); setBounties(b)
        if (account) {
          const addr = account.toLowerCase()
          setMyRequester(b.filter(x => x.requester?.toLowerCase() === addr))
          setMyContributor(b.filter(x => x.contributor?.toLowerCase() === addr && x.contributor !== '0x0000000000000000000000000000000000000000'))
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

  const withTx = async (label: string, fn: (h: (hash: string) => void) => Promise<string | void>, actType?: string, bId?: string) => {
    if (!account) return setTx({ phase: 'error', label: 'Connect wallet first' })
    setTx({ phase: 'submitting', label })
    try {
      await fn(h => setTx({ phase: 'consensus', label: `${label} — confirming…`, hash: h }))
      setTx({ phase: 'success', label: `${label} — done!` })
      if (actType && bId) addAct(actType, bId, `${label} succeeded`)
      await new Promise(r => setTimeout(r, 2000)); await refresh()
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

  const handleAutoAdjudicate = async (bid: string, url: string, note: string) => {
    if (!account) return
    setTx({ phase: 'submitting', label: 'Submitting solution…' })
    try {
      await submitSolution(account, bid, url, note, h => setTx({ phase: 'consensus', label: 'Submitting…', hash: h }))
      addAct('submitted', bid, 'Solution submitted')
      setTx({ phase: 'submitting', label: 'Running AI adjudication…' })
      await new Promise(r => setTimeout(r, 2000))
      await adjudicate(account, bid, h => setTx({ phase: 'consensus', label: 'AI evaluating…', hash: h }))
      setTx({ phase: 'success', label: 'Adjudication complete!' }); addAct('adjudicated', bid, 'Adjudication complete')
      await new Promise(r => setTimeout(r, 2000)); await refresh()
      try { setSelected(await getBounty(bid)) } catch { /* ok */ }
    } catch (e) { setTx({ phase: 'error', label: 'Failed', error: cleanError(e) }) }
  }

  const filtered = useMemo(() => {
    let r = [...bounties]
    if (filterStatus !== 'all') r = r.filter(b => b.status === filterStatus)
    switch (sortBy) {
      case 'reward': r.sort((a, b) => b.reward_wei - a.reward_wei); break
      case 'score': r.sort((a, b) => b.quality_score - a.quality_score); break
      default: r.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return r
  }, [bounties, filterStatus, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((browsePage - 1) * PER_PAGE, browsePage * PER_PAGE)

  const nav = (v: View) => { setView(v); setSelected(null); setMobileMenuOpen(false); setBrowsePage(1) }

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { open: 0, submitted: 0, paid: 0, refunded: 0, more_info: 0, cancelled: 0 }
    bounties.forEach(b => { if (b.status in c) c[b.status]++ }); return c
  }, [bounties])

  const adjudicationMetrics = useMemo(() => {
    const judged = bounties.filter(b => b.verdict !== 'pending' && b.verdict !== 'cancelled')
    if (judged.length === 0) return { total: 0, avgScore: 0, acceptRate: 0, avgCriteria: 0, highest: null as LearningBounty | null, lowest: null as LearningBounty | null }
    const scores = judged.map(b => b.quality_score)
    const accepted = judged.filter(b => b.verdict === 'accept').length
    return {
      total: judged.length,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      acceptRate: Math.round((accepted / judged.length) * 100),
      avgCriteria: Math.round(judged.reduce((a, b) => a + b.criteria_met, 0) / judged.length * 10) / 10,
      highest: judged.reduce((a, b) => a.quality_score > b.quality_score ? a : b),
      lowest: judged.reduce((a, b) => a.quality_score < b.quality_score ? a : b),
    }
  }, [bounties])

  const recentVerdicts = useMemo(() =>
    bounties.filter(b => b.verdict !== 'pending' && b.verdict !== 'cancelled')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5)
  , [bounties])

  const statusDistribution = useMemo(() => {
    const total = bounties.length || 1
    return [
      { key: 'open', label: 'Open', count: statusCounts.open, pct: Math.round(statusCounts.open / total * 100), color: '#3fb950' },
      { key: 'submitted', label: 'Submitted', count: statusCounts.submitted, pct: Math.round(statusCounts.submitted / total * 100), color: '#58a6ff' },
      { key: 'paid', label: 'Paid', count: statusCounts.paid, pct: Math.round(statusCounts.paid / total * 100), color: '#56d4a0' },
      { key: 'refunded', label: 'Refunded', count: statusCounts.refunded, pct: Math.round(statusCounts.refunded / total * 100), color: '#f0883e' },
      { key: 'more_info', label: 'Revision', count: statusCounts.more_info, pct: Math.round(statusCounts.more_info / total * 100), color: '#d29922' },
      { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, pct: Math.round(statusCounts.cancelled / total * 100), color: '#7d8590' },
    ].filter(s => s.count > 0)
  }, [bounties, statusCounts])

  const topBounties = useMemo(() => [...bounties].sort((a, b) => b.reward_wei - a.reward_wei).slice(0, 5), [bounties])

  return (
    <div className="app">
      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? '✕' : '☰'}</button>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-icon">C</div><div><strong>Curio</strong><small>Learning Bounties · GenLayer</small></div></div>
        <nav>
          {([['dashboard','📊','Dashboard'],['browse','🔍','Browse'],['create','✨','Create'],['my-bounties','📋','My Bounties'],['my-submissions','📩','Submissions']] as [View,string,string][]).map(([v,icon,label]) =>
            <button key={v} className={view === v || (view === 'bounty' && v === 'browse') ? 'active' : ''} onClick={() => nav(v)}>{icon} {label}</button>
          )}
        </nav>
        <div className="sidebar-filters">
          <h4>Status</h4>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button key={key} className="filter-link" onClick={() => { setFilterStatus(key); nav('browse') }}>
              {meta.icon} {meta.label}{' '}<span className="filter-count">{statusCounts[key] || 0}</span>
            </button>
          ))}
          <button className="filter-link" onClick={() => { setFilterStatus('all'); nav('browse') }}>📋 All</button>
        </div>
        <div className="sidebar-footer">
          <div className="network-badge">{networkName}</div>
          <button className="wallet-btn" onClick={handleConnect}>
            <span className={account ? 'dot on' : 'dot'} />{account ? shortAddr(account) : 'Connect Wallet'}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* ── Main ── */}
      <main>
        <header className="topbar">
          <h1>{view === 'dashboard' ? 'Dashboard' : view === 'browse' ? 'Browse Bounties' : view === 'create' ? 'Create Bounty' : view === 'my-bounties' ? 'My Bounties' : view === 'my-submissions' ? 'Submissions' : 'Bounty Detail'}</h1>
          {health.stats && (
            <div className="topbar-stats">
              <span>📋 {formatNumber(health.stats.bounty_count)}</span>
              <span>🔒 {weiToGen(health.stats.total_escrowed_wei)}</span>
              <span>✅ {weiToGen(health.stats.total_paid_wei)}</span>
            </div>
          )}
        </header>

        {tx.phase !== 'idle' && (
          <div className={`tx-panel tx-${tx.phase}`}>
            <strong>{tx.label}</strong>
            {tx.hash && <a href={transactionUrl(tx.hash)} target="_blank" rel="noreferrer">{tx.hash.slice(0, 16)}… ↗</a>}
            {tx.error && <p>{tx.error}</p>}
            <button onClick={() => setTx({ phase: 'idle', label: '' })}>×</button>
          </div>
        )}

        {!health.reachable && !loading && <div className="alert alert-danger"><strong>⚠ Contract not reachable</strong><p>{health.error}</p><button onClick={() => void refresh()}>Retry</button></div>}
        {loading && <div className="loading-screen"><div className="loading-spinner" /><p>Loading…</p></div>}

        {/* ═══════════ DASHBOARD ═══════════ */}
        {view === 'dashboard' && health.reachable && !loading && health.stats && (
          <div className="dashboard-view">
            {/* Metrics */}
            <div className="metric-grid">
              <div className="metric-card"><span className="metric-val">{formatNumber(health.stats.bounty_count)}</span><span className="metric-label">Total Bounties</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_escrowed_wei)}</span><span className="metric-label">GEN Escrowed</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_paid_wei)}</span><span className="metric-label">GEN Paid</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_refunded_wei)}</span><span className="metric-label">GEN Refunded</span></div>
            </div>

            {/* Lifecycle */}
            <div className="card lifecycle-card">
              <div className="lc-header">
                <h3>BOUNTY LIFECYCLE</h3>
                <div className="lc-legend">
                  <span className="lc-leg lc-leg-idle">IDLE</span>
                  <span className="lc-leg lc-leg-active">ACTIVE</span>
                  <span className="lc-leg lc-leg-done">DONE</span>
                </div>
              </div>
              <div className="flow-track">
                {/* Step 1: Open */}
                <div className={`flow-step ${statusCounts.open > 0 ? 'fs-active' : bounties.length > 0 ? 'fs-done' : ''}`}>
                  <div className="fs-dot"><span>01</span></div>
                  <div className="fs-box">
                    <div className="fs-icon">🟢</div>
                    <div className="fs-label">OPEN</div>
                    <div className="fs-sub">Escrow GEN</div>
                    {statusCounts.open > 0 && <div className="fs-count">{statusCounts.open}</div>}
                  </div>
                </div>
                {/* Arrow 1 */}
                <div className="flow-connector">
                  <div className="fc-line"><div className="fc-particle"></div></div>
                  <div className="fc-chevron">›</div>
                </div>
                {/* Step 2: Submitted */}
                <div className={`flow-step ${statusCounts.submitted > 0 ? 'fs-active' : statusCounts.open > 0 || statusCounts.submitted > 0 ? '' : bounties.some(b => ['paid','refunded','more_info'].includes(b.status)) ? 'fs-done' : ''}`}>
                  <div className="fs-dot"><span>02</span></div>
                  <div className="fs-box">
                    <div className="fs-icon">📩</div>
                    <div className="fs-label">SUBMITTED</div>
                    <div className="fs-sub">Submit URL</div>
                    {statusCounts.submitted > 0 && <div className="fs-count">{statusCounts.submitted}</div>}
                  </div>
                </div>
                {/* Arrow 2 */}
                <div className="flow-connector">
                  <div className="fc-line"><div className="fc-particle"></div></div>
                  <div className="fc-chevron">›</div>
                </div>
                {/* Step 3: Consensus */}
                <div className={`flow-step ${statusCounts.submitted > 0 ? 'fs-active' : ''}`}>
                  <div className="fs-dot"><span>03</span></div>
                  <div className="fs-box">
                    <div className="fs-icon">⚖️</div>
                    <div className="fs-label">CONSENSUS</div>
                    <div className="fs-sub">AI Evaluates</div>
                  </div>
                </div>
                {/* Arrow 3 — branches */}
                <div className="flow-connector">
                  <div className="fc-line"><div className="fc-particle"></div></div>
                  <div className="fc-chevron">›</div>
                </div>
                {/* Outcomes */}
                <div className="flow-outcomes-v2">
                  <div className={`flow-outcome ${statusCounts.paid > 0 ? 'fo-hit' : ''}`}>
                    <div className="fo-dot fo-green"></div>
                    <div className="fs-box fo-box">
                      <div className="fs-icon">✅</div>
                      <div className="fs-label">PAID</div>
                      {statusCounts.paid > 0 && <div className="fs-count">{statusCounts.paid}</div>}
                    </div>
                  </div>
                  <div className={`flow-outcome ${statusCounts.refunded > 0 ? 'fo-hit' : ''}`}>
                    <div className="fo-dot fo-orange"></div>
                    <div className="fs-box fo-box">
                      <div className="fs-icon">↩️</div>
                      <div className="fs-label">REFUNDED</div>
                      {statusCounts.refunded > 0 && <div className="fs-count">{statusCounts.refunded}</div>}
                    </div>
                  </div>
                  <div className={`flow-outcome ${statusCounts.more_info > 0 ? 'fo-hit' : ''}`}>
                    <div className="fo-dot fo-yellow"></div>
                    <div className="fs-box fo-box">
                      <div className="fs-icon">🔄</div>
                      <div className="fs-label">MORE INFO</div>
                      {statusCounts.more_info > 0 && <div className="fs-count">{statusCounts.more_info}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Adjudication Metrics ── */}
            <div className="grid-4">
              <div className="metric-card v2"><div className="m-label">EVALUATIONS</div><div className="m-val">{adjudicationMetrics.total}</div><div className="m-sub">Total AI verdicts</div></div>
              <div className="metric-card v2"><div className="m-label">AVG SCORE</div><div className="m-val" style={{ color: scoreColor(adjudicationMetrics.avgScore) }}>{adjudicationMetrics.avgScore}<span className="m-unit">/100</span></div><div className="m-sub">Quality average</div></div>
              <div className="metric-card v2"><div className="m-label">ACCEPT RATE</div><div className="m-val" style={{ color: adjudicationMetrics.acceptRate >= 50 ? '#3fb950' : '#f85149' }}>{adjudicationMetrics.acceptRate}<span className="m-unit">%</span></div><div className="m-sub">Pass ratio</div></div>
              <div className="metric-card v2"><div className="m-label">AVG CRITERIA</div><div className="m-val">{adjudicationMetrics.avgCriteria}<span className="m-unit">/10</span></div><div className="m-sub">Criteria met</div></div>
            </div>

            {/* ── Two columns: Verdicts + Distribution ── */}
            <div className="grid-2">
              {/* Recent Verdicts */}
              <div className="card verdict-card">
                <h3>⚖️ Recent Verdicts</h3>
                {recentVerdicts.length > 0 ? recentVerdicts.map(b => (
                  <div key={b.bounty_id} className="verdict-row" onClick={() => void viewBounty(b)}>
                    <div className="vr-left">
                      <span className={`vr-badge vr-${b.verdict}`}>{b.verdict === 'accept' ? 'PASS' : b.verdict === 'reject' ? 'FAIL' : 'INFO'}</span>
                      <div className="vr-info">
                        <div className="vr-title">{truncate(b.title, 32)}</div>
                        <div className="vr-meta">{b.criteria_met}/10 criteria · {timeAgo(b.updated_at)}</div>
                      </div>
                    </div>
                    <div className="vr-score" style={{ color: scoreColor(b.quality_score) }}>{b.quality_score}</div>
                  </div>
                )) : <p className="empty-sm">No verdicts yet.</p>}
              </div>

              {/* Status Distribution + Contract Health */}
              <div className="card">
                <h3>📊 Status Distribution</h3>
                <div className="dist-bar">
                  {statusDistribution.map(s => (
                    <div key={s.key} className="dist-seg" style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label}: ${s.count}`} />
                  ))}
                </div>
                <div className="dist-legend">
                  {statusDistribution.map(s => (
                    <span key={s.key} className="dist-item"><span className="dist-dot" style={{ background: s.color }} />{s.label} ({s.count})</span>
                  ))}
                </div>

                <div className="health-panel">
                  <h3>🔗 Contract Health</h3>
                  <div className="health-grid">
                    <div className="hg-row"><span className="hg-label">Status</span><span className={`hg-val ${health.reachable ? 'hg-ok' : 'hg-err'}`}>{health.reachable ? '● Connected' : '○ Unreachable'}</span></div>
                    <div className="hg-row"><span className="hg-label">Version</span><span className="hg-val">{health.version || '—'}</span></div>
                    <div className="hg-row"><span className="hg-label">Network</span><span className="hg-val">{networkName}</span></div>
                    <div className="hg-row"><span className="hg-label">Contract</span><span className="hg-val"><code>{shortAddr(contractAddress)}</code></span></div>
                    {health.error && <div className="hg-row"><span className="hg-label">Error</span><span className="hg-val hg-err">{truncate(health.error, 60)}</span></div>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Top Bounties + Activity ── */}
            <div className="grid-2">
              <div className="card">
                <h3>🏆 Top Bounties</h3>
                {topBounties.length > 0 ? topBounties.map(b => (
                  <div key={b.bounty_id} className="top-row" onClick={() => void viewBounty(b)}>
                    <span className="top-reward">{weiToGen(b.reward_wei)} GEN</span>
                    <span className="top-title">{truncate(b.title, 50)}</span>
                    <span className="status-pill sm" style={{ color: STATUS_META[b.status]?.color, background: STATUS_META[b.status]?.color + '18' }}>{STATUS_META[b.status]?.label}</span>
                  </div>
                )) : <p className="empty-sm">No bounties yet.</p>}
              </div>
              <div className="card">
                <h3>🔥 Activity</h3>
                {activityFeed.length > 0 ? activityFeed.slice(0, 8).map(item => (
                  <div key={item.id} className="act-item"><span className="act-dot" style={{ background: item.type === 'adjudicated' ? '#3fb950' : '#58a6ff' }} /><span className="act-msg">{item.message}</span><span className="act-time">{timeAgo(new Date(item.timestamp).toISOString())}</span></div>
                )) : <div className="empty-activity">
                  <div className="ea-rows">
                    {bounties.slice(0, 5).map(b => (
                      <div key={b.bounty_id} className="ea-row">
                        <span className="ea-dot" style={{ background: STATUS_META[b.status]?.color }} />
                        <span className="ea-msg">{truncate(b.title, 28)}</span>
                        <span className="ea-status" style={{ color: STATUS_META[b.status]?.color }}>{STATUS_META[b.status]?.label}</span>
                        <span className="ea-time">{timeAgo(b.updated_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>}
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="actions-grid">
              <button className="action-card" onClick={() => nav('create')}><span className="action-icon">✨</span><strong>Create Bounty</strong><p>Escrow GEN for a deliverable</p></button>
              <button className="action-card" onClick={() => nav('browse')}><span className="action-icon">🔍</span><strong>Browse</strong><p>View all bounties</p></button>
              <button className="action-card" onClick={() => nav('my-bounties')}><span className="action-icon">📋</span><strong>My Bounties</strong><p>Manage your bounties</p></button>
              <a className="action-card" href={studioImportUrl} target="_blank" rel="noreferrer"><span className="action-icon">🔧</span><strong>Studio ↗</strong><p>View contract</p></a>
            </div>

            <div className="info-bar">
              <span>Contract: <code>{shortAddr(contractAddress)}</code></span>
              <span>v{health.version}</span>
              <span>{networkName}</span>
            </div>
          </div>
        )}

        {/* ═══════════ BROWSE ═══════════ */}
        {view === 'browse' && !loading && (
          <div className="browse-view">
            <div className="browse-filters">
              <div className="filter-group"><label>Status</label><select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setBrowsePage(1) }}><option value="all">All</option>{Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
              <div className="filter-group"><label>Sort</label><select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}><option value="newest">Newest</option><option value="reward">Highest Reward</option><option value="score">Highest Score</option></select></div>
              <span className="results-count">{filtered.length} bount{filtered.length !== 1 ? 'ies' : 'y'}</span>
            </div>
            <div className="bounty-list">{paged.map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}</div>
            {filtered.length === 0 && <div className="empty-state"><span className="empty-icon">📭</span><h3>No bounties found</h3><p>Try a different filter or create one.</p><button className="btn primary" onClick={() => nav('create')}>Create Bounty</button></div>}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn secondary small" disabled={browsePage <= 1} onClick={() => setBrowsePage(p => p - 1)}>← Prev</button>
                <span className="page-info">Page {browsePage} of {totalPages}</span>
                <button className="btn secondary small" disabled={browsePage >= totalPages} onClick={() => setBrowsePage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ BOUNTY DETAIL ═══════════ */}
        {view === 'bounty' && selected && (
          <BountyDetailView
            bounty={selected} account={account}
            onSubmitAndAdjudicate={handleAutoAdjudicate}
            onAdjudicate={() => void withTx('Adjudicating', h => adjudicate(account!, selected.bounty_id, h), 'adjudicated', selected.bounty_id)}
            onCancel={() => void withTx('Cancelling', h => cancelBounty(account!, selected.bounty_id, h), 'refunded', selected.bounty_id)}
            onRefresh={async () => { setSelected(await getBounty(selected.bounty_id)); await refresh() }}
            onBack={() => nav('browse')}
          />
        )}

        {/* ═══════════ CREATE ═══════════ */}
        {view === 'create' && (
          <CreateView account={account} prefilled={prefilled}
            onSubmit={(id, title, brief, rubric, refUrl, gen) => {
              setPrefilled(null)
              void withTx('Creating bounty', h => createBounty(account!, id, title, brief, rubric, refUrl, BigInt(Math.floor(parseFloat(gen) * 1e18)), h), 'created', id)
            }}
          />
        )}

        {/* ═══════════ MY BOUNTIES ═══════════ */}
        {view === 'my-bounties' && !loading && (
          <div className="my-view">
            {!account ? <div className="empty-state"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><button className="btn primary" onClick={handleConnect}>Connect</button></div> : <>
              <h2>My Bounties ({myRequester.length})</h2>
              <div className="bounty-list">{myRequester.map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}</div>
              {myRequester.length === 0 && <div className="empty-state"><span className="empty-icon">📋</span><h3>No bounties yet</h3><button className="btn primary" onClick={() => nav('create')}>Create Bounty</button></div>}
            </>}
          </div>
        )}

        {/* ═══════════ SUBMISSIONS ═══════════ */}
        {view === 'my-submissions' && !loading && (
          <div className="my-view">
            {!account ? <div className="empty-state"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><button className="btn primary" onClick={handleConnect}>Connect</button></div> : <>
              <h2>My Submissions ({myContributor.length})</h2>
              <div className="bounty-list">{myContributor.map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}</div>
              {myContributor.length === 0 && <div className="empty-state"><span className="empty-icon">📩</span><h3>No submissions yet</h3><button className="btn primary" onClick={() => nav('browse')}>Browse Bounties</button></div>}
            </>}
          </div>
        )}
      </main>

      {/* ── CurioBot ── */}
      <CurioBot
        account={account}
        onConnectWallet={handleConnect}
        onCreateBounty={(data) => { if (data) setPrefilled(data); nav('create') }}
        onBrowseBounties={() => nav('browse')}
        onAdjudicate={async (bid) => {
          if (!account) return
          await adjudicate(account, bid, h => setTx({ phase: 'consensus', label: 'AI adjudication…', hash: h }))
          setTx({ phase: 'success', label: 'Done!' }); await new Promise(r => setTimeout(r, 2000)); await refresh()
        }}
        onViewBounty={async (bid) => { try { setSelected(await getBounty(bid)); setView('bounty') } catch { /* ok */ } }}
        bounties={bounties}
      />
    </div>
  )
}

// ═══════════ BountyRow ═══════════

function BountyRow({ bounty, onClick }: { bounty: LearningBounty; onClick: () => void }) {
  const s = STATUS_META[bounty.status]
  return (
    <div className="bounty-row" onClick={onClick}>
      <div className="bounty-row-left">
        <div className="bounty-dot" style={{ background: s?.color }} />
        <div className="bounty-info"><strong>{truncate(bounty.title, 80)}</strong><span className="bounty-brief">{truncate(bounty.brief, 120)}</span></div>
      </div>
      <div className="bounty-row-right">
        <span className="bounty-reward">{weiToGen(bounty.reward_wei)} GEN</span>
        <span className="status-pill" style={{ color: s?.color, background: s?.color + '18' }}>{s?.icon} {s?.label}</span>
        {bounty.quality_score > 0 && <span className="bounty-score" style={{ color: scoreColor(bounty.quality_score) }}>{bounty.quality_score}/100</span>}
        <span className="bounty-time">{timeAgo(bounty.created_at)}</span>
      </div>
    </div>
  )
}

// ═══════════ BountyDetailView ═══════════

function BountyDetailView({ bounty, account, onSubmitAndAdjudicate, onAdjudicate, onCancel, onRefresh, onBack }: {
  bounty: LearningBounty; account: string | null
  onSubmitAndAdjudicate: (bid: string, url: string, note: string) => Promise<void>
  onAdjudicate: () => void; onCancel: () => void; onRefresh: () => Promise<void>; onBack: () => void
}) {
  const [showSubmit, setShowSubmit] = useState(false)
  const [url, setUrl] = useState(''); const [note, setNote] = useState('')
  const [aiCheck, setAiCheck] = useState<{ score: number; feedback: string; suggestions: string[] } | null>(null)
  const [checking, setChecking] = useState(false)

  const s = STATUS_META[bounty.status]; const v = VERDICT_META[bounty.verdict]
  const isReq = account && bounty.requester?.toLowerCase() === account.toLowerCase()
  const isCon = account && bounty.contributor?.toLowerCase() === account.toLowerCase() && bounty.contributor !== '0x0000000000000000000000000000000000000000'
  const canSubmit = account && !isReq && (bounty.status === 'open' || (bounty.status === 'more_info' && isCon))
  const canAdj = account && bounty.status === 'submitted' && (isReq || isCon)
  const canCancel = account && isReq && (bounty.status === 'open' || bounty.status === 'more_info')

  const handleCheck = async () => {
    if (!url.trim() || !note.trim()) return; setChecking(true)
    try { setAiCheck(await checkSubmissionQuality(bounty.brief, bounty.rubric, url, note)) }
    catch { setAiCheck(null) } finally { setChecking(false) }
  }

  return (
    <div className="detail-view">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="detail-header">
        <div className="detail-meta">
          <span className="status-pill lg" style={{ color: s?.color, background: s?.color + '18' }}>{s?.icon} {s?.label}</span>
          {bounty.review_round > 0 && <span className="round-badge">Round {bounty.review_round}</span>}
          <span className="bounty-time">{timeAgo(bounty.created_at)}</span>
        </div>
        <h1>{bounty.title}</h1>
        <div className="detail-reward">{weiToGen(bounty.reward_wei)} GEN</div>
      </div>

      <div className="detail-cols">
        <div className="card"><h3>📝 Brief</h3><p className="detail-text">{bounty.brief}</p></div>
        <div className="card"><h3>📏 Rubric</h3><p className="detail-text">{bounty.rubric}</p></div>
      </div>

      {bounty.reference_url && <div className="card"><h3>📎 Reference</h3><a href={bounty.reference_url} target="_blank" rel="noreferrer" className="ref-link">{bounty.reference_url} ↗</a></div>}

      {bounty.status !== 'open' && bounty.submission_url && (
        <div className="card submission-card">
          <h3>📩 Submission</h3>
          <div><strong>Contributor:</strong> <span className="addr">{shortAddr(bounty.contributor)}</span></div>
          <a href={bounty.submission_url} target="_blank" rel="noreferrer" className="ref-link">{bounty.submission_url} ↗</a>
          {bounty.submission_note && <p className="sub-note">{bounty.submission_note}</p>}
        </div>
      )}

      {bounty.verdict !== 'pending' && (
        <div className={`adj-panel adj-${bounty.verdict}`}>
          <div className="adj-header"><strong>⚖️ AI Verdict</strong><span className="adj-verdict" style={{ color: v?.color }}>{v?.label}</span></div>
          <div className="adj-scores">
            <div className="adj-score-item"><span className="adj-label">Quality</span><div className="adj-bar"><div className="adj-fill" style={{ width: `${bounty.quality_score}%`, background: scoreColor(bounty.quality_score) }} /></div><span className="adj-val" style={{ color: scoreColor(bounty.quality_score) }}>{bounty.quality_score}/100</span></div>
            <div className="adj-score-item"><span className="adj-label">Criteria</span><span className="adj-val">{bounty.criteria_met}/10</span></div>
            <div className="adj-score-item"><span className="adj-label">Payout</span><span className="adj-val" style={{ color: bounty.quality_score >= 70 ? '#3fb950' : '#f85149' }}>{bounty.quality_score >= 70 ? 'PASS ≥70' : 'FAIL <70'}</span></div>
          </div>
          {bounty.reasoning && <div className="adj-reasoning"><strong>Reasoning:</strong> {bounty.reasoning}</div>}
          {bounty.missing_evidence && <div className="adj-missing"><strong>Missing:</strong> {bounty.missing_evidence}</div>}
        </div>
      )}

      {/* Actions */}
      <div className="detail-actions">
        {canSubmit && !showSubmit && <button className="btn primary" onClick={() => setShowSubmit(true)}>📩 Submit Solution</button>}
        {canSubmit && showSubmit && (
          <div className="card submit-form">
            <h3>Submit Solution</h3>
            <div className="form">
              <div className="form-group"><label>Solution URL</label><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-deliverable.com" /></div>
              <div className="form-group"><label>Note</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Describe your deliverable…" rows={3} /></div>
              <div className="form-actions">
                <button className="btn ai" onClick={handleCheck} disabled={checking || !url.trim()}>{checking ? '🤖 Checking…' : '🤖 AI Pre-Check'}</button>
                <button className="btn primary" onClick={() => { void onSubmitAndAdjudicate(bounty.bounty_id, url, note); setShowSubmit(false) }}>Submit & Auto-Adjudicate</button>
                <button className="btn secondary" onClick={() => setShowSubmit(false)}>Cancel</button>
              </div>
              {aiCheck && <div className={`ai-result ${aiCheck.score >= 70 ? 'good' : aiCheck.score >= 40 ? 'ok' : 'low'}`}><strong>AI Score: {aiCheck.score}/100</strong><p>{aiCheck.feedback}</p></div>}
            </div>
          </div>
        )}
        {canAdj && <div className="adj-prompt"><p>⚖️ Solution submitted — run AI evaluation</p><button className="btn primary lg" onClick={onAdjudicate}>Run Adjudication</button></div>}
        {canCancel && <button className="btn danger" onClick={onCancel}>❌ Cancel & Refund</button>}
        <button className="btn secondary" onClick={() => void onRefresh()}>🔄 Refresh</button>
      </div>

      <div className="card parties-card">
        <h3>Parties</h3>
        <div className="parties-grid">
          <div><strong>Requester:</strong> <span className="addr">{shortAddr(bounty.requester)}</span>{isReq && <span className="you-badge">You</span>}</div>
          {bounty.contributor !== '0x0000000000000000000000000000000000000000' && <div><strong>Contributor:</strong> <span className="addr">{shortAddr(bounty.contributor)}</span>{isCon && <span className="you-badge">You</span>}</div>}
          <div><strong>ID:</strong> <code>{bounty.bounty_id}</code></div>
        </div>
      </div>
    </div>
  )
}

// ═══════════ CreateView ═══════════

function CreateView({ account, prefilled, onSubmit }: {
  account: string | null; prefilled: BountyFormData | null
  onSubmit: (id: string, title: string, brief: string, rubric: string, refUrl: string, gen: string) => void
}) {
  const [id, setId] = useState(''); const [title, setTitle] = useState(''); const [brief, setBrief] = useState('')
  const [rubric, setRubric] = useState(''); const [refUrl, setRefUrl] = useState(''); const [gen, setGen] = useState('1')
  const [aiMsg, setAiMsg] = useState(''); const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (prefilled) { setId(prefilled.id); setTitle(prefilled.title); setBrief(prefilled.brief); setRubric(prefilled.rubric); setRefUrl(prefilled.refUrl) }
  }, [prefilled])

  const handleGenerate = async () => {
    if (!title.trim()) { setAiMsg('Enter a title first'); return }
    setAiLoading(true); setAiMsg('Generating with GenLayer Agent…')
    try { const r = await generateBountyBrief(title); setBrief(r.brief); setRubric(r.rubric); setAiMsg('✓ Generated — review and edit') }
    catch { setAiMsg('⚠ Failed — fill manually') } finally { setAiLoading(false) }
  }

  const handleImprove = async () => {
    if (!title.trim() || !brief.trim()) return; setAiLoading(true)
    try { setBrief(await improveDescription(title, brief)); setAiMsg('✓ Improved') }
    catch { setAiMsg('⚠ Failed') } finally { setAiLoading(false) }
  }

  if (!account) return <div className="empty-state"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><p>Connect to create bounties.</p></div>

  return (
    <div className="create-view">
      <div className="card">
        <h3>✨ Create a Learning Bounty</h3>
        <p className="create-desc">Escrow GEN and describe what you need. GenLayer validators evaluate submissions using AI consensus.</p>
        <div className="form">
          <div className="form-group"><label>Bounty ID (slug)</label><input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="python-async-tutorial" /><small>Letters, numbers, hyphens, underscores</small></div>
          <div className="form-group"><label>Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Write a Python async/await tutorial" /><div className="ai-buttons"><button className="btn ai" onClick={handleGenerate} disabled={aiLoading}>🤖 AI Generate Brief & Rubric</button></div></div>
          <div className="form-group"><label>Brief (30-2500 chars)</label><textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe what you need…" rows={5} />{brief && <button className="btn ai small" onClick={handleImprove} disabled={aiLoading}>✨ AI Improve</button>}</div>
          <div className="form-group"><label>Scoring Rubric (30-2500 chars)</label><textarea value={rubric} onChange={e => setRubric(e.target.value)} placeholder="How should it be evaluated?" rows={5} /></div>
          <div className="form-group"><label>Reference URL</label><input type="url" value={refUrl} onChange={e => setRefUrl(e.target.value)} placeholder="https://example.com" /></div>
          <div className="form-group"><label>Reward (GEN)</label><input type="number" step="0.01" min="0.01" value={gen} onChange={e => setGen(e.target.value)} /><small>Escrowed in contract</small></div>
          {aiMsg && <div className="ai-message">{aiMsg}</div>}
          <button className="btn primary lg" onClick={() => onSubmit(id, title, brief, rubric, refUrl, gen)}>🔒 Escrow {gen} GEN & Create Bounty</button>
        </div>
      </div>
    </div>
  )
}
