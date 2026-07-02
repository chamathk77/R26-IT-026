import type { PaymentRecord } from './payment';

export interface StartTrialRequest {
  startTrial: boolean;
  shopId?: string;
}

export interface StartTrialResponse {
  success: boolean;
  message: string;
  alreadyActive?: boolean;
  shopId: string;
  status: string;
  isTrailStared: boolean;
  isTrailCompleted: boolean;
  trailStartDate?: string | null;
  trailEndDate?: string | null;
  trialDays?: number;
  trialSecondsRemaining?: number;
  tokenExpiresInSeconds?: number;
  token: string | null;
  trialExpired?: boolean;
  sessionEnded?: boolean;
}

export interface SkipTrialRequest {
  shopId?: string;
}

export interface SkipTrialResponse {
  success: boolean;
  message: string;
  shopId: string;
  status: string;
  isTrailStared: boolean;
  isTrailCompleted: boolean;
  isOneTimePaymentGenerated?: boolean;
  trailStartDate?: string | null;
  trailEndDate?: string | null;
  trialExpired: boolean;
  sessionEnded: boolean;
  upFrontPayment?: PaymentRecord | null;
}
