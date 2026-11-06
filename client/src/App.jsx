import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, ChartNoAxesCombined, ChevronDown, CircleHelp, Droplet, HeartPulse, LogOut, Plus, ShieldCheck, Sparkles, Trash2, Pencil, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from './api.js';

const SLOT_LABELS = {
  MORNING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner'
};
const SLOTS = Object.keys(SLOT_LABELS);
const today = () => new Date().toISOString().slice(0, 10);
const prettyDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [date, setDate] = useState(today());
  const [activeReport, setActiveReport] = useState('daily');
  const [report, setReport] = useState(null);
  const [monthReport, setMonthReport] = useState(null);
  const [trend, setTrend] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ readingDate: today(), timeSlot: 'MORNING', glucoseValue: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.me().then(data => setUser(data.user)).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.report(activeReport === 'daily' ? 'daily' : activeReport === 'mtd' ? 'month-to-date' : 'monthly', date),
      api.report('daily', date),
      api.trend(date),
      api.readings(`?page=1&limit=50`)
    ]).then(([selected, daily, chart, history]) => {
      if (cancelled) return;
      setReport(selected);
      setMonthReport(daily);
      setTrend(chart.points);
      setReadings(history.readings);
    }).catch(err => showToast(err.message)).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, date, activeReport]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }

  async function submitAuth(e) {
    e.preventDefault(); setAuthError(''); setAuthBusy(true);
    try {
      const result = authMode === 'login'
        ? await api.login({ email, password })
        : await api.register({ name, email, password });
      setUser(result.user);
    } catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null); setReadings([]); setReport(null);
  }

  function openNew() {
    setEditing(null);
    setForm({ readingDate: date, timeSlot: 'MORNING', glucoseValue: '' });
    setFormError('');
    setModalOpen(true);
  }
  function openEdit(reading) {
    setEditing(reading);
    setForm({ readingDate: reading.readingDate.slice(0, 10), timeSlot: reading.timeSlot, glucoseValue: String(reading.glucoseValue) });
    setFormError('');
    setModalOpen(true);
  }
  async function saveReading(e) {
    e.preventDefault(); setFormError('');
    const value = Number(form.glucoseValue);
    if (!form.glucoseValue) return setFormError('Please enter a glucose value.');
    if (!Number.isInteger(value) || value < 40 || value > 600) return setFormError('Value must be between 40 and 600 mg/dl.');
    if (form.readingDate > today()) return setFormError('Date cannot be in the future.');
    setSaving(true);
    try {
      if (editing) await api.updateReading(editing.id, { ...form, glucoseValue: value });
      else await api.createReading({ ...form, glucoseValue: value });
      setModalOpen(false);
      showToast(editing ? 'Reading updated.' : 'Reading saved.');
      await refresh();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }
  async function refresh() {
    const [selected, daily, chart, history] = await Promise.all([
      api.report(activeReport === 'daily' ? 'daily' : activeReport === 'mtd' ? 'month-to-date' : 'monthly', date),
      api.report('daily', date), api.trend(date), api.readings('?page=1&limit=50')
    ]);
    setReport(selected); setMonthReport(daily); setTrend(chart.points); setReadings(history.readings);
  }
  async function removeReading(reading) {
    if (!window.confirm(`Delete the ${SLOT_LABELS[reading.timeSlot]} reading of ${reading.glucoseValue} mg/dL?`)) return;
    try { await api.deleteReading(reading.id); showToast('Reading deleted.'); await refresh(); }
    catch (err) { showToast(err.message); }
  }

  const chartData = useMemo(() => trend.map(point => ({ ...point, label: `${Number(point.date.slice(8, 10))} ${SLOT_LABELS[point.timeSlot].replace(' (fasting)', '')}`, value: point.value })), [trend]);

  if (authLoading) return <div className="loading-screen"><div className="brand-mark"><Droplet /></div><p>Preparing your dashboard…</p></div>;

  if (!user) return <main className="auth-shell">
    <section className="auth-visual">
      <div className="brand"><span className="brand-mark"><Droplet size={22}/></span><span>Sweety</span></div>
      <div className="auth-message">
        <span className="eyebrow"><Sparkles size={14}/> YOUR HEALTH, IN YOUR HANDS</span>
        <h1>Small steps.<br/><em>Clearer insights.</em></h1>
        <p>A calm, simple space to keep track of your blood glucose readings and understand your trends over time.</p>
        <div className="visual-stats"><div><strong>4</strong><span>daily time slots</span></div><div><strong>1</strong><span>clear overview</span></div></div>
      </div>
      <div className="auth-foot"><ShieldCheck size={15}/> Your readings are private to your account.</div>
    </section>
    <section className="auth-panel">
      <form className="auth-card" onSubmit={submitAuth}>
        <span className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
        <h2>{authMode === 'login' ? 'Good to see you.' : 'Create your account.'}</h2>
        <p className="muted">{authMode === 'login' ? 'Log in to continue your wellness journey.' : 'A few details and you’re ready to go.'}</p>
        {authMode === 'register' && <label>Your name<input required minLength="2" maxLength="80" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
        <label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label>Password<input required type="password" minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
        {authError && <div className="error-box" role="alert">{authError}</div>}
        <button className="primary-btn full" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create account'}</button>
        <p className="switch-auth">{authMode === 'login' ? 'New to Sweety?' : 'Already have an account?'} <button type="button" onClick={()=>{setAuthMode(authMode === 'login' ? 'register' : 'login');setAuthError('')}}>{authMode === 'login' ? 'Create an account' : 'Log in'}</button></p>
      </form>
    </section>
  </main>;

  const summary = report?.summary || { highest: null, lowest: null, average: null, count: 0 };
  const dailyReadings = monthReport?.readings || [];
  const rangeLabel = report?.range ? `${prettyDate(report.range.start)} – ${prettyDate(report.range.end)}` : '';

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Droplet size={22}/></span><span>Sweety</span></div>
      <div className="side-label">WORKSPACE</div>
      <button className="nav-item active"><Activity size={18}/> Overview</button>
      <div className="side-note"><div className="note-icon"><HeartPulse size={17}/></div><strong>A little progress, every day.</strong><p>Consistent tracking can help you have more informed conversations with your care team.</p></div>
      <div className="sidebar-bottom"><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{user.name}</strong><span>{user.email}</span></div><button className="icon-btn" title="Log out" onClick={logout}><LogOut size={17}/></button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">YOUR PERSONAL HEALTH SPACE</span><h1>Hello, {user.name.split(' ')[0]} <span className="wave">✦</span></h1><p>Here’s a look at your blood glucose activity.</p></div><div className="top-actions"><label className="date-control"><CalendarDays size={17}/><input aria-label="Selected date" type="date" max={today()} value={date} onChange={e=>setDate(e.target.value)}/></label><button className="primary-btn" onClick={openNew}><Plus size={17}/> Add reading</button></div></header>

      <section className="section-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Reading summary</h2><p>{rangeLabel || 'Your selected reporting period'}</p></div><div className="report-tabs" role="tablist" aria-label="Report period">
        {[['daily','Daily'],['mtd','Month to date'],['monthly','Previous month']].map(([key,label])=><button key={key} role="tab" aria-selected={activeReport===key} className={activeReport===key?'selected':''} onClick={()=>setActiveReport(key)}>{label}</button>)}
      </div></section>

      <section className="stats-grid">
        <StatCard label="Highest reading" value={summary.highest ?? '—'} unit={summary.highest == null ? '' : 'mg/dL'} icon={<ChartNoAxesCombined/>} tone="peach" detail="Peak in this period"/>
        <StatCard label="Lowest reading" value={summary.lowest ?? '—'} unit={summary.lowest == null ? '' : 'mg/dL'} icon={<Droplet/>} tone="blue" detail="Lowest in this period"/>
        <StatCard label="Average reading" value={summary.average ?? '—'} unit={summary.average == null ? '' : 'mg/dL'} icon={<Activity/>} tone="green" detail="Average in this period"/>
        <StatCard label="Total readings" value={summary.count} unit="entries" icon={<CalendarDays/>} tone="lavender" detail="Records in this period"/>
      </section>

      <section className="content-grid">
        <div className="panel chart-panel">
          <div className="panel-heading"><div><span className="eyebrow">YOUR HISTORY</span><h3>Glucose trends</h3><p>Readings recorded during {new Date(`${date.slice(0,7)}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p></div><span className="chart-legend"><i/> mg/dL</span></div>
          {chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:12,right:12,left:-18,bottom:0}}><defs><linearGradient id="glucoseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#55b8a1" stopOpacity={0.25}/><stop offset="95%" stopColor="#55b8a1" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#edf2ef" vertical={false}/><XAxis dataKey="label" tick={{fontSize:10,fill:'#8a9b97'}} axisLine={false} tickLine={false}/><YAxis domain={['dataMin - 20','dataMax + 20']} tick={{fontSize:10,fill:'#8a9b97'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{border:'1px solid #e7efeb',borderRadius:12,fontSize:12}} formatter={v=>[`${v} mg/dL`,'Glucose']}/><Area type="monotone" dataKey="value" stroke="#279783" strokeWidth={2.5} fill="url(#glucoseFill)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div> : <EmptyState title="No trend data yet" text="Add a reading to start seeing your glucose history."/>}
        </div>
        <div className="panel daily-panel">
          <div className="panel-heading"><div><span className="eyebrow">DAILY LOG</span><h3>{prettyDate(date)}</h3><p>{dailyReadings.length} of 4 possible readings</p></div><button className="small-add" onClick={openNew}><Plus size={15}/> Add</button></div>
          <div className="slot-list">{SLOTS.map(slot=>{const item=dailyReadings.find(r=>r.timeSlot===slot);return <div className="slot-row" key={slot}><span className={`slot-dot ${item?'filled':''}`}/><div className="slot-copy"><strong>{SLOT_LABELS[slot]}</strong><span>{item?'Recorded':'Not recorded yet'}</span></div>{item?<div className="slot-value"><strong>{item.glucoseValue}</strong><small>mg/dL</small></div>:<span className="slot-empty">—</span>}</div>})}</div>
        </div>
      </section>

      <section className="panel history-panel">
        <div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Your readings</h3><p>Manage your recent glucose records.</p></div><button className="text-btn" onClick={openNew}><Plus size={16}/> New reading</button></div>
        {loading ? <div className="table-empty">Loading readings…</div> : readings.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Time slot</th><th>Glucose value</th><th>Actions</th></tr></thead><tbody>{readings.map(r=><tr key={r.id}><td>{prettyDate(r.readingDate.slice(0,10))}</td><td><span className="slot-pill">{SLOT_LABELS[r.timeSlot]}</span></td><td><strong>{r.glucoseValue}</strong> <span className="muted">mg/dL</span></td><td><div className="row-actions"><button className="icon-btn" aria-label={`Edit ${SLOT_LABELS[r.timeSlot]}`} onClick={()=>openEdit(r)}><Pencil size={15}/></button><button className="icon-btn danger" aria-label={`Delete ${SLOT_LABELS[r.timeSlot]}`} onClick={()=>removeReading(r)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Your log is ready" text="No readings yet. Add your first reading to get started."/>}
      </section>
      <footer className="footer-note"><ShieldCheck size={14}/> Your health data is private to your account. <span>•</span> Sweety is a tracking tool, not a medical device.</footer>
    </main>

    {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><form className="modal-card" onSubmit={saveReading}>
      <div className="modal-heading"><div><span className="eyebrow">{editing?'UPDATE RECORD':'NEW RECORD'}</span><h2>{editing?'Edit reading':'Add a reading'}</h2><p>Enter your glucose reading below.</p></div><button type="button" className="icon-btn" aria-label="Close" onClick={()=>setModalOpen(false)}><X/></button></div>
      <label>Date<input type="date" required max={today()} value={form.readingDate} onChange={e=>setForm({...form,readingDate:e.target.value})}/></label>
      <label>Time slot<select value={form.timeSlot} onChange={e=>setForm({...form,timeSlot:e.target.value})}>{SLOTS.map(slot=><option key={slot} value={slot}>{SLOT_LABELS[slot]}</option>)}</select></label>
      <label>Glucose value <span className="muted">(mg/dL)</span><div className="value-input"><input type="number" required min="40" max="600" step="1" placeholder="e.g. 110" value={form.glucoseValue} onChange={e=>setForm({...form,glucoseValue:e.target.value})}/><span>mg/dL</span></div></label>
      <p className="form-hint"><CircleHelp size={14}/> Enter a whole number between 40 and 600.</p>
      {formError && <div className="error-box" role="alert">{formError}</div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setModalOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving?'Saving…':editing?'Save changes':'Save reading'}</button></div>
    </form></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function StatCard({label,value,unit,icon,tone,detail}) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><div className="stat-value">{value}<small>{unit}</small></div><span className="stat-detail">{detail}</span></article>;
}
function EmptyState({title,text}) {
  return <div className="empty-state"><div className="empty-icon"><Activity size={20}/></div><strong>{title}</strong><p>{text}</p></div>;
}
export default App;
