import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput as PaperTextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { fonts } from "../../constants/fonts";
import { useTheme } from "../../context/ThemeContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/RootStackParamsList";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { login_Service } from "../../services/AuthService";
import { startTrial_Service, skipTrial_Service } from "../../services/TrialService";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState, store } from "../../store/store";
import { devLog } from "../../utils/devLog";
import {
  clearSavedLoginCredentials,
  getSavedLoginCredentials,
  saveLoginCredentials,
} from "../../utils/loginCredentialStorage";
import { clearSavedToken, saveToken } from "../../utils/secureStorage";
import {
  clearLoginSession,
  setLoginSession,
} from "../../store/reducers/AuthReducer";
import { useCommonAlert } from "../../hooks/useCommonAlert";
import { getApiErrorMessage, parseApiError } from "../../utils/apiErrorAlert";
import CommonAlert from "../../components/CommonAlert/CommonAlert";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { cardShadow } from "../settings/shared/settingsDetailStyles";

const MOBILE_DIGIT_LENGTH = 10;
const LOCAL_MOBILE_PATTERN = /^0\d{9}$/;
const ONBOARDING_INCOMPLETE_CODE = "ONBOARDING_INCOMPLETE";
const HORIZONTAL_PADDING = 24;
const SCREEN_WIDTH = Dimensions.get("window").width;

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
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberCredentials, setRememberCredentials] = useState(false);
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

  const inputTextColor = paperTheme.colors.onSurface;
  const inputCursorColor = paperTheme.colors.primary;
  const inputSelectionColor = paperTheme.colors.primary;
  const inputPlaceholderColor = paperTheme.colors.onSurfaceVariant;

  const inputWrapperStyle = useMemo(
    () => [
      styles.inputWrapper,
      {
        backgroundColor: paperTheme.colors.surfaceVariant,
        borderColor: paperTheme.colors.outlineVariant,
      },
    ],
    [paperTheme.colors.outlineVariant, paperTheme.colors.surfaceVariant],
  );

  const formCardStyle = useMemo(
    () => [
      styles.formCard,
      {
        backgroundColor: paperTheme.colors.surface,
        borderColor: paperTheme.colors.outlineVariant,
      },
      cardShadow(resolvedTheme),
    ],
    [
      paperTheme.colors.outlineVariant,
      paperTheme.colors.surface,
      resolvedTheme,
    ],
  );

  const lottieSize = useMemo(
    () => Math.min(SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 48, 200),
    [],
  );

  const baseInputProps = useMemo(
    () => ({
      mode: "flat" as const,
      underlineColor: "transparent",
      activeUnderlineColor: "transparent",
      style: styles.input,
      contentStyle: [styles.inputContent, { color: inputTextColor }],
      placeholderTextColor: inputPlaceholderColor,
      theme: paperTheme,
      cursorColor: inputCursorColor,
      selectionColor: inputSelectionColor,
      textColor: inputTextColor,
      autoCorrect: false,
      autoCapitalize: "none" as const,
      caretHidden: false,
    }),
    [
      inputCursorColor,
      inputPlaceholderColor,
      inputSelectionColor,
      inputTextColor,
      paperTheme,
    ],
  );

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

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        const saved = await getSavedLoginCredentials();
        if (!active) {
          return;
        }

        if (saved) {
          setPhone(saved.phone);
          setPassword(saved.password);
          setRememberCredentials(true);
        }
      })();

      return () => {
        active = false;
      };
    }, []),
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

      if (!rememberCredentials) {
        await clearSavedLoginCredentials();
      }

      const response = await dispatch(
        login_Service({ phone: phone.trim(), password }),
      ).unwrap();

      devLog("Login response: login screen", JSON.stringify(response));

      if (response.success) {
        if (rememberCredentials) {
          await saveLoginCredentials(phone.trim(), password);
        }

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

        if (response.shop?.status === "changeSubscription") {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "ChangeSubscriptionPlanScreen",
                params: {
                  shopId: response.shop.shopId ?? response.user?.shopId ?? "",
                },
              },
            ],
          });
          return;
        }

        if (response.shop?.status === "subscriptionPaymentPending") {
          navigation.reset({
            index: 0,
            routes: [{ name: "PayInitialSubscriptionScreen" }],
          });
          return;
        }

        // `due` = subscription overdue but still within grace (backend still allows login).
        if (
          response.shop?.status === "active" ||
          response.shop?.status === "due"
        ) {
          navigation.reset({ index: 0, routes: [{ name: "PosMain" }] });
          return;
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
              navigation.reset({
                index: 0,
                routes: [{ name: "PendingPayments" }],
              });
            },
            "Cancel",
            () => {},
          );
          return;
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
        <View style={styles.screenBody}>
          <KeyboardAwareScrollView
            style={styles.keyboardScroll}
            contentContainerStyle={[
              styles.scrollViewContent,
              { paddingHorizontal: HORIZONTAL_PADDING },
            ]}
            bounces={false}
            showsVerticalScrollIndicator={false}
            enableOnAndroid
            enableAutomaticScroll
            enableResetScrollToCoords={false}
            extraScrollHeight={Platform.OS === "ios" ? 24 : 80}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            innerRef={(ref: any) => {
              scrollRef.current = ref;
            }}
          >
            <View style={styles.heroSection}>
              <View
                style={[
                  styles.lottieGlow,
                  {
                    width: lottieSize * 0.92,
                    height: lottieSize * 0.92,
                    borderRadius: lottieSize * 0.46,
                    backgroundColor: paperTheme.colors.primaryContainer,
                  },
                ]}
              />
              <View
                style={[styles.lottieFrame, { width: lottieSize, height: lottieSize }]}
              >
                <LottieView
                  source={require("../../../assets/Lottie/management.json")}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
              </View>
            </View>

            <View style={formCardStyle}>
              <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>
                Welcome back
              </Text>
              <View
                style={[
                  styles.taglinePill,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={paperTheme.colors.primary}
                />
                <Text style={[styles.tagline, { color: paperTheme.colors.primary }]}>
                  Owner secure sign in
                </Text>
              </View>
              <Text
                style={[
                  styles.subheading,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Enter your registered mobile number and password to continue.
              </Text>

              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Mobile number
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  ref={phoneInputRef}
                  {...baseInputProps}
                  left={
                    <PaperTextInput.Icon
                      icon={() => (
                        <Ionicons
                          name="call-outline"
                          size={20}
                          color={paperTheme.colors.primary}
                        />
                      )}
                      forceTextInputFocus={false}
                    />
                  }
                  placeholder="0712345678"
                  keyboardType={phoneKeyboardType}
                  maxLength={MOBILE_DIGIT_LENGTH}
                  value={phone}
                  onChangeText={(text) => setPhone(toLocalMobileNumber(text))}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                />
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Password
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  ref={passwordInputRef}
                  {...baseInputProps}
                  left={
                    <PaperTextInput.Icon
                      icon={() => (
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={paperTheme.colors.primary}
                        />
                      )}
                      forceTextInputFocus={false}
                    />
                  }
                  right={
                    <PaperTextInput.Icon
                      icon={showPassword ? "eye-off-outline" : "eye-outline"}
                      onPress={() => setShowPassword((prev) => !prev)}
                      forceTextInputFocus={false}
                    />
                  }
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={() => void onLogin()}
                  textContentType="password"
                  autoComplete="password"
                />
              </View>

              <View style={styles.utilityRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  activeOpacity={0.85}
                  onPress={() => setRememberCredentials((prev) => !prev)}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      {
                        borderColor: rememberCredentials
                          ? paperTheme.colors.primary
                          : paperTheme.colors.outline,
                        backgroundColor: rememberCredentials
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surface,
                      },
                    ]}
                  >
                    {rememberCredentials ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={paperTheme.colors.onPrimary}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.rememberText,
                      { color: paperTheme.colors.onSurface },
                    ]}
                  >
                    Save credentials
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("ForgotPasswordEnterMobileScreen")
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[styles.forgotPassword, { color: paperTheme.colors.primary }]}
                  >
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: paperTheme.colors.primary },
                  loginLoading && styles.buttonDisabled,
                ]}
                onPress={onLogin}
                disabled={loginLoading}
                activeOpacity={0.9}
              >
                {loginLoading ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.buttonText,
                        { color: paperTheme.colors.onPrimary },
                      ]}
                    >
                      Sign in
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={paperTheme.colors.onPrimary}
                    />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secureHintRow}>
                <Ionicons
                  name="lock-closed"
                  size={14}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.secureHintText,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  Your credentials are stored securely on this device
                </Text>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </View>

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
  },
  screenBody: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
    minHeight: 200,
  },
  lottieGlow: {
    position: "absolute",
    opacity: 0.55,
  },
  lottieFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 12,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 12,
  },
  taglinePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  subheading: {
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  fieldLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 8,
  },
  inputWrapper: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    backgroundColor: "transparent",
  },
  inputContent: {
    fontFamily: fonts.InterRegular,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  utilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
    marginBottom: 20,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rememberText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    flexShrink: 1,
  },
  forgotPassword: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#6b4f00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  buttonText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secureHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  secureHintText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
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
});
