import { ApiClientError } from "../../config/apiConfig";
import { navigationRef } from "../navigation/RootNavigation";
import { clearLoginSession } from "../store/reducers/AuthReducer";
import { store } from "../store/store";
import type { ApiErrorResponse } from "../type/common";
import type { LoginShop } from "../type/auth";
import { clearSavedToken } from "./secureStorage";

export type ShowAlertFn = (
  type: "success" | "error" | "pending",
  title: string,
  message: string,
  buttons: 0 | 1 | 2,
  MoreDetails?: boolean,
  positiveButtonText?: string,
  onPositivePress?: () => void,
  negativeButtonText?: string,
  onNegativePress?: () => void,
  OtherDescirption?: string,
  OtherButtonPress?: () => void,
  OtherButtonText?: string,
) => void;

export interface ParsedApiError {
  status?: number;
  code?: string;
  message: string;
  sessionEnded?: boolean;
  tokenExpired?: boolean;
  tokenInvalid?: boolean;
  trialExpired?: boolean;
  shopId?: string;
  onboardStep?: string;
  shop?: LoginShop | null;
}

const SESSION_ERROR_CODES = new Set([
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "TOKEN_MISMATCH",
  "TRIAL_ENDED",
  "NO_TOKEN",
  "USER_NOT_FOUND",
]);

export function parseApiError(error: unknown): ParsedApiError {
  if (error instanceof ApiClientError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      sessionEnded: error.sessionEnded,
      tokenExpired: error.tokenExpired,
      tokenInvalid: error.tokenInvalid,
      trialExpired: error.trialExpired,
      shopId: error.shopId,
      onboardStep: error.onboardStep,
      shop: (error.shop as LoginShop | null | undefined) ?? null,
    };
  }

  if (error && typeof error === "object") {
    const payload = error as ApiErrorResponse;
    if (payload.message || payload.status || payload.code || payload.shopId || payload.onboardStep) {
      return {
        status: payload.status,
        code: payload.code,
        message: payload.message || "Something went wrong.",
        sessionEnded: payload.sessionEnded,
        tokenExpired: payload.tokenExpired,
        tokenInvalid: payload.tokenInvalid,
        trialExpired: payload.trialExpired,
        shopId: payload.shopId,
        onboardStep: payload.onboardStep,
        shop: payload.shop ?? null,
      };
    }
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong." };
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  return parseApiError(error).message || fallback;
}

export function toApiErrorResponse(error: unknown): ApiErrorResponse {
  const parsed = parseApiError(error);
  return {
    error: "API Error",
    message: parsed.message,
    status: parsed.status ?? 400,
    code: parsed.code,
    sessionEnded: parsed.sessionEnded,
    tokenExpired: parsed.tokenExpired,
    tokenInvalid: parsed.tokenInvalid,
    trialExpired: parsed.trialExpired,
    shopId: parsed.shopId,
    onboardStep: parsed.onboardStep,
    shop: parsed.shop ?? null,
    timestamp: new Date().toISOString(),
  };
}

export function isSessionRelatedError(parsed: ParsedApiError): boolean {
  if (parsed.status !== 401) {
    return false;
  }

  const code = String(parsed.code || "").trim();
  return (
    Boolean(parsed.sessionEnded) ||
    Boolean(parsed.tokenExpired) ||
    Boolean(parsed.tokenInvalid) ||
    Boolean(parsed.trialExpired) ||
    SESSION_ERROR_CODES.has(code)
  );
}

function getSessionExpiredMessage(code?: string, fallback?: string): string {
  if (fallback?.trim()) return fallback;
  switch (code) {
    case "TOKEN_EXPIRED":
      return "Token has expired. Please log in again.";
    case "TOKEN_INVALID":
      return "Session token is invalid. Please log in again.";
    case "TOKEN_MISMATCH":
      return "Session is no longer valid. Please log in again.";
    case "TRIAL_ENDED":
      return "Your trial has ended. Please log in again.";
    case "NO_TOKEN":
      return "You are not logged in. Please log in again.";
    default:
      return "Session expired. Please log in again.";
  }
}

function navigateToLogin(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name: "LoginScreen" }],
  });
}

export async function handleSessionExpiredApiError(
  error: unknown,
  show_Alert: ShowAlertFn,
): Promise<boolean> {
  const parsed = parseApiError(error);
  if (!isSessionRelatedError(parsed)) {
    return false;
  }

  show_Alert(
    "error",
    "Session expired",
    getSessionExpiredMessage(parsed.code, parsed.message),
    1,
    false,
    "Login",
    async () => {
      await clearSavedToken();
      store.dispatch(clearLoginSession());
      navigateToLogin();
    },
  );

  return true;
}
