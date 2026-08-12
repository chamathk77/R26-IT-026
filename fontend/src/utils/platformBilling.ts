import { Platform } from 'react-native';

/** App Store builds must not offer in-app purchase / receipt upload flows. */
export const isInAppBillingAllowed = Platform.OS !== 'ios';
