/**
 * Zoho Payments — same integration as the Growsin app backend
 * (growsin-console modules/zoho/zoho-payments.service.ts + zoho-auth.service.ts):
 * the server creates a payment session; the browser opens Zoho's checkout
 * widget with it; the widget's signature (or a status lookup) confirms payment.
 *
 * Env (same names as growsin-console):
 *   ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN   OAuth self-client (scope ZohoPay.payments.CREATE,READ)
 *   ZOHO_ACCOUNT_ID            Zoho Payments account id
 *   ZOHO_API_KEY               widget API key (Settings > Developer Space)
 *   ZOHO_SIGNING_KEY           widget signing key (Settings > Developer Space > Authentication Keys)
 *   ZOHO_WEBHOOK_SIGNING_KEY   webhook signing key (optional; different from the above)
 *   ZOHO_API_BASE              default https://payments.zoho.in/api/v1
 *   ZOHO_ACCOUNTS_BASE         default https://accounts.zoho.in
 */
import crypto from 'crypto';
import axios from 'axios';

const httpError = (status, message, code) => Object.assign(new Error(message), { statusCode: status, code });
const apiBase = () => process.env.ZOHO_API_BASE || 'https://payments.zoho.in/api/v1';
const accountsBase = () => process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.in';

export const zohoPayConfigured = () => !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN
  && process.env.ZOHO_ACCOUNT_ID && process.env.ZOHO_API_KEY && process.env.ZOHO_SIGNING_KEY);

export function widgetConfig() {
  const base = apiBase();
  const domain = base.includes('.zoho.com') ? 'US' : base.includes('.zoho.eu') ? 'EU' : 'IN';
  return { accountId: process.env.ZOHO_ACCOUNT_ID, apiKey: process.env.ZOHO_API_KEY, domain };
}

let cached = null;
let inFlight = null;
async function refreshToken() {
  const { data, status } = await axios.post(`${accountsBase()}/oauth/v2/token`, new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000, validateStatus: () => true });
  if (status >= 400 || !data?.access_token) {
    console.error('Zoho token refresh failed:', data?.error || status);
    throw httpError(502, 'The payment service is not available right now. Please try again.', 'zoho_auth_failed');
  }
  // Refresh a minute early rather than racing the exact expiry.
  return { token: data.access_token, expiresAt: Date.now() + Math.max((data.expires_in ?? 3600) - 60, 60) * 1000 };
}
async function accessToken() {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  if (!inFlight) inFlight = refreshToken().finally(() => { inFlight = null; });
  cached = await inFlight;
  return cached.token;
}

const account = () => `account_id=${encodeURIComponent(process.env.ZOHO_ACCOUNT_ID)}`;

/** Creates a payment session. Amount in paise; Zoho wants rupees. */
export async function createPaymentSession({ amountPaise, description, referenceNumber }) {
  const token = await accessToken();
  const { data, status } = await axios.post(`${apiBase()}/paymentsessions?${account()}`, {
    amount: Number((amountPaise / 100).toFixed(2)),
    currency: 'INR',
    description: String(description).slice(0, 500),
    reference_number: referenceNumber,
  }, { headers: { Authorization: `Zoho-oauthtoken ${token}` }, timeout: 10000, validateStatus: () => true });
  const id = data?.payments_session?.payments_session_id;
  if (status >= 400 || !id) {
    console.error('Zoho payment session failed:', status, data?.message);
    throw httpError(502, data?.message || 'Could not start the payment. Please try again.', 'zoho_order_failed');
  }
  return id;
}

/** Status lookup — the fallback when there is no widget signature, and for webhooks. */
export async function getPaymentSession(sessionId) {
  const token = await accessToken();
  const { data, status } = await axios.get(`${apiBase()}/paymentsessions/${encodeURIComponent(sessionId)}?${account()}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` }, timeout: 8000, validateStatus: () => true });
  const s = data?.payments_session;
  if (status >= 400 || !s?.payments_session_id) throw httpError(502, 'Could not check the payment with Zoho.', 'zoho_lookup_failed');
  const payments = s.payments || [];
  const ok = payments.find((p) => ['success', 'captured', 'succeeded', 'paid'].includes(String(p.status || '').toLowerCase()));
  const sessionPaid = ['paid', 'completed', 'succeeded'].includes(String(s.status || '').toLowerCase());
  return { status: s.status || 'unknown', paid: !!ok || sessionPaid, paymentId: ok?.payment_id || payments[0]?.payment_id || null };
}

const sameHex = (a, b) => {
  const x = Buffer.from(String(a).toLowerCase()); const y = Buffer.from(String(b).toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Widget signature: HMAC-SHA256 of `${paymentId}|${sessionId}` with the signing key. */
export function verifyWidgetSignature(paymentId, sessionId, signature) {
  if (!process.env.ZOHO_SIGNING_KEY || !signature) return false;
  const expected = crypto.createHmac('sha256', process.env.ZOHO_SIGNING_KEY).update(`${paymentId}|${sessionId}`).digest('hex');
  return sameHex(signature, expected);
}

/** Webhook header `t=<ms>,v=<hmac>`: HMAC-SHA256 of `${t}.${rawBody}` with the webhook key. */
export function verifyWebhookSignature(rawBody, header) {
  if (!header || !process.env.ZOHO_WEBHOOK_SIGNING_KEY) return false;
  const parts = Object.fromEntries(String(header).split(',').map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()]; }));
  if (!parts.t || !parts.v) return false;
  const expected = crypto.createHmac('sha256', process.env.ZOHO_WEBHOOK_SIGNING_KEY).update(`${parts.t}.${rawBody}`).digest('hex');
  return sameHex(parts.v, expected);
}

export function extractSessionId(event) {
  const data = event?.data ?? event?.payload ?? event ?? {};
  const ps = data.payments_session ?? data.payment_session ?? {};
  const p = data.payment ?? {};
  return [event?.payments_session_id, event?.payment_session_id, data.payments_session_id, data.payment_session_id,
    ps.payments_session_id, ps.payment_session_id, ps.id, p.payments_session_id, p.payment_session_id]
    .find((v) => typeof v === 'string' && v) || null;
}
