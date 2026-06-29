import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { fonts } from '../../../constants/fonts';
import { AppDispatch, RootState } from '../../../store/store';
import { patchLoginShopData } from '../../../store/reducers/AuthReducer';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import {
  fetchShopFeatures_Service,
  updatedShopFeatures_Service,
} from '../../../services/ShopOnboardingService';
import { FEATURE_OPTIONS } from '../../loginScreens/onboarding/screens/onboardingConstants';
import {
  ADDITIONAL_USER_MONTHLY_PRICE_LKR,
  DEFAULT_MAX_USERS,
  formatLkr,
  formatLkrDecimal,
  ShopFeatureKey,
  ShopFeaturesState,
  SMS_PRICE_PER_MESSAGE_LKR,
} from '../../../type/onboarding';
import type { GetShopFeaturesResponse } from '../../../type/shopOnboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../shared/settingsDetailStyles';
import { SettingsEmptyState } from '../shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageFeatures'>;

function featuresFromApi(
  apiFeatures: GetShopFeaturesResponse['features'],
): ShopFeaturesState {
  return {
    sendReceiptSms: apiFeatures.sendReceiptSms,
    kpi: apiFeatures.kpi,
    analyticsModule: apiFeatures.analyticsModule,
    customerManualOrder: apiFeatures.customerManualOrder,
    costModule: apiFeatures.costModule,
    marketingModule: apiFeatures.marketingModule,
  };
}

function buildSnapshot(
  features: ShopFeaturesState,
  isAdditionalUsersAdded: boolean,
  numAdditionalUsers: string,
): string {
  return JSON.stringify({ features, isAdditionalUsersAdded, numAdditionalUsers });
}

