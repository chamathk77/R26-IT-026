import type { Category } from '../type/category';

export type RootStackParamList = {
  LoginScreen: undefined;
  SignUpScreen: undefined;
  ModuleHub: undefined;
  PosMain: undefined;
  ManageCatogory: undefined;
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
