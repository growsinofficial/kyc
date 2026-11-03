import { useState } from 'react'
import api from '../services/api'
import { useToast } from '../components/toastContext'
import { formatDate, rupees, TENURE } from '../constants/options'

const STAGES = ['Filling your details into the agreement', 'Adding your risk profile and suitability remarks', 'Adding your plan and fee schedule', 'Preparing the PDF for eSign']

function Rows({ rows }) {
  return <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
}

export default function Review({ kyc, risk, plan, onEdit, onGenerated }) {
  const toast = useToast()
  const [agree, setAgree] = useState(false)
  const [need, setNeed] = useState(false)
  const [stage, setStage] = useState(-1)
  const [err, setErr] = useState('')
  const p = kyc?.personal || {}
  const a = kyc?.address || {}

  const generate = async () => {
    setErr('')
    if (!agree) { setNeed(true); toast('Tick the confirmation box to continue', 'warn'); return }
    setStage(0)
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 650)
    try {
      const res = await api.generateAgreement(plan?._id)
      clearInterval(timer)
      setStage(STAGES.length)
      toast('Agreement generated. Continue to sign.')
      setTimeout(() => onGenerated(res.agreement), 300)
    } catch (e) {
      clearInterval(timer)
      setStage(-1)
      setErr(e.message)
    }
  }

  return (
    <section className="card panel" aria-labelledby="rev-h">
      <div className="p-head"><span className="eyebrow">Step 3 of 5</span><h1 id="rev-h">Review &amp; generate</h1><p>Check your details. Generating fills the agreement from the template and opens it for signing.</p></div>
      {stage < 0 ? (
        <>
          <div className="rv">
            <div className="rv-h"><b>Client</b><button type="button" className="link-btn" onClick={() => onEdit('details')}>Edit</button></div>
            <Rows rows={[['Name', p.name], ["Father's name", p.fatherName], ['Date of birth', formatDate(p.dob)], ['PAN', p.pan], ['Mobile', a.mobile && `+91 ${a.mobile}`], ['Email', a.email], ['Address', [a.address, a.city, a.state, a.pincode].filter(Boolean).join(', ')]]} />
          </div>
          <div className="rv">
            <div className="rv-h"><b>Risk profile and plan</b><button type="button" className="link-btn" onClick={() => onEdit('risk')}>Edit</button></div>
            <Rows rows={[['Risk profile', risk && `${risk.riskCategory} (${risk.riskScore}/21)`], ['Plan', plan?.title || plan?.name], ['Fee', plan && rupees(plan.price)], ['Tenure', plan && (TENURE[plan.billingCycle] || plan.billingCycle)]]} />
          </div>
          <label className={`consent${need ? ' need' : ''}`}>
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setNeed(false) }} />
            <span className="mark" aria-hidden="true" />
            <span>I confirm the details above are correct and want to generate my advisory agreement.</span>
          </label>
          {err && <p className="err-box" role="alert">{err}</p>}
          <div className="cta-bar"><button type="button" className="btn wide" onClick={generate}>Generate agreement &amp; sign</button></div>
        </>
      ) : (
        <ol className="stages" aria-live="polite">
          {STAGES.map((s, i) => <li key={s} className={i < stage ? 'ok' : i === stage ? 'run' : ''}><span className="s-ic" aria-hidden="true" />{s}</li>)}
        </ol>
      )}
    </section>
  )
}
