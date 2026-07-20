import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { StatePanel } from './components/StatePanel'
import { StatusBadge } from './components/StatusBadge'
import { TxPanel } from './components/TxPanel'
import { cleanError, formatGen, parseGen, shortAddress } from './lib/format'
import { connectWallet, contractAddress, listBounties, networkName, sendContractCall } from './lib/genlayer'
import type { LearningBounty, TxState } from './lib/types'

const idleTx: TxState = { phase: 'idle', label: '' }
const zeroAddress = '0x0000000000000000000000000000000000000000'

type View = 'market' | 'create' | 'review' | 'about'

export default function App() {
  const [view, setView] = useState<View>('market')
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [bounties, setBounties] = useState<LearningBounty[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<LearningBounty | null>(null)
  const [tx, setTx] = useState<TxState>(idleTx)

  const configured = /^0x[a-fA-F0-9]{40}$/.test(contractAddress)

  const refresh = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      setBounties([])
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const rows = await listBounties()
      setBounties([...rows].reverse())
      setSelected((current) => current ? rows.find((row) => row.bounty_id === current.bounty_id) || current : null)
    } catch (error) {
      setLoadError(cleanError(error))
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => { void refresh() }, [refresh])

  async function handleConnect() {
    setTx({ phase: 'wallet', label: 'Waiting for wallet approval…' })
    try {
      const connected = await connectWallet()
      setAccount(connected)
      setTx({ phase: 'success', label: 'Wallet connected' })
    } catch (error) {
      setTx({ phase: 'error', label: 'Wallet connection failed', error: cleanError(error) })
    }
  }

  async function transact(label: string, fn: string, args: unknown[], value = 0n) {
    let activeAccount = account
    try {
      if (!activeAccount) {
        setTx({ phase: 'wallet', label: 'Connect your wallet to continue…' })
        activeAccount = await connectWallet()
        setAccount(activeAccount)
      }
      setTx({ phase: 'submitting', label: `${label}: confirm in your wallet…` })
      const hash = await sendContractCall(activeAccount, fn, args, value, (nextHash) => {
        setTx({ phase: 'consensus', label: `${label}: validators are reaching consensus…`, hash: nextHash })
      })
      setTx({ phase: 'success', label: `${label}: finalized successfully`, hash })
      await refresh()
    } catch (error) {
      setTx({ phase: 'error', label: `${label} failed`, error: cleanError(error) })
      throw error
    }
  }

  const stats = useMemo(() => ({
    total: bounties.length,
    active: bounties.filter((item) => ['open', 'submitted', 'more_info'].includes(item.status)).length,
    settled: bounties.filter((item) => ['paid', 'refunded'].includes(item.status)).length,
  }), [bounties])

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('market')} aria-label="Curio home">
          <span className="brand-mark">C</span>
          <span><strong>Curio</strong><small>Learning bounties on GenLayer</small></span>
        </button>
        <nav aria-label="Primary navigation">
          {(['market', 'create', 'review', 'about'] as View[]).map((item) => (
            <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>
              {item === 'market' ? 'Bounties' : item === 'create' ? 'Create' : item === 'review' ? 'My work' : 'How it works'}
            </button>
          ))}
        </nav>
        <button className="wallet-button" onClick={handleConnect}>
          <span className={account ? 'wallet-light wallet-light--on' : 'wallet-light'} />
          {shortAddress(account || undefined)}
        </button>
      </header>

      <main>
        <TxPanel state={tx} />
        {!configured && (
          <StatePanel tone="warning" title="Intelligent Contract not configured">
            This UI intentionally does not simulate on-chain data. Deploy the Python contract, then set VITE_GENLAYER_CONTRACT_ADDRESS in app/.env.
          </StatePanel>
        )}
        {view === 'market' && (
          <MarketView
            bounties={bounties}
            loading={loading}
            error={loadError}
            stats={stats}
            selected={selected}
            account={account}
            onSelect={setSelected}
            onRefresh={refresh}
            onCreate={() => setView('create')}
            onTransact={transact}
          />
        )}
        {view === 'create' && <CreateView configured={configured} onTransact={transact} onDone={() => setView('market')} />}
        {view === 'review' && <MyWorkView account={account} bounties={bounties} onSelect={(item) => { setSelected(item); setView('market') }} />}
        {view === 'about' && <AboutView />}
      </main>

      <footer>
        <span>Curio · {networkName}</span>
        <span>Contract: {configured ? shortAddress(contractAddress) : 'not deployed'}</span>
        <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs ↗</a>
      </footer>
    </div>
  )
}

