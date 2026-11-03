import { useEffect, useState } from 'react'
import api from '../services/api'
import { TextField, SelectField } from '../components/Field'
import { useToast } from '../components/toastContext'
import { indianStates } from '../constants/indianStates'
import { GENDERS, MARITAL, OCCUPATIONS, INDUSTRIES, EXPERIENCE, INCOME, TENURE, rupees, digitsOnly, isPAN, isEmail, isMobile, normalizeMobile } from '../constants/options'

const EMPTY = {
  name: '', fatherName: '', dob: '', gender: '', maritalStatus: '',
  pan: '', aadhar: '',
  mobile: '', email: '',
  address: '', city: '', state: '', pincode: '',
  occupation: '', industry: '', experience: '', income: '',
}

const toForm = (kyc, user) => ({
  ...EMPTY,
  name: kyc?.personal?.name || user?.name || '',
  fatherName: kyc?.personal?.fatherName || '',
  dob: kyc?.personal?.dob ? String(kyc.personal.dob).slice(0, 10) : '',
  gender: kyc?.personal?.gender || '',
  maritalStatus: kyc?.personal?.maritalStatus || '',
  pan: kyc?.personal?.pan || '',
  aadhar: kyc?.personal?.aadhar ? String(kyc.personal.aadhar).replace(/(\d{4})(?=\d)/g, '$1 ') : '',
  mobile: kyc?.address?.mobile || user?.mobile || '',
  email: kyc?.address?.email || user?.email || '',
  address: kyc?.address?.address || '',
  city: kyc?.address?.city || '',
  state: kyc?.address?.state || '',
  pincode: kyc?.address?.pincode || '',
  occupation: kyc?.professional?.occupation || '',
  industry: kyc?.professional?.industry || '',
  experience: kyc?.professional?.experience || '',
  income: kyc?.professional?.income || '',
})

const REQUIRED = Object.keys(EMPTY)

