import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import PdfViewer from '../components/PdfViewer'
import { TextField, OtpInput } from '../components/Field'
import { useToast } from '../components/toastContext'
import { digitsOnly, formatDate } from '../constants/options'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function Sign({ agreement, onSigned, onBack }) {
  const toast = useToast()
  const [pdf, setPdf] = useState(null)
  const [pdfErr, setPdfErr] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pages, setPages] = useState(0)
  const [openMobile, setOpenMobile] = useState(false)
  const [esign, setEsign] = useState(null)
  const [prepErr, setPrepErr] = useState('')
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState(agreement.status === 'signed' ? 'done' : 'ready') // ready | working | mock | done
  const [err, setErr] = useState('')
  const [current, setCurrent] = useState(agreement)
  const [mockAadhaar, setMockAadhaar] = useState('')
  const [mockOtp, setMockOtp] = useState('')
  const signed = current.status === 'signed'

  const loadPdf = useCallback(async () => {
    setPdfErr('')
    try { setPdf(await api.agreementPdf(current.id)) } catch (e) { setPdfErr(e.message) }
  }, [current.id])
  useEffect(() => { loadPdf() }, [loadPdf, current.status])

  // Prepare the Digio request in advance so the button can open Digio straight from the click.
  useEffect(() => {
    if (signed) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.startEsign(current.id)
        if (cancelled) return
        setEsign(res.esign)
      } catch (e) {
        if (!cancelled) setPrepErr(e.message)
      }
    })()
    return () => { cancelled = true }
  }, [current.id, signed])

  const confirm = async (payload) => {
    setPhase('working')
    setErr('')
    try {
      // Digio can take a few seconds to mark the document complete.
      for (let i = 0; i < 8; i++) {
        const res = await api.completeEsign(current.id, payload)
        if (res.agreement.status === 'signed') {
          setCurrent(res.agreement)
          setPhase('done')
          toast('Agreement signed')
          onSigned(res.agreement)
          return
        }
        if (res.agreement.status === 'failed') throw new Error('Signing did not complete. Please try again.')
        await sleep(2500)
      }
      throw new Error('We have not received the signature from Digio yet. If you completed the OTP, wait a minute and press Sign again.')
    } catch (e) {
      setErr(e.message)
      setPhase('ready')
    }
  }

  const startSigning = async () => {
    setErr('')
    if (!consent) { toast('Tick the consent box to continue', 'warn'); return }
    if (!esign) { setErr(prepErr || 'Preparing your eSign request. Try again in a moment.'); return }
    if (esign.mode === 'mock') { setPhase('mock'); return }
    // Same flow as the Growsin app: open Digio's hosted signing page in this tab.
    // Digio sends the client back to /esign/complete, where the signature is confirmed.
    setPhase('working')
    try {
      // Ask again so the link's one-hour Digio token is always fresh.
      const res = await api.startEsign(current.id)
      if (!res.esign?.signUrl) throw new Error('Could not open Digio. Please try again.')
      window.location.assign(res.esign.signUrl)
    } catch (e) {
      if (e.status === 409) { await confirm({}); return }
      setErr(e.message)
      setPhase('ready')
    }
  }

  const download = async () => {
    try {
      const bytes = await api.agreementPdf(current.id)
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = current.fileName.replace(/\.pdf$/, signed ? '_signed.pdf' : '.pdf')
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) { toast(e.message, 'warn') }
  }

  return (
    <div className="agree-page">
      <section className={`card viewer${openMobile ? ' open' : ''}`} aria-label="Agreement">
        <div className="v-bar">
          <div className="v-title"><b>{current.fileName}</b><small>{signed ? 'Signed with Aadhaar eSign' : 'Generated · ready for eSign'}</small></div>
          <div className="zoom">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
          </div>
          <button type="button" className="v-close" onClick={() => setOpenMobile(false)}>Close</button>
        </div>
        <div className="v-meter">{pages ? `${pages} pages` : 'Loading…'}{signed ? ' · signed copy' : ''}</div>
        <div className="v-body">
          {pdfErr ? <div className="doc-state">{pdfErr} <button type="button" className="link-btn" onClick={loadPdf}>Try again</button></div> : <PdfViewer data={pdf} zoom={zoom} onPages={setPages} />}
        </div>
      </section>

      <section className="card panel" aria-labelledby="sign-h">
        <div className="p-head"><span className="eyebrow">Step 4 of 5</span><h1 id="sign-h">{signed ? 'Agreement signed' : 'Sign with Aadhaar OTP'}</h1><p>{signed ? 'Your signed agreement has been saved.' : 'Read your agreement, then sign with the OTP sent to the mobile number linked to your Aadhaar.'}</p></div>
        <button type="button" className="m-doc" onClick={() => setOpenMobile(true)}><b>Read your agreement</b><small>{pages ? `${pages} pages` : 'Tap to open'}{signed ? ' · signed' : ''}</small></button>

        <div className="gate">
          <div className="gate-h">
            <div className="gh-top"><b>Aadhaar eSign</b><span>{esign?.mode === 'mock' ? 'Test mode' : 'Secured by Digio'}</span></div>
            <dl><div><dt>Document</dt><dd>{current.fileName}</dd></div><div><dt>Signer</dt><dd>{current.values?.Client_Name}</dd></div></dl>
          </div>

          {phase === 'done' || signed ? (
            <div className="gate-b">
              <div className="success"><h3>Agreement signed</h3><p>Signed by {current.values?.Client_Name}{current.esign?.signedAt ? ` on ${formatDate(current.esign.signedAt)}` : ''}</p></div>
              <ol className="tl">
                <li>Details and risk profile submitted<small>{current.values?.Risk_Type} profile · {current.values?.Risk_Score}/21</small></li>
                <li>Agreement generated from template<small>{current.values?.Agreement_Date}</small></li>
                <li>Signed with Aadhaar eSign<small>{current.esign?.provider === 'mock' ? 'Test mode signature' : 'Digio'}</small></li>
              </ol>
              <button type="button" className="btn ghost wide" onClick={download}>Download signed agreement</button>
            </div>
          ) : phase === 'mock' ? (
            <form className="gate-b" onSubmit={(e) => { e.preventDefault(); if (digitsOnly(mockAadhaar).length !== 12 || mockOtp.length !== 6) { setErr('Enter a 12-digit Aadhaar number and any 6 digits'); return } confirm({ txn_id: 'MOCK' }) }}>
              <p className="info-box">Test mode: Digio is not connected (DIGIO_MODE=mock). No OTP is sent. Enter any 12 digits and any 6-digit code.</p>
              <TextField className="mono" label="Aadhaar number" inputMode="numeric" value={mockAadhaar} onChange={(v) => setMockAadhaar(digitsOnly(v).slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 '))} />
              <OtpInput value={mockOtp} onChange={setMockOtp} />
              {err && <p className="err-box" role="alert">{err}</p>}
              <button type="submit" className="btn wide">Verify &amp; sign (test)</button>
            </form>
          ) : (
            <div className="gate-b">
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span className="mark" aria-hidden="true" />
                <span>I have read the agreement, risk profile and disclosure document, and I consent to authenticate with my Aadhaar number and OTP to eSign it. Aadhaar details are used only for authentication with UIDAI.</span>
              </label>
              {prepErr && <p className="err-box" role="alert">{prepErr}</p>}
              {err && <p className="err-box" role="alert">{err}</p>}
              <p className="note">You will be taken to Digio's secure page. Enter your Aadhaar number and the OTP sent to your Aadhaar-linked mobile, and you will come back here automatically.</p>
            </div>
          )}
        </div>

        <div className="actions">
          {signed || phase === 'done' ? (
            <><span className="note" /><button type="button" className="btn" onClick={() => onSigned(current, true)}>Continue to payment</button></>
          ) : phase === 'mock' ? (
            <><button type="button" className="btn ghost" onClick={() => setPhase('ready')}>Back</button><span /></>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={onBack}>Edit details</button>
              <button type="button" className="btn" onClick={startSigning} disabled={phase === 'working'} aria-disabled={!esign}>{phase === 'working' && <span className="spin" />}{phase === 'working' ? 'Opening Digio…' : 'Sign with Aadhaar'}</button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
