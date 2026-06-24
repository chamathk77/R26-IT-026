import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { fonts } from '../../../../constants/fonts';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './OnboardingStepIndicator';
import { onboardingStyles as s } from '../styles/onboardingStyles';
import { formatSubscriptionRs, SUBSCRIPTION_OPTIONS } from './onboardingConstants';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { SubscriptionType } from '../../../../type/onboarding';
import { setSubscription_Service } from '../../../../services/ShopOnboardingService';
import { AppDispatch, RootState } from '../../../../store/store';
import { getApiErrorMessage, parseApiError } from '../../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectSubscriptionScreen'>;

export default function SelectSubscriptionScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { ownerData } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const setSubscriptionLoading = useSelector(
    (state: RootState) => state.shopOnboarding.setSubscription.loading,
  );
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);

  const onContinue = async () => {
    if (setSubscriptionLoading) {
      return;
    }

    if (!selectedType) {
      show_Alert(
        'error',
        'Validation',
        'Please select a subscription plan to continue.',
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
        'Shop id is missing. Please go back and complete previous steps.',
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
        setSubscription_Service({
          shopId: ownerData.shopId,
          subscriptionType: selectedType,
        }),
      ).unwrap();

      show_Alert(
        'success',
        'Onboarding Success',
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
      console.log('error in select subscription screen', parseApiError(error));
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Could not save subscription. Please try again.'),
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
          title="Select subscription"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={s.container}>
          <OnboardingStepIndicator currentStep={5} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            <Text style={[s.heading, { color: paperTheme.colors.onSurface }]}>
              Choose your plan
            </Text>
            <Text style={[s.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
              Select a subscription period for {ownerData.shopName}. You can manage billing later
              from settings.
            </Text>

            {SUBSCRIPTION_OPTIONS.map((option) => {
              const isSelected = selectedType === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedType(option.id)}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: paperTheme.colors.surface,
                      borderColor: isSelected
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outline,
                    },
                    isSelected && {
                      borderWidth: 2,
                      backgroundColor: paperTheme.colors.primaryContainer,
                    },
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planTitle, { color: paperTheme.colors.onSurface }]}>
                        {option.title}
                      </Text>
                      {option.isBestValue ? (
                        <View
                          style={[
                            styles.bestValueBadge,
                            { backgroundColor: paperTheme.colors.primary },
                          ]}
                        >
                          <Text
                            style={[styles.bestValueText, { color: paperTheme.colors.onPrimary }]}
                          >
                            Best Value
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: isSelected
                            ? paperTheme.colors.primary
                            : paperTheme.colors.outline,
                        },
                      ]}
                    >
                      {isSelected ? (
                        <View
                          style={[styles.radioInner, { backgroundColor: paperTheme.colors.primary }]}
                        />
                      ) : null}
                    </View>
                  </View>

                  <Text style={[styles.totalPrice, { color: paperTheme.colors.onSurface }]}>
                    {formatSubscriptionRs(option.totalPrice)}
                  </Text>

                  {option.perMonthPrice != null ? (
                    <Text
                      style={[styles.perMonthPrice, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      {formatSubscriptionRs(option.perMonthPrice)}/month
                    </Text>
                  ) : null}

                  {option.savings != null ? (
                    <View
                      style={[
                        styles.savingsBadge,
                        {
                          backgroundColor:
                            resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.18)' : '#ecfdf3',
                        },
                      ]}
                    >
                      <Text style={styles.savingsText}>
                        Save {formatSubscriptionRs(option.savings)}
                      </Text>
                    </View>
                  ) : null}

                  <Text
                    style={[styles.validityLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    {option.validityLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              s.primaryButton,
              { backgroundColor: paperTheme.colors.primary },
              setSubscriptionLoading && styles.primaryButtonDisabled,
            ]}
            onPress={() => void onContinue()}
            activeOpacity={0.9}
            disabled={setSubscriptionLoading}
          >
            {setSubscriptionLoading ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[s.primaryButtonText, { color: paperTheme.colors.onPrimary }]}>
                Complete onboarding
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
  planCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  planTitleRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  bestValueBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestValueText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  totalPrice: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 4,
  },
  perMonthPrice: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  savingsText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#15803d',
  },
  validityLabel: {
    fontFamily: fonts.InterRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
});
