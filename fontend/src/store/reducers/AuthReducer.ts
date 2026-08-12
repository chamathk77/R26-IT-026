import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  login_Service,
} from "../../services/AuthService";
import {
  resetForgotPassword_Service,
  sendForgotPasswordOtp_Service,
  verifyForgotPasswordOtp_Service,
} from "../../services/ForgotPasswordService";
import { devLog } from "../../utils/devLog";
import type { LoginShop, LoginUser } from "../../type/auth";

interface AuthState {
  Login: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: any;

    userData: LoginUser | null;
    shopData: LoginShop | null;
  };

  ForgotPasswordEnterEmail: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: any;

    phone: string;
    maskedPhone: string;
    otpTimerSeconds: number;
  };

  ForgotPasswordEnterPin: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: any;

    phone: string;
    maskedPhone: string;
    resetToken: string;
  };

  ForgotPasswordCreateNewPassword: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: any;
  };
}

const initialState: AuthState = {
  Login: {
    loading: false,
    error: null,
    success: false,
    data: null,
    //
    userData: null,
    shopData: null,


  },

  ForgotPasswordEnterEmail: {
    loading: false,
    error: null,
    success: false,
    data: null,

    phone: "",
    maskedPhone: "",
    otpTimerSeconds: 0,
  },

  ForgotPasswordEnterPin: {
    loading: false,
    error: null,
    success: false,
    data: null,

    phone: "",
    maskedPhone: "",
    resetToken: "",
  },
  ForgotPasswordCreateNewPassword: {
    loading: false,
    error: null,
    success: false,
    data: null,
  },
};

export const AuthSlice = createSlice({
  name: "Auth",
  initialState,
  reducers: {
    setLoginSession: (
      state,
      action: PayloadAction<{ user: LoginUser; shop: LoginShop | null }>,
    ) => {
      state.Login.userData = action.payload.user;
      state.Login.shopData = action.payload.shop;
      devLog("setLoginSession saved to reducer", action.payload);
    },
    clearLoginSession: (state) => {
      state.Login.userData = null;
      state.Login.shopData = null;
      state.Login.data = null;
      state.Login.success = false;
    },
    patchLoginShopData: (state, action: PayloadAction<Partial<LoginShop>>) => {
      if (state.Login.shopData) {
        state.Login.shopData = { ...state.Login.shopData, ...action.payload };
      }
    },
    patchLoginUserData: (state, action: PayloadAction<Partial<LoginUser>>) => {
      if (state.Login.userData) {
        state.Login.userData = { ...state.Login.userData, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login_Service.pending, (state) => {
      state.Login.loading = true;
      state.Login.error = null;
      state.Login.success = false;
      state.Login.data = null;
    });
    builder.addCase(login_Service.fulfilled, (state, action) => {
      console.log("Login Fulfilled:", action.payload);
      state.Login.loading = false;
      state.Login.success = true;
      state.Login.error = null;
      state.Login.data = action.payload;
      state.Login.userData = action.payload.user;
      state.Login.shopData = action.payload.shop;

    });
    builder.addCase(login_Service.rejected, (state, action) => {
      console.log("Login Rejected:", action.error);
      state.Login.loading = false;
      state.Login.error = action.error.message || "An error occurred";
      state.Login.success = false;
      state.Login.data = null;
    });

    builder.addCase(sendForgotPasswordOtp_Service.pending, (state) => {
      state.ForgotPasswordEnterEmail.loading = true;
      state.ForgotPasswordEnterEmail.error = null;
      state.ForgotPasswordEnterEmail.success = false;
    });
    builder.addCase(sendForgotPasswordOtp_Service.fulfilled, (state, action) => {
      state.ForgotPasswordEnterEmail.loading = false;
      state.ForgotPasswordEnterEmail.success = true;
      state.ForgotPasswordEnterEmail.data = action.payload;
      state.ForgotPasswordEnterEmail.phone = action.payload.phone;
      state.ForgotPasswordEnterEmail.maskedPhone = action.payload.maskedPhone;
      state.ForgotPasswordEnterEmail.otpTimerSeconds = action.payload.otpTimerSeconds;
    });
    builder.addCase(sendForgotPasswordOtp_Service.rejected, (state, action) => {
      state.ForgotPasswordEnterEmail.loading = false;
      state.ForgotPasswordEnterEmail.error = action.error.message || "An error occurred";
      state.ForgotPasswordEnterEmail.success = false;
    });

    builder.addCase(verifyForgotPasswordOtp_Service.pending, (state) => {
      state.ForgotPasswordEnterPin.loading = true;
      state.ForgotPasswordEnterPin.error = null;
      state.ForgotPasswordEnterPin.success = false;
    });
    builder.addCase(verifyForgotPasswordOtp_Service.fulfilled, (state, action) => {
      state.ForgotPasswordEnterPin.loading = false;
      state.ForgotPasswordEnterPin.success = true;
      state.ForgotPasswordEnterPin.data = action.payload;
      state.ForgotPasswordEnterPin.phone = action.payload.phone;
      state.ForgotPasswordEnterPin.maskedPhone = action.payload.maskedPhone;
      state.ForgotPasswordEnterPin.resetToken = action.payload.resetToken;
    });
    builder.addCase(verifyForgotPasswordOtp_Service.rejected, (state, action) => {
      state.ForgotPasswordEnterPin.loading = false;
      state.ForgotPasswordEnterPin.error = action.error.message || "An error occurred";
      state.ForgotPasswordEnterPin.success = false;
    });

    builder.addCase(resetForgotPassword_Service.pending, (state) => {
      state.ForgotPasswordCreateNewPassword.loading = true;
      state.ForgotPasswordCreateNewPassword.error = null;
      state.ForgotPasswordCreateNewPassword.success = false;
    });
    builder.addCase(resetForgotPassword_Service.fulfilled, (state, action) => {
      state.ForgotPasswordCreateNewPassword.loading = false;
      state.ForgotPasswordCreateNewPassword.success = true;
      state.ForgotPasswordCreateNewPassword.data = action.payload;
    });
    builder.addCase(resetForgotPassword_Service.rejected, (state, action) => {
      state.ForgotPasswordCreateNewPassword.loading = false;
      state.ForgotPasswordCreateNewPassword.error = action.error.message || "An error occurred";
      state.ForgotPasswordCreateNewPassword.success = false;
    });
  
  },
});

export const {
  setLoginSession,
  clearLoginSession,
  patchLoginShopData,
  patchLoginUserData,
} = AuthSlice.actions;

export default AuthSlice.reducer;
