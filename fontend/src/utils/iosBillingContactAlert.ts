import { Linking } from 'react-native';
import { formatPaymentAmount } from './paymentBreakdown';
import {
  BILLING_SUPPORT_EMAIL,
  BILLING_SUPPORT_PHONE_DISPLAY,
  BILLING_SUPPORT_TEL_URL,
  BILLING_SUPPORT_WHATSAPP_URL,
} from '../constants/businessConfig';

type ShowAlertFn = (
  type: 'success' | 'error' | 'pending',
  title: string,
  message: string,
  buttons: 0 | 1 | 2,
  MoreDetails?: boolean,
  positiveButtonText?: string,
  onPositivePress?: () => void,
  negativeButtonText?: string,
  onNegativePress?: () => void,
) => void;

type IosBillingContactAlertOptions = {
  amount: number | null;
  receiptNumber: string;
  isResubmit?: boolean;
};

export function buildIosBillingContactMessage({
  amount,
  receiptNumber,
  isResubmit = false,
}: IosBillingContactAlertOptions): string {
  const amountLabel = formatPaymentAmount(amount);
  const intro = isResubmit
    ? 'Your previous payment was not approved. Please transfer again using the bank details on this screen.'
    : 'Please transfer the amount using the bank details shown on this screen.';

  return [
    `Amount due: ${amountLabel}`,
    `Receipt no: ${receiptNumber}`,
    '',
    intro,
    'After you transfer, contact our admin team with:',
    '• Your shop name',
    '• Registered phone number',
    '• Receipt number above',
    '',
    'We will verify your payment and activate your account.',
    '',
    `Phone / WhatsApp: ${BILLING_SUPPORT_PHONE_DISPLAY}`,
    `Email: ${BILLING_SUPPORT_EMAIL}`,
  ].join('\n');
}

export function showIosBillingContactAlert(
  show_Alert: ShowAlertFn,
  options: IosBillingContactAlertOptions,
): void {
  show_Alert(
    'pending',
    options.isResubmit ? 'Payment rejected — contact admin' : 'Contact admin to confirm payment',
    buildIosBillingContactMessage(options),
    2,
    false,
    'Call',
    () => {
      void Linking.openURL(BILLING_SUPPORT_TEL_URL);
    },
    'WhatsApp',
    () => {
      void Linking.openURL(BILLING_SUPPORT_WHATSAPP_URL);
    },
  );
}