function MarketView({ bounties, loading, error, stats, selected, account, onSelect, onRefresh, onCreate, onTransact }: {
  bounties: LearningBounty[]
  loading: boolean
  error: string
  stats: { total: number; active: number; settled: number }
  selected: LearningBounty | null
  account: `0x${string}` | null
  onSelect: (item: LearningBounty | null) => void
  onRefresh: () => Promise<void>
  onCreate: () => void
  onTransact: (label: string, fn: string, args: unknown[], value?: bigint) => Promise<void>
}) {
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Consensus-backed work, not platform promises</div>
          <h1>Fund a learning outcome.<br /><em>Let validators judge the result.</em></h1>
          <p>Request a tutorial, research brief, curriculum, or technical lesson. GEN stays in escrow until GenLayer validators independently evaluate the submitted work against your rubric.</p>
          <div className="hero-actions">
            <button className="primary" onClick={onCreate}>Create a bounty</button>
            <button className="secondary" onClick={() => void onRefresh()}>Refresh on-chain data</button>
          </div>
        </div>
        <div className="consensus-card">
          <div className="consensus-head"><span>Adjudication flow</span><b>Equivalence Principle</b></div>
          <ol>
            <li><span>01</span><div><b>Leader evaluates</b><small>Fetches the deliverable and applies the rubric.</small></div></li>
            <li><span>02</span><div><b>Validators re-evaluate</b><small>Independent answer, not a schema-only check.</small></div></li>
            <li><span>03</span><div><b>GEN settles</b><small>Accept pays, reject refunds, uncertainty asks for more info.</small></div></li>
          </ol>
        </div>
      </section>

      <section className="metric-row" aria-label="On-chain metrics">
        <Metric value={String(stats.total)} label="Bounties loaded" />
        <Metric value={String(stats.active)} label="Active reviews" />
        <Metric value={String(stats.settled)} label="Settled outcomes" />
        <Metric value="3-way" label="Accept · refund · more info" />
      </section>

      <section className="content-grid">
        <div>
          <div className="section-heading"><div><span className="eyebrow">Live contract state</span><h2>Learning bounties</h2></div></div>
          {loading && <StatePanel title="Reading GenLayer state">Loading bounties directly from the configured Intelligent Contract…</StatePanel>}
          {error && <StatePanel tone="danger" title="Could not read contract">{error}</StatePanel>}
          {!loading && !error && bounties.length === 0 && (
            <StatePanel title="No bounties yet" action={<button className="primary small" onClick={onCreate}>Create the first</button>}>
              The contract returned an empty list. No demo rows were inserted.
            </StatePanel>
          )}
          <div className="bounty-list">
            {bounties.map((bounty) => (
              <button className={`bounty-card ${selected?.bounty_id === bounty.bounty_id ? 'selected' : ''}`} key={bounty.bounty_id} onClick={() => onSelect(bounty)}>
                <div className="bounty-top"><StatusBadge status={bounty.status} /><b>{formatGen(bounty.reward_wei)}</b></div>
                <h3>{bounty.title}</h3>
                <p>{bounty.brief}</p>
                <div className="bounty-meta"><span>#{bounty.bounty_id}</span><span>{shortAddress(bounty.requester)}</span><span>Round {bounty.review_round}</span></div>
              </button>
            ))}
          </div>
        </div>
        <BountyDetail bounty={selected} account={account} onClose={() => onSelect(null)} onTransact={onTransact} />
      </section>
    </>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>
}

