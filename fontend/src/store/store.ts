import { configureStore } from '@reduxjs/toolkit';

import SystemInitializationReducer from '../store/reducers/SystemIntitializationReducer';
import AuthReducer from '../store/reducers/AuthReducer';
import CategoryReducer from '../store/reducers/CategoryReducer';
import ProductReducer from '../store/reducers/ProductReducer';
import CartReducer from '../store/reducers/CartReducer';
import HistoryReducer from '../store/reducers/HistoryReducer';
import ShopOnboardingReducer from '../store/reducers/ShopOnboardingReducer';
import TrialReducer from '../store/reducers/TrialReducer';
import PaymentReducer from '../store/reducers/PaymentReducer';
import SalePersonReducer from '../store/reducers/SalePersonReducer';
import ManageUsersReducer from '../store/reducers/ManageUsersReducer';
import CostCategoryReducer from '../store/reducers/CostCategoryReducer';
import CostExpenseReducer from '../store/reducers/CostExpenseReducer';
import KpiReducer from '../store/reducers/KpiReducer';

export const store = configureStore({
  reducer: {
    SystemInitializationReducer: SystemInitializationReducer,
    AuthReducer,
    CategoryReducer,
    ProductReducer,
    CartReducer,
    HistoryReducer,
    shopOnboarding: ShopOnboardingReducer,
    TrialReducer,
    PaymentReducer,
    SalePersonReducer,
    ManageUsersReducer,
    CostCategoryReducer,
    CostExpenseReducer,
    KpiReducer,
  },
});

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
