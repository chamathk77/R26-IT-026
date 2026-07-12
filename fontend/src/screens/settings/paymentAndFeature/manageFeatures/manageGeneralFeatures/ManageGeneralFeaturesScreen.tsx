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
  fetchShopModuleFeatures_Service,
  updateShopModuleFeatures_Service,
} from '../../../../../services/ShopOnboardingService';
import { ONBOARDING_MODULE_OPTIONS } from '../../../../loginScreens/onboarding/screens/onboardingConstants';
import { OnboardingModuleKey, OnboardingModulesState } from '../../../../../type/onboarding';
import type { OnboardingShopFeaturesPayload } from '../../../../../type/shopOnboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../../shared/settingsDetailStyles';
import { FEATURE_ACCENTS, manageGeneralFeaturesStyles as styles } from './manageGeneralFeaturesStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageGeneralFeatures'>;

function modulesFromApi(features: OnboardingShopFeaturesPayload): OnboardingModulesState {
  return {
    kpi: features.kpi,
    analyticsModule: features.analyticsModule,
    customerManualOrder: features.customerManualOrder,
    costModule: features.costModule,
    marketingModule: features.marketingModule,
  };
}

function buildSnapshot(modules: OnboardingModulesState): string {
  return JSON.stringify(modules);
}

function ModuleRadioToggle({
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

function ModuleFeatureCard({
  title,
  description,
  icon,
  accentKey,
  enabled,
  onChange,
  paperTheme,
  resolvedTheme,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentKey: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const accent = FEATURE_ACCENTS[accentKey] ?? FEATURE_ACCENTS.kpi;

  return (
    <View
      style={[
        styles.moduleCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: enabled ? accent.activeBorder : paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      {enabled ? <View style={[styles.accentBar, { backgroundColor: accent.activeBorder }]} /> : null}
      <View style={styles.moduleTopRow}>
        <View style={[styles.moduleIconWrap, { backgroundColor: accent.iconBg }]}>
          <Ionicons name={icon} size={22} color={accent.iconColor} />
        </View>
        <View style={styles.moduleText}>
          <Text style={[styles.moduleTitle, { color: paperTheme.colors.onSurface }]}>
            {title}
          </Text>
          <Text style={[styles.moduleDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
        </View>
      </View>
      <ModuleRadioToggle
        value={enabled}
        onChange={onChange}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />
    </View>
  );
}

export default function ManageGeneralFeaturesScreen({ navigation }: Props) {
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
    (state: RootState) => state.shopOnboarding.shopModuleFeatures,
  );
  const { loading: updateLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.updateModuleFeatures,
  );

  const [modules, setModules] = useState<OnboardingModulesState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');

  const currentSnapshot = useMemo(() => {
    if (!modules) return '';
    return buildSnapshot(modules);
  }, [modules]);

  const hasChanges = Boolean(modules) && currentSnapshot !== savedSnapshot;
  const isSubmitting = updateLoading;
  const showLoader = fetchLoading && !modules;

  const applyLoadedModules = useCallback((features: OnboardingShopFeaturesPayload) => {
    const loaded = modulesFromApi(features);
    setModules(loaded);
    setSavedSnapshot(buildSnapshot(loaded));
  }, []);

  const loadModules = useCallback(async () => {
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
      const response = await dispatch(fetchShopModuleFeatures_Service(String(shopId))).unwrap();
      applyLoadedModules(response.features);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load module features. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadModules();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [applyLoadedModules, dispatch, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadModules();
    }, [loadModules]),
  );

  const setModuleValue = (key: OnboardingModuleKey, enabled: boolean) => {
    setModules((prev) => (prev ? { ...prev, [key]: enabled } : prev));
  };

  const onUpdate = async () => {
    if (!modules || !shopId || isSubmitting || !hasChanges) {
      return;
    }

    try {
      const response = await dispatch(
        updateShopModuleFeatures_Service({
          shopId: String(shopId),
          kpi: modules.kpi,
          analyticsModule: modules.analyticsModule,
          customerManualOrder: modules.customerManualOrder,
          costModule: modules.costModule,
          marketingModule: modules.marketingModule,
        }),
      ).unwrap();

      dispatch(
        patchLoginShopData({
          kpi: response.features.kpi,
          analyticsModule: response.features.analyticsModule,
          customerManualOrder: response.features.customerManualOrder,
          costModule: response.features.costModule,
          marketingModule: response.features.marketingModule,
        }),
      );

      navigation.goBack();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Update failed',
        getApiErrorMessage(error, 'Could not update module features. Please try again.'),
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
          title="General features"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading module features…
            </Text>
          </View>
        ) : !modules ? (
          <View style={styles.centered}>
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
              Could not load features
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: primary }]}
              onPress={() => {
                void loadModules();
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
            >
              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Modules
              </Text>

              {ONBOARDING_MODULE_OPTIONS.map((item) => (
                <ModuleFeatureCard
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  icon={item.icon as keyof typeof Ionicons.glyphMap}
                  accentKey={item.key}
                  enabled={modules[item.key]}
                  onChange={(next) => setModuleValue(item.key, next)}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              ))}
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
