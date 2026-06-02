import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import {
  findNodeHandle,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../constants/fonts';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './onboarding/OnboardingStepIndicator';
import { onboardingStyles as s } from './onboarding/onboardingStyles';
import {
  createDefaultFeatures,
  FEATURE_OPTIONS,
} from './onboarding/onboardingConstants';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import {
  ADDITIONAL_USER_MONTHLY_PRICE_LKR,
  DEFAULT_MAX_USERS,
  formatLkr,
  formatLkrDecimal,
  ShopFeatureKey,
  ShopFeaturesState,
  SMS_PRICE_PER_MESSAGE_LKR,
} from '../../type/onboarding';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectFeaturesScreen'>;

const KEYBOARD_EXTRA_SCROLL = Platform.OS === 'ios' ? 80 : 120;

function toAdditionalUserCount(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

export default function SelectFeaturesScreen({ navigation, route }: Props) {
  const { ownerData } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [features, setFeatures] = useState<ShopFeaturesState>(createDefaultFeatures);
  const [needMoreUsers, setNeedMoreUsers] = useState(false);
  const [additionalUsersCount, setAdditionalUsersCount] = useState('');

  const additionalUsersInputRef = useRef<TextInput>(null);
  const additionalUsersFieldRef = useRef<View>(null);
  const keyboardScrollRef = useRef<ScrollView | null>(null);

  const inputSurface = {
    backgroundColor: paperTheme.colors.surfaceVariant,
  };

  const inputTextColor = paperTheme.colors.onSurface;

  const parsedAdditionalUsers = useMemo(() => {
    const value = parseInt(additionalUsersCount, 10);
    if (!additionalUsersCount.trim() || Number.isNaN(value) || value < 1) {
      return 0;
    }
    return value;
  }, [additionalUsersCount]);

  const additionalUsersMonthlyCost = useMemo(
    () => parsedAdditionalUsers * ADDITIONAL_USER_MONTHLY_PRICE_LKR,
    [parsedAdditionalUsers],
  );

  const showSubscriptionSummary = features.sms || (needMoreUsers && parsedAdditionalUsers > 0);

  const scrollToField = useCallback((fieldRef: React.RefObject<View | null>) => {
    const field = fieldRef.current;
    const scrollView = keyboardScrollRef.current;
    if (!field || !scrollView) {
      return;
    }

    const scrollNode = findNodeHandle(scrollView);
    if (!scrollNode) {
      return;
    }

    field.measureLayout(
      scrollNode,
      (_left, top) => {
        scrollView.scrollTo({
          y: Math.max(0, top - KEYBOARD_EXTRA_SCROLL),
          animated: true,
        });
      },
      () => {},
    );
  }, []);

  const toggleFeature = (key: ShopFeatureKey) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onToggleNeedMoreUsers = (enabled: boolean) => {
    setNeedMoreUsers(enabled);
    if (!enabled) {
      setAdditionalUsersCount('');
    }
  };

  const onContinue = () => {
    const hasSelection = Object.values(features).some(Boolean);
    if (!hasSelection) {
      show_Alert(
        'error',
        'Validation',
        'Please select at least one feature to continue.',
        1,
        true,
        'OK',
        () => {},
      );
      return;
    }

    let numAdditionalUsers: number | null = null;
    if (needMoreUsers) {
      if (parsedAdditionalUsers < 1) {
        show_Alert(
          'error',
          'Validation',
          'Please enter how many additional users you need (minimum 1).',
          1,
          true,
          'OK',
          () => {},
        );
        return;
      }
      numAdditionalUsers = parsedAdditionalUsers;
    }

    navigation.navigate('CreatePasswordScreen', {
      ownerData,
      features,
      userConfig: {
        maxUsers: DEFAULT_MAX_USERS,
        isAdditionalUsersAdded: needMoreUsers,
        numAdditionalUsers,
      },
    });
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[s.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Select features"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={[s.container, styles.screenBody]}>
          <OnboardingStepIndicator currentStep={2} />
          <KeyboardAwareScrollView
            innerRef={(ref) => {
              keyboardScrollRef.current = ref as ScrollView | null;
            }}
            style={styles.keyboardScroll}
            contentContainerStyle={[s.scrollContent, styles.keyboardScrollContent]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            enableOnAndroid
            enableAutomaticScroll
            enableResetScrollToCoords={false}
            extraScrollHeight={KEYBOARD_EXTRA_SCROLL}
            extraHeight={KEYBOARD_EXTRA_SCROLL}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            viewIsInsideTabBar={false}
          >
            <Text style={[s.heading, { color: paperTheme.colors.onSurface }]}>Choose modules</Text>
            <Text style={[s.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
              Enable the tools your shop needs. You can change these later.
            </Text>

            {FEATURE_OPTIONS.map((item) => {
              const enabled = features[item.key];
              const isSms = item.key === 'sms';
              return (
                <View
                  key={item.key}
                  style={[
                    styles.featureCard,
                    {
                      backgroundColor: paperTheme.colors.surface,
                      borderColor: enabled
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outline,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: enabled
                          ? paperTheme.colors.primaryContainer
                          : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={paperTheme.colors.primary}
                    />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: paperTheme.colors.onSurface }]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.featureDesc,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      {item.description}
                    </Text>
                    {isSms && enabled && (
                      <Text style={[styles.billingNote, { color: paperTheme.colors.primary }]}>
                        SMS usage ({formatLkrDecimal(SMS_PRICE_PER_MESSAGE_LKR)} per message) will be
                        added to your monthly subscription.
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={() => toggleFeature(item.key)}
                    trackColor={{
                      false: paperTheme.colors.surfaceVariant,
                      true: paperTheme.colors.primaryContainer,
                    }}
                    thumbColor={
                      enabled ? paperTheme.colors.primary : paperTheme.colors.outline
                    }
                    ios_backgroundColor={paperTheme.colors.surfaceVariant}
                    accessibilityLabel={`Toggle ${item.title}`}
                  />
                </View>
              );
            })}

            <View
              ref={additionalUsersFieldRef}
              collapsable={false}
              style={[
                styles.usersCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: needMoreUsers
                    ? paperTheme.colors.primary
                    : paperTheme.colors.outline,
                },
              ]}
            >
              <View style={styles.usersCardHeader}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: needMoreUsers
                        ? paperTheme.colors.primaryContainer
                        : paperTheme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Ionicons name="people-outline" size={22} color={paperTheme.colors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: paperTheme.colors.onSurface }]}>
                    Need more users?
                  </Text>
                  <Text
                    style={[styles.featureDesc, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    Your plan includes {DEFAULT_MAX_USERS} users by default. Each additional user
                    costs {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)} per month and will be
                    added to your monthly subscription.
                  </Text>
                </View>
                <Switch
                  value={needMoreUsers}
                  onValueChange={onToggleNeedMoreUsers}
                  trackColor={{
                    false: paperTheme.colors.surfaceVariant,
                    true: paperTheme.colors.primaryContainer,
                  }}
                  thumbColor={
                    needMoreUsers ? paperTheme.colors.primary : paperTheme.colors.outline
                  }
                  ios_backgroundColor={paperTheme.colors.surfaceVariant}
                  accessibilityLabel="Toggle additional users"
                />
              </View>

              {needMoreUsers && (
                <View style={styles.expandedSection}>
                  <Text
                    style={[styles.inputLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    HOW MANY ADDITIONAL USERS?
                  </Text>
                  <View style={[styles.inputWrapper, inputSurface]}>
                    <PaperTextInput
                      ref={additionalUsersInputRef}
                      style={s.input}
                      mode="flat"
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      contentStyle={[s.inputContent, { color: inputTextColor }]}
                      placeholder="Enter number of users"
                      placeholderTextColor="#9b9ca5"
                      value={additionalUsersCount}
                      onChangeText={(text) =>
                        setAdditionalUsersCount(toAdditionalUserCount(text))
                      }
                      keyboardType="number-pad"
                      theme={paperTheme}
                      cursorColor={paperTheme.colors.primary}
                      selectionColor={paperTheme.colors.primary}
                      textColor={inputTextColor}
                      onFocus={() => scrollToField(additionalUsersFieldRef)}
                    />
                  </View>
                  <Text style={[styles.usersHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {parsedAdditionalUsers > 0
                      ? `Total users: ${DEFAULT_MAX_USERS} included + ${parsedAdditionalUsers} additional = ${
                          DEFAULT_MAX_USERS + parsedAdditionalUsers
                        }`
                      : `${DEFAULT_MAX_USERS} users included in your plan.`}
                  </Text>
                  {parsedAdditionalUsers > 0 && (
                    <Text style={[styles.billingNote, { color: paperTheme.colors.primary }]}>
                      {parsedAdditionalUsers} × {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)} ={' '}
                      {formatLkr(additionalUsersMonthlyCost)} / month added to your monthly
                      subscription.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {showSubscriptionSummary && (
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: paperTheme.colors.primaryContainer,
                    borderColor: paperTheme.colors.primary,
                  },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                  Monthly subscription add-ons
                </Text>
                {features.sms && (
                  <Text
                    style={[styles.summaryLine, { color: paperTheme.colors.onPrimaryContainer }]}
                  >
                    • SMS module: {formatLkrDecimal(SMS_PRICE_PER_MESSAGE_LKR)} per SMS (usage-based,
                    added to monthly bill)
                  </Text>
                )}
                {needMoreUsers && parsedAdditionalUsers > 0 && (
                  <Text
                    style={[styles.summaryLine, { color: paperTheme.colors.onPrimaryContainer }]}
                  >
                    • Additional users: {formatLkr(additionalUsersMonthlyCost)} / month (
                    {parsedAdditionalUsers} × {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)})
                  </Text>
                )}
                {needMoreUsers && parsedAdditionalUsers > 0 && (
                  <Text style={[styles.summaryTotal, { color: paperTheme.colors.primary }]}>
                    Fixed add-on this month: {formatLkr(additionalUsersMonthlyCost)}
                  </Text>
                )}
              </View>
            )}
          </KeyboardAwareScrollView>

          <TouchableOpacity
            style={[s.primaryButton, { backgroundColor: paperTheme.colors.primary }]}
            onPress={onContinue}
            activeOpacity={0.9}
          >
            <Text style={[s.primaryButtonText, { color: paperTheme.colors.onPrimary }]}>
              Continue
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

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  keyboardScrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  usersCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  usersCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d4d4d8',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    paddingRight: 4,
  },
  featureTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: fonts.InterRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  billingNote: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  inputLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  inputWrapper: {
    minHeight: 52,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  usersHint: {
    fontFamily: fonts.InterRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  summaryLine: {
    fontFamily: fonts.InterRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  summaryTotal: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginTop: 6,
  },
});
