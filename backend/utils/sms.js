/**
 * Mobile OTP delivery through Fast2SMS — the same setup as the Growsin app
 * backend (growsin-console lib/sms.ts): WhatsApp template first, plain SMS
 * (DLT OTP template) as the fallback. We generate and check the code
 * ourselves; Fast2SMS only delivers it.
 *
 * Env:
 *   FAST2SMS_API_KEY             Fast2SMS dashboard > API key
 *   FAST2SMS_OTP_ID              DLT-approved OTP template id (SMS route)
 *   FAST2SMS_WA_MESSAGE_ID       WhatsApp Authentication template's Message ID
 *   FAST2SMS_WA_PHONE_NUMBER_ID  Phone Number ID of the sending WhatsApp number
 *   FAST2SMS_WA_VARIABLES        template variables, {otp} = the code (default "{otp}")
 *   FAST2SMS_BASE_URL            optional host override (testing)
 */
import axios from 'axios';

const base = () => (process.env.FAST2SMS_BASE_URL || 'https://www.fast2sms.com').replace(/\/$/, '');
const httpError = (status, message, code) => Object.assign(new Error(message), { statusCode: status, code });

export const smsConfigured = () => !!(process.env.FAST2SMS_API_KEY && (process.env.FAST2SMS_OTP_ID || waConfigured()));
const waConfigured = () => !!(process.env.FAST2SMS_WA_MESSAGE_ID && process.env.FAST2SMS_WA_PHONE_NUMBER_ID);
const mask = (mobile) => `xxxxxx${String(mobile).slice(-4)}`;

function checkReply(data, what, mobile) {
  if (!data?.return) {
    console.error(`Fast2SMS ${what} send failed to ${mask(mobile)}:`, JSON.stringify(data));
    throw httpError(502, 'Could not send the code. Please try again.', 'sms_send_failed');
  }
  console.log(`Fast2SMS ${what} accepted for ${mask(mobile)}: request_id=${data.request_id ?? '?'}`);
}

async function sendWhatsApp(mobile, otp) {
  const vars = (process.env.FAST2SMS_WA_VARIABLES || '{otp}').replace(/\{otp\}/g, otp);
  try {
    const { data } = await axios.get(`${base()}/dev/whatsapp`, {
      params: { message_id: process.env.FAST2SMS_WA_MESSAGE_ID, phone_number_id: process.env.FAST2SMS_WA_PHONE_NUMBER_ID, numbers: mobile, variables_values: vars },
      headers: { authorization: process.env.FAST2SMS_API_KEY },
      timeout: 10000,
      validateStatus: () => true,
    });
    checkReply(data, 'WhatsApp', mobile);
  } catch (e) {
    if (e.statusCode) throw e;
    console.error('Fast2SMS (WhatsApp) unreachable:', e.message);
    throw httpError(502, 'Could not send the code. Please try again.', 'sms_send_failed');
  }
}

async function sendSms(mobile, otp) {
  if (!process.env.FAST2SMS_OTP_ID) throw httpError(503, 'SMS delivery is not available right now.', 'sms_not_configured');
  try {
    const { data } = await axios.post(`${base()}/dev/otp/send`,
      { mobile, otp_id: process.env.FAST2SMS_OTP_ID, otp, otp_expiry: 10 },
      { headers: { authorization: process.env.FAST2SMS_API_KEY }, timeout: 10000, validateStatus: () => true });
    checkReply(data, 'SMS', mobile);
  } catch (e) {
    if (e.statusCode) throw e;
    console.error('Fast2SMS (SMS) unreachable:', e.message);
    throw httpError(502, 'Could not send the SMS. Please try again.', 'sms_send_failed');
  }
}

/**
 * Sends the code: WhatsApp first, SMS if WhatsApp fails (or smsOnly).
 * Returns the channel used: 'whatsapp' | 'sms'.
 */
export async function deliverOtp(mobile, otp, { smsOnly = false } = {}) {
  if (!smsOnly && waConfigured()) {
    try {
      await sendWhatsApp(mobile, otp);
      return 'whatsapp';
    } catch (e) {
      if (!process.env.FAST2SMS_OTP_ID) throw e;
      console.warn(`WhatsApp OTP to ${mask(mobile)} failed, falling back to SMS`);
    }
  }
  await sendSms(mobile, otp);
  return 'sms';
}