export default function Details({ user, kyc, plans, planId, onPlan, riskCategory, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(() => toForm(kyc, user))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setF(toForm(kyc, user)) }, [kyc, user])

  const set = (k) => (v) => {
    let val = v
    if (k === 'aadhar') val = digitsOnly(v).slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ')
    if (k === 'pincode') val = digitsOnly(v).slice(0, 6)
    if (k === 'pan') val = v.toUpperCase().replace(/\s/g, '').slice(0, 10)
    setF((s) => ({ ...s, [k]: val }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    for (const k of REQUIRED) if (!String(f[k] || '').trim()) e[k] = 'Required'
    if (f.pan && !isPAN(f.pan)) e.pan = '5 letters, 4 digits, 1 letter (ABCDE1234F)'
    if (f.aadhar && digitsOnly(f.aadhar).length !== 12) e.aadhar = 'Aadhaar has 12 digits'
    if (f.mobile && !isMobile(f.mobile)) e.mobile = 'Enter a 10-digit mobile number'
    if (f.email && !isEmail(f.email)) e.email = 'Enter a valid email address'
    if (f.pincode && f.pincode.length !== 6) e.pincode = 'PIN code has 6 digits'
    if (f.dob) {
      const age = (Date.now() - new Date(f.dob).getTime()) / (365.25 * 864e5)
      if (!(age >= 18)) e.dob = 'You must be at least 18 years old'
    }
    if (!planId) e.plan = 'Choose an advisory plan'
    setErrors(e)
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setErr('')
    const e = validate()
    const first = Object.keys(e)[0]
    if (first) {
      toast(first === 'plan' ? 'Choose an advisory plan' : 'Some details need attention', 'warn')
      document.querySelector('[aria-invalid="true"], .plans')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setBusy(true)
    try {
      await api.saveDetails({
        personal: { name: f.name.trim(), fatherName: f.fatherName.trim(), dob: f.dob, gender: f.gender, maritalStatus: f.maritalStatus, pan: f.pan, aadhar: digitsOnly(f.aadhar) },
        address: { address: f.address.trim(), city: f.city.trim(), state: f.state, pincode: f.pincode, country: 'India', mobile: normalizeMobile(f.mobile), email: f.email.trim() },
        professional: { occupation: f.occupation, industry: f.industry, experience: f.experience, income: f.income },
      })
      onSaved()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card panel" onSubmit={submit} noValidate aria-labelledby="det-h">
      <div className="p-head"><span className="eyebrow">Step 1 of 5</span><h1 id="det-h">Client details</h1><p>Enter your details exactly as they appear on your PAN card.</p></div>

      <div className="group">
        <div className="group-h">Personal details</div>
        <div className="grid">
          <TextField className="span2" label="Full name (as per PAN)" value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" />
          <TextField className="span2" label="Father's name" value={f.fatherName} onChange={set('fatherName')} error={errors.fatherName} />
          <TextField label="Date of birth" type="date" value={f.dob} onChange={set('dob')} error={errors.dob} max={new Date().toISOString().slice(0, 10)} />
          <SelectField label="Gender" value={f.gender} onChange={set('gender')} options={GENDERS} error={errors.gender} />
          <SelectField className="span2" label="Marital status" value={f.maritalStatus} onChange={set('maritalStatus')} options={MARITAL} error={errors.maritalStatus} />
        </div>
      </div>

      <div className="group">
        <div className="group-h">KYC numbers</div>
        <div className="grid">
          <TextField className="mono upper" label="PAN number" value={f.pan} onChange={set('pan')} error={errors.pan} autoCapitalize="characters" maxLength={10} />
          <TextField className="mono" label="Aadhaar number" inputMode="numeric" value={f.aadhar} onChange={set('aadhar')} error={errors.aadhar} maxLength={14} autoComplete="off" />
        </div>
      </div>

      <div className="group">
        <div className="group-h">Contact</div>
        <div className="grid">
          <TextField label="Mobile number" prefix="+91" inputMode="tel" value={f.mobile} onChange={set('mobile')} error={errors.mobile} />
          <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} help="Your signed agreement is sent here." />
        </div>
      </div>

      <div className="group">
        <div className="group-h">Address</div>
        <div className="grid">
          <TextField className="span2" label="House no, street, area" value={f.address} onChange={set('address')} error={errors.address} autoComplete="street-address" />
          <TextField label="City" value={f.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
          <TextField className="mono" label="PIN code" inputMode="numeric" value={f.pincode} onChange={set('pincode')} error={errors.pincode} autoComplete="postal-code" />
          <SelectField className="span2" label="State" value={f.state} onChange={set('state')} options={indianStates} error={errors.state} />
        </div>
      </div>

      <div className="group">
        <div className="group-h">Work and income</div>
        <div className="grid">
          <SelectField label="Occupation" value={f.occupation} onChange={set('occupation')} options={OCCUPATIONS} error={errors.occupation} />
          <SelectField label="Industry" value={f.industry} onChange={set('industry')} options={INDUSTRIES} error={errors.industry} />
          <SelectField label="Work experience" value={f.experience} onChange={set('experience')} options={EXPERIENCE} error={errors.experience} />
          <SelectField label="Annual income" value={f.income} onChange={set('income')} options={INCOME} error={errors.income} />
        </div>
      </div>

      <div className="group">
        <div className="group-h">Advisory plan</div>
        <div className="plans" role="radiogroup" aria-label="Advisory plan">
          {plans.map((p) => {
            const unsuitable = riskCategory && Array.isArray(p.riskProfiles) && p.riskProfiles.length && !p.riskProfiles.includes(riskCategory)
            return (
              <label key={p._id} className="plan">
                <input type="radio" name="plan" value={p._id} checked={planId === p._id} onChange={() => { onPlan(p._id); setErrors((e) => ({ ...e, plan: undefined })) }} />
                <b>{p.title || p.name}</b>
                <span className="price">{rupees(p.price)}</span>
                <span className="ten">{TENURE[p.billingCycle] || p.billingCycle}</span>
                {unsuitable && <span className="fit">Not offered for a {riskCategory} profile</span>}
              </label>
            )
          })}
        </div>
        {errors.plan && <p className="note" style={{ color: 'var(--red)' }}>{errors.plan}</p>}
      </div>

      {err && <p className="err-box" role="alert">{err}</p>}
      <div className="actions"><span className="note">Your details are used to prepare your advisory agreement.</span><button className="btn" type="submit" disabled={busy}>{busy && <span className="spin" />}Continue to risk profile</button></div>
    </form>
  )
}
