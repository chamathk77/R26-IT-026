import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
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
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../store/store';
import { patchLoginShopData } from '../../../../store/reducers/AuthReducer';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import {
  fetchShopFeatures_Service,
  updatedShopFeatures_Service,
} from '../../../../services/ShopOnboardingService';
import { FEATURE_OPTIONS } from '../../../loginScreens/onboarding/screens/onboardingConstants';
import {
  ADDITIONAL_USER_MONTHLY_PRICE_LKR,
  DEFAULT_MAX_USERS,
  formatLkr,
  formatLkrDecimal,
  ShopFeatureKey,
  ShopFeaturesState,
  SMS_PRICE_PER_MESSAGE_LKR,
} from '../../../../type/onboarding';
import type { GetShopFeaturesResponse } from '../../../../type/shopOnboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../shared/settingsDetailStyles';
import { FEATURE_ACCENTS, manageFeaturesStyles as styles } from './manageFeaturesStyles';

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

function SegmentedToggle({
  value,
  onChange,
  paperTheme,
  resolvedTheme,
}: {
  value: boolean;
  onChange: (enabled: boolean) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const options = [
    { label: 'Active', enabled: true, icon: 'checkmark-circle' as const },
    { label: 'Inactive', enabled: false, icon: 'close-circle' as const },
  ];

  return (
    <View
      style={[
        styles.segmentTrack,
        { backgroundColor: paperTheme.colors.surfaceVariant },
      ]}
    >
      {options.map((option) => {
        const selected = value === option.enabled;
        return (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.segmentOption,
              selected && {
                backgroundColor: paperTheme.colors.surface,
                ...cardShadow(resolvedTheme),
              },
            ]}
            onPress={() => onChange(option.enabled)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={
                selected
                  ? option.enabled
                    ? '#15803d'
                    : paperTheme.colors.onSurfaceVariant
                  : paperTheme.colors.outline
              }
            />
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: selected
                    ? paperTheme.colors.onSurface
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

function FeatureCard({
  title,
  description,
  icon,
  accentKey,
  enabled,
  onChange,
  paperTheme,
  resolvedTheme,
  billingNote,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentKey: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  billingNote?: string;
}) {
  const accent = FEATURE_ACCENTS[accentKey] ?? FEATURE_ACCENTS.kpi;

  return (
    <View
      style={[
        styles.featureCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: enabled ? accent.activeBorder : paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      {enabled ? (
        <View style={[styles.accentBar, { backgroundColor: accent.activeBorder }]} />
      ) : null}
      <View style={styles.featureTopRow}>
        <View style={[styles.iconWrap, { backgroundColor: accent.iconBg }]}>
          <Ionicons name={icon} size={24} color={accent.iconColor} />
        </View>
        <View style={styles.featureText}>
          <View style={styles.titleRow}>
            <Text style={[styles.featureTitle, { color: paperTheme.colors.onSurface }]}>
              {title}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: enabled
                    ? resolvedTheme === 'dark'
                      ? '#14532d'
                      : '#dcfce7'
                    : paperTheme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: enabled ? '#15803d' : paperTheme.colors.onSurfaceVariant },
                ]}
              >
                {enabled ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={[styles.featureDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
          {billingNote ? (
            <View
              style={[
                styles.billingChip,
                { backgroundColor: paperTheme.colors.primaryContainer },
              ]}
            >
              <Text style={[styles.billingChipText, { color: paperTheme.colors.primary }]}>
                {billingNote}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <SegmentedToggle
        value={enabled}
        onChange={onChange}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />
    </View>
  );
}

export default function ManageFeaturesScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const primary = paperTheme.colors.primary;

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

  const activeModuleCount = useMemo(() => {
    if (!features) return 0;
    return Object.values(features).filter(Boolean).length;
  }, [features]);

  const showBillingSummary =
    Boolean(features?.sendReceiptSms) || (needMoreUsers && parsedAdditionalUsers > 0);

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
            <View
              style={[
                styles.stateCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                cardShadow(resolvedTheme),
              ]}
            >
              <View
                style={[
                  styles.stateIconRing,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
              >
                <ActivityIndicator size="large" color={primary} />
              </View>
              <Text style={[styles.stateTitle, { color: paperTheme.colors.onSurface }]}>
                Loading modules
              </Text>
              <Text style={[styles.stateDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                Fetching your shop feature settings…
              </Text>
            </View>
          </View>
        ) : !features ? (
          <View style={styles.centered}>
            <View
              style={[
                styles.stateCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                cardShadow(resolvedTheme),
              ]}
            >
              <View
                style={[
                  styles.stateIconRing,
                  {
                    backgroundColor:
                      resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                  },
                ]}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={36}
                  color={resolvedTheme === 'dark' ? '#fbbf24' : '#b45309'}
                />
              </View>
              <Text style={[styles.stateTitle, { color: paperTheme.colors.onSurface }]}>
                Could not load features
              </Text>
              <Text style={[styles.stateDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity
                style={[styles.primaryAction, { backgroundColor: primary }]}
                onPress={() => {
                  void loadFeatures();
                }}
                activeOpacity={0.9}
                disabled={fetchLoading}
              >
                {fetchLoading ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={paperTheme.colors.onPrimary}
                    />
                    <Text
                      style={[styles.primaryActionText, { color: paperTheme.colors.onPrimary }]}
                    >
                      Refresh
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[
                sharedStyles.scroll,
                hasChanges && styles.scrollWithFooter,
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View style={[styles.heroAccent, { backgroundColor: primary }]} />
                <View style={styles.heroRow}>
                  <View
                    style={[
                      styles.heroIcon,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Ionicons name="options-outline" size={26} color={primary} />
                  </View>
                  <View style={styles.heroBody}>
                    <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
                      Shop modules
                    </Text>
                    <Text
                      style={[
                        styles.heroSubtitle,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      Enable the tools your business needs. Tap Update to save changes.
                    </Text>
                  </View>
                </View>
                <View style={styles.heroBadges}>
                  <View
                    style={[
                      styles.heroBadge,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Text style={[styles.heroBadgeText, { color: primary }]}>
                      {activeModuleCount} active
                    </Text>
                  </View>
                  {hasChanges ? (
                    <View
                      style={[
                        styles.heroBadge,
                        {
                          backgroundColor:
                            resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroBadgeText,
                          { color: resolvedTheme === 'dark' ? '#fcd34d' : '#b45309' },
                        ]}
                      >
                        Unsaved changes
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <Text
                style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}
              >
                Modules
              </Text>

              {FEATURE_OPTIONS.map((item) => (
                <FeatureCard
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  icon={item.icon as keyof typeof Ionicons.glyphMap}
                  accentKey={item.key}
                  enabled={features[item.key]}
                  onChange={(next) => setFeatureValue(item.key, next)}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                  billingNote={
                    item.key === 'sendReceiptSms'
                      ? `${formatLkrDecimal(SMS_PRICE_PER_MESSAGE_LKR, 2)} per SMS`
                      : undefined
                  }
                />
              ))}

              <Text
                style={[
                  styles.sectionLabel,
                  { color: paperTheme.colors.onSurfaceVariant, marginTop: 8 },
                ]}
              >
                User capacity
              </Text>

              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: needMoreUsers
                      ? FEATURE_ACCENTS.additionalUsers.activeBorder
                      : paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                {needMoreUsers ? (
                  <View
                    style={[
                      styles.accentBar,
                      { backgroundColor: FEATURE_ACCENTS.additionalUsers.activeBorder },
                    ]}
                  />
                ) : null}
                <View style={styles.featureTopRow}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: FEATURE_ACCENTS.additionalUsers.iconBg },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={24}
                      color={FEATURE_ACCENTS.additionalUsers.iconColor}
                    />
                  </View>
                  <View style={styles.featureText}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.featureTitle, { color: paperTheme.colors.onSurface }]}>
                        Additional users
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: needMoreUsers
                              ? resolvedTheme === 'dark'
                                ? '#14532d'
                                : '#dcfce7'
                              : paperTheme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color: needMoreUsers
                                ? '#15803d'
                                : paperTheme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {needMoreUsers ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.featureDesc, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      {DEFAULT_MAX_USERS} users included. Add more at{' '}
                      {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)}/month each.
                    </Text>
                  </View>
                </View>
                <SegmentedToggle
                  value={needMoreUsers}
                  onChange={onToggleNeedMoreUsers}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
                {needMoreUsers ? (
                  <View
                    style={[
                      styles.expandedSection,
                      { borderTopColor: paperTheme.colors.outlineVariant },
                    ]}
                  >
                    <Text
                      style={[styles.inputLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      HOW MANY ADDITIONAL USERS?
                    </Text>
                    <View
                      style={[
                        styles.inputRow,
                        { backgroundColor: paperTheme.colors.surfaceVariant },
                      ]}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={20}
                        color={paperTheme.colors.onSurfaceVariant}
                      />
                      <PaperTextInput
                        style={styles.input}
                        mode="flat"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        contentStyle={[
                          styles.inputContent,
                          { color: paperTheme.colors.onSurface },
                        ]}
                        placeholder="e.g. 2"
                        placeholderTextColor="#9b9ca5"
                        value={additionalUsersCount}
                        onChangeText={(text) =>
                          setAdditionalUsersCount(toAdditionalUserCount(text))
                        }
                        keyboardType="number-pad"
                        theme={paperTheme}
                        cursorColor={primary}
                        selectionColor={primary}
                        textColor={paperTheme.colors.onSurface}
                      />
                    </View>
                    <Text
                      style={[styles.usersHint, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      {parsedAdditionalUsers > 0
                        ? `Total capacity: ${DEFAULT_MAX_USERS} + ${parsedAdditionalUsers} = ${
                            DEFAULT_MAX_USERS + parsedAdditionalUsers
                          } users`
                        : `${DEFAULT_MAX_USERS} users included in your plan.`}
                    </Text>
                  </View>
                ) : null}
              </View>

              {showBillingSummary ? (
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: paperTheme.colors.primaryContainer,
                      borderColor: paperTheme.colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryTitle,
                      { color: paperTheme.colors.onPrimaryContainer },
                    ]}
                  >
                    Billing add-ons
                  </Text>
                  {features.sendReceiptSms ? (
                    <Text
                      style={[
                        styles.summaryLine,
                        { color: paperTheme.colors.onPrimaryContainer },
                      ]}
                    >
                      • SMS receipts: {formatLkrDecimal(SMS_PRICE_PER_MESSAGE_LKR, 2)} per message
                    </Text>
                  ) : null}
                  {needMoreUsers && parsedAdditionalUsers > 0 ? (
                    <Text
                      style={[
                        styles.summaryLine,
                        { color: paperTheme.colors.onPrimaryContainer },
                      ]}
                    >
                      • Extra users: {formatLkr(parsedAdditionalUsers * ADDITIONAL_USER_MONTHLY_PRICE_LKR)}
                      /month ({parsedAdditionalUsers} ×{' '}
                      {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)})
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>

            {hasChanges ? (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.footerHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  You have unsaved changes
                </Text>
                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    { backgroundColor: primary },
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
                    <>
                      <Ionicons
                        name="save-outline"
                        size={20}
                        color={paperTheme.colors.onPrimary}
                      />
                      <Text
                        style={[styles.updateButtonText, { color: paperTheme.colors.onPrimary }]}
                      >
                        Save changes
                      </Text>
                    </>
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
