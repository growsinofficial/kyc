/**
 * Where each client value goes on the agreement template PDF.
 *
 * Coordinates are PDF points measured from the TOP-LEFT of an A4 page
 * (595.2 x 841.92), the same system as `pdftotext -bbox`. They match the
 * signed-off template "Investment_agreement_1.pdf" (24 pages; page 24 is
 * blank and is removed). If the template changes, re-measure these.
 *
 *  x, y, w, h  box in points (y = top edge of the text line)
 *  size        font size in points
 *  font        'serif' (Times New Roman parts) | 'sans' (Calibri parts)
 *  bold        bold weight
 *  key         a single value from the values object
 *  text        a paragraph with {Key} tokens and **bold** runs
 *  cover       paint white behind the box first (hides template text it replaces)
 *  justify     justify paragraph lines
 *  lineHeight  paragraph line height in points
 *  color       [r,g,b] 0–1
 *  fit         shrink the font until a single line fits the box
 */
export const PAGE_W = 595.2;
export const PAGE_H = 841.92;
export const CONTENT_PAGES = 23;

const GREY = [0.349, 0.349, 0.349];
const BLUE = [0.267, 0.447, 0.769];

export const OVERLAYS = [
  // ---- Page 1 · Risk profiling ----
  { page: 1, x: 186, y: 197.4, w: 112, h: 11, size: 9, font: 'serif', key: 'Client_Name', fit: true },
  { page: 1, x: 384, y: 197.4, w: 145, h: 11, size: 9, font: 'serif', key: 'Date_of_Birth' },
  { page: 1, x: 186, y: 214.1, w: 112, h: 11, size: 9, font: 'serif', key: 'PAN' },
  { page: 1, x: 384, y: 214.1, w: 145, h: 11, size: 9, font: 'serif', key: 'Risk_Score' },
  { page: 1, x: 186, y: 229.4, w: 112, h: 11, size: 9, font: 'serif', key: 'Submission_Date' },
  { page: 1, x: 384, y: 229.4, w: 145, h: 11, size: 9, font: 'serif', key: 'Risk_Type' },
  { page: 1, x: 300, y: 281.5, w: 227, h: 14, size: 8.5, font: 'sans', key: 'Q_age', fit: true },
  { page: 1, x: 300, y: 301.7, w: 227, h: 14, size: 8.5, font: 'sans', key: 'Q_income', fit: true },
  { page: 1, x: 300, y: 319.7, w: 227, h: 12, size: 8.5, font: 'sans', key: 'Q_outcome', fit: true },
  { page: 1, x: 300, y: 338.1, w: 227, h: 20, size: 8.5, font: 'sans', key: 'Q_invest_percent', fit: true },
  { page: 1, x: 300, y: 363.3, w: 227, h: 24, size: 8.5, font: 'sans', key: 'Q_liability_percent', fit: true },
  { page: 1, x: 300, y: 391.7, w: 227, h: 22, size: 8.5, font: 'sans', key: 'Q_current_investments', fit: true },
  { page: 1, x: 300, y: 419.8, w: 220, h: 18, size: 8, font: 'sans', key: 'Q_objective', lineHeight: 8.9 },
  { page: 1, x: 73.5, y: 503.4, w: 466, h: 13, size: 11, font: 'serif', cover: true,
    text: '{Client_Name} has been categorized as an {Risk_Type_Investor}', colorKeys: { Risk_Type_Investor: BLUE }, boldKeys: ['Risk_Type_Investor'] },
  { page: 1, x: 73.5, y: 524.8, w: 466, h: 39, size: 11, font: 'serif', cover: true, justify: true, lineHeight: 12.7, text: '{Suitability_Remarks}' },
  { page: 1, x: 73.5, y: 603.7, w: 466, h: 26, size: 11, font: 'serif', cover: true, justify: true, lineHeight: 12.7,
    text: 'I, {Salutation} {Client_Name}, confirm that the information provided is accurate and complete to the best of my knowledge.' },
  { page: 1, x: 96, y: 736.4, w: 160, h: 12, size: 11, font: 'serif', key: 'Submission_Date' },

  // ---- Page 2 · Suitability assessment ----
  { page: 2, x: 158, y: 149.8, w: 380, h: 13, size: 11, font: 'sans', key: 'Client_Name' },
  { page: 2, x: 158, y: 164.4, w: 380, h: 13, size: 11, font: 'sans', key: 'Risk_Type' },
  { page: 2, x: 158, y: 179.1, w: 380, h: 13, size: 11, font: 'sans', key: 'Service_Subscribed' },

  // ---- Page 3 ----
  { page: 3, x: 88, y: 755.7, w: 160, h: 12, size: 10, font: 'sans', key: 'Agreement_Date' },

  // ---- Page 4 · Agreement parties ----
  { page: 4, x: 419.5, y: 94.2, w: 110, h: 11, size: 8.6, font: 'sans', cover: true, color: GREY, key: 'Agreement_Date' },
  { page: 4, x: 55.5, y: 260.4, w: 484, h: 58, size: 11, font: 'sans', cover: true, lineHeight: 14.65, color: GREY,
    text: 'Mr/Ms. {Client_Name}, a resident of {Address} (hereinafter referred to as the “CLIENT” which expression shall unless it be repugnant to the context or be deemed to mean and include, its administrators & permitted assigns) of the **SECOND PART;**' },
  { page: 4, x: 268, y: 324.6, w: 189, h: 11, size: 8.5, font: 'sans', key: 'Client_Name', fit: true },
  { page: 4, x: 268, y: 340.4, w: 189, h: 11, size: 8.5, font: 'sans', key: 'Date_of_Birth' },
  { page: 4, x: 268, y: 355.8, w: 189, h: 11, size: 8.5, font: 'sans', key: 'Father_Name', fit: true },
  { page: 4, x: 268, y: 371.4, w: 189, h: 11, size: 8.5, font: 'sans', key: 'Mobile' },
  { page: 4, x: 268, y: 387.0, w: 189, h: 11, size: 8.5, font: 'sans', key: 'Email', fit: true },
  { page: 4, x: 268, y: 402.3, w: 189, h: 11, size: 8.5, font: 'sans', key: 'PAN' },
  { page: 4, x: 268, y: 417.9, w: 184, h: 11, size: 8.5, font: 'sans', key: 'Address', fit: true },

  // ---- Page 19 · Acknowledgement & declaration by client ----
  { page: 19, x: 126, y: 418.3, w: 300, h: 12, size: 10, font: 'serif', key: 'Client_Name' },
  { page: 19, x: 88, y: 524.9, w: 160, h: 12, size: 10, font: 'serif', key: 'Agreement_Date' },

  // ---- Page 20 · Annexure B fee table, CKYC consent ----
  { page: 20, x: 104.5, y: 251, w: 134, h: 13, size: 8.6, font: 'sans', cover: true, key: 'Service_Subscribed', fit: true },
  { page: 20, x: 243.5, y: 251.3, w: 90, h: 12, size: 8.6, font: 'sans', key: 'Service_Start_Date' },
  { page: 20, x: 337.5, y: 251, w: 55, h: 13, size: 8.6, font: 'sans', cover: true, key: 'Fee_Amount' },
  { page: 20, x: 398, y: 251, w: 128, h: 13, size: 8.6, font: 'sans', cover: true, key: 'Service_Tenure' },
  { page: 20, x: 55.5, y: 426.6, w: 484, h: 46, size: 9.3, font: 'sans', cover: true, justify: true, lineHeight: 11.6,
    text: 'I, {Client_Name}, S/o / D/o / W/o {Father_Name}, give my consent to **Murali Krishna Sivvala** to download my KYC Records from the Central KYC Registry (CKYCR), only for the purpose of verification of my identity, due compliance and address from the database of CKYCR Registry.' },

  // ---- Page 23 · Client declaration ----
  { page: 23, x: 126, y: 89.8, w: 300, h: 12, size: 10.5, font: 'serif', bold: true, key: 'Client_Name' },
  { page: 23, x: 126, y: 116.4, w: 300, h: 12, size: 10.5, font: 'serif', bold: true, key: 'PAN' },
  { page: 23, x: 126, y: 143.1, w: 300, h: 12, size: 10.5, font: 'serif', bold: true, key: 'Agreement_Date' },
  { page: 23, x: 332, y: 334, w: 90, h: 12.5, size: 10.3, font: 'serif', bold: true, cover: true, key: 'Risk_Type' },
  { page: 23, x: 92, y: 733.5, w: 160, h: 12, size: 9, font: 'sans', key: 'Client_Name', fit: true },
  { page: 23, x: 92, y: 759.6, w: 160, h: 12, size: 9, font: 'sans', key: 'Agreement_Date' },
  { page: 23, x: 350, y: 753.3, w: 160, h: 12, size: 10, font: 'serif', key: 'Agreement_Date' },
];

