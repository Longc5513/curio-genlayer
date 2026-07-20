import { useCallback, useEffect, useState } from 'react'
import { shortAddr, scoreColor, cleanError } from './lib/format'
import {
  connectWallet, getConnectedWallet, subscribeWallet,
  getContractHealth, listCompanies, batchAddCompanies,
  listCompanyTasks, listCompanyResults, createTask, adjudicate,
  batchCreateTasks, batchAdjudicate, listBatches,
  transactionUrl, contractAddress, networkName, studioImportUrl,
  type Company, type AdjudicationTask, type AdjudicationResult,
  type BatchJob, type ContractHealth, type TxState,
} from './lib/genlayer'

const FIELDS = ['technology','finance','legal','marketing','operations','hr','compliance','security','quality','sustainability','innovation']
const SAMPLE_CRITERIA = JSON.stringify([{name:"Accuracy",weight:30},{name:"Completeness",weight:25},{name:"Compliance",weight:25},{name:"Innovation",weight:20}],null,2)

type View = 'dashboard' | 'companies' | 'adjudicate' | 'batches' | 'results'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [health, setHealth] = useState<ContractHealth>({configured:true,reachable:false,version:'',stats:null,error:''})
  const [companies, setCompanies] = useState<Company[]>([])
  const [batches, setBatches] = useState<BatchJob[]>([])
  const [selected, setSelected] = useState<Company | null>(null)
  const [tasks, setTasks] = useState<AdjudicationTask[]>([])
  const [results, setResults] = useState<AdjudicationResult[]>([])
  const [tx, setTx] = useState<TxState>({phase:'idle',label:''})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const h = await getContractHealth()
      setHealth(h)
      if (h.reachable) {
        const [c, b] = await Promise.all([listCompanies(), listBatches()])
        setCompanies(c); setBatches(b)
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    void getConnectedWallet().then(setAccount).catch(() => setAccount(null))
    return subscribeWallet(setAccount, () => void refresh())
  }, [refresh])

  const loadCompany = async (c: Company) => {
    setSelected(c)
    const [t, r] = await Promise.all([listCompanyTasks(c.company_id), listCompanyResults(c.company_id)])
    setTasks(t); setResults(r)
  }

  const handleConnect = async () => {
    setTx({phase:'wallet',label:'Connecting wallet…'})
    try {
      const a = await connectWallet(); setAccount(a)
      setTx({phase:'success',label:'Wallet connected'})
    } catch(e) { setTx({phase:'error',label:'Connection failed',error:cleanError(e)}) }
  }

  const handleBatchAdd = async (json: string) => {
    if (!account) return
    setTx({phase:'submitting',label:'Adding companies…'})
    try {
      await batchAddCompanies(account, json, (h) => setTx({phase:'consensus',label:'Confirming on-chain…',hash:h}))
      setTx({phase:'success',label:'Companies added!'}); await refresh()
    } catch(e) { setTx({phase:'error',label:'Failed',error:cleanError(e)}) }
  }

  const handleAdjudicate = async (tid: string) => {
    if (!account) return
    setTx({phase:'submitting',label:`Running adjudication for ${tid}…`})
    try {
      await adjudicate(account, tid, (h) => setTx({phase:'consensus',label:'Validators evaluating…',hash:h}))
      setTx({phase:'success',label:'Adjudication complete!'})
      if (selected) { const r = await listCompanyResults(selected.company_id); setResults(r) }
    } catch(e) { setTx({phase:'error',label:'Failed',error:cleanError(e)}) }
  }

  const handleBatchScore = async (field: string) => {
    if (!account || companies.length === 0) return
    const cids = companies.filter(c=>c.is_active).slice(0,10).map(c=>c.company_id)
    setTx({phase:'submitting',label:`Batch scoring ${cids.length} companies on ${field}…`})
    try {
      await batchCreateTasks(account, `Batch ${field} ${new Date().toISOString().slice(0,10)}`, JSON.stringify(cids), field, `${field} audit for {company}`, `Evaluate {company} on ${field} criteria`, SAMPLE_CRITERIA, (h) => setTx({phase:'consensus',label:'Creating tasks…',hash:h}))
      setTx({phase:'success',label:'Batch tasks created!'}); await refresh()
    } catch(e) { setTx({phase:'error',label:'Failed',error:cleanError(e)}) }
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">C</div>
          <div><strong>Curio</strong><small>Enterprise</small></div>
        </div>
        <nav>
          {([['dashboard','Dashboard'],['companies','Companies'],['adjudicate','Adjudicate'],['batches','Batches'],['results','Results']] as [View,string][]).map(([v,l]) =>
            <button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{l}</button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="network-badge">{networkName}</div>
          <button className="wallet-btn" onClick={handleConnect}>
            <span className={account?'dot on':'dot'}/>{account ? shortAddr(account) : 'Connect'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main>
        {/* Topbar */}
        <header className="topbar">
          <h1>{view==='dashboard'?'Dashboard':view==='companies'?'Company Management':view==='adjudicate'?'Adjudication Center':view==='batches'?'Batch Operations':'Results & Reports'}</h1>
          <div className="topbar-stats">
            {health.stats && <>
              <span>{health.stats.total_companies} Companies</span>
              <span>{health.stats.total_tasks} Tasks</span>
              <span>{health.stats.total_results} Results</span>
            </>}
          </div>
        </header>

        {/* TX Panel */}
        {tx.phase !== 'idle' && (
          <div className={`tx-panel tx-${tx.phase}`}>
            <strong>{tx.label}</strong>
            {tx.hash && <a href={transactionUrl(tx.hash)} target="_blank" rel="noreferrer">{tx.hash.slice(0,16)}… ↗</a>}
            {tx.error && <p>{tx.error}</p>}
            <button onClick={()=>setTx({phase:'idle',label:''})}>×</button>
          </div>
        )}

        {/* Health check */}
        {!health.reachable && !loading && (
          <div className="alert alert-danger">
            <strong>Contract not reachable</strong>
            <p>{health.error || 'Check network connection'}</p>
            <button onClick={()=>void refresh()}>Retry</button>
          </div>
        )}

        {/* Dashboard */}
        {view === 'dashboard' && health.reachable && (
          <div className="dashboard">
            <div className="metric-grid">
              <div className="metric-card"><span className="metric-val">{health.stats?.total_companies||0}</span><span className="metric-label">Companies</span></div>
              <div className="metric-card"><span className="metric-val">{health.stats?.total_tasks||0}</span><span className="metric-label">Tasks</span></div>
              <div className="metric-card"><span className="metric-val">{health.stats?.total_results||0}</span><span className="metric-label">Results</span></div>
              <div className="metric-card"><span className="metric-val">{health.stats?.total_batches||0}</span><span className="metric-label">Batches</span></div>
            </div>
            <div className="card">
              <h3>Supported Fields</h3>
              <div className="field-tags">
                {health.stats?.supported_fields.map(f => <span key={f} className="tag">{f}</span>)}
              </div>
            </div>
            <div className="card">
              <h3>Quick Actions</h3>
              <div className="actions">
                <button className="btn primary" onClick={()=>setView('companies')}>Manage Companies</button>
                <button className="btn primary" onClick={()=>setView('adjudicate')}>Start Adjudication</button>
                <a className="btn secondary" href={studioImportUrl} target="_blank" rel="noreferrer">Open in Studio ↗</a>
              </div>
            </div>
            <div className="card">
              <h3>Contract Info</h3>
              <p>Version: {health.version}</p>
              <p>Address: {shortAddr(contractAddress)}</p>
              <p>Network: {networkName}</p>
            </div>
          </div>
        )}

        {/* Companies */}
        {view === 'companies' && (
          <div className="companies-view">
            <div className="section-header">
              <h2>Companies ({companies.length})</h2>
              <button className="btn primary" onClick={() => {
                const sample = JSON.stringify([
                  {company_id:'acme',name:'ACME Corp',industry:'Technology',description:'Leading tech company',website:'https://acme.com',contact_email:'info@acme.com'},
                  {company_id:'globex',name:'Globex Inc',industry:'Finance',description:'Financial services',website:'https://globex.com',contact_email:'hello@globex.com'},
                  {company_id:'initech',name:'Initech',industry:'Software',description:'Enterprise solutions',website:'https://initech.com',contact_email:'team@initech.com'},
                ])
                void handleBatchAdd(sample)
              }}>+ Add Sample (3)</button>
            </div>
            <div className="company-grid">
              {companies.map(c => (
                <div key={c.company_id} className={`company-card ${selected?.company_id===c.company_id?'selected':''}`} onClick={()=>void loadCompany(c)}>
                  <div className="company-header">
                    <strong>{c.name}</strong>
                    <span className={`status ${c.is_active?'active':'inactive'}`}>{c.is_active?'Active':'Inactive'}</span>
                  </div>
                  <p className="company-industry">{c.industry}</p>
                  <p className="company-desc">{c.description?.slice(0,80)}…</p>
                  <div className="company-meta">
                    <span>{c.company_id}</span>
                    <span>{c.website}</span>
                  </div>
                </div>
              ))}
              {companies.length===0 && <div className="empty">No companies yet. Add some to get started.</div>}
            </div>

            {/* Selected company detail */}
            {selected && (
              <div className="company-detail card">
                <h3>{selected.name} — Detail</h3>
                <div className="detail-grid">
                  <div><strong>ID:</strong> {selected.company_id}</div>
                  <div><strong>Industry:</strong> {selected.industry}</div>
                  <div><strong>Email:</strong> {selected.contact_email}</div>
                  <div><strong>Website:</strong> {selected.website}</div>
                </div>
                <h4>Tasks ({tasks.length})</h4>
                {tasks.map(t => (
                  <div key={t.task_id} className="task-row">
                    <span className="tag">{t.field}</span>
                    <span>{t.title}</span>
                    <span className={`status ${t.status}`}>{t.status}</span>
                    {t.status==='pending' && <button className="btn small" onClick={()=>void handleAdjudicate(t.task_id)}>Run</button>}
                  </div>
                ))}
                <h4>Results ({results.length})</h4>
                {results.map(r => (
                  <div key={r.result_id} className="result-row">
                    <span className="tag">{r.field}</span>
                    <span className="score" style={{color:scoreColor(r.overall_score)}}>{r.overall_score}/100</span>
                    <span className={`verdict ${r.verdict}`}>{r.verdict}</span>
                    <p>{r.reasoning?.slice(0,100)}…</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Adjudicate */}
        {view === 'adjudicate' && (
          <div className="adjudicate-view">
            <h2>Batch Score by Field</h2>
            <p>Select a field to run AI-powered adjudication on all active companies (max 10).</p>
            <div className="field-grid">
              {FIELDS.map(f => (
                <button key={f} className="field-card" onClick={()=>void handleBatchScore(f)}>
                  <strong>{f}</strong>
                  <small>Score all companies</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Batches */}
        {view === 'batches' && (
          <div className="batches-view">
            <h2>Batch Jobs ({batches.length})</h2>
            {batches.map(b => (
              <div key={b.batch_id} className="batch-card card">
                <div className="batch-header">
                  <strong>{b.name}</strong>
                  <span className={`status ${b.status}`}>{b.status}</span>
                </div>
                <div className="batch-stats">
                  <span>Field: {b.field}</span>
                  <span>Total: {b.total}</span>
                  <span>Done: {b.completed}</span>
                  <span>Failed: {b.failed}</span>
                </div>
                {b.status==='pending' && <button className="btn primary" onClick={()=>void (async()=>{
                  if(!account)return; setTx({phase:'submitting',label:'Running batch…'})
                  try{await batchAdjudicate(account,b.batch_id,(h)=>setTx({phase:'consensus',label:'Processing…',hash:h}));setTx({phase:'success',label:'Batch done!'});await refresh()}catch(e){setTx({phase:'error',label:'Failed',error:cleanError(e)})}
                })()}>Run Batch</button>}
              </div>
            ))}
            {batches.length===0 && <div className="empty">No batch jobs yet.</div>}
          </div>
        )}

        {/* Results */}
        {view === 'results' && (
          <div className="results-view">
            <h2>All Results</h2>
            {companies.map(c => (
              <div key={c.company_id} className="card" style={{marginBottom:16}}>
                <h3>{c.name}</h3>
                <button className="btn small" onClick={()=>void loadCompany(c)}>Load Results</button>
                {selected?.company_id===c.company_id && results.map(r => (
                  <div key={r.result_id} className="result-row">
                    <span className="tag">{r.field}</span>
                    <span className="score" style={{color:scoreColor(r.overall_score)}}>{r.overall_score}/100</span>
                    <span className={`verdict ${r.verdict}`}>{r.verdict}</span>
                    <p>{r.reasoning?.slice(0,120)}</p>
                    {r.recommendations && <small>💡 {r.recommendations?.slice(0,120)}</small>}
                  </div>
                ))}
              </div>
            ))}
            {companies.length===0 && <div className="empty">No companies to show results for.</div>}
          </div>
        )}
      </main>
    </div>
  )
}
