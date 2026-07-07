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
  updateShopSmsFeatures_Service,
} from '../../../../../services/ShopOnboardingService';
import type { ShopSmsFeaturesPayload, SmsPackage } from '../../../../../type/shopOnboarding';
import { formatLkr, formatLkrDecimal, SMS_PRICE_PER_MESSAGE_LKR } from '../../../../../type/onboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../../shared/settingsDetailStyles';
import { manageSmsFeatureStyles as styles } from './manageSmsFeatureStyles';
import SmsPackagesModal from './SmsPackagesModal';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageSmsFeature'>;

type SmsFormState = {
  sendReceiptSms: boolean;
  smsPackageType: string | null;
};

function isSmsFeatureEnabled(status?: string | null): boolean {
  return Boolean(status && status !== 'disabled');
}

function featuresToForm(features: ShopSmsFeaturesPayload): SmsFormState {
  return {
    sendReceiptSms: isSmsFeatureEnabled(features.smsFeatureStatus),
    smsPackageType: features.smsPackageType,
  };
}

function buildSnapshot(form: SmsFormState): string {
  return JSON.stringify(form);
}

function formatBillingDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function calculateUsageCharge(
  used: number,
  packageType: string | null,
  packages: SmsPackage[],
): number {
  const selectedPackage = packages.find((pkg) => pkg.type === packageType);
  const allowance = selectedPackage?.messageCount ?? 0;
  const overage = Math.max(0, used - allowance);
  return overage * SMS_PRICE_PER_MESSAGE_LKR;
}

