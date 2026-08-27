// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/loginScreens/onboarding/screens/OnboardingScreen';
import OnboardOwnerScreen from '../screens/loginScreens/onboarding/screens/OnboardOwnerScreen';
import SelectFeaturesScreen from '../screens/loginScreens/onboarding/screens/SelectFeaturesScreen';
import SelectSubscriptionScreen from '../screens/loginScreens/selectSubscription/SelectSubscriptionScreen';
import ChangeSubscriptionPlanScreen from '../screens/loginScreens/changeSubscription/ChangeSubscriptionPlanScreen';
import CreatePasswordScreen from '../screens/loginScreens/onboarding/screens/CreatePasswordScreen';
import OtpValidationScreen from '../screens/loginScreens/onboarding/screens/OtpValidationScreen';
import LoginScreen from '../screens/loginScreens/LoginScreen';
import TrialDetailScreen from '../screens/loginScreens/trial/TrialDetailScreen';
import PayUpfrontScreen from '../screens/loginScreens/payment/upFrontPayment/PayUpfrontScreen';
import PayUpfrontBankTransferScreen from '../screens/loginScreens/payment/upFrontPayment/PayUpfrontBankTransferScreen';
import PayInitialSubscriptionScreen from '../screens/loginScreens/payment/initialSubscriptionPayment/PayInitialSubscriptionScreen';
import PayInitialSubscriptionBankTransferScreen from '../screens/loginScreens/payment/initialSubscriptionPayment/PayInitialSubscriptionBankTransferScreen';
import PendingPaymentsScreen from '../screens/loginScreens/payment/pendingPayment/PendingPaymentsScreen';
import SignUpScreen from '../screens/loginScreens/SignUpScreen';
import ForgotPasswordEnterMobileScreen from '../screens/loginScreens/forgotPassword/ForgotPasswordEnterMobileScreen';
import ForgotPasswordOtpScreen from '../screens/loginScreens/forgotPassword/ForgotPasswordOtpScreen';
import ForgotPasswordNewPasswordScreen from '../screens/loginScreens/forgotPassword/ForgotPasswordNewPasswordScreen';
import MainBottomTabNavigator from './MainBottomTabNavigator';

import CostDashboardScreen from '../screens/cost/dashboard/CostDashboardScreen';
import ManageCostCategoriesScreen from '../screens/cost/dashboard/tabs/dashboard/categories/ManageCostCategoriesScreen';
import CostCategoryFormScreen from '../screens/cost/dashboard/tabs/dashboard/categories/CostCategoryFormScreen';
import AddCostExpenseScreen from '../screens/cost/dashboard/tabs/dashboard/addExpenses/AddCostExpenseScreen';
import CostExpenseDetailScreen from '../screens/cost/dashboard/tabs/history/expenseDetail/CostExpenseDetailScreen';

import ManageTablesScreen from '../screens/settings/tables/ManageTablesScreen';
import TableFormScreen from '../screens/settings/tables/TableFormScreen';
import SettingsScreen from '../screens/settings/hub/SettingsScreen';
import ProfileDetailsScreen from '../screens/settings/account/profileDetails/ProfileDetailsScreen';
import ShopDetailsScreen from '../screens/settings/account/shopDetails/ShopDetailsScreen';
import ManageAccountScreen from '../screens/settings/paymentAndFeature/manageAccounts/ManageAccountScreen';
import ManageFeaturesScreen from '../screens/settings/paymentAndFeature/manageFeatures/ManageFeaturesScreen';
import ManageGeneralFeaturesScreen from '../screens/settings/paymentAndFeature/manageFeatures/manageGeneralFeatures/ManageGeneralFeaturesScreen';
import ManageSmsFeatureScreen from '../screens/settings/paymentAndFeature/manageFeatures/smsFeature/ManageSmsFeatureScreen';
import ManageAddUsersScreen from '../screens/settings/paymentAndFeature/manageFeatures/manageUsersFeature/ManageAddUsersScreen';
import ManageUserFormScreen from '../screens/settings/paymentAndFeature/manageAccounts/manageUserForm/ManageUserFormScreen';
import ThemePreferenceScreen from '../screens/settings/preferences/theme/ThemePreferenceScreen';
import UserBehaviorScreen from '../screens/settings/userBehavior/UserBehaviorScreen';
import ProductDemandScreen from '../screens/settings/productDemand/ProductDemandScreen';
import RecommendationsScreen from '../screens/settings/recommendations/RecommendationsScreen';
import PrinterConnectionScreen from '../screens/settings/paymentAndFeature/receiptPrinter/PrinterConnectionScreen';
import SubscriptionPaymentsScreen from '../screens/settings/paymentAndFeature/payment/SubscriptionPaymentsScreen';
import ChangeSubscriptionScreen from '../screens/settings/paymentAndFeature/changeSubscription/ChangeSubscriptionScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import PayNowScreen from '../screens/settings/paymentAndFeature/payment/PayNowScreen';
import KpiScreen from '../screens/kpi/KpiScreen';
import UnassignedOrderDetailScreen from '../screens/kpi/unassignedOrder/UnassignedOrderDetailScreen';
import ManageCatogoryScreen from '../screens/pos/ManageCatogory/ManageCatogoryScreen';
import CreateCatogoryScreen from '../screens/pos/ManageCatogory/CreateCatogoryScreen';
import ManageInventoryScreen from '../screens/pos/ManageInventory/ManageInventoryScreen';
import ManualOrdersScreen from '../screens/pos/manualOrders/ManualOrdersScreen';
import BranchOrderQrScreen from '../screens/pos/manualOrders/BranchOrderQrScreen';
import { AddProductScreen, EditProductScreen } from '../screens/pos/ManageInventory/ProductFormScreen';
import ManageEmployeesScreen from '../screens/pos/ManageEmployes/ManageEmployeesScreen';
import AddEmployeeScreen from '../screens/pos/ManageEmployes/AddEmployeeScreen';
import QuotationsListScreen from '../screens/quotations/QuotationsListScreen';
import QuotationFormScreen from '../screens/quotations/QuotationFormScreen';
import QuotationDetailScreen from '../screens/quotations/QuotationDetailScreen';
import { RootStackParamList } from './RootStackParamsList';



