import { useEffect, useState } from 'react'
import api from '../services/api'
import { TextField, OtpInput } from '../components/Field'
import { useToast } from '../components/toastContext'
import { isEmail, isMobile, normalizeMobile } from '../constants/options'

export default function Auth({ onSignedIn }) {
  const [tab, setTab] = useState('signup')
  return (
    <section className="card panel" aria-labelledby="auth-h">
      <div className="p-head">
        <h1 id="auth-h">{tab === 'signup' ? 'Start your onboarding' : 'Welcome back'}</h1>
        <p>{tab === 'signup' ? 'Create your account to begin. It takes about 5 minutes.' : 'Log in to continue where you left off.'}</p>
      </div>
      <div className="tabs" role="tablist" aria-label="Account">
        <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => setTab('signup')}>Sign up</button>
        <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => setTab('login')}>Log in</button>
      </div>
      {tab === 'signup' ? <Signup onSignedIn={onSignedIn} /> : <Login onSignedIn={onSignedIn} />}
    </section>
  )
}

const RESEND_SECONDS = 60 // matches the server's resend wait

function Signup({ onSignedIn }) {
  const toast = useToast()
  const [stage, setStage] = useState('form') // form | otp
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '' })
  const [errors, setErrors] = useState({})
  const [otp, setOtp] = useState('')
  const [channel, setChannel] = useState('') // whatsapp | sms | test
  const [hint, setHint] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const mobile = normalizeMobile(f.mobile)
  const shown = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const validate = () => {
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Enter your full name'
    if (!isEmail(f.email)) e.email = 'Enter a valid email address'
    if (!isMobile(f.mobile)) e.mobile = 'Enter a 10-digit mobile number'
    if (f.password.length < 6) e.password = 'Use at least 6 characters'
    setErrors(e)
    return !Object.keys(e).length
  }

  const run = async (fn) => {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const send = (opts = {}) => run(async () => {
    const res = await api.sendMobileOTP(mobile, { email: f.email.trim(), channel: opts.channel })
    setChannel(res.channel)
    setHint(res.testOtp ? `Test mode code: ${res.testOtp}` : '')
    setOtp(''); setStage('otp'); setResendIn(RESEND_SECONDS)
    if (opts.toastText) toast(opts.toastText)
  })

  const start = () => { if (validate()) send() }

  const verify = (code = otp) => run(async () => {
    if (code.length !== 6) { setErr('Enter the 6-digit code'); return }
    await api.register({ name: f.name.trim(), email: f.email.trim(), mobile, password: f.password, otp: code })
    const me = await api.me()
    onSignedIn(me.user)
  })

  if (stage === 'form') {
    return (
      <form className="group" onSubmit={(e) => { e.preventDefault(); start() }} noValidate>
        <TextField label="Full name (as per PAN)" value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <TextField label="Mobile number" prefix="+91" inputMode="tel" value={f.mobile} onChange={set('mobile')} error={errors.mobile} autoComplete="tel-national" />
        <TextField label="Password" type="password" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" help="At least 6 characters" />
        {err && <p className="err-box" role="alert">{err}</p>}
        <div className="actions"><span className="note">We'll send a code to your mobile on WhatsApp.</span><button className="btn" type="submit" disabled={busy}>{busy && <span className="spin" />}Continue</button></div>
      </form>
    )
  }

  return (
    <form className="group" onSubmit={(e) => { e.preventDefault(); verify() }} noValidate>
      <p className="center">
        {channel === 'whatsapp' ? 'Enter the 6-digit code sent on WhatsApp to ' : 'Enter the 6-digit code sent to '}
        <b>{shown}</b>
      </p>
      <OtpInput value={otp} onChange={setOtp} onComplete={(c) => verify(c)} disabled={busy} />
      {hint && <p className="info-box center">{hint}</p>}
      <div className="otp-meta">
        <button type="button" className="link-btn" onClick={() => { setStage('form'); setErr('') }}>Change number</button>
        {resendIn > 0
          ? <span>Resend code in {Math.floor(resendIn / 60)}:{String(resendIn % 60).padStart(2, '0')}</span>
          : <button type="button" className="link-btn" disabled={busy} onClick={() => send({ toastText: 'New code sent' })}>Didn't get it? Resend</button>}
      </div>
      {channel === 'whatsapp' && resendIn === 0 && (
        <p className="otp-sms">Didn't get it on WhatsApp? <button type="button" className="link-btn" disabled={busy} onClick={() => send({ channel: 'sms', toastText: 'Code sent by SMS' })}>Send by SMS</button></p>
      )}
      {err && <p className="err-box" role="alert">{err}</p>}
      <div className="actions"><span className="note">Verify your mobile number</span><button className="btn" type="submit" disabled={busy}>{busy && <span className="spin" />}Verify &amp; continue</button></div>
    </form>
  )
}

function Login({ onSignedIn }) {
  const toast = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [forgot, setForgot] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      if (forgot) {
        if (!isEmail(identifier)) throw new Error('Enter the email you signed up with')
        await api.forgotPassword(identifier.trim())
        toast('If that email is registered, a reset link is on its way')
        setForgot(false)
      } else {
        const id = identifier.includes('@') ? identifier.trim() : normalizeMobile(identifier)
        await api.login(id, password)
        const me = await api.me()
        onSignedIn(me.user)
      }
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <form className="group" onSubmit={submit} noValidate>
      <TextField label={forgot ? 'Email' : 'Email or mobile number'} value={identifier} onChange={setIdentifier} autoComplete="username" />
      {!forgot && <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />}
      <button type="button" className="link-btn" onClick={() => { setForgot(!forgot); setErr('') }}>{forgot ? 'Back to log in' : 'Forgot password?'}</button>
      {err && <p className="err-box" role="alert">{err}</p>}
      <div className="actions"><span className="note" /><button className="btn" type="submit" disabled={busy}>{busy && <span className="spin" />}{forgot ? 'Send reset link' : 'Log in'}</button></div>
    </form>
  )
}

export function ResetPassword({ token, onDone }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  return (
    <section className="card panel">
      <div className="p-head"><h1>Set a new password</h1></div>
      {ok ? (
        <>
          <p className="ok-box">Your password has been changed.</p>
          <div className="actions"><span /><button className="btn" type="button" onClick={onDone}>Log in</button></div>
        </>
      ) : (
        <form className="group" noValidate onSubmit={async (e) => {
          e.preventDefault(); setErr('')
          if (password.length < 6) { setErr('Use at least 6 characters'); return }
          setBusy(true)
          try { await api.resetPassword(token, password); setOk(true) } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
        }}>
          <TextField label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          {err && <p className="err-box" role="alert">{err}</p>}
          <div className="actions"><span /><button className="btn" type="submit" disabled={busy}>Save password</button></div>
        </form>
      )}
    </section>
  )
}
