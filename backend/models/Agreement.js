import mongoose from 'mongoose';

/**
 * One generated Investment Advisory Agreement per attempt.
 * Holds the filled PDF, the Digio eSign request and, once signed,
 * the signed PDF returned by Digio.
 */
const agreementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
      type: String,
      enum: ['generated', 'sent_for_esign', 'signed', 'failed', 'expired', 'superseded'],
      default: 'generated',
      index: true,
    },
    fileName: { type: String, required: true },
    // Snapshot of every value printed on the agreement (audit trail)
    values: { type: Object, required: true },
    templateVersion: { type: String, default: 'investment-agreement-v1' },
    pageCount: { type: Number },
    unsignedPdf: { type: Buffer, required: true, select: false },
    signedPdf: { type: Buffer, select: false },
    esign: {
      provider: { type: String, enum: ['digio', 'mock'] },
      environment: { type: String },
      documentId: { type: String, index: true },
      identifier: { type: String },
      accessToken: { type: String }, // Digio GWT token so the client skips Digio's first login step
      status: { type: String },
      txnId: { type: String },
      requestedAt: { type: Date },
      layout: { type: String }, // signature boxes + reason this Digio request was made with
      signedAt: { type: Date },
      signerDetails: { type: Object }, // Digio pki_signature_details (name, aadhaar suffix, …)
      lastError: { type: String },
      rawStatus: { type: Object, select: false },
    },
  },
  { timestamps: true }
);

agreementSchema.methods.toClient = function () {
  return {
    id: this._id,
    planId: this.planId,
    status: this.status,
    fileName: this.fileName,
    pageCount: this.pageCount,
    createdAt: this.createdAt,
    values: {
      Client_Name: this.values?.Client_Name,
      Risk_Type: this.values?.Risk_Type,
      Risk_Score: this.values?.Risk_Score,
      Service_Subscribed: this.values?.Service_Subscribed,
      Fee_Amount: this.values?.Fee_Amount,
      Agreement_Date: this.values?.Agreement_Date,
    },
    esign: this.esign
      ? {
          provider: this.esign.provider,
          documentId: this.esign.documentId,
          status: this.esign.status,
          signedAt: this.esign.signedAt,
        }
      : undefined,
  };
};

const Agreement = mongoose.model('Agreement', agreementSchema);
export default Agreement;
