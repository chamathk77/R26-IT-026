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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { fonts } from '../../../../constants/fonts';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import OnboardingStepIndicator from './OnboardingStepIndicator';
import { onboardingStyles as s } from '../styles/onboardingStyles';
import { SUBSCRIPTION_OPTIONS } from './onboardingConstants';
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
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isSelected
                          ? paperTheme.colors.primaryContainer
                          : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={paperTheme.colors.primary}
                    />
                  </View>
                  <View style={styles.planText}>
                    <Text style={[styles.planTitle, { color: paperTheme.colors.onSurface }]}>
                      {option.title}
                    </Text>
                    <Text
                      style={[styles.planDesc, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      {option.description}
                    </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: {
    flex: 1,
    minWidth: 0,
  },
  planTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  planDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
});
