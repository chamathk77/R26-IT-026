import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { fonts } from '../../../../constants/fonts';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './OnboardingStepIndicator';
import { onboardingStyles as s } from '../styles/onboardingStyles';
import {
  createDefaultOnboardingModules,
  ONBOARDING_MODULE_OPTIONS,
} from './onboardingConstants';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { OnboardingModuleKey, OnboardingModulesState } from '../../../../type/onboarding';
import { onboardingShopFeatures_Service } from '../../../../services/ShopOnboardingService';
import { AppDispatch, RootState } from '../../../../store/store';
import { getApiErrorMessage, parseApiError } from '../../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectFeaturesScreen'>;

export default function SelectFeaturesScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { ownerData } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const updateFeaturesLoading = useSelector(
    (state: RootState) => state.shopOnboarding.updateFeatures.loading,
  );
  const isSubmitting = updateFeaturesLoading;
  const [modules, setModules] = useState<OnboardingModulesState>(createDefaultOnboardingModules);

  const toggleModule = (key: OnboardingModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onContinue = async () => {
    if (isSubmitting) {
      return;
    }

    const hasSelection = Object.values(modules).some(Boolean);
    if (!hasSelection) {
      show_Alert(
        'error',
        'Validation',
        'Please select at least one module to continue.',
        1,
        true,
        'OK',
        () => {},
      );
      return;
    }

    if (!ownerData.shopId?.trim()) {
      show_Alert(
        'error',
        'Error',
        'Shop id is missing. Please go back and complete shop details again.',
        1,
        true,
        'OK',
        () => {},
      );
      return;
    }

    try {
      Keyboard.dismiss();
      await dispatch(
        onboardingShopFeatures_Service({
          shopId: ownerData.shopId,
          kpi: modules.kpi,
          analyticsModule: modules.analyticsModule,
          customerManualOrder: modules.customerManualOrder,
          costModule: modules.costModule,
          marketingModule: modules.marketingModule,
        }),
      ).unwrap();

      show_Alert(
        'success',
        'Onboarding complete',
        'Your shop has been set up successfully. Please log in to continue.',
        1,
        false,
        'Go to Login',
        () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }],
          });
        },
      );
    } catch (error: unknown) {
      console.log('error in select features screen', parseApiError(error));
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Could not save shop features. Please try again.'),
        1,
        true,
        'OK',
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
      <SafeAreaView style={[s.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Select features"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={[s.container, styles.screenBody]}>
          <OnboardingStepIndicator currentStep={4} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[s.scrollContent, styles.scrollContent]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[s.heading, { color: paperTheme.colors.onSurface }]}>Choose modules</Text>
            <Text style={[s.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
              Enable the tools your shop needs. SMS and add-ons can be configured later in settings.
            </Text>

            {ONBOARDING_MODULE_OPTIONS.map((item) => {
              const enabled = modules[item.key];
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
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={() => toggleModule(item.key)}
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
          </ScrollView>

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
              <Text style={[s.primaryButtonText, { color: paperTheme.colors.onPrimary }]}>
                Complete setup
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
});
