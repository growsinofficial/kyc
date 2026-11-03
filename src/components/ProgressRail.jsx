import { STEPS } from '../constants/steps'

export default function ProgressRail({ step, status, onGo, client, progress }) {
  const done = status.done || {}
  const doneCount = STEPS.filter((s) => done[s.id]).length
  const chip = (s) => (done[s.id] ? (s.id === 'sign' ? 'Signed' : s.id === 'payment' ? 'Paid' : 'Done') : s.id === step ? 'In progress' : status.canOpen[s.id] ? 'To do' : 'Locked')
  const initials = (client?.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (
    <aside className="rail" aria-label="Onboarding progress">
      <div className="card prog-card">
        <div className="pc-head">
          <span className="pring" aria-hidden="true">
            <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="23" className="rb" /><circle cx="28" cy="28" r="23" className="rf" pathLength="100" style={{ strokeDasharray: `${Math.round(progress)} 100` }} /></svg>
            <b>{Math.round(progress)}%</b>
          </span>
          <div><b>Onboarding progress</b><small>{doneCount === STEPS.length ? 'Onboarding complete' : `${doneCount} of ${STEPS.length} steps complete`}</small></div>
        </div>
        <nav aria-label="Onboarding steps">
          <ol className="rail-steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={[done[s.id] && 'done', s.id === step && 'current', !status.canOpen[s.id] && 'locked'].filter(Boolean).join(' ')}>
                <button type="button" disabled={!status.canOpen[s.id]} aria-current={s.id === step ? 'step' : undefined} onClick={() => onGo(s.id)}>
                  <span className="rs-num">{i + 1}</span>
                  <span className="rs-body"><span className="rs-t">{s.title}</span><span className="rs-sub">{status.sub[s.id]}</span></span>
                  <span className="rs-chip">{chip(s)}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        {client?.name && (
          <div className="client-mini">
            <span className="avatar">{initials || '–'}</span>
            <div><b>{client.name}</b><small>{client.meta}</small></div>
          </div>
        )}
      </div>
    </aside>
  )
}
