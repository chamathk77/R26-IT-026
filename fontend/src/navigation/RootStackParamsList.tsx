import type { Category } from '../type/category';
import type { InventoryProductFormParams } from '../type/inventory';
import type {
  OnboardingOwnerData,
  OnboardingUserConfig,
  ShopFeaturesState,
} from '../type/onboarding';
import type { PaymentRecord } from '../type/payment';

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
  PosMain: undefined;
  ManageCatogory: undefined;
  ManageInventory: undefined;
  ManageEmployees: undefined;
  AddEmployee: { salePersonId?: string } | undefined;
  AddProduct: undefined;
  EditProduct: InventoryProductFormParams;
  CreateCatogory: { category?: Category; categoryId?: string };
  CostModuleHub: undefined;
  CostDashboard: undefined;
  ManageCostCategories: undefined;
  CostCategoryForm: { categoryId?: string } | undefined;
  AddCostExpense: undefined;
  CostExpenseDetail: { expenseId: string };
  CostManagementMain: undefined;
  EnterEmailScreen: undefined;
  Settings: undefined;
  ProfileDetails: undefined;
  ShopDetails: undefined;
  ManageAccount: undefined;
  ManageUserForm: { userId?: string } | undefined;
  ThemePreference: undefined;
  SubscriptionPayments: undefined;
  Analytics: undefined;
  PayNow: { payment: PaymentRecord };
  KpiDashboard: undefined;
  KpiUnassignedOrderDetail: {
    orderId: string;
  };
};