function BountyDetail({ bounty, account, onClose, onTransact }: {
  bounty: LearningBounty | null
  account: `0x${string}` | null
  onClose: () => void
  onTransact: (label: string, fn: string, args: unknown[], value?: bigint) => Promise<void>
}) {
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [note, setNote] = useState('')
  if (!bounty) return <aside className="detail empty-detail"><div><span>↗</span><h3>Select a bounty</h3><p>Inspect the rubric, submission evidence, consensus result, and available on-chain actions.</p></div></aside>

  const activeBounty = bounty
  const isRequester = account?.toLowerCase() === activeBounty.requester.toLowerCase()
  const isContributor = account?.toLowerCase() === activeBounty.contributor.toLowerCase()
  const canSubmit = activeBounty.status === 'open' || (activeBounty.status === 'more_info' && isContributor)

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await onTransact('Submit deliverable', 'submit_solution', [activeBounty.bounty_id, submissionUrl, note])
      setSubmissionUrl('')
      setNote('')
    } catch {
      // Global transaction state already shows the actionable contract/wallet error.
    }
  }

  return (
    <aside className="detail">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="detail-title"><StatusBadge status={bounty.status} /><h2>{bounty.title}</h2><div className="reward">{formatGen(bounty.reward_wei)} escrowed</div></div>
      <DetailBlock title="Brief"><p>{bounty.brief}</p></DetailBlock>
      <DetailBlock title="Acceptance rubric"><pre>{bounty.rubric}</pre></DetailBlock>
      {bounty.reference_url && <DetailBlock title="Reference"><a href={bounty.reference_url} target="_blank" rel="noreferrer">Open requester reference ↗</a></DetailBlock>}
      {bounty.submission_url && (
        <DetailBlock title="Submitted evidence">
          <a href={bounty.submission_url} target="_blank" rel="noreferrer">Open deliverable ↗</a>
          <p>{bounty.submission_note}</p>
        </DetailBlock>
      )}
      {bounty.verdict !== 'pending' && (
        <div className="verdict">
          <div><span>Consensus verdict</span><strong>{bounty.verdict.replace('_', ' ')}</strong></div>
          <div><span>Quality</span><strong>{bounty.quality_score}/100</strong></div>
          <div><span>Criteria</span><strong>{bounty.criteria_met}/10</strong></div>
          <p>{bounty.reasoning}</p>
          {bounty.missing_evidence && <small>Missing: {bounty.missing_evidence}</small>}
        </div>
      )}
      {canSubmit && !isRequester && (
        <form className="inline-form" onSubmit={submit}>
          <h3>{bounty.status === 'more_info' ? 'Provide requested evidence' : 'Submit your work'}</h3>
          <label>Public HTTPS deliverable URL<input type="url" required value={submissionUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setSubmissionUrl(e.target.value)} placeholder="https://…" /></label>
          <label>Evidence note<textarea required minLength={10} value={note} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} placeholder="Explain what you delivered and how it meets the rubric." /></label>
          <button className="primary" type="submit">Record submission on-chain</button>
        </form>
      )}
      {bounty.status === 'submitted' && (
        <button className="primary full" onClick={() => { void onTransact('Run AI adjudication', 'adjudicate', [bounty.bounty_id]).catch(() => undefined) }}>Run validator consensus</button>
      )}
      {(bounty.status === 'open' || bounty.status === 'more_info') && isRequester && (
        <button className="danger full" onClick={() => { void onTransact('Cancel bounty', 'cancel_open_bounty', [bounty.bounty_id]).catch(() => undefined) }}>Cancel and refund escrow</button>
      )}
      {!account && <p className="hint">Connect a wallet to see actions available to this account.</p>}
      {bounty.contributor !== zeroAddress && <p className="hint">Contributor: {shortAddress(bounty.contributor)}</p>}
    </aside>
  )
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return <section className="detail-block"><h3>{title}</h3>{children}</section>
}

