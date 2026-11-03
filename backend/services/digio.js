import axios from 'axios';
import crypto from 'crypto';
import { digioSignCoordinates } from '../config/agreementLayout.js';

/**
 * Digio Aadhaar eSign (DigiSign) integration.
 * Docs: https://documentation.digio.in/digisign/
 *
 * Env:
 *   DIGIO_MODE            sandbox | production | mock   (default: mock when no keys)
 *   DIGIO_CLIENT_ID       client id for the chosen environment
 *   DIGIO_CLIENT_SECRET   client secret for the chosen environment
 *   DIGIO_WEBHOOK_SECRET  optional; webhook group secret from the Digio dashboard
 *   DIGIO_SIGNER_IDENTIFIER  email | mobile (default email)
 *   DIGIO_BASE_URL / DIGIO_GATEWAY_URL  optional host overrides (API / signing page)
 */
const ENV = {
  sandbox: { api: 'https://ext.digio.in:444', app: 'https://ext.digio.in' },
  production: { api: 'https://api.digio.in', app: 'https://app.digio.in' },
};

export function digioConfig() {
  const hasKeys = !!(process.env.DIGIO_CLIENT_ID && process.env.DIGIO_CLIENT_SECRET);
  let mode = (process.env.DIGIO_MODE || '').toLowerCase();
  if (!mode) mode = hasKeys ? 'sandbox' : 'mock';
  if (mode !== 'mock' && !hasKeys) {
    throw Object.assign(new Error('DIGIO_CLIENT_ID and DIGIO_CLIENT_SECRET must be set for Digio eSign'), { statusCode: 500 });
  }
  if (mode === 'mock' && process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('DIGIO_MODE=mock is not allowed in production'), { statusCode: 500 });
  }
  return {
    mode,
    // Optional overrides, same names as the Growsin app backend (growsin-console env.ts).
    api: (mode !== 'mock' && process.env.DIGIO_BASE_URL) || ENV[mode]?.api,
    app: (mode !== 'mock' && process.env.DIGIO_GATEWAY_URL?.replace(/\/$/, '')) || ENV[mode]?.app,
    identifierType: (process.env.DIGIO_SIGNER_IDENTIFIER || 'email').toLowerCase(),
  };
}

function client(cfg) {
  const token = Buffer.from(`${process.env.DIGIO_CLIENT_ID}:${process.env.DIGIO_CLIENT_SECRET}`).toString('base64');
  return axios.create({
    baseURL: cfg.api,
    timeout: 30000,
    headers: { Authorization: `Basic ${token}` },
  });
}

function digioError(e, what) {
  const detail = e.response?.data?.message || e.response?.data?.details || e.message;
  const err = new Error(`Digio ${what} failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  err.statusCode = 502;
  return err;
}

/**
 * Create an Aadhaar eSign request for the filled agreement.
 * Returns { documentId, accessToken, raw }.
 */
export async function createSignRequest({ pdf, fileName, signer, reference }) {
  const cfg = digioConfig();
  if (cfg.mode === 'mock') {
    return { documentId: `MOCK${crypto.randomBytes(8).toString('hex').toUpperCase()}`, accessToken: null, raw: { mock: true } };
  }
  const coords = digioSignCoordinates();
  const body = {
    file_name: fileName,
    file_data: Buffer.from(pdf).toString('base64'),
    signers: [{ identifier: signer.identifier, name: signer.name, reason: 'Investment Advisory Agreement', sign_type: 'aadhaar' }],
    expire_in_days: 10,
    display_on_page: 'custom',
    sign_coordinates: { [signer.identifier]: coords },
    notify_signers: false,
    send_sign_link: false,
    generate_access_token: true,
    callback: reference, // idempotency: one Digio request per agreement
    comment: 'Please eSign your Investment Advisory Agreement with Aadhaar OTP.',
  };
  try {
    const { data } = await client(cfg).post('/v2/client/document/uploadpdf', body);
    return { documentId: data.id, accessToken: data.access_token?.id || null, raw: data };
  } catch (e) {
    throw digioError(e, 'create sign request');
  }
}

/** Where Digio sends the signer back to after signing (handled by the onboarding screens). */
export const ESIGN_RETURN_PATH = '/esign/complete';

/**
 * Digio's hosted signing page, built the same way as Digio's web SDK
 * (generateUrl) and the Growsin app backend (growsin-console digio.client.ts):
 *   {gateway}/#/gateway/login/{documentId}/{txn}/{identifier}?token_id=GWT…&redirect_url=…&error_url=…
 * Digio appends status=success|failure and digio_doc_id to the return URL.
 */
export function signUrl({ documentId, identifier, accessToken, returnBase }) {
  const cfg = digioConfig();
  if (cfg.mode === 'mock') return null;
  const txn = crypto.randomBytes(4).toString('hex');
  const back = encodeURIComponent(`${String(returnBase).replace(/\/$/, '')}${ESIGN_RETURN_PATH}`);
  const params = [...(accessToken ? [`token_id=${accessToken}`] : []), `redirect_url=${back}`, `error_url=${back}`];
  return `${cfg.app}/#/gateway/login/${documentId}/${txn}/${identifier}?${params.join('&')}`;
}

/** Document details: agreement_status and signing_parties[].status */
export async function getDocument(documentId) {
  const cfg = digioConfig();
  if (cfg.mode === 'mock') return { id: documentId, agreement_status: 'completed', signing_parties: [{ status: 'signed' }], mock: true };
  try {
    const { data } = await client(cfg).get(`/v2/client/document/${encodeURIComponent(documentId)}`);
    return data;
  } catch (e) {
    throw digioError(e, 'get document');
  }
}

/** Signed PDF bytes */
export async function downloadSignedPdf(documentId) {
  const cfg = digioConfig();
  if (cfg.mode === 'mock') return null;
  try {
    const { data } = await client(cfg).get('/v2/client/document/download', {
      params: { document_id: documentId },
      responseType: 'arraybuffer',
    });
    return Buffer.from(data);
  } catch (e) {
    throw digioError(e, 'download signed document');
  }
}

export const isCompleted = (doc) =>
  doc?.agreement_status === 'completed' ||
  (Array.isArray(doc?.signing_parties) && doc.signing_parties.length > 0 && doc.signing_parties.every((p) => p.status === 'signed'));

export const isFailed = (doc) =>
  ['expired', 'cancelled', 'rejected', 'failed'].includes(String(doc?.agreement_status || '').toLowerCase()) ||
  (doc?.signing_parties || []).some((p) => ['rejected', 'failed', 'expired'].includes(String(p.status || '').toLowerCase()));

/**
 * Optional webhook checksum check. Digio's docs describe a per-group secret
 * but not the header format, so we accept an HMAC-SHA256 (hex or base64) of
 * the raw body in `x-digio-checksum`. Whatever the webhook says, we always
 * re-fetch the document from Digio before trusting it.
 */
export function verifyWebhook(rawBody, headers) {
  const secret = process.env.DIGIO_WEBHOOK_SECRET;
  if (!secret) return true;
  const sent = headers['x-digio-checksum'] || headers['x-digio-signature'];
  if (!sent) return false;
  const h = crypto.createHmac('sha256', secret).update(rawBody);
  const digest = h.digest();
  const candidates = [digest.toString('hex'), digest.toString('base64')];
  return candidates.some((c) => c.length === String(sent).length && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(String(sent))));
}
