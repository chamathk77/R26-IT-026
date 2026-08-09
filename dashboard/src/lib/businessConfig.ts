import businessContact from '../../config/businessContact.json';

function trim(value: string | undefined): string {
  return value?.trim() ?? '';
}

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

const envPhone = trim(process.env.NEXT_PUBLIC_SUPPORT_PHONE);
const envEmail = trim(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);

export const BUSINESS_SUPPORT_PHONE_DISPLAY =
  envPhone || businessContact.supportPhone;
export const BUSINESS_SUPPORT_EMAIL = envEmail || businessContact.supportEmail;
export const BUSINESS_SUPPORT_PHONE_E164 = toSriLankaE164(
  BUSINESS_SUPPORT_PHONE_DISPLAY,
);
export const BUSINESS_SUPPORT_TEL_URL = `tel:+${BUSINESS_SUPPORT_PHONE_E164}`;
export const BUSINESS_SUPPORT_WHATSAPP_URL = `https://wa.me/${BUSINESS_SUPPORT_PHONE_E164}`;

export const SMART_COST_BANK_DETAILS = {
  bankName: trim(process.env.NEXT_PUBLIC_BANK_NAME) || businessContact.bankName,
  accountName:
    trim(process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME) ||
    businessContact.bankAccountName,
  accountNumber:
    trim(process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER) ||
    businessContact.bankAccountNumber,
  branch: trim(process.env.NEXT_PUBLIC_BANK_BRANCH) || businessContact.bankBranch,
} as const;