const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const initialRoute: keyof RootStackParamList = 'OnboardingScreen';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="RootStack" initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="OnboardOwnerScreen" component={OnboardOwnerScreen} />
        <Stack.Screen name="SelectFeaturesScreen" component={SelectFeaturesScreen} />
        <Stack.Screen name="SelectSubscriptionScreen" component={SelectSubscriptionScreen} />
        <Stack.Screen
          name="ChangeSubscriptionPlanScreen"
          component={ChangeSubscriptionPlanScreen}
        />
        <Stack.Screen name="CreatePasswordScreen" component={CreatePasswordScreen} />
        <Stack.Screen name="OtpValidationScreen" component={OtpValidationScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="PayUpfrontScreen" component={PayUpfrontScreen} />
        <Stack.Screen
          name="PayUpfrontBankTransferScreen"
          component={PayUpfrontBankTransferScreen}
        />
        <Stack.Screen
          name="PayInitialSubscriptionScreen"
          component={PayInitialSubscriptionScreen}
        />
        <Stack.Screen
          name="PayInitialSubscriptionBankTransferScreen"
          component={PayInitialSubscriptionBankTransferScreen}
        />
        <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
        <Stack.Screen name="TrialDetailScreen" component={TrialDetailScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen
          name="ForgotPasswordEnterMobileScreen"
          component={ForgotPasswordEnterMobileScreen}
        />
        <Stack.Screen name="ForgotPasswordOtpScreen" component={ForgotPasswordOtpScreen} />
        <Stack.Screen
          name="ForgotPasswordNewPasswordScreen"
          component={ForgotPasswordNewPasswordScreen}
        />
        <Stack.Screen name="PosMain" component={MainBottomTabNavigator} />
        <Stack.Screen name="ManageCatogory" component={ManageCatogoryScreen} />
        <Stack.Screen name="ManageInventory" component={ManageInventoryScreen} />
        <Stack.Screen name="ManualOrders" component={ManualOrdersScreen} />
        <Stack.Screen name="BranchOrderQr" component={BranchOrderQrScreen} />
        <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} />
        <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        <Stack.Screen name="EditProduct" component={EditProductScreen} />
        <Stack.Screen name="CreateCatogory" component={CreateCatogoryScreen} />
        <Stack.Screen name="CostDashboard" component={CostDashboardScreen} />
        <Stack.Screen name="ManageCostCategories" component={ManageCostCategoriesScreen} />
        <Stack.Screen name="CostCategoryForm" component={CostCategoryFormScreen} />
        <Stack.Screen name="AddCostExpense" component={AddCostExpenseScreen} />
        <Stack.Screen name="CostExpenseDetail" component={CostExpenseDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ManageTables" component={ManageTablesScreen} />
        <Stack.Screen name="TableForm" component={TableFormScreen} />
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
        <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
        <Stack.Screen name="ManageAccount" component={ManageAccountScreen} />
        <Stack.Screen name="ManageFeatures" component={ManageFeaturesScreen} />
        <Stack.Screen name="ManageGeneralFeatures" component={ManageGeneralFeaturesScreen} />
        <Stack.Screen name="ManageSmsFeature" component={ManageSmsFeatureScreen} />
        <Stack.Screen name="ManageAddUsers" component={ManageAddUsersScreen} />
        <Stack.Screen name="ManageUserForm" component={ManageUserFormScreen} />
        <Stack.Screen name="ThemePreference" component={ThemePreferenceScreen} />
        <Stack.Screen name="UserBehavior" component={UserBehaviorScreen} />
        <Stack.Screen name="ProductDemand" component={ProductDemandScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
        <Stack.Screen name="PrinterConnection" component={PrinterConnectionScreen} />
        <Stack.Screen name="ChangeSubscription" component={ChangeSubscriptionScreen} />
        <Stack.Screen name="SubscriptionPayments" component={SubscriptionPaymentsScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="PayNow" component={PayNowScreen} />
        <Stack.Screen name="KpiDashboard" component={KpiScreen} />
        <Stack.Screen name="KpiUnassignedOrderDetail" component={UnassignedOrderDetailScreen} />
        <Stack.Screen name="QuotationsList" component={QuotationsListScreen} />
        <Stack.Screen name="QuotationForm" component={QuotationFormScreen} />
        <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
