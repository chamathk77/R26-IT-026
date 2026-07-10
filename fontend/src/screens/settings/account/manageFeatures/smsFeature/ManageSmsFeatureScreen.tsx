import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../../store/store';
import { patchLoginShopData } from '../../../../../store/reducers/AuthReducer';
import CommonHeader from '../../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../../hooks/useCommonAlert';
import {
  fetchShopSmsFeatures_Service,
  fetchSmsPackages_Service,
  manageSmsFeature_Service,
} from '../../../../../services/ShopOnboardingService';
import type { ShopSmsFeaturesPayload, SmsPackage } from '../../../../../type/shopOnboarding';
import { formatSmsPackageLabel } from '../../../../../type/shopOnboarding';
import { formatLkr } from '../../../../../type/onboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../../shared/settingsDetailStyles';
import { SettingsBadge } from '../../../shared/SettingsDetailComponents';
import { manageSmsFeatureStyles as styles } from './manageSmsFeatureStyles';
import SmsPackagesModal from './SmsPackagesModal';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageSmsFeature'>;

function isSmsFeatureEnabled(
  features?: { isSmsFeatureActive?: boolean; smsFeatureStatus?: string | null } | null,
): boolean {
  if (!features) return false;
  if (typeof features.isSmsFeatureActive === 'boolean') {
    return features.isSmsFeatureActive;
  }
  return features.smsFeatureStatus === 'active';
}

function getSmsStatusMeta(status?: string | null) {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success' as const, color: '#15803d' };
    case 'notActivated':
      return { label: 'Not activated', tone: 'neutral' as const, color: '#64748b' };
    case 'pending':
      return { label: 'Pending', tone: 'warning' as const, color: '#b45309' };
    case 'due':
      return { label: 'Due', tone: 'neutral' as const, color: '#dc2626' };
    case 'inactive':
    default:
      return { label: 'Inactive', tone: 'neutral' as const, color: '#64748b' };
  }
}

function formatBillingDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function BooleanRadioToggle({
  value,
  onChange,
  disabled,
  paperTheme,
  resolvedTheme,
}: {
  value: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const options = [
    { label: 'Active', enabled: true },
    { label: 'Inactive', enabled: false },
  ];

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
                backgroundColor: selected
                  ? paperTheme.colors.surface
                  : paperTheme.colors.surfaceVariant,
                borderColor: selected ? paperTheme.colors.primary : 'transparent',
                opacity: disabled ? 0.6 : 1,
              },
              selected && cardShadow(resolvedTheme),
            ]}
            onPress={() => onChange(option.enabled)}
            activeOpacity={0.85}
            disabled={disabled}
          >
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: selected ? paperTheme.colors.primary : paperTheme.colors.outline,
                },
              ]}
            >
              {selected ? (
                <View style={[styles.radioInner, { backgroundColor: paperTheme.colors.primary }]} />
              ) : null}
            </View>
            <Text
              style={[
                styles.radioLabel,
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

export default function ManageSmsFeatureScreen({ navigation }: Props) {
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
    (state: RootState) => state.shopOnboarding.shopSmsFeatures,
  );
  const { loading: manageLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.manageSmsFeature,
  );
  const packages = useSelector(
    (state: RootState) => state.shopOnboarding.smsPackages.data?.packages ?? [],
  );
  const packagesLoading = useSelector(
    (state: RootState) => state.shopOnboarding.smsPackages.loading,
  );

  const [features, setFeatures] = useState<ShopSmsFeaturesPayload | null>(null);
  const [enabledDraft, setEnabledDraft] = useState(false);
  const [packagesModalVisible, setPackagesModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const showLoader = fetchLoading && !features;
  const isSubmitting = manageLoading;
  const savedEnabled = isSmsFeatureEnabled(features);
  const hasChanges = Boolean(features) && enabledDraft !== savedEnabled;
  const statusMeta = getSmsStatusMeta(features?.smsFeatureStatus);
  const showSmsDetails =
    features?.smsFeatureStatus === 'active' || features?.smsFeatureStatus === 'due';

  const currentPackage = useMemo(
    () => packages.find((pkg) => pkg.type === features?.smsPackageType) ?? null,
    [features?.smsPackageType, packages],
  );

  const nextRenewalLabel = formatBillingDate(features?.smsNextRenewalDate);

  const applyLoadedFeatures = useCallback((loaded: ShopSmsFeaturesPayload) => {
    setFeatures(loaded);
    setEnabledDraft(isSmsFeatureEnabled(loaded));
  }, []);

  const reloadSmsFeatures = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!shopId) {
        if (!silent) {
          setTimeout(() => {
            show_Alert('error', 'Error', 'Shop not found. Please log in again.', 1, false, 'OK', () => {});
          }, 150);
        }
        return null;
      }

      try {
        const response = await dispatch(fetchShopSmsFeatures_Service(String(shopId))).unwrap();
        applyLoadedFeatures(response.features);
        dispatch(
          patchLoginShopData({
            sendReceiptSms: isSmsFeatureEnabled(response.features),
          }),
        );
        return response.features;
      } catch (error: unknown) {
        if (!silent) {
          const handled = await handleSessionExpiredApiError(error, show_Alert);
          if (handled) return null;

          setTimeout(() => {
            show_Alert(
              'error',
              'Load failed',
              getApiErrorMessage(error, 'Could not load SMS settings. Please try again.'),
              2,
              false,
              'Retry',
              () => {
                void reloadSmsFeatures();
              },
              'Cancel',
              () => {},
            );
          }, 150);
        }
        return null;
      }
    },
    [applyLoadedFeatures, dispatch, shopId, show_Alert],
  );

  const loadSmsFeatures = useCallback(async () => {
    await reloadSmsFeatures();
  }, [reloadSmsFeatures]);

  const ensurePackagesLoaded = useCallback(async () => {
    if (packages.length > 0) {
      return;
    }
    try {
      await dispatch(fetchSmsPackages_Service()).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load SMS packages. Please try again.'),
        1,
      );
    }
  }, [dispatch, packages.length, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadSmsFeatures();
      void ensurePackagesLoaded();
    }, [ensurePackagesLoaded, loadSmsFeatures]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadSmsFeatures({ silent: true }), ensurePackagesLoaded()]);
    } finally {
      setRefreshing(false);
    }
  }, [ensurePackagesLoaded, reloadSmsFeatures]);

  const onUpdate = async () => {
    if (!features || isSubmitting || !hasChanges) {
      return;
    }

    if (enabledDraft && !features.senderId?.trim()) {
      show_Alert(
        'error',
        'Sender ID required',
        'Need to register your shop name to activate. Please contact admin.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    try {
      const response = await dispatch(
        manageSmsFeature_Service({ enabled: enabledDraft }),
      ).unwrap();

      setRefreshing(true);
      await Promise.all([
        reloadSmsFeatures({ silent: true }),
        ensurePackagesLoaded(),
      ]);

      show_Alert(
        'success',
        'Updated',
        response.message || 'SMS settings updated successfully.',
        1,
        false,
        'OK',
        () => {},
      );
    } catch (error: unknown) {
      setRefreshing(true);
      await Promise.all([
        reloadSmsFeatures({ silent: true }),
        ensurePackagesLoaded(),
      ]);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Update failed',
        getApiErrorMessage(error, 'Could not update SMS settings. Please try again.'),
        2,
        false,
        'Try again',
        () => {
          void onUpdate();
        },
        'Cancel',
        () => {},
      );
    } finally {
      setRefreshing(false);
    }
  };

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
          title="SMS activation"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading SMS settings…
            </Text>
          </View>
        ) : !features ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={40} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
              Could not load SMS settings
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: primary }]}
              onPress={() => {
                void loadSmsFeatures();
              }}
              activeOpacity={0.9}
              disabled={fetchLoading}
            >
              {fetchLoading ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <Text style={[styles.retryButtonText, { color: paperTheme.colors.onPrimary }]}>
                  Retry
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[
                sharedStyles.scroll,
                hasChanges && styles.scrollWithFooter,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={primary}
                  colors={[primary]}
                />
              }
            >
              {showSmsDetails ? (
                <View
                  style={[
                    styles.renewalCard,
                    {
                      backgroundColor: paperTheme.colors.surface,
                      borderColor: paperTheme.colors.outlineVariant,
                    },
                    cardShadow(resolvedTheme),
                  ]}
                >
                  <View
                    style={[
                      styles.renewalIconWrap,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={22} color={primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.renewalTitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Next SMS renewal
                    </Text>
                    <Text style={[styles.renewalValue, { color: paperTheme.colors.onSurface }]}>
                      {nextRenewalLabel ?? 'Not scheduled yet'}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View style={styles.statusRow}>
                  <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    SMS status
                  </Text>
                  <SettingsBadge label={statusMeta.label} tone={statusMeta.tone} paperTheme={paperTheme} />
                </View>
                {features.senderId ? (
                  <View style={styles.statusRow}>
                    <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Sender ID
                    </Text>
                    <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>
                      {features.senderId}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.packageSelectHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Need to register your shop name to activate. Please contact admin.
                  </Text>
                )}
              </View>

              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                SMS feature
              </Text>

              <View
                style={[
                  styles.moduleCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: enabledDraft ? '#1d4ed8' : paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                {enabledDraft ? <View style={[styles.accentBar, { backgroundColor: '#1d4ed8' }]} /> : null}
                <View style={styles.moduleTopRow}>
                  <View style={[styles.moduleIconWrap, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="#1d4ed8" />
                  </View>
                  <View style={styles.moduleText}>
                    <Text style={[styles.moduleTitle, { color: paperTheme.colors.onSurface }]}>
                      Digital receipt SMS
                    </Text>
                    <Text style={[styles.moduleDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Send receipt links to customers by SMS after checkout.
                    </Text>
                  </View>
                </View>

                <BooleanRadioToggle
                  value={enabledDraft}
                  onChange={setEnabledDraft}
                  disabled={isSubmitting}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              </View>

              {showSmsDetails ? (
                <>
                  <View
                    style={[
                      styles.summaryCard,
                      {
                        backgroundColor: paperTheme.colors.surface,
                        borderColor: paperTheme.colors.outlineVariant,
                      },
                      cardShadow(resolvedTheme),
                    ]}
                  >
                    <Text style={[styles.summaryTitle, { color: paperTheme.colors.onSurface }]}>
                      Current package
                    </Text>
                    <Text style={[styles.currentPackageTitle, { color: paperTheme.colors.onSurface }]}>
                      {currentPackage
                        ? formatSmsPackageLabel(currentPackage)
                        : features.smsPackageType ?? 'Not assigned'}
                    </Text>
                    <Text style={[styles.packageSelectHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Assigned automatically based on your SMS usage this billing period.
                    </Text>
                    {currentPackage ? (
                      <View style={[styles.summaryRow, { marginTop: 12 }]}>
                        <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                          Monthly fee
                        </Text>
                        <Text style={[styles.summaryValueStrong, { color: paperTheme.colors.onSurface }]}>
                          {formatLkr(currentPackage.fee)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.usageCard,
                      {
                        backgroundColor: paperTheme.colors.surface,
                        borderColor: paperTheme.colors.outlineVariant,
                      },
                      cardShadow(resolvedTheme),
                    ]}
                  >
                    <Text style={[styles.summaryTitle, { color: paperTheme.colors.onSurface }]}>
                      Current usage
                    </Text>
                    <Text style={[styles.usageMetric, { color: primary }]}>
                      {(features.smsUsedInPeriod ?? 0).toLocaleString('en-LK')}
                    </Text>
                    <Text style={[styles.usageCaption, { color: paperTheme.colors.onSurfaceVariant }]}>
                      messages sent in the current SMS billing period
                    </Text>
                    {currentPackage ? (
                      <Text
                        style={[
                          styles.usageCaption,
                          { color: paperTheme.colors.onSurfaceVariant, marginTop: 6 },
                        ]}
                      >
                        Package allowance: up to{' '}
                        {(
                          currentPackage.maxMessageCount ?? currentPackage.messageCount
                        ).toLocaleString('en-LK')}{' '}
                        messages
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      borderColor: paperTheme.colors.outlineVariant,
                      backgroundColor: paperTheme.colors.surface,
                    },
                  ]}
                  onPress={() => {
                    setPackagesModalVisible(true);
                    void ensurePackagesLoaded();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.secondaryButtonText, { color: paperTheme.colors.onSurface }]}>
                    See SMS package prices
                  </Text>
                </TouchableOpacity>
              </View>
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
                        Update
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>

      <SmsPackagesModal
        visible={packagesModalVisible}
        loading={packagesLoading}
        packages={packages}
        selectedType={features?.smsPackageType ?? null}
        onClose={() => setPackagesModalVisible(false)}
        paperTheme={paperTheme}
      />

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
          />
        </Portal>
      ) : null}
    </>
  );
}
