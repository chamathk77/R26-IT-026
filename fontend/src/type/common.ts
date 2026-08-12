// Common error response (matching your API format)
import type { LoginShop } from './auth';

export interface ApiErrorResponse {
  success?: boolean;
  error?: string;           // e.g., "Validation Error"
  message?: string;         // e.g., "Mobile Number must be exactly 9 characters"
  status?: number;          // e.g., 401
  code?: string;            // e.g., TOKEN_EXPIRED
  sessionEnded?: boolean;
  tokenExpired?: boolean;
  tokenInvalid?: boolean;
  trialExpired?: boolean;
  shopId?: string;
  onboardStep?: string;
  shop?: LoginShop | null;
  timestamp?: string;
}
