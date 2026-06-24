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
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { OtpInput } from 'react-native-otp-entry';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { fonts } from '../../../../constants/fonts';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './OnboardingStepIndicator';
import { onboardingStyles as s } from '../styles/onboardingStyles';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import {
  sendOtpOnboarding_Service,
  verifyOtpOnboarding_Service,
} from '../../../../services/ShopOnboardingService';
import { AppDispatch, RootState } from '../../../../store/store';
import { getApiErrorMessage, parseApiError } from '../../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpValidationScreen'>;

const DEFAULT_TIMER_DURATION_SEC = 300;
const OTP_LENGTH = 6;

export default function OtpValidationScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { ownerData, otpTimerSeconds } = route.params;
  const mobileNumber = ownerData.ownerMobileNumber;
  const shopId = ownerData.shopId ?? '';
  const shopName = ownerData.shopName;
  const timerDuration = otpTimerSeconds ?? DEFAULT_TIMER_DURATION_SEC;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const verifyOtpLoading = useSelector(
    (state: RootState) => state.shopOnboarding.verifyOtp.loading,
  );
  const sendOtpLoading = useSelector(
    (state: RootState) => state.shopOnboarding.sendOtp.loading,
  );
  const isSubmitting = verifyOtpLoading;

  const [timer, setTimer] = useState(timerDuration);
  const [forceFocus, setForceFocus] = useState(0);
  const [otpCode, setOtpCode] = useState('');

  const otpRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const timerEndTime = useRef<number | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const maskedMobile =
    mobileNumber.length >= 4
      ? `${mobileNumber.slice(0, 3)}****${mobileNumber.slice(-2)}`
      : mobileNumber;

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
    if (timer > 0 || sendOtpLoading || !shopId) {
      return;
    }

    try {
      const response = await dispatch(
        sendOtpOnboarding_Service({ shopId }),
      ).unwrap();

      setOtpCode('');
      setForceFocus((prev) => prev + 1);
      startTimer(response.otpTimerSeconds ?? timerDuration);
      show_Alert(
        'success',
        'OTP Sent',
        `A new verification code has been sent to ${mobileNumber}.`,
        1,
        false,
        'OK',
        () => {},
      );
    } catch (error: unknown) {
      console.log('error in resend OTP', parseApiError(error));
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
    if (isSubmitting) {
      return;
    }

    if (!shopId) {
      show_Alert(
        'error',
        'Error',
        'Shop id is missing. Please go back and complete previous steps.',
        1,
        true,
        'OK',
        () => {},
      );
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
      await dispatch(
        verifyOtpOnboarding_Service({ shopId, otp: otpCode }),
      ).unwrap();

      navigation.navigate('CreatePasswordScreen', { ownerData });
    } catch (error: unknown) {
      console.log('error in verify OTP', parseApiError(error));
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
          title="OTP Verification"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={[s.container, styles.screenBody]}>
          <OnboardingStepIndicator currentStep={2} />
          <KeyboardAwareScrollView
            style={styles.keyboardScroll}
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
            <View style={styles.container}>
              <View style={styles.lottieContainer}>
                <LottieView
                  source={require('../../../../../assets/Lottie/Otp_Lottie.json')}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
              </View>

              <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
                <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                  OTP Verification
                </Text>
                <Text style={[styles.phoneNumber, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Enter the code sent to {maskedMobile}
                  {shopName ? ` for ${shopName}` : ''}.
                </Text>

                {timer > 0 ? (
                  <Text style={[styles.timer, { color: paperTheme.colors.primary }]}>
                    {formatTime()}
                  </Text>
                ) : (
                  <View style={styles.timerSpacer} />
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
                    I didn&apos;t receive any code.
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
                  isSubmitting && styles.verifyButtonDisabled,
                ]}
                onPress={onVerify}
                activeOpacity={0.9}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <Text style={[styles.verifyButtonText, { color: paperTheme.colors.onPrimary }]}>
                    Verify & continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
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
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  container: {
    flexGrow: 1,
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
  timerSpacer: {
    height: 20,
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
    fontSize: 15,
    letterSpacing: 0.5,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
});
