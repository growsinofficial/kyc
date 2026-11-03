import { useEffect, useState } from 'react'
import api from '../services/api'
import { rupees, TENURE } from '../constants/options'

export default function Payment({ plan, agreement, onBack }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pay = async () => {
    setBusy(true); setErr('')
    try {
      const res = await api.initiatePayment(plan._id)
      const url = res.data?.paymentUrl
      if (!url) throw new Error('The payment page could not be opened. Please try again.')
      window.location.assign(url)
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }
  return (
    <section className="card panel" aria-labelledby="pay-h">
      <div className="p-head"><span className="eyebrow">Step 5 of 5</span><h1 id="pay-h">Payment</h1><p>Pay the advisory fee for your plan. You will return here after paying.</p></div>
      <div className="rv">
        <div className="sum-row"><span>Plan</span><b>{plan?.title || plan?.name}</b></div>
        <div className="sum-row"><span>Tenure</span><b>{plan && (TENURE[plan.billingCycle] || plan.billingCycle)}</b></div>
        <div className="sum-row"><span>Agreement</span><b>{agreement?.status === 'signed' ? 'Signed' : 'Not signed'}</b></div>
        <div className="sum-row total"><span>Amount</span><b>{plan && rupees(plan.price)}</b></div>
      </div>
      <p className="note">Payments are processed securely by Zoho Payments. Cash is not accepted (SEBI IA Regulations).</p>
      {err && <p className="err-box" role="alert">{err}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onBack}>Back</button>
        <button type="button" className="btn" onClick={pay} disabled={busy || !plan}>{busy && <span className="spin" />}Pay {plan ? rupees(plan.price) : ''}</button>
      </div>
    </section>
  )
}

export function PaymentReturn({ cancelled, onDone, onRetry }) {
  const [state, setState] = useState(cancelled ? 'cancelled' : 'checking')
  const [err, setErr] = useState('')
  useEffect(() => {
    if (cancelled) return
    const q = new URLSearchParams(window.location.search)
    const tx = q.get('transaction_id')
    if (!tx) { setState('error'); setErr('We could not find your payment reference.'); return }
    api.verifyPayment(tx, q.get('payment_id')).then(
      () => { setState('paid'); setTimeout(onDone, 1200) },
      (e) => { setState('error'); setErr(e.message) }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelled])
  return (
    <section className="card panel" aria-live="polite">
      <div className="p-head"><h1>{state === 'paid' ? 'Payment received' : state === 'checking' ? 'Confirming your payment…' : state === 'cancelled' ? 'Payment cancelled' : 'Payment not confirmed'}</h1></div>
      {state === 'paid' && <p className="ok-box">Thank you. Your payment is confirmed.</p>}
      {state === 'cancelled' && <p className="info-box">No money was taken. You can pay whenever you are ready.</p>}
      {state === 'error' && <p className="err-box">{err}</p>}
      {state !== 'checking' && state !== 'paid' && <div className="actions"><span /><button type="button" className="btn" onClick={onRetry}>Back to payment</button></div>}
    </section>
  )
}

export function Done({ user, onDownload }) {
  return (
    <section className="card panel" aria-labelledby="done-h">
      <div className="p-head"><h1 id="done-h">You're all set{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1><p>Your onboarding is complete. Your adviser will be in touch with your first recommendations.</p></div>
      <ol className="tl">
        <li>Client details and risk profile<small>Submitted</small></li>
        <li>Investment Advisory Agreement<small>Signed with Aadhaar eSign</small></li>
        <li>Advisory fee<small>Paid</small></li>
      </ol>
      <div className="actions"><span className="note" /><button type="button" className="btn ghost" onClick={onDownload}>Download signed agreement</button></div>
    </section>
  )
}
