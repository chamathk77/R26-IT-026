import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { fonts } from '../../../constants/fonts';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { AppDispatch, RootState } from '../../../store/store';
import { resetForgotPassword_Service } from '../../../services/ForgotPasswordService';
import { getApiErrorMessage, parseApiError } from '../../../utils/apiErrorAlert';
import { clearSavedLoginCredentials } from '../../../utils/loginCredentialStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordNewPasswordScreen'>;

export default function ForgotPasswordNewPasswordScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { phone, maskedPhone, resetToken } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const resetLoading = useSelector(
    (state: RootState) => state.AuthReducer.ForgotPasswordCreateNewPassword.loading,
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onResetPassword = async () => {
    if (resetLoading) {
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      show_Alert('error', 'Validation', 'Please fill in all fields.', 1, false, 'OK', () => {});
      return;
    }

    if (password.length < 6) {
      show_Alert(
        'error',
        'Validation',
        'Password must be at least 6 characters.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    if (password !== confirmPassword) {
      show_Alert('error', 'Validation', 'Passwords do not match.', 1, false, 'OK', () => {});
      return;
    }

    try {
      Keyboard.dismiss();
      await dispatch(
        resetForgotPassword_Service({
          phone,
          resetToken,
          password,
          confirmPassword,
        }),
      ).unwrap();

      await clearSavedLoginCredentials();

      show_Alert(
        'success',
        'Password updated',
        `Your password for ${maskedPhone} has been changed successfully. Please sign in with your new password.`,
        1,
        false,
        'Go to Sign In',
        () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }],
          });
        },
        'Cancel',
        () => {},
        undefined,
        undefined,
        undefined,
        false,
      );
    } catch (error: unknown) {
      console.log('error in reset forgot password', parseApiError(error));
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Could not update password. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="New Password"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
          <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
            Create new password
          </Text>
          <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
            Set a new password for {maskedPhone}.
          </Text>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            NEW PASSWORD
          </Text>
          <View style={styles.inputWrapper}>
            <PaperTextInput
              style={styles.input}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
              placeholder="••••••••••••"
              placeholderTextColor="#9b9ca5"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              cursorColor="#a16207"
              theme={paperTheme}
              right={
                <PaperTextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((prev) => !prev)}
                />
              }
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            CONFIRM PASSWORD
          </Text>
          <View style={styles.inputWrapper}>
            <PaperTextInput
              style={styles.input}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
              placeholder="••••••••••••"
              placeholderTextColor="#9b9ca5"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              cursorColor="#a16207"
              theme={paperTheme}
              right={
                <PaperTextInput.Icon
                  icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                />
              }
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: paperTheme.colors.primary },
              resetLoading && styles.buttonDisabled,
            ]}
            onPress={onResetPassword}
            disabled={resetLoading}
            activeOpacity={0.9}
          >
            {resetLoading ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: paperTheme.colors.onPrimary }]}>
                UPDATE PASSWORD &gt;
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {alertConfig && (
        <CommonAlert
          visible={visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          positiveButtonText={alertConfig.positiveButtonText}
          negativeButtonText={alertConfig.negativeButtonText}
          onPositivePress={alertConfig.onPositivePress}
          onNegativePress={alertConfig.onNegativePress}
          onClose={hideAlert}
          closeOnBackdropPress={alertConfig.closeOnBackdropPress ?? true}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 8,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 28,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 2.1,
    marginBottom: 8,
  },
  inputWrapper: {
    height: 66,
    backgroundColor: '#ececf1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  inputContent: {
    fontFamily: fonts.InterRegular,
    fontSize: 17,
  },
  button: {
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