function CreateView({ configured, onTransact, onDone }: {
  configured: boolean
  onTransact: (label: string, fn: string, args: unknown[], value?: bigint) => Promise<void>
  onDone: () => void
}) {
  const [form, setForm] = useState({ id: '', title: '', brief: '', rubric: '', reference: '', reward: '1' })
  const [localError, setLocalError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setLocalError('')
    try {
      await onTransact('Create bounty', 'create_bounty', [form.id, form.title, form.brief, form.rubric, form.reference], parseGen(form.reward))
      onDone()
    } catch (error) { setLocalError(cleanError(error)) }
  }
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  return (
    <section className="form-page">
      <div className="form-copy"><span className="eyebrow">Escrow a real outcome</span><h1>Create a learning bounty</h1><p>Write a testable brief and rubric. The submitted URL is evaluated by independent GenLayer validators before the reward moves.</p>
        <div className="rubric-tips"><b>Strong rubric</b><ul><li>Names required sections or deliverables.</li><li>Defines correctness and source quality.</li><li>States what counts as rejection.</li><li>Avoids purely aesthetic preferences.</li></ul></div>
      </div>
      <form className="create-form" onSubmit={submit}>
        <label>Bounty ID<input required minLength={3} maxLength={64} value={form.id} onChange={(e: ChangeEvent<HTMLInputElement>) => update('id', e.target.value)} placeholder="genlayer-course-guide" /><small>Letters, numbers, hyphens and underscores.</small></label>
        <label>Title<input required minLength={5} maxLength={100} value={form.title} onChange={(e: ChangeEvent<HTMLInputElement>) => update('title', e.target.value)} placeholder="Create a GenLayer validator tutorial" /></label>
        <label>Detailed brief<textarea required minLength={30} maxLength={2500} value={form.brief} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('brief', e.target.value)} placeholder="Describe the audience, scope and expected learning outcome…" /></label>
        <label>Acceptance rubric<textarea required minLength={30} maxLength={2500} value={form.rubric} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('rubric', e.target.value)} placeholder={'1. Accurate Python contract example\n2. Explains leader and validator roles\n3. Includes runnable tests'} /></label>
        <label>Reference URL <span>(optional)</span><input type="url" value={form.reference} onChange={(e: ChangeEvent<HTMLInputElement>) => update('reference', e.target.value)} placeholder="https://docs.example.com/reference" /></label>
        <label>GEN reward<input required inputMode="decimal" value={form.reward} onChange={(e: ChangeEvent<HTMLInputElement>) => update('reward', e.target.value)} /></label>
        {localError && <p className="form-error">{localError}</p>}
        <button className="primary full" disabled={!configured}>Create bounty and escrow GEN</button>
        {!configured && <small className="hint">Deploy and configure the contract before submitting.</small>}
      </form>
    </section>
  )
}

function MyWorkView({ account, bounties, onSelect }: { account: `0x${string}` | null; bounties: LearningBounty[]; onSelect: (item: LearningBounty) => void }) {
  if (!account) return <StatePanel title="Wallet required">Connect a wallet to filter requester and contributor activity for your address.</StatePanel>
  const mine = bounties.filter((item) => item.requester.toLowerCase() === account.toLowerCase() || item.contributor.toLowerCase() === account.toLowerCase())
  return <section className="simple-page"><span className="eyebrow">Address-specific contract state</span><h1>My work</h1><p>{shortAddress(account)} appears in {mine.length} loaded bounties.</p><div className="bounty-list">{mine.map((item) => <button className="bounty-card" onClick={() => onSelect(item)} key={item.bounty_id}><div className="bounty-top"><StatusBadge status={item.status} /><b>{formatGen(item.reward_wei)}</b></div><h3>{item.title}</h3><p>{item.requester.toLowerCase() === account.toLowerCase() ? 'You requested this outcome.' : 'You submitted this deliverable.'}</p></button>)}</div>{mine.length === 0 && <StatePanel title="No matching activity">This address is not yet a requester or contributor in the loaded contract state.</StatePanel>}</section>
}

function AboutView() {
  return <section className="about-page"><div><span className="eyebrow">Why GenLayer is essential</span><h1>A normal smart contract cannot grade an open-ended lesson.</h1><p>Curio combines deterministic escrow rules with non-deterministic judgment. The contract fetches unstructured evidence and asks multiple AI-enabled validators to independently derive the payout decision.</p></div><div className="architecture"><article><span>Deterministic</span><h3>Funds and permissions</h3><p>Exact GEN reward, requester ownership, status transitions, replay protection and transfer destination.</p></article><article><span>Non-deterministic</span><h3>Quality judgment</h3><p>Web rendering, rubric interpretation, relevance, evidence quality and completeness.</p></article><article><span>Consensus</span><h3>Substantive comparison</h3><p>Decision must match; score and criteria counts have tight tolerances; payout-boundary disagreements fail validation.</p></article><article><span>Settlement</span><h3>Three honest outcomes</h3><p>Pay contributor, refund requester, or preserve escrow while requesting specific missing evidence.</p></article></div><div className="security-note"><b>Prompt-injection boundary</b><p>Submission and reference pages are explicitly treated as untrusted evidence. Embedded commands are ignored; validators judge only the requester-authored brief and rubric.</p></div></section>
}
