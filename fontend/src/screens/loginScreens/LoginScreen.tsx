import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput as PaperTextInput } from "react-native-paper";
import LottieView from "lottie-react-native";
import { fonts } from "../../constants/fonts";
import { useTheme } from "../../context/ThemeContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/RootStackParamsList";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { login_Service } from "../../services/AuthService";
import { startTrial_Service, skipTrial_Service } from "../../services/TrialService";
import { reverseSubscriptionSelection_Service } from "../../services/PaymentService";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState, store } from "../../store/store";
import { devLog } from "../../utils/devLog";
import { clearSavedToken, saveToken } from "../../utils/secureStorage";
import {
  clearLoginSession,
  patchLoginShopData,
  setLoginSession,
} from "../../store/reducers/AuthReducer";
import { clearInitialSubscriptionPayment } from "../../store/reducers/PaymentReducer";
import { useCommonAlert } from "../../hooks/useCommonAlert";
import { getApiErrorMessage, parseApiError } from "../../utils/apiErrorAlert";
import CommonAlert from "../../components/CommonAlert/CommonAlert";
import CommonHeader from "../../components/CommonHeader/CommonHeader";

const MOBILE_DIGIT_LENGTH = 10;
const LOCAL_MOBILE_PATTERN = /^0\d{9}$/;
const ONBOARDING_INCOMPLETE_CODE = "ONBOARDING_INCOMPLETE";

function toLocalMobileNumber(text: string): string {
  let digits = text.replace(/\D/g, "");
  if (digits.length > 0 && digits[0] !== "0") {
    digits = `0${digits}`;
  }
  return digits.slice(0, MOBILE_DIGIT_LENGTH);
}

function isValidLocalMobileNumber(value: string): boolean {
  return LOCAL_MOBILE_PATTERN.test(value);
}

function formatTrialEndDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return "—";
  }
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(isoDate);
  }
  return parsed.toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type Props = NativeStackScreenProps<RootStackParamList, "LoginScreen">;

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("0760352847");
  const [password, setPassword] = useState("111111");
  const [showPassword, setShowPassword] = useState(false);
  const { paperTheme, resolvedTheme } = useTheme();
  const scrollRef = useRef<any>(null);
  const phoneInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const loginLoading = useSelector(
    (state: RootState) => state.AuthReducer.Login.loading,
  );
  const userData = useSelector(
    (state: RootState) => state.AuthReducer.Login.userData,
  );
  const shopData = useSelector(
    (state: RootState) => state.AuthReducer.Login.shopData,
  );
  const trialLoading = useSelector(
    (state: RootState) => state.TrialReducer.startTrial.loading,
  );
  const skipTrialLoading = useSelector(
    (state: RootState) => state.TrialReducer.skipTrial.loading,
  );

  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const phoneKeyboardType =
    Platform.OS === "android" ? "numeric" : "number-pad";

  const goToOnboarding = useCallback(() => {
    navigation.navigate("OnboardingScreen");
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const onHardwareBack = () => {
        goToOnboarding();
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBack,
      );
      return () => sub.remove();
    }, [goToOnboarding]),
  );

  useFocusEffect(
    useCallback(() => {
      devLog("shopData", shopData);
      devLog("userData", userData);
    }, [shopData, userData]),
  );

  useFocusEffect(
    useCallback(() => {
      devLog("trialLoading", trialLoading);
    }, [trialLoading]),
  );

  useFocusEffect(
    useCallback(() => {
      devLog("loginLoading", loginLoading);
    }, [loginLoading]),
  );

  const StartTrial = useCallback(
    async (shopIdOverride?: string) => {
      const { userData: currentUser, shopData: currentShop } =
        store.getState().AuthReducer.Login;
      const shopId =
        shopIdOverride ?? currentShop?.shopId ?? currentUser?.shopId;

      if (!shopId) {
        devLog("shopId not found", { currentShop, currentUser });
        show_Alert(
          "error",
          "Error",
          "Shop not found. Please log in again.",
          1,
          false,
          "OK",
          () => { },
        );
        return;
      }

      if (trialLoading) {
        devLog("trialLoading", trialLoading);
        return;
      }

      try {
        const response = await dispatch(
          startTrial_Service({ startTrial: true, shopId: String(shopId) }),
        ).unwrap();
        devLog("Start Trial response:", response);

        if (response.token) {
          await clearSavedToken();
          await saveToken(response.token);
        }

        dispatch(
          setLoginSession({
            user: currentUser
              ? { ...currentUser, isFirsttimeLogin: false }
              : currentUser,
            shop: currentShop
              ? {
                ...currentShop,
                shopId: response.shopId,
                status: response.status,
                isTrailStared: response.isTrailStared,
                isTrailCompleted: response.isTrailCompleted,
                trailStartDate:
                  response.trailStartDate ?? currentShop.trailStartDate,
                trailEndDate:
                  response.trailEndDate ?? currentShop.trailEndDate,
              }
              : currentShop,
          }),
        );

        const goToModuleHub = () => {
          navigation.reset({ index: 0, routes: [{ name: "PosMain" }] });
        };
        const trialEndText = formatTrialEndDate(response.trailEndDate);

        setTimeout(() => {
          if (response.alreadyActive) {
            show_Alert(
              "success",
              "Trial active",
              `Your trial is already active. Trial ends on ${trialEndText}.`,
              1,
              false,
              "Continue",
              goToModuleHub,
            );
          } else {
            show_Alert(
              "success",
              "Trial started",
              `Your 14-day trial has started. Trial ends on ${trialEndText}.`,
              1,
              false,
              "Continue",
              goToModuleHub,
            );
          }
        }, 150);
      } catch (error: unknown) {
        const parsed = parseApiError(error);
        console.log("error in Start Trial", parsed);

        setTimeout(() => {
          show_Alert(
            "error",
            "Trial failed",
            getApiErrorMessage(error, "Could not start trial. Please try again."),
            1,
            false,
            "OK",
            async () => {
              await clearSavedToken();
              dispatch(clearLoginSession());
            },
          );
        }, 150);
      }
    },
    [dispatch, navigation, show_Alert, trialLoading],
  );

  const SkipTrial = useCallback(
    async (shopId: string) => {
      if (skipTrialLoading) {
        return;
      }

      try {
        const response = await dispatch(
          skipTrial_Service({ shopId: String(shopId) }),
        ).unwrap();
        devLog("Skip Trial response:", response);

        await clearSavedToken();
        dispatch(clearLoginSession());

        setTimeout(() => {
          show_Alert(
            "success",
            "Trial skipped",
            response.message ||
              "Your trial has been skipped successfully. Please log in again to pay your upfront fee and activate your account.",
            1,
            false,
            "Log in again",
            () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "LoginScreen" }],
              });
            },
          );
        }, 150);
      } catch (error: unknown) {
        const parsed = parseApiError(error);
        console.log("error in Skip Trial", parsed);

        setTimeout(() => {
          show_Alert(
            "error",
            "Could not skip trial",
            getApiErrorMessage(error, "Could not skip trial. Please try again."),
            1,
            false,
            "OK",
            () => {},
          );
        }, 150);
      }
    },
    [dispatch, navigation, show_Alert, skipTrialLoading],
  );

  const onLogin = async () => {
    if (loginLoading) {
      return;
    }

    if (!phone.trim() || !password.trim()) {
      show_Alert(
        "error",
        "Validation",
        "Please enter your mobile number and password.",
        1,
        false,
        "OK",
        () => { },
      );
      return;
    }

    if (!isValidLocalMobileNumber(phone.trim())) {
      show_Alert(
        "error",
        "Validation",
        "Mobile number must be 10 digits and start with 0 (e.g. 0712345678).",
        1,
        false,
        "OK",
        () => { },
      );
      return;
    }

    try {
      Keyboard.dismiss();
      const response = await dispatch(
        login_Service({ phone: phone.trim(), password }),
      ).unwrap();

      devLog("Login response: login screen", JSON.stringify(response));

      if (response.success) {
        await saveToken(response.token);
        dispatch(
          setLoginSession({
            user: response.user,
            shop: response.shop ?? null,
          }),
        );

        if (response.shop?.status === "disabled") {
          devLog("response.shop.onboardStep", response.shop.onboardStep);

          if (
            response.shop.onboardStep === "completed" &&
            response.shop.isTrailStared === false
          ) {
            const pendingShopId =
              response.shop.shopId ?? response.user?.shopId ?? "";

            show_Alert(
              "pending",
              "Account pending",
              "Your account is still pending. Do you want to activate your account or start the trial version?",
              2,
              false,
              "Trial",
              () => {
                navigation.navigate("TrialDetailScreen", {
                  shopId: pendingShopId,
                });
              },
              "Activate",
              () => {
                setTimeout(() => {
                  show_Alert(
                    "pending",
                    "Skip trial?",
                    "Are you sure you want to skip the free trial? You will need to complete your one-time upfront payment to activate your account and continue using Smart Cost.",
                    2,
                    false,
                    "Skip trial",
                    () => {
                      void SkipTrial(pendingShopId);
                    },
                    "Cancel",
                    () => {},
                  );
                }, 350);
              },
            );
            return;
          }
        }

        if (response.shop?.isTrailStared === true && response.shop.status === "trial") {
          void StartTrial(response.shop?.shopId);

        }

        if (response.shop.status === "trialExpired") {
          navigation.reset({
            index: 0,
            routes: [{ name: "PayUpfrontScreen" }],
          });
          return;
        }

        if (response.shop?.status === "initialPaymentApproved") {
          navigation.navigate("SelectSubscriptionScreen", {
            shopId: response.shop.shopId ?? response.user?.shopId ?? "",
          });
          return;
        }

        if (response.shop?.status === "subscriptionPaymentPending") {
          const pendingShopId =
            response.shop.shopId ?? response.user?.shopId ?? "";

          try {
            const reverseResponse = await dispatch(
              reverseSubscriptionSelection_Service(),
            ).unwrap();

            dispatch(
              patchLoginShopData({
                status: reverseResponse.shop.status ?? "initialPaymentApproved",
                subscriptionType: reverseResponse.shop.subscriptionType ?? null,
              }),
            );
            dispatch(clearInitialSubscriptionPayment());

            navigation.navigate("SelectSubscriptionScreen", {
              shopId: reverseResponse.shopId || pendingShopId,
            });
          } catch (reverseError: unknown) {
            const parsed = parseApiError(reverseError);
            console.log("error reversing subscription selection on login", parsed);

            show_Alert(
              "error",
              "Could not reset subscription",
              getApiErrorMessage(
                reverseError,
                "Could not reset your subscription selection. Please try again.",
              ),
              1,
              false,
              "OK",
              () => {},
            );
          }
          return;
        }

        if (response.shop?.status === "active") {
          navigation.reset({ index: 0, routes: [{ name: "PosMain" }] });
        }
        
        if (response.shop?.status === "paymentPending") {
          show_Alert(
            "pending",
            "Payment Pending",
            "Your payment is pending. Please complete your payment to continue.",
            1,
            false,
            "Pay Now",
            () => {
              console.log("Pay Now pressed");
            },
            "Cancel",
            () => {
              console.log("Cancel pressed");
            },
          );
        }
      }
    } catch (error: unknown) {
      const parsed = parseApiError(error);
      console.log("error in onLogin", parsed);
      devLog("Login error:", parsed);

      if (parsed.code === ONBOARDING_INCOMPLETE_CODE) {
        show_Alert(
          "pending",
          "Complete onboarding",
          "Your shop onboarding is not complete. Please continue setup to access your account.",
          1,
          false,
          "Continue",
          () => {
            navigation.navigate("OnboardingScreen");
          },
        );
        return;
      }

      show_Alert(
        "error",
        "Error",
        getApiErrorMessage(error, "Login failed"),
        1,
        false,
        "OK",
        () => { },
      );
    }
  };

  

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={paperTheme.colors.background}
        translucent={false}
      />
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: paperTheme.colors.background },
        ]}
      >
        <CommonHeader
          title="Sign in"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={goToOnboarding}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollViewContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            enableResetScrollToCoords={false}
            extraScrollHeight={Platform.OS === "ios" ? 30 : 60}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            resetScrollToCoords={{ x: 0, y: 0 }}
            innerRef={(ref: any) => {
              // Assign ref to use for scrollToFocusedInput
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              scrollRef.current = ref;
            }}
          >
            <View style={styles.lottieWrapper}>
              <LottieView
                source={require("../../../assets/Lottie/management.json")}
                autoPlay
                loop
                style={styles.lottie}
              />
            </View>
            <View
              style={[
                styles.container,
                { backgroundColor: paperTheme.colors.background },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.heading,
                    { color: paperTheme.colors.onSurface },
                  ]}
                >
                  Sign In
                </Text>
                <Text
                  style={[
                    styles.subheading,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  Sign in with your owner mobile number and password.
                </Text>

                <Text
                  style={[
                    styles.label,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  MOBILE NUMBER
                </Text>
                <View style={styles.inputWrapper}>
                  <PaperTextInput
                    ref={phoneInputRef}
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

                <View style={styles.passwordRow}>
                  <Text
                    style={[
                      styles.label,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    PASSWORD
                  </Text>
                </View>

                <View style={[styles.inputWrapper]}>
                  <PaperTextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={styles.inputContent}
                    // left={<PaperTextInput.Icon icon="lock-outline" />}
                    right={
                      <PaperTextInput.Icon
                        icon={showPassword ? "eye-off-outline" : "eye-outline"}
                        onPress={() => setShowPassword((prev) => !prev)}
                      />
                    }
                    placeholder="••••••••••••"
                    placeholderTextColor="#9b9ca5"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    cursorColor="#a16207"
                    theme={paperTheme}
                  />
                </View>

                <TouchableOpacity
                  style={styles.forgotPasswordContainer}
                  onPress={() => navigation.navigate("EnterEmailScreen")}
                >
                  <Text
                    style={[
                      styles.forgotPassword,
                      {
                        color: paperTheme.colors.onSurfaceVariant,
                        borderBottomWidth: 0.3,
                        borderBottomColor: paperTheme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Forgot Password ?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: paperTheme.colors.primary,
                      borderRadius: 15,
                    },
                    loginLoading && styles.buttonDisabled,
                  ]}
                  onPress={onLogin}
                  disabled={loginLoading}
                  activeOpacity={0.9}
                >
                  {loginLoading ? (
                    <ActivityIndicator color={paperTheme.colors.onPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        { color: paperTheme.colors.onPrimary, fontSize: 14 },
                      ]}
                    >
                      SIGN IN &gt;
                    </Text>
                  )}
                </TouchableOpacity>



                {/* <TouchableOpacity onPress={onSignUp}>
                <Text style={[styles.registerText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  New staff ? <Text style={styles.registerLink}>Register Account</Text>
                </Text>
              </TouchableOpacity> */}
              </View>
            </View>
          </KeyboardAwareScrollView>
        </ScrollView>

        {trialLoading && (
          <View style={styles.trialLoadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text
              style={[
                styles.trialLoadingText,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              Starting trial...
            </Text>
          </View>
        )}

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
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eeedf5",
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 26,
  },
  lottieWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: "100%",
    height: 250,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    color: "#171717",
    marginBottom: 8,
  },
  subheading: {
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    color: "#52525b",
    marginBottom: 30,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: "#52525b",
    letterSpacing: 2.1,
    marginBottom: 8,
  },
  inputWrapper: {
    height: 66,
    backgroundColor: "#ececf1",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  inputIcon: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    color: "#57534e",
    marginRight: 12,
    width: 26,
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    color: "#18181b",
    backgroundColor: "transparent",
  },
  inputContent: {
    fontFamily: fonts.InterRegular,
    fontSize: 17,
    color: "#18181b",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotPassword: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: "#a16207",
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: -12,
    marginBottom: 8,
  },
  button: {
    height: 60,
    backgroundColor: "#c48d00",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 26,
    shadowColor: "#6b4f00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 3,
  },
  buttonText: {
    fontFamily: fonts.PoppinsBold,
    color: "#ffffff",
    fontSize: 14,
    letterSpacing: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  trialLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  trialLoadingText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e4e4e7",
  },
  dividerText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    color: "#9a9aa4",
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },
  registerText: {
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    color: "#3f3f46",
    textAlign: "center",
  },
  registerLink: {
    fontFamily: fonts.InterBold,
    color: "#8a6500",
  },
  encryptionText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    color: "#9a9aa4",
    textAlign: "center",
    letterSpacing: 3,
  },
});
