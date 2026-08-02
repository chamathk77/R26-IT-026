import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
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
import { sendForgotPasswordOtp_Service } from '../../../services/ForgotPasswordService';
import { getApiErrorMessage, parseApiError } from '../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordEnterMobileScreen'>;

const MOBILE_DIGIT_LENGTH = 10;
const LOCAL_MOBILE_PATTERN = /^0\d{9}$/;

function toLocalMobileNumber(text: string): string {
  let digits = text.replace(/\D/g, '');
  if (digits.length > 0 && digits[0] !== '0') {
    digits = `0${digits}`;
  }
  return digits.slice(0, MOBILE_DIGIT_LENGTH);
}

function isValidLocalMobileNumber(value: string): boolean {
  return LOCAL_MOBILE_PATTERN.test(value);
}

export default function ForgotPasswordEnterMobileScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const sendOtpLoading = useSelector(
    (state: RootState) => state.AuthReducer.ForgotPasswordEnterEmail.loading,
  );

  const [phone, setPhone] = useState('');
  const phoneKeyboardType = Platform.OS === 'android' ? 'numeric' : 'number-pad';

  const onSendOtp = async () => {
    if (sendOtpLoading) {
      return;
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      show_Alert('error', 'Validation', 'Please enter your mobile number.', 1, false, 'OK', () => {});
      return;
    }

    if (!isValidLocalMobileNumber(trimmedPhone)) {
      show_Alert(
        'error',
        'Validation',
        'Mobile number must be 10 digits and start with 0 (e.g. 0712345678).',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    try {
      Keyboard.dismiss();
      const response = await dispatch(
        sendForgotPasswordOtp_Service({ phone: trimmedPhone }),
      ).unwrap();

      navigation.navigate('ForgotPasswordOtpScreen', {
        phone: response.phone,
        maskedPhone: response.maskedPhone,
        otpTimerSeconds: response.otpTimerSeconds,
      });
    } catch (error: unknown) {
      console.log('error in send forgot password OTP', parseApiError(error));
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Could not send verification code. Please try again.'),
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
          title="Forgot Password"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
          <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
            Reset your password
          </Text>
          <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
            Enter the mobile number linked to your Smart Cost account. We will send a 6-digit
            verification code.
          </Text>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            MOBILE NUMBER
          </Text>
          <View style={styles.inputWrapper}>
            <PaperTextInput
              style={styles.input}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
              placeholder="e.g. 0712345678"
              placeholderTextColor="#9b9ca5"
              keyboardType={phoneKeyboardType}
              maxLength={MOBILE_DIGIT_LENGTH}
              value={phone}
              onChangeText={(text) => setPhone(toLocalMobileNumber(text))}
              cursorColor="#a16207"
              theme={paperTheme}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: paperTheme.colors.primary },
              sendOtpLoading && styles.buttonDisabled,
            ]}
            onPress={onSendOtp}
            disabled={sendOtpLoading}
            activeOpacity={0.9}
          >
            {sendOtpLoading ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: paperTheme.colors.onPrimary }]}>
                SEND OTP &gt;
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
          closeOnBackdropPress={alertConfig.closeOnBackdropPress}
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
    marginBottom: 24,
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
