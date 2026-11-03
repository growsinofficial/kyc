import { useId } from 'react'

/** Floating-label text input. `error` shows below the field. */
export function TextField({ label, value, onChange, error, help, prefix, className = '', type = 'text', placeholder = ' ', ...rest }) {
  const id = useId()
  return (
    <div className={['field', prefix && 'prefix', error && 'invalid', className].filter(Boolean).join(' ')}>
      {prefix && <span className="pre" aria-hidden="true">{prefix}</span>}
      <input id={id} type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error || help ? `${id}-d` : undefined} {...rest} />
      <label htmlFor={id}>{label}</label>
      {(error || help) && <p id={`${id}-d`} className={error ? 'msg' : 'help'}>{error || help}</p>}
    </div>
  )
}

export function SelectField({ label, value, onChange, options, error, className = '', ...rest }) {
  const id = useId()
  return (
    <div className={['field', error && 'invalid', className].filter(Boolean).join(' ')}>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...rest}>
        <option value="">Select</option>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <label htmlFor={id}>{label}</label>
      {error && <p className="msg">{error}</p>}
    </div>
  )
}

/** Six one-digit boxes with paste support. */
export function OtpInput({ value, onChange, onComplete, disabled }) {
  const digits = (value || '').padEnd(6, ' ').slice(0, 6).split('')
  const set = (i, ch, el) => {
    const next = digits.slice()
    next[i] = ch || ' '
    const v = next.join('').replace(/\s+$/, '')
    onChange(v.replace(/\s/g, ''))
    if (ch && el?.nextElementSibling) el.nextElementSibling.focus()
    if (v.replace(/\s/g, '').length === 6) onComplete?.(v.replace(/\s/g, ''))
  }
  return (
    <div className="otp" role="group" aria-label="One-time password">
      {digits.map((d, i) => (
        <input
          key={i}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => set(i, e.target.value.replace(/\D/g, '').slice(-1), e.target)}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !d.trim() && e.currentTarget.previousElementSibling) e.currentTarget.previousElementSibling.focus() }}
          onPaste={(e) => {
            const p = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
            if (!p) return
            e.preventDefault()
            onChange(p)
            if (p.length === 6) onComplete?.(p)
          }}
        />
      ))}
    </div>
  )
}