function BooleanRadioToggle({
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
              },
              selected && cardShadow(resolvedTheme),
            ]}
            onPress={() => onChange(option.enabled)}
            activeOpacity={0.85}
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
  const { loading: updateLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.updateSmsFeatures,
  );
  const packages = useSelector(
    (state: RootState) => state.shopOnboarding.smsPackages.data?.packages ?? [],
  );
  const packagesLoading = useSelector(
    (state: RootState) => state.shopOnboarding.smsPackages.loading,
  );

  const [features, setFeatures] = useState<ShopSmsFeaturesPayload | null>(null);
  const [form, setForm] = useState<SmsFormState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [packagesModalVisible, setPackagesModalVisible] = useState(false);
  const [packageSelectionMode, setPackageSelectionMode] = useState(false);

  const currentSnapshot = useMemo(() => (form ? buildSnapshot(form) : ''), [form]);
  const hasChanges = Boolean(form) && currentSnapshot !== savedSnapshot;
  const isSubmitting = updateLoading;
  const showLoader = fetchLoading && !features;

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.type === form?.smsPackageType) ?? null,
    [form?.smsPackageType, packages],
  );

  const nextRenewalLabel = formatBillingDate(features?.smsNextRenewalDate);
  const usageCharge = features
    ? calculateUsageCharge(features.smsUsedInPeriod, form?.smsPackageType ?? null, packages)
    : 0;
  const isSmsActive = Boolean(form?.sendReceiptSms);

  const applyLoadedFeatures = useCallback((loaded: ShopSmsFeaturesPayload) => {
    const nextForm = featuresToForm(loaded);
    setFeatures(loaded);
    setForm(nextForm);
    setSavedSnapshot(buildSnapshot(nextForm));
  }, []);

  const loadSmsFeatures = useCallback(async () => {
    if (!shopId) {
      setTimeout(() => {
        show_Alert('error', 'Error', 'Shop not found. Please log in again.', 1, false, 'OK', () => {});
      }, 150);
      return;
    }

    try {
      const response = await dispatch(fetchShopSmsFeatures_Service(String(shopId))).unwrap();
      applyLoadedFeatures(response.features);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load SMS settings. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadSmsFeatures();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [applyLoadedFeatures, dispatch, shopId, show_Alert]);

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
      );
    }
  }, [dispatch, packages.length, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadSmsFeatures();
      void ensurePackagesLoaded();
    }, [ensurePackagesLoaded, loadSmsFeatures]),
  );

  const openPackagesModal = (selectionMode: boolean) => {
    setPackageSelectionMode(selectionMode);
    setPackagesModalVisible(true);
    void ensurePackagesLoaded();
  };

  const handlePackageSelect = (pkg: SmsPackage) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            sendReceiptSms: true,
            smsPackageType: pkg.type,
          }
        : prev,
    );
    setPackagesModalVisible(false);
  };

  const onUpdate = async () => {
    if (!form || !shopId || isSubmitting || !hasChanges) {
      return;
    }

    if (form.sendReceiptSms && !form.smsPackageType) {
      show_Alert(
        'error',
        'Package required',
        'Please select an SMS package before activating receipt SMS.',
        2,
        false,
        'Choose package',
        () => openPackagesModal(true),
        'Cancel',
        () => {},
      );
      return;
    }

    try {
      const response = await dispatch(
        updateShopSmsFeatures_Service({
          shopId: String(shopId),
          sendReceiptSms: form.sendReceiptSms,
          ...(form.sendReceiptSms ? { smsPackageType: form.smsPackageType } : {}),
        }),
      ).unwrap();

      applyLoadedFeatures(response.features);
      dispatch(
        patchLoginShopData({
          sendReceiptSms: form.sendReceiptSms,
        }),
      );

      show_Alert('success', 'Updated', response.message || 'SMS settings updated successfully.');
    } catch (error: unknown) {
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
        ) : !features || !form ? (
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
              contentContainerStyle={[sharedStyles.scroll, hasChanges && styles.scrollWithFooter]}
              showsVerticalScrollIndicator={false}
            >
              {nextRenewalLabel ? (
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
                      Next SMS payment date
                    </Text>
                    <Text style={[styles.renewalValue, { color: paperTheme.colors.onSurface }]}>
                      {nextRenewalLabel}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                SMS feature
              </Text>

              <View
                style={[
                  styles.moduleCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: isSmsActive ? '#1d4ed8' : paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                {isSmsActive ? <View style={[styles.accentBar, { backgroundColor: '#1d4ed8' }]} /> : null}
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
                  value={form.sendReceiptSms}
                  onChange={(enabled) => {
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            sendReceiptSms: enabled,
                            smsPackageType: enabled ? prev.smsPackageType : null,
                          }
                        : prev,
                    );
                  }}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />

                {form.sendReceiptSms ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.packageSelectButton,
                        {
                          borderColor: paperTheme.colors.outlineVariant,
                          backgroundColor: paperTheme.colors.surfaceVariant,
                        },
                      ]}
                      onPress={() => openPackagesModal(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.packageSelectText, { color: paperTheme.colors.onSurface }]}>
                        {selectedPackage
                          ? `${selectedPackage.messageCount.toLocaleString('en-LK')} messages · ${formatLkr(selectedPackage.fee)}/mo`
                          : 'Select SMS package'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={paperTheme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <Text style={[styles.packageSelectHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Choose the monthly SMS package that matches your shop volume.
                    </Text>
                  </>
                ) : null}
              </View>

              {isSmsActive ? (
                <>
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
                      messages used in the current SMS billing period
                    </Text>
                  </View>

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
                      Billing summary
                    </Text>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                        Monthly package fee
                      </Text>
                      <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>
                        {features.smsPackageAmount != null
                          ? formatLkr(features.smsPackageAmount)
                          : selectedPackage
                            ? formatLkr(selectedPackage.fee)
                            : '—'}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                        Per-message rate
                      </Text>
                      <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>
                        {formatLkrDecimal(SMS_PRICE_PER_MESSAGE_LKR)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                        Usage charge
                      </Text>
                      <Text style={[styles.summaryValueStrong, { color: paperTheme.colors.onSurface }]}>
                        {formatLkrDecimal(usageCharge, 2)}
                      </Text>
                    </View>
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
                  onPress={() => openPackagesModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.secondaryButtonText, { color: paperTheme.colors.onSurface }]}>
                    See SMS packages
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
                  You have unsaved SMS changes
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
                      <Ionicons name="save-outline" size={20} color={paperTheme.colors.onPrimary} />
                      <Text style={[styles.updateButtonText, { color: paperTheme.colors.onPrimary }]}>
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
        selectedType={form?.smsPackageType ?? null}
        selectionMode={packageSelectionMode}
        onClose={() => setPackagesModalVisible(false)}
        onSelect={handlePackageSelect}
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
