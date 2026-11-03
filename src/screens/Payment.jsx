import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { TENURE } from '../constants/options'
import { useToast } from '../components/toastContext'

const ZOHO_SCRIPT = 'https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js'
let zohoScript = null
function loadZoho() {
  if (window.ZPayments) return Promise.resolve()
  if (!zohoScript) {
    zohoScript = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = ZOHO_SCRIPT; s.async = true
      s.onload = () => resolve()
      s.onerror = () => { zohoScript = null; reject(new Error('Could not load the payment window. Check your connection and try again.')) }
      document.head.appendChild(s)
    })
  }
  return zohoScript
}
const inr = (paise) => {
  const p = Math.round(Number(paise || 0))
  const digits = p % 100 ? 2 : 0
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

/** Review order: same layout as the Growsin app (price breakdown, coupon, available coupons sheet, Proceed to Pay). */
export default function Payment({ onBack, onPaid }) {
  const toast = useToast()
  const [sum, setSum] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState(null) // quote
  const [couponMsg, setCouponMsg] = useState('')
  const [applying, setApplying] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [testOrder, setTestOrder] = useState(null)

  const load = useCallback(() => {
    setLoadErr('')
    api.paymentSummary().then(setSum, (e) => setLoadErr(e.message))
  }, [])
  useEffect(() => { load() }, [load])

  const apply = async (c = code) => {
    const v = String(c || '').trim()
    if (!v) { setCouponMsg('Please enter a coupon code.'); return }
    setApplying(true); setCouponMsg('')
    try {
      const res = await api.validateCoupon(v)
      setApplied(res.quote); setCode(''); setSheet(false)
      toast(res.quote.free ? `${res.quote.code} applied. Your plan is free.` : `${res.quote.code} applied. You save ${inr(res.quote.discountPaise)}`)
    } catch (e) { setCouponMsg(e.message); if (sheet) toast(e.message, 'warn') } finally { setApplying(false) }
  }

  const confirmPaid = async (orderId, paymentId, signature) => {
    for (let i = 0; i < 5; i++) {
      const res = await api.verifyPayment(orderId, paymentId, signature)
      if (res.status === 'paid') { toast('Payment successful'); onPaid(); return }
      await new Promise((r) => setTimeout(r, 2500))
    }
    throw new Error('We have not received the payment confirmation yet. If money was taken, it will be confirmed shortly. Please contact us if it is not.')
  }

  const pay = async () => {
    setBusy(true); setErr('')
    let order
    try {
      order = await api.createOrder(applied?.code)
      if (order.free) { toast('Coupon applied. Your plan is active.'); onPaid(); return }
      if (order.gateway === 'test') { setTestOrder(order); setBusy(false); return }
      await loadZoho()
      const instance = new window.ZPayments({ account_id: order.widget.accountId, domain: order.widget.domain, otherOptions: { api_key: order.widget.apiKey } })
      try {
        const data = await instance.requestPaymentMethod({
          amount: (order.amountPaise / 100).toFixed(2),
          currency_code: 'INR',
          currency_symbol: '₹',
          payments_session_id: order.orderId,
          business: 'Growsin',
          description: `${order.plan.title} advisory fee`,
          address: { name: order.customer.name, email: order.customer.email, phone: order.customer.phone },
        })
        await confirmPaid(order.orderId, data?.payment_id, data?.signature)
      } catch (e) {
        if (e?.code === 'widget_closed') {
          api.cancelPayment(order.orderId).catch(() => {})
          setErr('Payment was not completed. You can try again when you are ready.')
        } else {
          throw new Error(e?.message || 'Payment failed. Please try again.')
        }
      } finally {
        try { await instance.close() } catch { /* already closed */ }
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loadErr) return <section className="card panel"><p className="err-box">{loadErr}</p><div className="actions"><button type="button" className="btn ghost" onClick={onBack}>Back</button><button type="button" className="btn" onClick={load}>Try again</button></div></section>
  if (!sum) return <div className="boot">Loading…</div>

  const plan = sum.plan
  const couponOff = applied?.discountPaise || 0
  const total = plan.pricePaise - couponOff
  const offers = (sum.coupons || []).filter((c) => c.valid)
  const best = !applied && offers.length ? offers.reduce((a, c) => (c.discountPaise > a.discountPaise ? c : a)) : null

  return (
    <section className="card panel pay" aria-labelledby="pay-h">
      <div className="p-head"><span className="eyebrow">Step 5 of 5</span><h1 id="pay-h">Review order</h1><p>Your advisory fee, as per your signed agreement.</p></div>

      <div className="po-plan">
        <div><b>{plan.title}</b><small>{TENURE[plan.billingCycle] || plan.billingCycle} · Investment Advisory</small></div>
        <div className="po-price">{couponOff > 0 && <s>{inr(plan.pricePaise)}</s>}<b>{inr(total)}</b></div>
      </div>

      <div className="po-coupon">
        <div className="po-ch"><span>Coupon</span>{(sum.coupons || []).length > 0 && <button type="button" className="link-btn" onClick={() => setSheet(true)}>View all ›</button>}</div>
        {applied ? (
          <div className="po-applied">
            <span className="po-pct" aria-hidden="true">%</span>
            <div><b>{applied.code} applied</b><small>{applied.free ? 'Coupon makes this plan free' : `Coupon saved you ${inr(applied.discountPaise)}`}</small></div>
            <button type="button" className="link-btn danger" onClick={() => { setApplied(null); setCouponMsg('') }}>Remove</button>
          </div>
        ) : (
          <>
            <form className="po-input" onSubmit={(e) => { e.preventDefault(); apply() }}>
              <input aria-label="Coupon code" placeholder="Enter coupon code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCouponMsg('') }} autoCapitalize="characters" />
              <button type="submit" className="btn" disabled={applying}>{applying ? <span className="spin" /> : 'Apply'}</button>
            </form>
            {couponMsg && <p className="po-msg" role="alert">{couponMsg}</p>}
            {best && (
              <div className="po-best"><span>Best offer: <b>{best.code}</b> saves {inr(best.discountPaise)}</span><button type="button" className="btn sm" onClick={() => apply(best.code)} disabled={applying}>Apply</button></div>
            )}
          </>
        )}
      </div>

      <div className="rv">
        <div className="sum-row"><span>Plan price</span><b>{inr(plan.pricePaise)}</b></div>
        {couponOff > 0 && <div className="sum-row save"><span>Coupon ({applied.code})</span><b>− {inr(couponOff)}</b></div>}
        <div className="sum-row total"><span>Total payable</span><b>{inr(total)}</b></div>
      </div>
      <p className="note">Payments are processed securely by Zoho Payments. Cash is not accepted (SEBI IA Regulations).</p>
      {err && <p className="err-box" role="alert">{err}</p>}

      <div className="actions po-bar">
        <div className="po-total"><small>Total payable</small><b>{inr(total)}</b>{couponOff > 0 && <em>You save {inr(couponOff)}</em>}</div>
        <button type="button" className="btn" onClick={pay} disabled={busy}>{busy && <span className="spin" />}{total === 0 ? 'Activate plan' : 'Proceed to Pay →'}</button>
      </div>

      {sheet && (
        <div className="sheet-wrap" role="presentation" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cs-h" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" aria-hidden="true" />
            <div className="sheet-h"><h2 id="cs-h">Available coupons</h2><button type="button" className="link-btn" onClick={() => setSheet(false)}>Close</button></div>
            {(sum.coupons || []).length === 0 ? <p className="note center">No coupons available for this plan right now.</p> : (
              <ul className="tickets">
                {sum.coupons.map((c) => (
                  <li key={c.code} className={`ticket${c.valid ? '' : ' off'}`}>
                    <div className="t-left">{c.valid ? (c.discountType === 'percent' ? 'OFFER' : 'FLAT') : 'LOCKED'}</div>
                    <div className="t-body">
                      <b className="t-code">{c.code}</b>
                      <span>{c.valid ? (c.free ? 'Makes this plan free' : `Save ${inr(c.discountPaise)} on this plan`) : c.reason}</span>
                      {c.description && <small>{c.description}</small>}
                      {c.expiresAt && <small>Valid till {new Date(c.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small>}
                    </div>
                    {c.valid && <button type="button" className="btn sm" disabled={applying} onClick={() => apply(c.code)}>Apply</button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {testOrder && (
        <div className="sheet-wrap" role="presentation">
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="tp-h">
            <div className="sheet-h"><h2 id="tp-h">Test payment</h2></div>
            <p className="info-box">Test mode: Zoho Payments is not connected on this site. No money is taken.</p>
            <div className="sum-row total"><span>Amount</span><b>{inr(testOrder.amountPaise)}</b></div>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => { api.cancelPayment(testOrder.orderId).catch(() => {}); setTestOrder(null); setErr('Payment was not completed. You can try again when you are ready.') }}>Cancel</button>
              <button type="button" className="btn" onClick={async () => { const o = testOrder; setTestOrder(null); setBusy(true); try { await confirmPaid(o.orderId) } catch (e) { setErr(e.message) } finally { setBusy(false) } }}>Pay (test)</button>
            </div>
          </div>
        </div>
      )}
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
