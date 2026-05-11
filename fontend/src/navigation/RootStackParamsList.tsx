import type { Category } from '../type/category';
import type { InventoryProductFormParams } from '../type/inventory';

export type RootStackParamList = {
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
  ManageAccount: undefined;
  EditUser: { userId: string };
  ThemePreference: undefined;
};
