import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import api from './services/api'
import Header from './components/Header'
import ProgressRail from './components/ProgressRail'
import { STEPS } from './constants/steps'
import { ToastProvider } from './components/Toasts'
import { useToast } from './components/toastContext'
import Auth, { ResetPassword } from './screens/Auth'
import Details from './screens/Details'
import Risk from './screens/Risk'
import Review from './screens/Review'
import Payment, { PaymentReturn, Done } from './screens/Payment'
import EsignReturn from './screens/EsignReturn'

// The signing screen carries the PDF viewer; load it only when needed.
const Sign = lazy(() => import('./screens/Sign'))

const RISK_VERSION = 'agreement-7q-v1'
const PLAN_KEY = 'growsin.planId'
const readPlan = () => { try { return localStorage.getItem(PLAN_KEY) || '' } catch { return '' } }
const savePlan = (id) => { try { localStorage.setItem(PLAN_KEY, id) } catch { /* ignore */ } }

export default function App() {
  return (
    <ToastProvider>
      <Onboarding />
    </ToastProvider>
  )
}

function routeFromPath() {
  const p = window.location.pathname
  const reset = p.match(/^\/reset-password\/([^/]+)/)
  if (reset) return { name: 'reset', token: decodeURIComponent(reset[1]) }
  if (p.startsWith('/payment/success')) return { name: 'paid' }
  if (p.startsWith('/payment/cancel')) return { name: 'pay-cancel' }
  if (p.startsWith('/esign/complete')) return { name: 'esign-return' }
  return { name: 'app' }
}

