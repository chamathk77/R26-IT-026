import React, { useEffect, useRef, useState } from 'react';
import {
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
import LottieView from 'lottie-react-native';
import { OtpInput } from 'react-native-otp-entry';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../constants/fonts';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './onboarding/OnboardingStepIndicator';
import { onboardingStyles as s } from './onboarding/onboardingStyles';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert/CommonAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpValidationScreen'>;

const TIMER_DURATION_SEC = 360;
const OTP_LENGTH = 6;

export default function OtpValidationScreen({ navigation, route }: Props) {
  const { mobileNumber, shopName } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const [timer, setTimer] = useState(TIMER_DURATION_SEC);
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
    startTimer(TIMER_DURATION_SEC);
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const onResend = () => {
    if (timer > 0) {
      return;
    }
    setOtpCode('');
    setForceFocus((prev) => prev + 1);
    startTimer(TIMER_DURATION_SEC);
    show_Alert(
      'success',
      'OTP Sent',
      `A new verification code has been sent to ${mobileNumber}.`,
      1,
      true,
      'OK',
      () => {},
    );
  };

  const onVerify = () => {
    if (otpCode.length !== OTP_LENGTH) {
      show_Alert(
        'error',
        'Validation',
        `Please enter the ${OTP_LENGTH}-digit verification code.`,
        1,
        true,
        'OK',
        () => {},
      );
      return;
    }

    Keyboard.dismiss();
    show_Alert(
      'success',
      'Onboarding complete',
      'Your shop has been set up successfully. Please sign in to continue.',
      1,
      true,
      'OK',
      () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        });
      },
    );
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
          <OnboardingStepIndicator currentStep={4} />
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
                  source={require('../../../assets/Lottie/Otp_Lottie.json')}
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
                  <TouchableOpacity onPress={onResend} disabled={timer > 0}>
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
                style={[styles.verifyButton, { backgroundColor: paperTheme.colors.primary }]}
                onPress={onVerify}
                activeOpacity={0.9}
              >
                <Text style={[styles.verifyButtonText, { color: paperTheme.colors.onPrimary }]}>
                  Verify & continue
                </Text>
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
});
