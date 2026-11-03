import { useState } from 'react'
import api from '../services/api'
import { useToast } from '../components/toastContext'
import { RISK_QUESTIONS, PROFILE, HORIZON, scoreAnswers } from '../constants/riskQuestions'

export function ResultCard({ score, category, horizon }) {
  const P = PROFILE[category]
  return (
    <section className="rp" data-z={category} aria-label="Risk profile result">
      <div className="rp-main">
        <div className="rp-num"><b>{score}</b><span>/ 21</span></div>
        <div className="rp-id"><h3>{category}</h3><p>{P.desc}</p></div>
      </div>
      <div className="scale" aria-hidden="true">
        <div className="sc-bar">
          {['Conservative', 'Moderate', 'Aggressive'].map((z) => <i key={z} className={z === category ? 'on' : ''} />)}
          <span className="sc-mark" style={{ left: `${((score - 7) / 14) * 100}%` }} />
        </div>
        <div className="sc-lab">
          <span className={category === 'Conservative' ? 'on' : ''}>Conservative 7–11</span>
          <span className={category === 'Moderate' ? 'on' : ''}>Moderate 12–16</span>
          <span className={category === 'Aggressive' ? 'on' : ''}>Aggressive 17–21</span>
        </div>
      </div>
      <dl className="rp-facts">
        <div><dt>Risk tolerance</dt><dd>{P.tolerance}</dd></div>
        <div><dt>Investment horizon</dt><dd>{horizon}</dd></div>
        <div><dt>Suitable services</dt><dd>{P.services}</dd></div>
      </dl>
    </section>
  )
}

export default function Risk({ initialAnswers, onBack, onSaved }) {
  const toast = useToast()
  const [answers, setAnswers] = useState(initialAnswers || {})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [need, setNeed] = useState(null)
  const r = scoreAnswers(answers)

  const pick = (q, i) => {
    setAnswers((a) => {
      if (!q.multi) return { ...a, [q.id]: i }
      const cur = Array.isArray(a[q.id]) ? a[q.id] : []
      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()
      const out = { ...a, [q.id]: next }
      if (!next.length) delete out[q.id]
      return out
    })
    if (!q.multi && window.matchMedia('(max-width: 760px)').matches) {
      const idx = RISK_QUESTIONS.indexOf(q)
      const nextQ = RISK_QUESTIONS.findIndex((qq, k) => k > idx && answers[qq.id] === undefined)
      if (nextQ > 0) setTimeout(() => document.getElementById(`q-${RISK_QUESTIONS[nextQ].id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250)
    }
  }

  const submit = async () => {
    setErr('')
    const missing = RISK_QUESTIONS.find((q) => answers[q.id] === undefined || (Array.isArray(answers[q.id]) && !answers[q.id].length))
    if (missing) {
      { const left = 7 - r.answered; toast(`${left} ${left === 1 ? "question" : "questions"} still to answer`, "warn") }
      setNeed(missing.id)
      setTimeout(() => setNeed(null), 1400)
      document.getElementById(`q-${missing.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setBusy(true)
    try {
      const res = await api.saveRisk(answers)
      onSaved(res.result, answers)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const horizon = answers.objective !== undefined ? HORIZON[RISK_QUESTIONS[6].options[answers.objective][1]] : ''

  return (
    <section className="card panel" aria-labelledby="risk-h">
      <div className="p-head"><span className="eyebrow">Step 2 of 5</span><h1 id="risk-h">Risk profile</h1><p>Answer 7 quick questions. Your risk profile appears below once all are answered.</p></div>
      <div className="q-all">
        {RISK_QUESTIONS.map((q, j) => {
          const a = answers[q.id]
          const isDone = q.multi ? Array.isArray(a) && a.length > 0 : a !== undefined
          return (
            <fieldset key={q.id} id={`q-${q.id}`} className={['q-card', isDone && 'done', need === q.id && 'need'].filter(Boolean).join(' ')}>
              <legend className="q-title">
                <span className="q-n">{j + 1}</span>
                <span>{q.text}</span>
                {q.multi && <small>Select all that apply</small>}
              </legend>
              <div className="choices">
                {q.options.map(([label], i) => (
                  <label key={i} className={`choice${q.multi ? ' multi' : ''}`}>
                    <input type={q.multi ? 'checkbox' : 'radio'} name={q.id} checked={q.multi ? Array.isArray(a) && a.includes(i) : a === i} onChange={() => pick(q, i)} />
                    <span className="mark" aria-hidden="true" />
                    <span className="txt">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>
      {r.category ? (
        <ResultCard score={r.score} category={r.category} horizon={horizon} />
      ) : (
        <div className="rp-pending">
          <b>Your risk profile</b>
          <span>{r.answered === 0 ? 'Answer all 7 questions to see your risk profile.' : `${r.answered} of 7 answered. ${7 - r.answered} more to see your risk profile.`}</span>
          <div className="pend-bar" aria-hidden="true"><i style={{ width: `${(r.answered / 7) * 100}%` }} /></div>
        </div>
      )}
      {err && <p className="err-box" role="alert">{err}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onBack}>Back</button>
        <button type="button" className="btn" onClick={submit} disabled={busy}>{busy && <span className="spin" />}Review agreement</button>
      </div>
    </section>
  )
}