/**
 * Client signature boxes (top-left based, points). Digio places the
 * Aadhaar eSign appearance here: under "Client Sign:" (p1),
 * "Signature:" (p19) and "Client Signature" (p23).
 */
// All three boxes are the same size so the Aadhaar eSign stamp looks the same
// (same size, same position inside the box) on every page. Measured on the
// stored template with pdftotext -bbox: each box sits in the empty signature
// space under/next to its label and clear of the Date/Name lines below it.
const SIGN_W = 160;
const SIGN_H = 48;
export const CLIENT_SIGNATURE_BOXES = [
  { page: 1, x: 400, y: 686, w: SIGN_W, h: SIGN_H },  // under "Client Sign:" (label at y 670-681; disclaimer from y 758)
  { page: 19, x: 110, y: 466, w: SIGN_W, h: SIGN_H }, // in the gap between "Signature:" (ends y 455) and "Date:" (starts y 525), centred
  { page: 23, x: 58, y: 668, w: SIGN_W, h: SIGN_H },  // under "Client Signature" (label at y 655-665; "Name:" at y 733)
];

/** Digio expects bottom-left coordinates: { "1": [{llx,lly,urx,ury}] } */
export const digioSignCoordinates = () => {
  const pages = {};
  for (const b of CLIENT_SIGNATURE_BOXES) {
    pages[String(b.page)] = [
      {
        llx: Math.round(b.x),
        lly: Math.round(PAGE_H - (b.y + b.h)),
        urx: Math.round(b.x + b.w),
        ury: Math.round(PAGE_H - b.y),
      },
    ];
  }
  return pages;
};
