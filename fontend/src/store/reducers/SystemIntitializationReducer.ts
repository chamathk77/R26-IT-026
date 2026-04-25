import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Appearance } from 'react-native';
import { ThemeMode } from '../../utils/theme';

interface SystemInitializationState {
    theme: ThemeMode;
}

const getSystemTheme = (): 'light' | 'dark' => {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
};

const initialState: SystemInitializationState = {
    theme: 'system',
};

export const SystemInitializationSlice = createSlice({
    name: 'SystemInitialization',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<ThemeMode>) => {
            state.theme = action.payload;
        },
        toggleTheme: (state) => {
            if (state.theme === 'light') {
                state.theme = 'dark';
            } else if (state.theme === 'dark') {
                state.theme = 'system';
            } else {
                state.theme = 'light';
            }
        },
        setSystemTheme: (state) => {
            state.theme = getSystemTheme();
        },
    },
});

export const { setTheme, toggleTheme, setSystemTheme } = SystemInitializationSlice.actions;

export default SystemInitializationSlice.reducer;
