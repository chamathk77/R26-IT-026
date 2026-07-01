import React, { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { TextInput } from "react-native";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput as PaperTextInput } from "react-native-paper";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../navigation/RootStackParamsList";
import { useTheme } from "../../../../context/ThemeContext";
import { fonts } from "../../../../constants/fonts";
import CommonHeader from "../../../../components/CommonHeader/CommonHeader";
import OnboardingStepIndicator from "./OnboardingStepIndicator";
import { onboardingStyles as s } from "../styles/onboardingStyles";
import { useCommonAlert } from "../../../../hooks/useCommonAlert";
import CommonAlert from "../../../../components/CommonAlert/CommonAlert";
import { createShopOnboarding_Service, removeOnboardingData_Service, sendOtpOnboarding_Service } from "../../../../services/ShopOnboardingService";
import { getApiErrorMessage, parseApiError } from "../../../../utils/apiErrorAlert";
import { AppDispatch, RootState } from "../../../../store/store";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardOwnerScreen">;

const INCOMPLETE_OWNER_MOBILE_MESSAGE =
  "Owner mobile number is already registered but not completed onboarding";
const EXISTING_OWNER_ACCOUNT_MESSAGE =
  "There is already an account for that owner mobile number";

const MOBILE_DIGIT_LENGTH = 10;
const LOCAL_MOBILE_PATTERN = /^0\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export default function OnboardOwnerScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const createShopLoading = useSelector(
    (state: RootState) => state.shopOnboarding.createShop.loading,
  );
  const sendOtpLoading = useSelector(
    (state: RootState) => state.shopOnboarding.sendOtp.loading,
  );
  const removeOnboardingLoading = useSelector(
    (state: RootState) => state.shopOnboarding.removeOnboardingData.loading,
  );
  const isSubmitting = createShopLoading || sendOtpLoading || removeOnboardingLoading;

  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [shopMobileNumber, setShopMobileNumber] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [email, setEmail] = useState("");
  const [ownerMobileNumber, setOwnerMobileNumber] = useState("");

  const shopNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const shopMobileRef = useRef<TextInput>(null);
  const ownerFirstNameRef = useRef<TextInput>(null);
  const ownerLastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const ownerMobileRef = useRef<TextInput>(null);

  const phoneKeyboardType =
    Platform.OS === "android" ? "numeric" : "number-pad";

  const cardStyle = [
    styles.fieldCard,
    {
      backgroundColor: paperTheme.colors.surface,
      borderColor: paperTheme.colors.outline,
    },
  ];

  const inputWrapperStyle = [
    styles.inputWrapper,
    { backgroundColor: paperTheme.colors.surfaceVariant },
  ];

  const inputTextColor = paperTheme.colors.onSurface;
  const inputCursorColor = paperTheme.colors.primary;
  const inputSelectionColor = paperTheme.colors.primary;

  const baseInputProps = {
    style: s.input,
    mode: "flat" as const,
    underlineColor: "transparent",
    activeUnderlineColor: "transparent",
    contentStyle: [s.inputContent, styles.inputText, { color: inputTextColor }],
    placeholderTextColor: "#9b9ca5",
    theme: paperTheme,
    cursorColor: inputCursorColor,
    selectionColor: inputSelectionColor,
    textColor: inputTextColor,
  };

  const handleRemoveIncompleteOnboarding = async (shopId: string) => {
    try {
      await dispatch(removeOnboardingData_Service({ shopId })).unwrap();
      show_Alert(
        "success",
        "Data removed",
        "Existing details were removed successfully. You can continue now.",
        1,
        false,
        "OK",
        () => {},
      );
    } catch (error: unknown) {
      console.log("error removing incomplete onboarding", parseApiError(error));
      show_Alert(
        "error",
        "Error",
        getApiErrorMessage(error, "Could not remove existing data. Please try again."),
        1,
        true,
        "OK",
        () => {},
      );
    }
  };

  const onContinue = async () => {
    if (isSubmitting) {
      return;
    }

    if (
      !shopName.trim() ||
      !address.trim() ||
      !shopMobileNumber.trim() ||
      !ownerFirstName.trim() ||
      !ownerLastName.trim() ||
      !email.trim() ||
      !ownerMobileNumber.trim()
    ) {
      show_Alert(
        "error",
        "Validation",
        "Please fill in all fields.",
        1,
        true,
        "OK",
        () => {},
      );
      return;
    }

    if (!isValidEmail(email)) {
      show_Alert(
        "error",
        "Validation",
        "Please enter a valid email address.",
        1,
        true,
        "OK",
        () => {},
      );
      return;
    }

    if (
      !isValidLocalMobileNumber(shopMobileNumber) ||
      !isValidLocalMobileNumber(ownerMobileNumber)
    ) {
      show_Alert(
        "error",
        "Validation",
        "Mobile numbers must be 10 digits and start with 0 (e.g. 0712345678).",
        1,
        true,
        "OK",
        () => {},
      );
      return;
    }

    const ownerData = {
      shopName: shopName.trim(),
      address: address.trim(),
      shopMobileNumber: shopMobileNumber.trim(),
      ownerFirstName: ownerFirstName.trim(),
      ownerLastName: ownerLastName.trim(),
      email: email.trim().toLowerCase(),
      ownerMobileNumber: ownerMobileNumber.trim(),
    };

    try {
      Keyboard.dismiss();
      const response = await dispatch(
        createShopOnboarding_Service(ownerData),
      ).unwrap();
      console.log("response in onboard owner screen", response);

      const otpResponse = await dispatch(
        sendOtpOnboarding_Service({ shopId: response.shopId }),
      ).unwrap();

      navigation.navigate("OtpValidationScreen", {
        ownerData: {
          ...ownerData,
          shopId: response.shopId,
        },
        otpTimerSeconds: otpResponse.otpTimerSeconds,
      });
      

    } catch (error: unknown) {
      const parsed = parseApiError(error);
      console.log("error in onboard owner screen", parsed);

      if (parsed.message === INCOMPLETE_OWNER_MOBILE_MESSAGE && parsed.shopId) {
        show_Alert(
          "pending",
          "Incomplete onboarding",
          "This owner mobile number has an incomplete registration. Would you like to remove the existing data and continue?",
          2,
          false,
          "Yes",
          () => {
            void handleRemoveIncompleteOnboarding(parsed.shopId!);
          },
          "No",
          () => {},
        );
        return;
      }

      if (parsed.message === EXISTING_OWNER_ACCOUNT_MESSAGE) {
        show_Alert(
          "error",
          "Account already exists",
          "There is already an account for this owner mobile number. Please log in to continue.",
          2,
          false,
          "Login",
          () => {
            navigation.navigate("LoginScreen");
          },
          "Cancel",
          () => {},
        );
        return;
      }

      show_Alert(
        "error",
        "Error",
        getApiErrorMessage(error, "Could not save shop details. Please try again."),
        1,
        true,
        "OK",
        () => {},
      );
    }
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[s.safeArea, { backgroundColor: paperTheme.colors.background }]}
      >
        <CommonHeader
          title="Shop onboarding"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={[s.container, styles.screenBody]}>
          <OnboardingStepIndicator currentStep={1} />
          <KeyboardAwareScrollView
            style={styles.keyboardScroll}
            contentContainerStyle={[
              s.scrollContent,
              styles.keyboardScrollContent,
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            enableOnAndroid
            enableAutomaticScroll
            enableResetScrollToCoords={false}
            extraScrollHeight={Platform.OS === "ios" ? 24 : 80}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[s.heading, { color: paperTheme.colors.onSurface }]}>
              Shop & owner
            </Text>
            <Text
              style={[
                s.subheading,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Tell us about your shop and the owner account.
            </Text>

            {/* Shop Name */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                SHOP NAME
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={shopNameRef}
                  placeholder="Enter shop name"
                  value={shopName}
                  onChangeText={setShopName}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => addressRef.current?.focus()}
                />
              </View>
            </View>

            {/* Address */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                ADDRESS
              </Text>
              <View style={[inputWrapperStyle, styles.inputWrapperMultiline]}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={addressRef}
                  placeholder="Enter shop address"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  returnKeyType="next"
                  blurOnSubmit
                  onSubmitEditing={() => shopMobileRef.current?.focus()}
                />
              </View>
            </View>

            {/* Shop Contact Number */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                SHOP CONTACT NUMBER
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={shopMobileRef}
                  placeholder="e.g. 0712345678"
                  value={shopMobileNumber}
                  onChangeText={(text) =>
                    setShopMobileNumber(toLocalMobileNumber(text))
                  }
                  keyboardType={phoneKeyboardType}
                  maxLength={MOBILE_DIGIT_LENGTH}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => ownerFirstNameRef.current?.focus()}
                />
              </View>
            </View>

            {/* Owner First Name */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                OWNER FIRST NAME
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={ownerFirstNameRef}
                  placeholder="Enter owner first name"
                  value={ownerFirstName}
                  onChangeText={setOwnerFirstName}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => ownerLastNameRef.current?.focus()}
                />
              </View>
            </View>

            {/* Owner Last Name */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                OWNER LAST NAME
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={ownerLastNameRef}
                  placeholder="Enter owner last name"
                  value={ownerLastName}
                  onChangeText={setOwnerLastName}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                EMAIL ADDRESS
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={emailRef}
                  placeholder="e.g. owner@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => ownerMobileRef.current?.focus()}
                />
              </View>
            </View>

            {/* Owner Mobile Number */}
            <View style={cardStyle}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                OWNER MOBILE NUMBER
              </Text>
              <View style={inputWrapperStyle}>
                <PaperTextInput
                  {...baseInputProps}
                  ref={ownerMobileRef}
                  placeholder="e.g. 0712345678"
                  value={ownerMobileNumber}
                  onChangeText={(text) =>
                    setOwnerMobileNumber(toLocalMobileNumber(text))
                  }
                  keyboardType={phoneKeyboardType}
                  maxLength={MOBILE_DIGIT_LENGTH}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    // onContinue();
                  }}
                />
              </View>
              <View
                style={[
                  styles.smsNoticeBox,
                  {
                    backgroundColor: paperTheme.colors.primaryContainer,
                    borderColor: paperTheme.colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={paperTheme.colors.primary}
                  style={styles.smsNoticeIcon}
                />
                <Text
                  style={[
                    styles.smsNoticeText,
                    { color: paperTheme.colors.onSurface },
                  ]}
                >
                  OTP verification and future SMS alerts will be sent to this
                  mobile number.
                </Text>
              </View>
            </View>
          </KeyboardAwareScrollView>

          <TouchableOpacity
            style={[
              s.primaryButton,
              { backgroundColor: paperTheme.colors.primary },
              isSubmitting && styles.primaryButtonDisabled,
            ]}
            onPress={onContinue}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <Text
                style={[
                  s.primaryButtonText,
                  { color: paperTheme.colors.onPrimary },
                ]}
              >
                Continue
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
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  keyboardScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  fieldCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  inputWrapper: {
    minHeight: 52,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputWrapperMultiline: {
    minHeight: 88,
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  smsNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  smsNoticeIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  smsNoticeText: {
    flex: 1,
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    lineHeight: 18,
  },
  inputText: {
    paddingVertical: 0,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
});
