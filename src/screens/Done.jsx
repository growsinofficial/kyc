import { useEffect, useState } from 'react'
import api from '../services/api'
import { formatDate } from '../constants/options'

const inr = (paise) => {
  const p = Math.round(Number(paise || 0))
  const digits = p % 100 ? 2 : 0
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

/** Final screen: welcome, a record of what was completed, and what happens next. */
export default function Done({ user, agreement, risk, onDownload, onLogout }) {
  const [order, setOrder] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.paymentHistory().then((r) => setOrder((r.orders || []).find((o) => o.status === 'paid') || null), () => {})
  }, [])

  const first = (user?.name || '').trim().split(/\s+/)[0]
  const v = agreement?.values || {}
  const signedOn = agreement?.esign?.signedAt ? formatDate(agreement.esign.signedAt) : ''
  const paidOn = order?.paidAt ? formatDate(order.paidAt) : ''
  const amount = order ? (order.amountPaise === 0 ? 'Covered by coupon' : inr(order.amountPaise)) : ''

  const download = async () => {
    setDownloading(true)
    try { await onDownload() } finally { setDownloading(false) }
  }

  return (
    <section className="done" aria-labelledby="done-h">
      <header className="done-hero">
        <span className="done-badge" aria-hidden="true" />
        <span className="done-kicker">Onboarding complete</span>
        <h1 id="done-h">Welcome to Growsin{first ? `, ${first}` : ''}</h1>
        <p>Your advisory account is active. Your adviser will be in touch with your first recommendations.</p>
      </header>

      <div className="done-body">
        <dl className="done-tiles">
          <div><dt>Plan</dt><dd>{v.Service_Subscribed || order?.planCode || 'Advisory plan'}</dd></div>
          <div><dt>Risk profile</dt><dd>{risk?.riskCategory || v.Risk_Type}<small>{(risk?.riskScore ?? v.Risk_Score) != null ? `Score ${risk?.riskScore ?? v.Risk_Score} of 21` : ''}</small></dd></div>
          <div><dt>Fee paid</dt><dd>{amount || '—'}<small>{order?.couponCode ? `Coupon ${order.couponCode}` : paidOn}</small></dd></div>
        </dl>

        <div className="done-sec">
          <h2>Your onboarding record</h2>
          <ol className="done-steps">
            <li>
              <b>Client details and risk profile</b>
              <span>Submitted{v.Agreement_Date ? ` on ${v.Agreement_Date}` : ''}{v.Risk_Type ? ` · ${v.Risk_Type} investor` : ''}</span>
            </li>
            <li>
              <b>Investment Advisory Agreement</b>
              <span>Signed with Aadhaar eSign{signedOn ? ` on ${signedOn}` : ''}</span>
              <button type="button" className="link-btn" onClick={download} disabled={downloading}>{downloading ? 'Preparing…' : 'Download signed copy'}</button>
            </li>
            <li>
              <b>Advisory fee</b>
              <span>{order ? `${amount}${paidOn ? ` paid on ${paidOn}` : ''}` : 'Paid'}</span>
              {order?.gatewayPaymentId && order.gateway === 'zoho' && <small>Payment reference {order.gatewayPaymentId}</small>}
            </li>
          </ol>
        </div>

        <div className="done-next">
          <h2>What happens next</h2>
          <ol>
            <li><b>Profile review</b><span>Your adviser reviews your risk profile, goals and investment horizon.</span></li>
            <li><b>Recommendations</b><span>You receive advice suited to your {(risk?.riskCategory || v.Risk_Type || '').toLowerCase() || 'risk'} profile.</span></li>
            <li><b>Keep us updated</b><span>Tell us if your income, goals or situation change, so your advice stays suitable.</span></li>
          </ol>
        </div>

        <p className="done-mail">Signed in as <b>{user?.email}</b>. Keep a copy of your signed agreement for your records.</p>
      </div>

      <div className="actions done-actions">
        <button type="button" className="btn ghost" onClick={onLogout}>Log out</button>
        <button type="button" className="btn" onClick={download} disabled={downloading}>{downloading && <span className="spin" />}Download agreement</button>
      </div>
    </section>
  )
}
