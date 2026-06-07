import type { Category } from '../type/category';
import type { InventoryProductFormParams } from '../type/inventory';
import type {
  OnboardingOwnerData,
  OnboardingUserConfig,
  ShopFeaturesState,
} from '../type/onboarding';

export type RootStackParamList = {
  OnboardingScreen: undefined;
  OnboardOwnerScreen: undefined;
  SelectFeaturesScreen: {
    ownerData: OnboardingOwnerData;
  };
  CreatePasswordScreen: {
    ownerData: OnboardingOwnerData;
    features: ShopFeaturesState;
    userConfig: OnboardingUserConfig;
  };
  OtpValidationScreen: {
    mobileNumber: string;
    password: string;
    shopId: string;
    ownerName: string;
    email: string;
    shopName?: string;
    otpTimerSeconds?: number;
  };
  LoginScreen: undefined;
  SignUpScreen: undefined;
  ModuleHub: undefined;
  PosMain: undefined;
  ManageCatogory: undefined;
  ManageInventory: undefined;
  AddProduct: undefined;
  EditProduct: InventoryProductFormParams;
  CreateCatogory: { category?: Category };
  CostModuleHub: undefined;
  CostAnalysis: undefined;
  CostManagementMain: undefined;
  EnterEmailScreen: undefined;
  Settings: undefined;
  ProfileDetails: undefined;
  ShopDetails: undefined;
  ManageAccount: undefined;
  EditUser: { userId: string };
  ThemePreference: undefined;
};