function Onboarding() {
  const toast = useToast()
  const [route, setRoute] = useState(routeFromPath)
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [risk, setRisk] = useState(null)
  const [plans, setPlans] = useState([])
  const [planId, setPlanId] = useState(readPlan)
  const [agreement, setAgreement] = useState(null)
  const [step, setStep] = useState('auth')

  const loadAll = useCallback(async (knownUser) => {
    const me = knownUser || (await api.me()).user
    const [k, r, p, a] = await Promise.allSettled([api.getKYC(), api.getRiskProfile(), api.getPlans(), api.currentAgreement()])
    const kycData = k.status === 'fulfilled' ? k.value.data : null
    const riskProfile = r.status === 'fulfilled' && r.value.riskProfile?.assessmentVersion === RISK_VERSION ? r.value.riskProfile : null
    const planList = p.status === 'fulfilled' ? p.value.plans || [] : []
    const agr = a.status === 'fulfilled' ? a.value.agreement : null
    setUser(me); setKyc(kycData); setRisk(riskProfile); setPlans(planList); setAgreement(agr)
    setPlanId((cur) => {
      const ids = planList.map((x) => x._id)
      const pick = (agr?.planId && ids.includes(String(agr.planId)) && String(agr.planId)) || (ids.includes(cur) && cur) || ids[0] || ''
      if (pick) savePlan(pick)
      return pick
    })
    return { me, kycData, riskProfile, agr }
  }, [])

  const status = useMemo(() => {
    const detailsDone = !!(kyc?.personal?.name && kyc?.address?.address && kyc?.professional?.occupation)
    const riskDone = !!risk
    const generated = !!agreement
    const signed = agreement?.status === 'signed'
    const paid = !!user?.flags?.paymentDone
    const done = { details: detailsDone, risk: riskDone, review: generated, sign: signed, payment: paid }
    const canOpen = {
      details: !signed,
      risk: detailsDone && !signed,
      review: detailsDone && riskDone && !signed,
      sign: generated,
      payment: signed,
    }
    const sub = {
      details: detailsDone ? 'All details complete' : 'Not started',
      risk: riskDone ? `${risk.riskCategory} · ${risk.riskScore}/21` : 'Not started',
      review: generated ? 'Agreement generated' : 'Not generated',
      sign: signed ? 'Signed with Aadhaar' : generated ? 'Waiting for OTP' : 'After generating',
      payment: paid ? 'Paid' : signed ? 'Fee due' : 'After signing',
    }
    return { done, canOpen, sub }
  }, [kyc, risk, agreement, user])

  const nextStep = (s = status) => {
    if (!s.done.details) return 'details'
    if (!s.done.risk) return 'risk'
    if (!s.done.review) return 'review'
    if (!s.done.sign) return 'sign'
    if (!s.done.payment) return 'payment'
    return 'done'
  }

  // Restore the session on load
  useEffect(() => {
    if (route.name === 'reset') { setBooting(false); return }
    if (!api.token) { setBooting(false); return }
    loadAll().catch(() => api.setToken(null)).finally(() => setBooting(false))
  }, [loadAll, route.name])

  // Pick the right step whenever the data changes and no explicit step is set
  const [explicit, setExplicit] = useState(false)
  useEffect(() => {
    if (!user) { setStep('auth'); return }
    if (!explicit) setStep(nextStep())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status])

  // When embedded in the Growsin site (iframe), keep the parent informed (same messages as before).
  useEffect(() => {
    if (window.parent === window) return
    let origin = '*'
    try { if (document.referrer) origin = new URL(document.referrer).origin } catch { /* keep * */ }
    window.parent.postMessage({ type: 'KYC_STEP_CHANGE', data: { step } }, origin)
    if (user?.flags?.paymentDone) window.parent.postMessage({ type: 'KYC_COMPLETE', data: { user: user.email } }, origin)
  }, [step, user])
  useEffect(() => {
    if (window.parent === window) return
    let origin = '*'
    try { if (document.referrer) origin = new URL(document.referrer).origin } catch { /* keep * */ }
    window.parent.postMessage({ type: 'KYC_LOADED' }, origin)
  }, [])

  const go = (s) => { setExplicit(true); setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const reload = async () => { setExplicit(false); await loadAll(user) }

  const progress = STEPS.reduce((t, s) => t + (status.done[s.id] ? 100 / STEPS.length : 0), 0)
  const plan = plans.find((p) => p._id === planId)
  const client = kyc?.personal?.name ? { name: kyc.personal.name, meta: [kyc.personal.pan, risk?.riskCategory, plan?.title].filter(Boolean).join(' · ') } : null
  const order = ['details', 'risk', 'review', 'sign', 'payment']
  const prev = order[order.indexOf(step) - 1]
  const onBack = user && prev && status.canOpen[prev] ? () => go(prev) : undefined

  const logout = async () => {
    await api.logout()
    setUser(null); setKyc(null); setRisk(null); setAgreement(null); setExplicit(false)
    toast('Logged out')
  }

  const downloadSigned = async () => {
    if (!agreement) return
    try {
      const bytes = await api.agreementPdf(agreement.id)
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = agreement.fileName.replace(/\.pdf$/, '_signed.pdf')
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) { toast(e.message, 'warn') }
  }

  const leaveRoute = () => { window.history.replaceState({}, '', '/'); setRoute({ name: 'app' }) }

  let content
  if (booting) content = <div className="boot">Loading…</div>
  else if (route.name === 'reset') content = <ResetPassword token={route.token} onDone={leaveRoute} />
  else if (!user) content = <Auth onSignedIn={async (u) => { setExplicit(false); await loadAll(u) }} />
  else if (route.name === 'paid' || route.name === 'pay-cancel') {
    content = <PaymentReturn cancelled={route.name === 'pay-cancel'} onDone={async () => { leaveRoute(); await reload() }} onRetry={() => { leaveRoute(); go('payment') }} />
  } else if (route.name === 'esign-return') {
    content = <EsignReturn onSigned={async (a) => { leaveRoute(); setAgreement(a); await loadAll(user); go('sign') }} onRetry={() => { leaveRoute(); go('sign') }} />
  } else {
    switch (step) {
      case 'details':
        content = <Details user={user} kyc={kyc} plans={plans} planId={planId} onPlan={(id) => { setPlanId(id); savePlan(id) }} riskCategory={risk?.riskCategory} onSaved={async () => { await loadAll(user); go(status.done.risk ? 'review' : 'risk') }} />
        break
      case 'risk':
        content = <Risk initialAnswers={risk?.answers} onBack={() => go('details')} onSaved={async () => { await loadAll(user); go('review') }} />
        break
      case 'review':
        content = <Review kyc={kyc} risk={risk} plan={plan} onEdit={go} onGenerated={(a) => { setAgreement(a); go('sign') }} />
        break
      case 'sign':
        content = agreement
          ? <Suspense fallback={<div className="boot">Loading…</div>}><Sign key={agreement.id} agreement={agreement} onBack={() => go('details')} onSigned={async (a, next) => { setAgreement(a); if (next) { await reload(); go('payment') } }} /></Suspense>
          : <div className="boot">Generate your agreement first.</div>
        break
      case 'payment':
        content = <Payment plan={plan} agreement={agreement} onBack={() => go('sign')} />
        break
      default:
        content = <Done user={user} onDownload={downloadSigned} />
    }
  }

  const showRail = user && !booting && route.name === 'app' && step !== 'done'
  return (
    <>
      <Header progress={user ? progress : 0} onBack={route.name === 'app' ? onBack : undefined} user={user} onLogout={logout} />
      <main className={`shell${showRail ? '' : ' solo'}`}>
        {showRail && <ProgressRail step={step} status={status} onGo={go} client={client} progress={progress} />}
        <div className="work">{content}</div>
      </main>
      <footer className="foot-note">Growsin · Murali Krishna Sivvala, SEBI Registered Investment Adviser INA000021261 · Investments in securities markets are subject to market risks.</footer>
    </>
  )
}
