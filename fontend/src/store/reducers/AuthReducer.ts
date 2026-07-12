import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  login_Service,
} from "../../services/AuthService";
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

    email: string;
  };

  ForgotPasswordEnterPin: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: any;

    reset_token: string;
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

    email: "",
  },

  ForgotPasswordEnterPin: {
    loading: false,
    error: null,
    success: false,
    data: null,

    reset_token: "",
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

  
  },
});

export const {
  setLoginSession,
  clearLoginSession,
  patchLoginShopData,
  patchLoginUserData,
} = AuthSlice.actions;

export default AuthSlice.reducer;
