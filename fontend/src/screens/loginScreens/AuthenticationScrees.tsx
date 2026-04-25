import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { OtpInput } from 'react-native-otp-entry';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, "AuthenticationScreen">;

export default function AuthenticationScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');

  const timerDuration = 360;
  const [timer, setTimer] = useState(timerDuration);
  const [forceFocus, setForceFocus] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const hiddenInputRef = useRef<TextInput>(null);
  const otpRef = useRef<any>(null);
  const scrollViewRef = useRef<any>(null);

  // Refs for timestamp-based timer
  const timerEndTime = useRef<number | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  const { paperTheme, resolvedTheme } = useTheme();


  const handlePinPress = () => {
    hiddenInputRef.current?.focus();
  };

  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };


  // Initialize timer with end timestamp
  const startTimer = (duration: number) => {
    const now = Date.now();
    timerEndTime.current = now + (duration * 1000);
    setTimer(duration);

    // Clear existing interval
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Start new interval
    timerInterval.current = setInterval(() => {
      if (timerEndTime.current) {
        const now = Date.now();
        const remainingTime = Math.max(Math.ceil((timerEndTime.current - now) / 1000), 0);
        setTimer(remainingTime);

        if (remainingTime <= 0) {
          timerEndTime.current = null;
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
        }
      }
    }, 1000);
  };

  // Initialize timer on component mount
  useEffect(() => {
    startTimer(timerDuration);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [timerDuration]);



  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: paperTheme.colors.background }]}>

        <CommonHeader
          title="Authentication"
          onPressLeftBtn={() => navigation.goBack()}
          iconColor={paperTheme.colors.secondary}
          titleColor={paperTheme.colors.secondary}
        />
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollViewContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          enableResetScrollToCoords={false}
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 50}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          innerRef={(ref: any) => {
            // Assign ref to use for scrollToFocusedInput
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            scrollViewRef.current = ref;
          }}
        >
          <View style={styles.container}>

           <View>
           
           </View>



            <View style={styles.cardWrapper}>
              <View style={[styles.card, { backgroundColor: paperTheme.colors.background }]}>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: paperTheme.colors.secondary }]}>
                    OTP Verification
                  </Text>


                  {timer <= 0 ?
                    <View style={{ height: 20 }}></View>
                    : <Text style={[styles.timer, { color: paperTheme.colors.secondary }]}>
                      {formatTime()}
                    </Text>
                  }

                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => {
                      // Focus the OTP input when the container is tapped
                      if (otpRef.current) {
                        // Add a small delay to ensure the keyboard shows up properly
                        setTimeout(() => {
                          otpRef.current?.focus();
                        }, 100);
                      } else {
                        // Fallback: force re-render to trigger autoFocus
                        setForceFocus(prev => prev + 1);
                      }
                    }}
                    style={styles.otpInputWrapper}
                  >
                    <OtpInput
                      key={forceFocus}
                      ref={otpRef}
                      numberOfDigits={6}
                      focusColor={paperTheme.colors.secondary}
                      autoFocus={true}
                      hideStick={false}
                      placeholder=""
                      blurOnFilled={true}
                      disabled={false}
                      type="numeric"
                      secureTextEntry={false}
                      focusStickBlinkingDuration={500}
                      onFocus={() => {
                        console.log("Focused");
                        setIsKeyboardVisible(true);
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 300);
                      }}
                      onBlur={() => {
                        setIsKeyboardVisible(false);
                        Keyboard.dismiss();
                      }}
                      onTextChange={(text: any) => {
                        console.log(text);
                        setOtpCode(text);
                      }}
                      onFilled={(text: any) => {
                        console.log(`OTP is ${text}`);
                        Keyboard.dismiss();
                      }}
                      textInputProps={{
                        accessibilityLabel: "One-Time Password",
                      }}
                      textProps={{
                        accessibilityRole: "text",
                        accessibilityLabel: "OTP digit",
                        allowFontScaling: false,
                      }}
                      theme={{
                        containerStyle: styles.otpContainer,
                        pinCodeContainerStyle: {
                          ...styles.otpInputBox,
                          backgroundColor: paperTheme.colors.secondary,
                          borderColor: paperTheme.colors.outline,
                        },
                        focusStickStyle: {
                          ...styles.otpFocusStick,
                          backgroundColor: paperTheme.colors.surfaceVariant,
                        },
                        pinCodeTextStyle: {
                          ...styles.otpText,
                          color: paperTheme.colors.surfaceVariant,
                        },
                        focusedPinCodeContainerStyle: {
                          ...styles.otpInputBoxFocused,
                          borderColor: paperTheme.colors.primary,
                          backgroundColor: paperTheme.colors.secondary,
                          shadowColor: paperTheme.colors.secondary,
                        },
                        filledPinCodeContainerStyle: {
                          ...styles.otpInputBoxFilled,
                          backgroundColor: paperTheme.colors.secondary,
                          borderColor: paperTheme.colors.secondary,
                        },
                      }}
                    />
                  </TouchableOpacity>

                  <View style={styles.resendContainer}>
                    <Text style={[styles.resendText, { color: paperTheme.colors.secondary }]}>
                      I didn't receive any code.
                    </Text>
                    <TouchableOpacity
                      onPress={() => { }}
                      disabled={timer > 0}
                    >
                      <Text style={[
                        styles.resendButton,
                        { color: "#FADB00" },
                        (timer > 0) ? styles.resendDisabled : {}
                      ]}>
                        {'RESEND'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* <TouchableOpacity style={styles.verifyButton}>
                    <Text style={styles.verifyButtonText}>VERIFY</Text>
                  </TouchableOpacity> */}
                </View>
              </View>
            </View>

            <TouchableOpacity style={[styles.verifyButton, { backgroundColor: paperTheme.colors.primary,borderRadius: 15 }]}>
              <Text style={[styles.verifyButtonText, { color: paperTheme.colors.onPrimary, fontSize: 14 }]}>VERIFY &gt;</Text>
            </TouchableOpacity>

          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f1f7',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,

  },
  scrollViewContent: {
    flexGrow: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    fontSize: 16,
  },
  brandText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
    color: '#6b5f38',
  },
  profileDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#131313',
    borderWidth: 2,
    borderColor: '#a9a9a9',
  },
  sectionLabel: {
    marginTop: 16,
    fontFamily: fonts.PoppinsSemiBold,
    letterSpacing: 2,
    fontSize: 12,
    color: '#706b58',
  },
  identityText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    color: '#17161f',
    lineHeight: 56,
    marginTop: 6,
  },
  verificationText: {
    fontFamily: fonts.PoppinsBold,
    fontStyle: 'italic',
    fontSize: 54,
    color: '#d0a106',
    lineHeight: 56,
  },
  description: {
    marginTop: 8,
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    lineHeight: 31,
    color: '#3f3f46',
  },
  securityCard: {
    marginTop: 12,
    backgroundColor: '#eceaf2',
    borderRadius: 4,
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#9c7a00',
  },
  securityIcon: {
    fontSize: 17,
  },
  securityText: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    lineHeight: 23,
    color: '#3f3f46',
  },
  pinCard: {
    backgroundColor: '#f6f5f9',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#ebeaf0',
    marginTop: 10,
  },
  pinLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    letterSpacing: 2,
    fontSize: 12,
    color: '#53535b',
    marginBottom: 12,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  pinBox: {
    width: 44,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#e7e6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinChar: {
    fontSize: 24,
    color: '#4b5563',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  verifyButton: {
    height: 54,
    borderRadius: 4,
    backgroundColor: '#c79a00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 56,
     marginHorizontal: 24,
  },
  verifyButtonText: {
    fontFamily: fonts.PoppinsBold,
    color: '#ffffff',
    fontSize: 20,
    letterSpacing: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    letterSpacing: 1.4,
    color: '#44403c',
  },
  quote: {
    textAlign: 'center',
    fontFamily: fonts.InterRegular,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 20,
    color: '#71717a',
  },
  bottomNav: {
    height: 68,
    borderTopWidth: 1,
    borderTopColor: '#dfdee6',
    backgroundColor: '#f3f2f8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: -20,
    paddingHorizontal: 12,
  },
  navItem: {
    width: 88,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  navItemActive: {
    backgroundColor: '#d1a402',
  },
  navIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  navText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#3f3f46',
  },
  navTextActive: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#111827',
  },

  // OTP Input Styles
  otpInputWrapper: {
    width: '100%',
    marginVertical: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpContainer: {
    width: '100%',
    height: 60,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 30,
  },
  otpInputBox: {
    width: 48,
    // height: 52,
    borderWidth: 1,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: fonts.InterRegular,
    shadowColor: '#252525',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  otpFocusStick: {
    width: 2,
    height: 20,
  },
  otpText: {
    fontSize: 20,
    fontFamily: fonts.InterBold,
    textAlign: 'center',
    lineHeight: 52,
  },
  otpInputBoxFocused: {
    borderWidth: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  otpInputBoxFilled: {
    borderWidth: 2,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },
  resendText: {
    fontSize: 14,
    fontFamily: fonts.PoppinsRegular,
  },
  resendButton: {
    fontSize: 14,
    fontFamily: fonts.PoppinsRegular,
    fontWeight: '700',
    marginLeft: 5,
  },
  resendDisabled: {
    opacity: 0.5,
  },
  cardWrapper: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 40, // Increased to accommodate overlap
    paddingBottom: 40,
    minHeight: '50%', // Ensures minimum height for bottom sheet feel
    justifyContent: 'flex-start',
    zIndex: 2, // Higher z-index to appear above illustration
  },
  cardContent: {
    paddingBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: fonts.InterBold,
  },
  phoneNumber: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    fontFamily: fonts.PoppinsRegular,
  },
  timer: {
    fontSize: 20,
    textAlign: "center",
    marginVertical: 8,
    fontFamily: fonts.InterRegular,
  },
});
