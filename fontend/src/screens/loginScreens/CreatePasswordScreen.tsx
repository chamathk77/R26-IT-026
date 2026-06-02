import React, { useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { useTheme } from '../../context/ThemeContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './onboarding/OnboardingStepIndicator';
import { onboardingStyles as s } from './onboarding/onboardingStyles';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert/CommonAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePasswordScreen'>;

export default function CreatePasswordScreen({ navigation, route }: Props) {
  const { ownerData } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputSurface = {
    backgroundColor: paperTheme.colors.surfaceVariant,
  };

  const onComplete = () => {
    if (!password.trim() || !confirmPassword.trim()) {
      show_Alert('error', 'Validation', 'Please fill in all fields.', 1, true, 'OK', () => {});
      return;
    }
    if (password.length < 6) {
      show_Alert(
        'error',
        'Validation',
        'Password must be at least 6 characters.',
        1,
        true,
        'OK',
        () => {},
      );
      return;
    }
    if (password !== confirmPassword) {
      show_Alert('error', 'Validation', 'Passwords do not match.', 1, true, 'OK', () => {});
      return;
    }

    Keyboard.dismiss();
    show_Alert(
      'success',
      'OTP Sent',
      `A verification code has been sent to ${ownerData.ownerMobileNumber}.`,
      1,
      true,
      'OK',
      () => {
        navigation.navigate('OtpValidationScreen', {
          mobileNumber: ownerData.ownerMobileNumber,
          shopName: ownerData.shopName,
        });
      },
    );
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    secure: boolean,
    onToggleSecure: () => void,
  ) => (
    <View>
      <Text style={[s.label, { color: paperTheme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={[s.inputWrapper, inputSurface]}>
        <PaperTextInput
          style={s.input}
          mode="flat"
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          contentStyle={s.inputContent}
          placeholder={label === 'CREATE PASSWORD' ? 'Enter password' : 'Confirm password'}
          placeholderTextColor="#9b9ca5"
          secureTextEntry={secure}
          value={value}
          onChangeText={onChangeText}
          theme={paperTheme}
          right={
            <PaperTextInput.Icon
              icon={secure ? 'eye-outline' : 'eye-off-outline'}
              onPress={onToggleSecure}
            />
          }
        />
      </View>
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[s.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Create password"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={s.container}>
          <OnboardingStepIndicator currentStep={3} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            <Text style={[s.heading, { color: paperTheme.colors.onSurface }]}>Create password</Text>
            <Text style={[s.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
              Set a secure password for {ownerData.shopName}. Use your owner mobile number to sign
              in after setup.
            </Text>

            {renderPasswordField(
              'CREATE PASSWORD',
              password,
              setPassword,
              !showPassword,
              () => setShowPassword((p) => !p),
            )}
            {renderPasswordField(
              'CONFIRM PASSWORD',
              confirmPassword,
              setConfirmPassword,
              !showConfirmPassword,
              () => setShowConfirmPassword((p) => !p),
            )}
          </ScrollView>

          <TouchableOpacity
            style={[s.primaryButton, { backgroundColor: paperTheme.colors.primary }]}
            onPress={onComplete}
            activeOpacity={0.9}
          >
            <Text style={[s.primaryButtonText, { color: paperTheme.colors.onPrimary }]}>
              Send verification code
            </Text>
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
