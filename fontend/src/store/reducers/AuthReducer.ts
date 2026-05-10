import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  login_Service,
} from "../../services/AuthService";
import { devLog } from "../../utils/devLog";

interface AuthState {
  Login: {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: any;

    userData: any;

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
    setUserData: (state, action: PayloadAction<any>) => {
      state.Login.userData = action.payload;
      devLog("setUserData saved to reducer ", action.payload);
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
  setUserData,
} = AuthSlice.actions;

export default AuthSlice.reducer;
