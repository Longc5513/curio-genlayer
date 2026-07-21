import { useCallback, useEffect, useState, useMemo } from 'react'
import { shortAddr, weiToGen, scoreColor, verdictColor, cleanError, timeAgo, formatNumber, truncate } from './lib/format'
import {
  connectWallet, getConnectedWallet, subscribeWallet,
  getContractHealth, listBounties, getBounty, listRequesterBounties, listContributorBounties,
  createBounty, submitSolution, adjudicate, cancelBounty,
  transactionUrl, contractAddress, networkName, studioImportUrl,
  type LearningBounty, type ContractHealth, type TxState,
} from './lib/genlayer'
import { STATUS_META, VERDICT_META, type View } from './lib/types'

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

  // ── Data Loading ──────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const h = await getContractHealth()
      setHealth(h)
      if (h.reachable) {
        const b = await listBounties()
        setBounties(b)
        if (account) {
          const [r, c] = await Promise.all([listRequesterBounties(account), listContributorBounties(account)])
          setMyRequester(r); setMyContributor(c)
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

  // ── Handlers ──────────────────────────────────────────────────────

  const txDismiss = () => setTx({ phase: 'idle', label: '' })

  const withTx = async (label: string, fn: (onHash: (h: string) => void) => Promise<string | void>) => {
    if (!account) return setTx({ phase: 'error', label: 'Connect wallet first' })
    setTx({ phase: 'submitting', label })
    try {
      await fn((h) => setTx({ phase: 'consensus', label: `${label} — confirming on-chain…`, hash: h }))
      setTx({ phase: 'success', label: `${label} — done!` })
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

  // ── Filtered bounties ─────────────────────────────────────────────

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

  // ── Status counts ─────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { open: 0, submitted: 0, paid: 0, refunded: 0, more_info: 0, cancelled: 0 }
    bounties.forEach(b => { if (b.status in counts) counts[b.status]++ })
    return counts
  }, [bounties])

  return (
    <div className="app">
      {/* Mobile Menu */}
      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? '✕' : '☰'}</button>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">C</div>
          <div><strong>Curio</strong><small>Learning Bounties · GenLayer</small></div>
        </div>
        <nav>
          {([['dashboard', '📊', 'Dashboard'], ['browse', '🔍', 'Browse Bounties'], ['create', '✨', 'Create Bounty'], ['my-bounties', '📋', 'My Bounties'], ['my-submissions', '📩', 'My Submissions']] as [View, string, string][]).map(([v, icon, label]) =>
            <button key={v} className={view === v || (view === 'bounty' && v === 'browse') ? 'active' : ''} onClick={() => nav(v)}>{icon} {label}</button>
          )}
        </nav>

        {/* Status Quick Filters */}
        <div className="sidebar-filters">
          <h4>By Status</h4>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button key={key} className="filter-link" onClick={() => { setFilterStatus(key); nav('browse') }}>
              {meta.icon} {meta.label} <span className="filter-count">{statusCounts[key] || 0}</span>
            </button>
          ))}
          <button className="filter-link" onClick={() => { setFilterStatus('all'); nav('browse') }}>📋 All</button>
        </div>

        <div className="sidebar-footer">
          <div className="network-badge">{networkName}</div>
          <button className="wallet-btn" onClick={handleConnect}>
            <span className={account ? 'dot on' : 'dot'} />
            {account ? shortAddr(account) : 'Connect Wallet'}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main */}
      <main>
        <header className="topbar">
          <div className="topbar-left">
            <h1>{view === 'dashboard' ? 'Dashboard' : view === 'browse' ? 'Browse Bounties' : view === 'create' ? 'Create Bounty' : view === 'my-bounties' ? 'My Bounties' : view === 'my-submissions' ? 'My Submissions' : 'Bounty Detail'}</h1>
          </div>
          <div className="topbar-right">
            {health.stats && (
              <div className="topbar-stats">
                <span title="Total bounties">📋 {formatNumber(health.stats.bounty_count)}</span>
                <span title="Total escrowed">🔒 {weiToGen(health.stats.total_escrowed_wei)} GEN</span>
                <span title="Total paid out">✅ {weiToGen(health.stats.total_paid_wei)} GEN</span>
              </div>
            )}
          </div>
        </header>

        {/* TX Panel */}
        {tx.phase !== 'idle' && (
          <div className={`tx-panel tx-${tx.phase}`}>
            <strong>{tx.label}</strong>
            {tx.hash && <a href={transactionUrl(tx.hash)} target="_blank" rel="noreferrer">{tx.hash.slice(0, 16)}… ↗</a>}
            {tx.error && <p>{tx.error}</p>}
            <button onClick={txDismiss}>×</button>
          </div>
        )}

        {/* Health Alert */}
        {!health.reachable && !loading && (
          <div className="alert alert-danger">
            <strong>⚠ Contract not reachable</strong>
            <p>{health.error || 'Check your network connection and wallet.'}</p>
            <button onClick={() => void refresh()}>Retry</button>
          </div>
        )}

        {loading && <div className="loading-screen"><div className="loading-spinner" /><p>Loading Curio…</p></div>}

        {/* ═══ DASHBOARD ═══ */}
        {view === 'dashboard' && health.reachable && !loading && health.stats && (
          <div className="dashboard-view">
            {/* State Machine Diagram */}
            <div className="state-machine card">
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

            {/* Stats */}
            <div className="metric-grid">
              <div className="metric-card"><span className="metric-val">{formatNumber(health.stats.bounty_count)}</span><span className="metric-label">Total Bounties</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_escrowed_wei)}</span><span className="metric-label">GEN Escrowed</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_paid_wei)}</span><span className="metric-label">GEN Paid Out</span></div>
              <div className="metric-card"><span className="metric-val">{weiToGen(health.stats.total_refunded_wei)}</span><span className="metric-label">GEN Refunded</span></div>
            </div>

            {/* Status Breakdown */}
            <div className="card">
              <h3>📊 Status Breakdown</h3>
              <div className="status-bars">
                {Object.entries(STATUS_META).map(([key, meta]) => {
                  const count = statusCounts[key] || 0
                  const pct = health.stats!.bounty_count > 0 ? (count / health.stats!.bounty_count) * 100 : 0
                  return (
                    <div key={key} className="status-bar-row">
                      <span className="status-bar-label">{meta.icon} {meta.label}</span>
                      <div className="status-bar"><div className="status-bar-fill" style={{ width: `${pct}%`, background: meta.color }} /></div>
                      <span className="status-bar-count">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <button className="action-card" onClick={() => nav('browse')}>
                <span className="action-icon">🔍</span>
                <strong>Browse Bounties</strong>
                <p>Find open bounties to contribute to</p>
              </button>
              <button className="action-card" onClick={() => nav('create')}>
                <span className="action-icon">✨</span>
                <strong>Create Bounty</strong>
                <p>Escrow GEN for a learning deliverable</p>
              </button>
              <a className="action-card" href={studioImportUrl} target="_blank" rel="noreferrer">
                <span className="action-icon">🔧</span>
                <strong>GenLayer Studio ↗</strong>
                <p>View contract on-chain</p>
              </a>
            </div>

            {/* Recent Bounties */}
            <div className="section">
              <div className="section-header">
                <h2>📋 Recent Bounties</h2>
                <button className="btn secondary small" onClick={() => nav('browse')}>View All →</button>
              </div>
              <div className="bounty-list">
                {bounties.slice(0, 5).map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}
              </div>
              {bounties.length === 0 && <div className="empty">No bounties yet. Be the first to create one!</div>}
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
        {view === 'browse' && !loading && (
          <div className="browse-view">
            <div className="browse-filters">
              <div className="filter-group">
                <label>Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                  <option value="newest">Newest</option>
                  <option value="reward">Highest Reward</option>
                  <option value="score">Highest Score</option>
                </select>
              </div>
              <span className="results-count">{filtered.length} bount{filtered.length !== 1 ? 'ies' : 'y'}</span>
            </div>
            <div className="bounty-list">
              {filtered.map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}
            </div>
            {filtered.length === 0 && <div className="empty">No bounties match your filters.</div>}
          </div>
        )}

        {/* ═══ BOUNTY DETAIL ═══ */}
        {view === 'bounty' && selected && (
          <BountyDetailView
            bounty={selected}
            account={account}
            onRefresh={async () => { setSelected(await getBounty(selected.bounty_id)); await refresh() }}
            onSubmit={(url, note) => void withTx('Submitting solution', h => submitSolution(account!, selected.bounty_id, url, note, h))}
            onAdjudicate={() => void withTx('Running adjudication', h => adjudicate(account!, selected.bounty_id, h))}
            onCancel={() => void withTx('Cancelling bounty', h => cancelBounty(account!, selected.bounty_id, h))}
            onBack={() => nav('browse')}
          />
        )}

        {/* ═══ CREATE ═══ */}
        {view === 'create' && (
          <CreateBountyView
            account={account}
            onSubmit={(id, title, brief, rubric, refUrl, genAmount) =>
              void withTx('Creating bounty', h => createBounty(account!, id, title, brief, rubric, refUrl, BigInt(Math.floor(parseFloat(genAmount) * 1e18)), h))
            }
          />
        )}

        {/* ═══ MY BOUNTIES ═══ */}
        {view === 'my-bounties' && !loading && (
          <div className="my-bounties-view">
            {!account && <div className="empty-lg"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><p>Connect to see your bounties.</p></div>}
            {account && (
              <>
                <h2>Bounties I Created ({myRequester.length})</h2>
                <div className="bounty-list">
                  {myRequester.map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}
                </div>
                {myRequester.length === 0 && <div className="empty">You haven't created any bounties yet.</div>}
              </>
            )}
          </div>
        )}

        {/* ═══ MY SUBMISSIONS ═══ */}
        {view === 'my-submissions' && !loading && (
          <div className="my-submissions-view">
            {!account && <div className="empty-lg"><span className="empty-icon">🔗</span><h3>Connect Wallet</h3><p>Connect to see your submissions.</p></div>}
            {account && (
              <>
                <h2>Bounties I Contributed To ({myContributor.length})</h2>
                <div className="bounty-list">
                  {myContributor.map(b => <BountyRow key={b.bounty_id} bounty={b} onClick={() => void viewBounty(b)} />)}
                </div>
                {myContributor.length === 0 && <div className="empty">You haven't submitted to any bounties yet.</div>}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// BountyRow
// ══════════════════════════════════════════════════════════════════════

function BountyRow({ bounty, onClick }: { bounty: LearningBounty; onClick: () => void }) {
  const statusMeta = STATUS_META[bounty.status]
  const verdictMeta = VERDICT_META[bounty.verdict]
  return (
    <div className="bounty-row" onClick={onClick}>
      <div className="bounty-row-left">
        <div className="bounty-status-dot" style={{ background: statusMeta?.color }} />
        <div className="bounty-row-info">
          <strong>{truncate(bounty.title, 80)}</strong>
          <span className="bounty-brief">{truncate(bounty.brief, 120)}</span>
        </div>
      </div>
      <div className="bounty-row-right">
        <span className="bounty-reward">💰 {weiToGen(bounty.reward_wei)} GEN</span>
        <span className="bounty-status-pill" style={{ color: statusMeta?.color, background: statusMeta?.color + '18' }}>{statusMeta?.icon} {statusMeta?.label}</span>
        {bounty.quality_score > 0 && <span className="bounty-score" style={{ color: scoreColor(bounty.quality_score) }}>{bounty.quality_score}/100</span>}
        {bounty.verdict !== 'pending' && <span className="bounty-verdict" style={{ color: verdictMeta?.color }}>{verdictMeta?.label}</span>}
        <span className="bounty-time">{timeAgo(bounty.created_at)}</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// BountyDetailView
// ══════════════════════════════════════════════════════════════════════

function BountyDetailView({ bounty, account, onRefresh, onSubmit, onAdjudicate, onCancel, onBack }: {
  bounty: LearningBounty; account: string | null
  onRefresh: () => Promise<void>
  onSubmit: (url: string, note: string) => void
  onAdjudicate: () => void
  onCancel: () => void
  onBack: () => void
}) {
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitNote, setSubmitNote] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)

  const statusMeta = STATUS_META[bounty.status]
  const verdictMeta = VERDICT_META[bounty.verdict]
  const isRequester = account && bounty.requester === account
  const isContributor = account && bounty.contributor === account
  const canSubmit = account && !isRequester && (bounty.status === 'open' || (bounty.status === 'more_info' && isContributor))
  const canAdjudicate = account && bounty.status === 'submitted' && (isRequester || isContributor)
  const canCancel = account && isRequester && (bounty.status === 'open' || bounty.status === 'more_info')

  return (
    <div className="bounty-detail">
      <button className="back-btn" onClick={onBack}>← Back</button>

      {/* Header */}
      <div className="bounty-detail-header">
        <div className="bounty-detail-meta">
          <span className="bounty-status-pill lg" style={{ color: statusMeta?.color, background: statusMeta?.color + '18' }}>{statusMeta?.icon} {statusMeta?.label}</span>
          {bounty.review_round > 0 && <span className="round-badge">Round {bounty.review_round}</span>}
          <span className="bounty-time">{timeAgo(bounty.created_at)}</span>
        </div>
        <h1>{bounty.title}</h1>
        <div className="bounty-reward-lg">💰 {weiToGen(bounty.reward_wei)} GEN</div>
      </div>

      {/* Brief & Rubric */}
      <div className="detail-columns">
        <div className="card">
          <h3>📝 Brief</h3>
          <p className="detail-text">{bounty.brief}</p>
        </div>
        <div className="card">
          <h3>📏 Rubric</h3>
          <p className="detail-text">{bounty.rubric}</p>
        </div>
      </div>

      {/* Reference URL */}
      {bounty.reference_url && (
        <div className="card">
          <h3>📎 Reference Material</h3>
          <a href={bounty.reference_url} target="_blank" rel="noreferrer" className="ref-link">{bounty.reference_url} ↗</a>
        </div>
      )}

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

      {/* Adjudication Result */}
      {bounty.verdict !== 'pending' && (
        <div className={`adjudication-panel adjudication-${bounty.verdict}`}>
          <div className="adj-header">
            <strong>⚖️ Adjudication Result</strong>
            <span className="adj-verdict" style={{ color: verdictMeta?.color }}>{verdictMeta?.label}</span>
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
          </div>
          {bounty.reasoning && <div className="adj-reasoning"><strong>Reasoning:</strong> {bounty.reasoning}</div>}
          {bounty.missing_evidence && <div className="adj-missing"><strong>Missing Evidence:</strong> {bounty.missing_evidence}</div>}
          <div className="adj-info">
            <span>Round {bounty.review_round}</span>
            <span>Reviewed {timeAgo(bounty.updated_at)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bounty-actions">
        {/* Submit Solution */}
        {canSubmit && !showSubmit && (
          <button className="btn primary" onClick={() => setShowSubmit(true)}>📩 Submit Solution</button>
        )}
        {canSubmit && showSubmit && (
          <div className="card submit-form">
            <h3>Submit Your Solution</h3>
            <div className="form">
              <div className="form-group">
                <label>Solution URL (HTTPS)</label>
                <input type="url" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} placeholder="https://your-deliverable.com" />
              </div>
              <div className="form-group">
                <label>Note to Requester</label>
                <textarea value={submitNote} onChange={e => setSubmitNote(e.target.value)} placeholder="Describe your deliverable and how it meets the rubric…" rows={4} />
              </div>
              <div className="form-actions">
                <button className="btn primary" onClick={() => onSubmit(submitUrl, submitNote)}>Submit Solution</button>
                <button className="btn secondary" onClick={() => setShowSubmit(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Adjudicate */}
        {canAdjudicate && (
          <button className="btn primary" onClick={onAdjudicate}>⚖️ Run Adjudication</button>
        )}

        {/* Cancel */}
        {canCancel && (
          <button className="btn danger" onClick={onCancel}>❌ Cancel & Refund</button>
        )}

        {/* Refresh */}
        <button className="btn secondary" onClick={() => void onRefresh()}>🔄 Refresh</button>
      </div>

      {/* Parties */}
      <div className="card parties-card">
        <h3>👥 Parties</h3>
        <div className="parties-grid">
          <div><strong>Requester:</strong> <span className="addr">{shortAddr(bounty.requester)}</span>{isRequester && <span className="you-badge">You</span>}</div>
          {bounty.contributor && bounty.contributor !== '0x0000000000000000000000000000000000000000' && (
            <div><strong>Contributor:</strong> <span className="addr">{shortAddr(bounty.contributor)}</span>{isContributor && <span className="you-badge">You</span>}</div>
          )}
          <div><strong>Bounty ID:</strong> <code>{bounty.bounty_id}</code></div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// CreateBountyView
// ══════════════════════════════════════════════════════════════════════

function CreateBountyView({ account, onSubmit }: {
  account: string | null
  onSubmit: (id: string, title: string, brief: string, rubric: string, refUrl: string, genAmount: string) => void
}) {
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [rubric, setRubric] = useState('')
  const [refUrl, setRefUrl] = useState('')
  const [genAmount, setGenAmount] = useState('1')

  if (!account) return (
    <div className="create-view">
      <div className="empty-lg">
        <span className="empty-icon">🔗</span>
        <h3>Connect Wallet</h3>
        <p>You need to connect a wallet to create bounties.</p>
      </div>
    </div>
  )

  return (
    <div className="create-view">
      <div className="card">
        <h3>✨ Create a Learning Bounty</h3>
        <p className="create-desc">Escrow GEN and describe the learning deliverable you need. A contributor will submit their work, and GenLayer validators will evaluate it against your rubric using AI consensus.</p>
        <div className="form">
          <div className="form-group">
            <label>Bounty ID (unique slug)</label>
            <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="e.g. python-async-tutorial" />
            <small>Letters, numbers, hyphens, underscores only</small>
          </div>
          <div className="form-group">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Write a Python async/await tutorial for beginners" />
          </div>
          <div className="form-group">
            <label>Brief (30-2500 chars)</label>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe what you need in detail. What should the deliverable cover? Who is the audience? What format?" rows={5} />
          </div>
          <div className="form-group">
            <label>Scoring Rubric (30-2500 chars)</label>
            <textarea value={rubric} onChange={e => setRubric(e.target.value)} placeholder="How should the deliverable be evaluated? What criteria matter most? What does a passing submission look like?" rows={5} />
          </div>
          <div className="form-group">
            <label>Reference URL (optional, HTTPS)</label>
            <input type="url" value={refUrl} onChange={e => setRefUrl(e.target.value)} placeholder="https://example.com/reference-material" />
            <small>Optional reference for the contributor</small>
          </div>
          <div className="form-group">
            <label>Reward Amount (GEN)</label>
            <input type="number" step="0.01" min="0.01" value={genAmount} onChange={e => setGenAmount(e.target.value)} />
            <small>This amount will be escrowed in the contract</small>
          </div>
          <button className="btn primary lg" onClick={() => onSubmit(id, title, brief, rubric, refUrl, genAmount)}>
            🔒 Escrow {genAmount} GEN & Create Bounty
          </button>
        </div>
      </div>
    </div>
  )
}
