import { useEffect, useRef, useState } from 'react'
import api from '../services/api'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Digio sends the client here after the hosted signing page
 * (?status=success|failure&digio_doc_id=…). The status in the URL is never
 * trusted: the server re-checks the request with Digio before marking it signed.
 */
export default function EsignReturn({ onSigned, onRetry }) {
  const params = new URLSearchParams(window.location.search)
  const failed = params.get('status') && params.get('status') !== 'success'
  const docId = params.get('digio_doc_id') || ''
  const [state, setState] = useState(failed ? 'failed' : 'checking') // checking | failed | waiting
  const signedRef = useRef(onSigned)
  useEffect(() => { signedRef.current = onSigned })
  const [msg, setMsg] = useState(failed ? params.get('message') || 'Aadhaar eSign was not completed.' : '')

  useEffect(() => {
    if (failed) return
    let stop = false
    ;(async () => {
      try {
        // Digio can take a few seconds to mark the document complete.
        for (let i = 0; i < 10 && !stop; i++) {
          const res = await api.esignReturn(docId)
          if (res.agreement.status === 'signed') { signedRef.current(res.agreement); return }
          if (res.agreement.status === 'failed') { setState('failed'); setMsg('Signing did not complete with Digio.'); return }
          await sleep(3000)
        }
        if (!stop) setState('waiting')
      } catch (e) {
        if (!stop) { setState('failed'); setMsg(e.message) }
      }
    })()
    return () => { stop = true }
  }, [docId, failed])

  return (
    <section className="card panel" aria-labelledby="ret-h">
      <div className="p-head">
        <span className="eyebrow">Step 4 of 5</span>
        <h1 id="ret-h">{state === 'checking' ? 'Confirming your signature' : state === 'waiting' ? 'Signature received' : 'Signing not completed'}</h1>
        <p>
          {state === 'checking' && 'Please wait while we confirm your Aadhaar eSign with Digio.'}
          {state === 'waiting' && 'Digio has not confirmed the signature yet. This usually takes under a minute.'}
          {state === 'failed' && `${msg.replace(/[.!]?\s*$/, '.')} You can try again.`}
        </p>
      </div>
      {state === 'checking' && <div className="boot"><span className="spin" /> Checking with Digio…</div>}
      <div className="actions">
        <span />
        {state === 'waiting' && <button type="button" className="btn" onClick={() => window.location.reload()}>Check again</button>}
        {state === 'failed' && <button type="button" className="btn" onClick={onRetry}>Back to signing</button>}
      </div>
    </section>
  )
}
