import type { Category } from '../type/category';
import type { InventoryProductFormParams } from '../type/inventory';
import type {
  OnboardingOwnerData,
} from '../type/onboarding';
import type { PaymentRecord } from '../type/payment';

export type RootStackParamList = {
  OnboardingScreen: undefined;
  OnboardOwnerScreen: undefined;
  SelectFeaturesScreen: {
    ownerData: OnboardingOwnerData;
  };
  SelectSubscriptionScreen: {
    ownerData: OnboardingOwnerData;
  };
  CreatePasswordScreen: {
    ownerData: OnboardingOwnerData;
  };
  OtpValidationScreen: {
    ownerData: OnboardingOwnerData;
    otpTimerSeconds?: number;
  };
  LoginScreen: undefined;
  TrialDetailScreen: {
    shopId?: string;
  };
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
  ManageFeatures: undefined;
  ManageGeneralFeatures: undefined;
  ManageAddUsers: undefined;
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
