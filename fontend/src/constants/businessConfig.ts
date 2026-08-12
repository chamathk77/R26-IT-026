import businessContact from '../../config/businessContact.json';

function trim(value: string | undefined): string {
  return value?.trim() ?? '';
}

/** Local 07xxxxxxxx → 947xxxxxxxx for tel:/wa.me links. */
function toSriLankaE164(localPhone: string): string {
  const digits = localPhone.replace(/\D/g, '');
  if (digits.startsWith('94')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `94${digits.slice(1)}`;
  }
  return digits;
}

const envPhone = trim(process.env.EXPO_PUBLIC_SUPPORT_PHONE);
const envEmail = trim(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);
const envBankName = trim(process.env.EXPO_PUBLIC_BANK_NAME);
const envBankAccountName = trim(process.env.EXPO_PUBLIC_BANK_ACCOUNT_NAME);
const envBankAccountNumber = trim(process.env.EXPO_PUBLIC_BANK_ACCOUNT_NUMBER);
const envBankBranch = trim(process.env.EXPO_PUBLIC_BANK_BRANCH);

export const BUSINESS_SUPPORT_PHONE_DISPLAY =
  envPhone || businessContact.supportPhone;
export const BUSINESS_SUPPORT_EMAIL = envEmail || businessContact.supportEmail;

export const BUSINESS_SUPPORT_PHONE_E164 = toSriLankaE164(
  BUSINESS_SUPPORT_PHONE_DISPLAY,
);
export const BUSINESS_SUPPORT_TEL_URL = `tel:+${BUSINESS_SUPPORT_PHONE_E164}`;
export const BUSINESS_SUPPORT_WHATSAPP_URL = `https://wa.me/${BUSINESS_SUPPORT_PHONE_E164}`;

export const SMART_COST_BANK_DETAILS = {
  bankName: envBankName || businessContact.bankName,
  accountName: envBankAccountName || businessContact.bankAccountName,
  accountNumber: envBankAccountNumber || businessContact.bankAccountNumber,
  branch: envBankBranch || businessContact.bankBranch,
} as const;

/** @deprecated Use BUSINESS_SUPPORT_* exports from this module. */
export const BILLING_SUPPORT_PHONE_DISPLAY = BUSINESS_SUPPORT_PHONE_DISPLAY;
/** @deprecated Use BUSINESS_SUPPORT_* exports from this module. */
export const BILLING_SUPPORT_PHONE_E164 = BUSINESS_SUPPORT_PHONE_E164;
/** @deprecated Use BUSINESS_SUPPORT_* exports from this module. */
export const BILLING_SUPPORT_EMAIL = BUSINESS_SUPPORT_EMAIL;
/** @deprecated Use BUSINESS_SUPPORT_* exports from this module. */
export const BILLING_SUPPORT_TEL_URL = BUSINESS_SUPPORT_TEL_URL;
/** @deprecated Use BUSINESS_SUPPORT_* exports from this module. */
export const BILLING_SUPPORT_WHATSAPP_URL = BUSINESS_SUPPORT_WHATSAPP_URL;
