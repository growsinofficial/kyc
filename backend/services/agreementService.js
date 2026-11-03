import { User, KYCData, RiskProfile, Plan, Agreement } from '../models/index.js';
import { buildAgreementValues, renderAgreementPdf } from './agreementPdf.js';
import { digioConfig, createSignRequest, getDocument, downloadSignedPdf, isCompleted, isFailed } from './digio.js';
import { CONTENT_PAGES } from '../config/agreementLayout.js';

const httpError = (status, message) => Object.assign(new Error(message), { statusCode: status });

/** Fill the template with the user's saved details and store it. */
export async function generateAgreement(userId, planId) {
  const [user, kyc, risk, plan] = await Promise.all([
    User.findById(userId),
    KYCData.findOne({ userId }),
    RiskProfile.findOne({ userId }),
    planId ? Plan.findById(planId) : null,
  ]);
  if (!user) throw httpError(404, 'User not found');
  if (!kyc?.personal?.name || !kyc?.personal?.pan) throw httpError(400, 'Please complete your personal details first');
  if (!kyc?.address?.address) throw httpError(400, 'Please complete your address first');
  if (!risk || risk.assessmentVersion !== 'agreement-7q-v1') throw httpError(400, 'Please complete the risk profile first');
  if (!plan || !plan.isActive) throw httpError(400, 'Please choose an advisory plan');
  // Suitability (SEBI IA Regulations 16–17): only offer services that suit the risk category.
  if (Array.isArray(plan.riskProfiles) && plan.riskProfiles.length && !plan.riskProfiles.includes(risk.riskCategory)) {
    throw httpError(400, `${plan.title || plan.name} is not suitable for a ${risk.riskCategory} risk profile. Please choose another plan.`);
  }

  const values = buildAgreementValues({ user, kyc, risk, plan, agreementDate: new Date() });
  const pdf = await renderAgreementPdf(values);
  const safe = values.Client_Name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const fileName = `Agreement_${safe}_${values.PAN}.pdf`;

  // Older unsigned attempts no longer apply.
  await Agreement.updateMany(
    { userId, status: { $in: ['generated', 'sent_for_esign', 'failed'] } },
    { $set: { status: 'superseded' } }
  );

  const agreement = await Agreement.create({
    userId,
    planId: plan._id,
    fileName,
    values,
    pageCount: CONTENT_PAGES,
    unsignedPdf: Buffer.from(pdf),
  });
  await User.findByIdAndUpdate(userId, { 'flags.agreementSigned': false });
  return agreement;
}

export async function findOwnAgreement(userId, id, withPdf = false) {
  const q = Agreement.findOne({ _id: id, userId });
  if (withPdf) q.select('+unsignedPdf +signedPdf');
  const agreement = await q;
  if (!agreement) throw httpError(404, 'Agreement not found');
  return agreement;
}

const signerIdentifier = (user, agreement, type) => {
  if (type === 'mobile') return String(agreement.values.Mobile || user.mobile).replace(/\D/g, '').slice(-10);
  return agreement.values.Email || user.email;
};

/** Create (or reuse) the Digio Aadhaar eSign request. */
export async function startEsign(userId, id) {
  const cfg = digioConfig();
  const agreement = await findOwnAgreement(userId, id, true);
  if (agreement.status === 'signed') throw httpError(409, 'This agreement is already signed');
  if (agreement.status === 'superseded') throw httpError(409, 'A newer agreement exists. Please generate it again.');
  const user = await User.findById(userId);

  if (agreement.status !== 'sent_for_esign' || !agreement.esign?.documentId || agreement.esign.provider !== (cfg.mode === 'mock' ? 'mock' : 'digio')) {
    const identifier = signerIdentifier(user, agreement, cfg.identifierType);
    const { documentId, accessToken } = await createSignRequest({
      pdf: agreement.unsignedPdf,
      fileName: agreement.fileName,
      signer: { identifier, name: agreement.values.Client_Name },
      reference: String(agreement._id),
    });
    agreement.status = 'sent_for_esign';
    agreement.esign = {
      provider: cfg.mode === 'mock' ? 'mock' : 'digio',
      environment: cfg.mode,
      documentId,
      identifier,
      status: 'requested',
      requestedAt: new Date(),
      accessToken,
    };
    agreement.markModified('esign');
    await agreement.save();
  }

  return {
    mode: cfg.mode,
    documentId: agreement.esign.documentId,
    identifier: agreement.esign.identifier,
    accessToken: agreement.esign.accessToken || null,
    sdkUrl: cfg.sdkUrl,
    environment: cfg.mode === 'production' ? 'production' : 'sandbox',
    logo: cfg.logo,
  };
}

/**
 * Check the request with Digio and, once signed, store the signed PDF.
 * Safe to call many times (from the browser callback and the webhook).
 */
export async function syncEsign(agreement) {
  if (agreement.status === 'signed') return agreement;
  if (!agreement.esign?.documentId) throw httpError(400, 'eSign has not been started');
  const full = agreement.unsignedPdf ? agreement : await Agreement.findById(agreement._id).select('+unsignedPdf +signedPdf');

  const doc = await getDocument(full.esign.documentId);
  if (isCompleted(doc)) {
    let signed;
    if (full.esign.provider === 'mock') {
      signed = Buffer.from(await renderAgreementPdf(full.values, { testSignature: { name: full.values.Client_Name, signedAt: new Date() } }));
    } else {
      signed = await downloadSignedPdf(full.esign.documentId);
    }
    const party = (doc.signing_parties || [])[0] || {};
    full.signedPdf = signed;
    full.status = 'signed';
    full.esign.status = 'signed';
    full.esign.signedAt = party.updated_at ? new Date(party.updated_at) : new Date();
    full.esign.signerDetails = party.pki_signature_details || null;
    full.markModified('esign');
    await full.save();
    await User.findByIdAndUpdate(full.userId, { 'flags.agreementSigned': true });
    return full;
  }
  if (isFailed(doc)) {
    full.status = 'failed';
    full.esign.status = String(doc.agreement_status || 'failed');
    full.esign.lastError = doc.error_message || null;
    full.markModified('esign');
    await full.save();
  }
  return full;
}
