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
  },
});

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
