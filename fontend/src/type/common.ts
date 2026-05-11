// Common error response (matching your API format)
export interface ApiErrorResponse {
  success?: boolean;
  error?: string;           // e.g., "Validation Error"
  message?: string;         // e.g., "Mobile Number must be exactly 9 characters"
  status?: number;          // e.g., 400
  timestamp?: string;       // e.g., "2025-06-03T06:58:26.8983106+05:30"
}