function toAdditionalUserCount(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

function ActiveInactiveRadio({
  value,
  onChange,
  paperTheme,
}: {
  value: boolean;
  onChange: (enabled: boolean) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
}) {
  const options = [
    { label: 'Active', enabled: true },
    { label: 'Inactive', enabled: false },
  ] as const;

  return (
    <View style={styles.radioRow}>
      {options.map((option) => {
        const selected = value === option.enabled;
        return (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.radioOption,
              {
                borderColor: selected
                  ? paperTheme.colors.primary
                  : paperTheme.colors.outlineVariant,
                backgroundColor: selected
                  ? paperTheme.colors.primaryContainer
                  : paperTheme.colors.surface,
              },
            ]}
            onPress={() => onChange(option.enabled)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: selected
                    ? paperTheme.colors.primary
                    : paperTheme.colors.outline,
                },
              ]}
            >
              {selected ? (
                <View
                  style={[styles.radioInner, { backgroundColor: paperTheme.colors.primary }]}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.radioLabel,
                {
                  color: selected
                    ? paperTheme.colors.primary
                    : paperTheme.colors.onSurfaceVariant,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ManageFeaturesScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );

  const { loading: fetchLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.shopFeatures,
  );
  const { loading: updateLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.updateFeatures,
  );

  const [features, setFeatures] = useState<ShopFeaturesState | null>(null);
  const [needMoreUsers, setNeedMoreUsers] = useState(false);
  const [additionalUsersCount, setAdditionalUsersCount] = useState('');
  const [savedSnapshot, setSavedSnapshot] = useState('');

  const parsedAdditionalUsers = useMemo(() => {
    const value = parseInt(additionalUsersCount, 10);
    if (!additionalUsersCount.trim() || Number.isNaN(value) || value < 1) {
      return 0;
    }
    return value;
  }, [additionalUsersCount]);

  const currentSnapshot = useMemo(() => {
    if (!features) return '';
    return buildSnapshot(features, needMoreUsers, additionalUsersCount);
  }, [features, needMoreUsers, additionalUsersCount]);

  const hasChanges = Boolean(features) && currentSnapshot !== savedSnapshot;
  const isSubmitting = updateLoading;

  const applyLoadedFeatures = useCallback((data: GetShopFeaturesResponse) => {
    const loadedFeatures = featuresFromApi(data.features);
    const loadedNeedMoreUsers = data.features.isAdditionalUsersAdded;
    const loadedCount =
      data.features.numAdditionalUsers != null
        ? String(data.features.numAdditionalUsers)
        : '';

    setFeatures(loadedFeatures);
    setNeedMoreUsers(loadedNeedMoreUsers);
    setAdditionalUsersCount(loadedCount);
    setSavedSnapshot(
      buildSnapshot(loadedFeatures, loadedNeedMoreUsers, loadedCount),
    );
  }, []);

  const loadFeatures = useCallback(async () => {
    if (!shopId) {
      setTimeout(() => {
        show_Alert(
          'error',
          'Error',
          'Shop not found. Please log in again.',
          1,
          false,
          'OK',
          () => {},
        );
      }, 150);
      return;
    }

    try {
      const response = await dispatch(fetchShopFeatures_Service(String(shopId))).unwrap();
      applyLoadedFeatures(response);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load shop features. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadFeatures();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [applyLoadedFeatures, dispatch, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadFeatures();
    }, [loadFeatures]),
  );

  const setFeatureValue = (key: ShopFeatureKey, enabled: boolean) => {
    setFeatures((prev) => (prev ? { ...prev, [key]: enabled } : prev));
  };

  const onToggleNeedMoreUsers = (enabled: boolean) => {
    setNeedMoreUsers(enabled);
    if (!enabled) {
      setAdditionalUsersCount('');
    }
  };

  const onUpdate = async () => {
    if (!features || !shopId || isSubmitting || !hasChanges) {
      return;
    }

    const hasSelection = Object.values(features).some(Boolean);
    if (!hasSelection) {
      show_Alert(
        'error',
        'Validation',
        'Please keep at least one feature active.',
        1,
        false,
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
          false,
          'OK',
          () => {},
        );
        return;
      }
      numAdditionalUsers = parsedAdditionalUsers;
    }

    try {
      const response = await dispatch(
        updatedShopFeatures_Service({
          shopId: String(shopId),
          sendReceiptSms: features.sendReceiptSms,
          kpi: features.kpi,
          analyticsModule: features.analyticsModule,
          customerManualOrder: features.customerManualOrder,
          costModule: features.costModule,
          marketingModule: features.marketingModule,
          isAdditionalUsersAdded: needMoreUsers,
          numAdditionalUsers: needMoreUsers ? numAdditionalUsers : null,
        }),
      ).unwrap();

      dispatch(
        patchLoginShopData({
          sendReceiptSms: response.features.sendReceiptSms,
          kpi: response.features.kpi,
          analyticsModule: response.features.analyticsModule,
          customerManualOrder: response.features.customerManualOrder,
          costModule: response.features.costModule,
          marketingModule: response.features.marketingModule,
          maxUsers: response.features.maxUsers,
        }),
      );

      show_Alert(
        'success',
        'Updated',
        'Shop features were saved successfully.',
        1,
        false,
        'OK',
        () => {
          navigation.navigate('Settings');
        },
      );
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Update failed',
        getApiErrorMessage(error, 'Could not update shop features. Please try again.'),
        2,
        false,
        'Try again',
        () => {
          void onUpdate();
        },
        'Cancel',
        () => {},
      );
    }
  };

  const showLoader = fetchLoading && !features;

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage features"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading features…
            </Text>
          </View>
        ) : !features ? (
          <View style={styles.centered}>
            <SettingsEmptyState
              icon="options-outline"
              title="Could not load features"
              description="Check your connection and try again."
              paperTheme={paperTheme}
            />
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: paperTheme.colors.primary }]}
              onPress={() => {
                void loadFeatures();
              }}
              activeOpacity={0.9}
            >
              <Text style={[styles.updateButtonText, { color: paperTheme.colors.onPrimary }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[sharedStyles.scroll, hasChanges && styles.scrollWithFooter]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                Turn modules on or off for your shop. Changes apply after you tap Update.
              </Text>

              {FEATURE_OPTIONS.map((item) => {
                const enabled = features[item.key];
                const isSendReceiptSms = item.key === 'sendReceiptSms';
                return (
                  <View
                    key={item.key}
                    style={[
                      styles.featureCard,
                      {
                        backgroundColor: paperTheme.colors.surface,
                        borderColor: paperTheme.colors.outlineVariant,
                      },
                      cardShadow(resolvedTheme),
                    ]}
                  >
                    <View style={styles.featureHeader}>
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
                        <Text
                          style={[styles.featureTitle, { color: paperTheme.colors.onSurface }]}
                        >
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
                        {isSendReceiptSms ? (
                          <Text style={[styles.billingNote, { color: paperTheme.colors.primary }]}>
                            {formatLkrDecimal(SMS_PRICE_PER_MESSAGE_LKR, 2)} per SMS (usage-based).
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <ActiveInactiveRadio
                      value={enabled}
                      onChange={(next) => setFeatureValue(item.key, next)}
                      paperTheme={paperTheme}
                    />
                  </View>
                );
              })}

              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: needMoreUsers
                      ? paperTheme.colors.primary
                      : paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View style={styles.featureHeader}>
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
                      Additional users
                    </Text>
                    <Text
                      style={[styles.featureDesc, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      Your plan includes {DEFAULT_MAX_USERS} users. Each additional user costs{' '}
                      {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)} per month.
                    </Text>
                  </View>
                </View>
                <ActiveInactiveRadio
                  value={needMoreUsers}
                  onChange={onToggleNeedMoreUsers}
                  paperTheme={paperTheme}
                />
                {needMoreUsers ? (
                  <View style={styles.expandedSection}>
                    <Text
                      style={[styles.inputLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      HOW MANY ADDITIONAL USERS?
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: paperTheme.colors.surfaceVariant },
                      ]}
                    >
                      <PaperTextInput
                        style={styles.input}
                        mode="flat"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        contentStyle={[
                          styles.inputContent,
                          { color: paperTheme.colors.onSurface },
                        ]}
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
                        textColor={paperTheme.colors.onSurface}
                      />
                    </View>
                    <Text style={[styles.usersHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {parsedAdditionalUsers > 0
                        ? `Total users: ${DEFAULT_MAX_USERS} + ${parsedAdditionalUsers} = ${
                            DEFAULT_MAX_USERS + parsedAdditionalUsers
                          }`
                        : `${DEFAULT_MAX_USERS} users included in your plan.`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {hasChanges ? (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: paperTheme.colors.background,
                    borderTopColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    { backgroundColor: paperTheme.colors.primary },
                    isSubmitting && styles.updateButtonDisabled,
                  ]}
                  onPress={() => {
                    void onUpdate();
                  }}
                  activeOpacity={0.9}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={paperTheme.colors.onPrimary} />
                  ) : (
                    <Text style={[styles.updateButtonText, { color: paperTheme.colors.onPrimary }]}>
                      Update
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>

      {alertConfig ? (
        <Portal>
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
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  scrollWithFooter: {
    paddingBottom: 100,
  },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  featureDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  billingNote: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginTop: 6,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cbd5e1',
  },
  inputLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: 'transparent',
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
  },
  inputContent: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
  },
  usersHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  updateButton: {
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
