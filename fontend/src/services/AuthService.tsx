import { createAsyncThunk } from "@reduxjs/toolkit";
import { AnyActionArg } from "react";
import { apiClient } from "../../config/apiConfig";
import { ensureInternetConnection } from "../utils/checkInternetConnection";
import { ApiErrorResponse } from "../type/common";
import {   LoginRequest, LoginResponse, SignUpRequest, SignUpResponse } from "../type/auth";

function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export const login_Service = createAsyncThunk(
  "auth/login",
  async (loginData: LoginRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<LoginResponse>(
        "/api/auth/login",
        loginData,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Login response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Login failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Login error:---", error);
      // If error already has the API format (from interceptor), re-throw as-is
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.", 
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);


export const signup_Service = createAsyncThunk(
  "auth/signup",
  async (signupData: SignUpRequest, { rejectWithValue }) => {
    try {
      await ensureInternetConnection();

      const response = await apiClient.post<SignUpResponse>(
        "/api/auth/signup",
        signupData,
      );

      if (isHttpSuccess(response.status)) {
        console.log("Signup response:", response.data);

        return response.data;
      }

      const apiError: ApiErrorResponse = {
        error: "Error",
        message: "Signup failed",
        status: response.status,
        timestamp: new Date().toISOString(),
      };
      throw apiError;
    } catch (error: any) {
      console.log("Signup error:---", error);
      // If error already has the API format (from interceptor), re-throw as-is
      if (error.error && error.message && error.status && error.timestamp) {
        throw error as ApiErrorResponse;
      }

      const networkError: ApiErrorResponse = {
        error: "Network Error",
        message:
          error.message ||
          "Network error. Please check your connection and try again.", 
        status: 0,
        timestamp: new Date().toISOString(),
      };
      throw networkError;
    }
  },
);



