import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { OtpInput } from 'react-native-otp-entry';
import LottieView from 'lottie-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { fonts } from '../../../constants/fonts';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { AppDispatch, RootState } from '../../../store/store';
import {
  sendForgotPasswordOtp_Service,
  verifyForgotPasswordOtp_Service,
} from '../../../services/ForgotPasswordService';
import { getApiErrorMessage, parseApiError } from '../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordOtpScreen'>;

const DEFAULT_TIMER_DURATION_SEC = 300;
const OTP_LENGTH = 6;

export default function ForgotPasswordOtpScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { phone, maskedPhone, otpTimerSeconds } = route.params;
  const timerDuration = otpTimerSeconds ?? DEFAULT_TIMER_DURATION_SEC;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const verifyOtpLoading = useSelector(
    (state: RootState) => state.AuthReducer.ForgotPasswordEnterPin.loading,
  );
  const sendOtpLoading = useSelector(
    (state: RootState) => state.AuthReducer.ForgotPasswordEnterEmail.loading,
  );

  const [timer, setTimer] = useState(timerDuration);
  const [forceFocus, setForceFocus] = useState(0);
  const [otpCode, setOtpCode] = useState('');

  const otpRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const timerEndTime = useRef<number | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startTimer = (duration: number) => {
    const now = Date.now();
    timerEndTime.current = now + duration * 1000;
    setTimer(duration);

    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    timerInterval.current = setInterval(() => {
      if (timerEndTime.current) {
        const current = Date.now();
        const remaining = Math.max(Math.ceil((timerEndTime.current - current) / 1000), 0);
        setTimer(remaining);

        if (remaining <= 0) {
          timerEndTime.current = null;
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
        }
      }
    }, 1000);
  };

  useEffect(() => {
    startTimer(timerDuration);
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [timerDuration]);

  const onResend = async () => {
    if (timer > 0 || sendOtpLoading) {
      return;
    }

    try {
      const response = await dispatch(sendForgotPasswordOtp_Service({ phone })).unwrap();
      setOtpCode('');
      setForceFocus((prev) => prev + 1);
      startTimer(response.otpTimerSeconds ?? timerDuration);
      show_Alert(
        'success',
        'OTP Sent',
        `A new verification code has been sent to ${maskedPhone}.`,
        1,
        false,
        'OK',
        () => {},
      );
    } catch (error: unknown) {
      console.log('error in resend forgot password OTP', parseApiError(error));
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Failed to resend verification code.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  };

  const onVerify = async () => {
    if (verifyOtpLoading) {
      return;
    }

    if (otpCode.length !== OTP_LENGTH) {
      show_Alert(
        'error',
        'Validation',
        `Please enter the ${OTP_LENGTH}-digit verification code.`,
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
        verifyForgotPasswordOtp_Service({ phone, otp: otpCode }),
      ).unwrap();

      navigation.navigate('ForgotPasswordNewPasswordScreen', {
        phone: response.phone,
        maskedPhone: response.maskedPhone,
        resetToken: response.resetToken,
      });
    } catch (error: unknown) {
      console.log('error in verify forgot password OTP', parseApiError(error));
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Verification failed. Please try again.'),
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
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Verify OTP"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          enableAutomaticScroll
          enableResetScrollToCoords={false}
          extraScrollHeight={Platform.OS === 'ios' ? 24 : 60}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
          innerRef={(ref: ScrollView | null) => {
            scrollViewRef.current = ref;
          }}
        >
          <View style={styles.lottieContainer}>
            <LottieView
              source={require('../../../../assets/Lottie/Otp_Lottie.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>

          <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
              Enter verification code
            </Text>
            <Text style={[styles.phoneNumber, { color: paperTheme.colors.onSurfaceVariant }]}>
              Code sent to {maskedPhone}
            </Text>

            {timer > 0 ? (
              <Text style={[styles.timer, { color: paperTheme.colors.primary }]}>
                Expires in {formatTime()}
              </Text>
            ) : (
              <Text style={[styles.timerExpired, { color: paperTheme.colors.error }]}>
                Code expired
              </Text>
            )}

            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {
                setTimeout(() => {
                  otpRef.current?.focus();
                }, 100);
              }}
              style={styles.otpInputWrapper}
            >
              <OtpInput
                key={forceFocus}
                ref={otpRef}
                numberOfDigits={OTP_LENGTH}
                focusColor={paperTheme.colors.primary}
                autoFocus
                blurOnFilled
                type="numeric"
                onTextChange={setOtpCode}
                onFilled={() => Keyboard.dismiss()}
                theme={{
                  containerStyle: styles.otpContainer,
                  pinCodeContainerStyle: {
                    ...styles.otpInputBox,
                    backgroundColor: paperTheme.colors.surfaceVariant,
                    borderColor: paperTheme.colors.outline,
                  },
                  focusStickStyle: {
                    backgroundColor: paperTheme.colors.primary,
                  },
                  pinCodeTextStyle: {
                    ...styles.otpText,
                    color: paperTheme.colors.onSurface,
                  },
                  focusedPinCodeContainerStyle: {
                    borderColor: paperTheme.colors.primary,
                    backgroundColor: paperTheme.colors.primaryContainer,
                  },
                  filledPinCodeContainerStyle: {
                    borderColor: paperTheme.colors.primary,
                    backgroundColor: paperTheme.colors.surfaceVariant,
                  },
                }}
              />
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={[styles.resendText, { color: paperTheme.colors.onSurfaceVariant }]}>
                Didn&apos;t receive the code?
              </Text>
              <TouchableOpacity onPress={onResend} disabled={timer > 0 || sendOtpLoading}>
                <Text
                  style={[
                    styles.resendButton,
                    { color: paperTheme.colors.primary },
                    timer > 0 && styles.resendDisabled,
                  ]}
                >
                  RESEND
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              { backgroundColor: paperTheme.colors.primary },
              verifyOtpLoading && styles.verifyButtonDisabled,
            ]}
            onPress={onVerify}
            activeOpacity={0.9}
            disabled={verifyOtpLoading}
          >
            {verifyOtpLoading ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[styles.verifyButtonText, { color: paperTheme.colors.onPrimary }]}>
                VERIFY & CONTINUE
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingBottom: 24,
  },
  lottieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  cardTitle: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fonts.PoppinsBold,
  },
  phoneNumber: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: fonts.InterRegular,
  },
  timer: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: fonts.PoppinsSemiBold,
  },
  timerExpired: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: fonts.PoppinsMedium,
  },
  otpInputWrapper: {
    width: '100%',
    marginVertical: 12,
  },
  otpContainer: {
    width: '100%',
  },
  otpInputBox: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  otpText: {
    fontSize: 18,
    fontFamily: fonts.PoppinsSemiBold,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  resendText: {
    fontSize: 13,
    fontFamily: fonts.PoppinsRegular,
  },
  resendButton: {
    fontSize: 13,
    fontFamily: fonts.PoppinsSemiBold,
    marginLeft: 6,
  },
  resendDisabled: {
    opacity: 0.45,
  },
  verifyButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    letterSpacing: 1,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
});
