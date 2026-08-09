export interface ForgotPasswordSendOtpRequest {
  phone: string;
}

export interface ForgotPasswordSendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  maskedPhone: string;
  otpTimerSeconds: number;
}

export interface ForgotPasswordVerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface ForgotPasswordVerifyOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  maskedPhone: string;
  resetToken: string;
}

export interface ForgotPasswordResetRequest {
  phone: string;
  resetToken: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordResetResponse {
  success: boolean;
  message: string;
}
