import React, { useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import { fonts } from '../../../constants/fonts';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { onboardingStyles as s } from '../onboarding/styles/onboardingStyles';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { startTrial_Service } from '../../../services/TrialService';
import { AppDispatch, RootState, store } from '../../../store/store';
import { clearSavedToken, saveToken } from '../../../utils/secureStorage';
import {
  clearLoginSession,
  setLoginSession,
} from '../../../store/reducers/AuthReducer';
import { getApiErrorMessage, handleSessionExpiredApiError, parseApiError } from '../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'TrialDetailScreen'>;

const TRIAL_INCLUDED_FEATURES = [
  { key: 'pos', label: 'POS System' },
  { key: 'kpi', label: 'KPI (Key Performance Indicators)' },
  { key: 'costModule', label: 'Cost Module' },
  { key: 'analyticsModule', label: 'Analytics Module' },
  { key: 'customerManualOrder', label: 'Customer Manual Order' },
] as const;

const TRIAL_UNAVAILABLE_FEATURES = [
  'Marketing Module is not available in the trial version.',
  'Send SMS feature is not available now.',
] as const;

function formatTrialEndDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '—';
  }
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(isoDate);
  }
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TrialDetailScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const trialLoading = useSelector(
    (state: RootState) => state.TrialReducer.startTrial.loading,
  );

  const onStartTrial = useCallback(async () => {
    const { userData: currentUser, shopData: currentShop } =
      store.getState().AuthReducer.Login;
    const shopId =
      route.params.shopId ?? currentShop?.shopId ?? currentUser?.shopId;

    if (!shopId) {
      show_Alert(
        'error',
        'Error',
        'Shop not found. Please log in again.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    if (trialLoading) {
      return;
    }

    try {
      const response = await dispatch(
        startTrial_Service({ startTrial: true, shopId: String(shopId) }),
      ).unwrap();

      if (response.token) {
        await clearSavedToken();
        await saveToken(response.token);
      }

      dispatch(
        setLoginSession({
          user: currentUser
            ? { ...currentUser, isFirsttimeLogin: false }
            : currentUser,
          shop: currentShop
            ? {
                ...currentShop,
                shopId: response.shopId,
                status: response.status,
                isTrailStared: response.isTrailStared,
                isTrailCompleted: response.isTrailCompleted,
                trailStartDate:
                  response.trailStartDate ?? currentShop.trailStartDate,
                trailEndDate: response.trailEndDate ?? currentShop.trailEndDate,
              }
            : currentShop,
        }),
      );

      const goToPos = () => {
        navigation.reset({ index: 0, routes: [{ name: 'PosMain' }] });
      };
      const trialEndText = formatTrialEndDate(response.trailEndDate);

      show_Alert(
        'success',
        response.alreadyActive ? 'Trial active' : 'Trial started',
        response.alreadyActive
          ? `Your trial is already active. Trial ends on ${trialEndText}.`
          : `Your 14-day trial has started. Trial ends on ${trialEndText}.`,
        1,
        false,
        'Continue',
        goToPos,
      );
    } catch (error: unknown) {

      console.log('error in loadAddedSessions', error);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return; 
      console.log('error starting trial from detail screen', parseApiError(error));
      show_Alert(
        'error',
        'Trial failed',
        getApiErrorMessage(error, 'Could not start trial. Please try again.'),
        1,
        false,
        'OK',
        async () => {
          await clearSavedToken();
          dispatch(clearLoginSession());
          navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
        },
      );
    }
  }, [dispatch, navigation, route.params.shopId, show_Alert, trialLoading]);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[s.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Trial version"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[s.heading, { color: paperTheme.colors.onSurface }]}>
              Start your trial
            </Text>
            <Text style={[s.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
              Explore Smart Cost with a 14-day trial. Below are the features included in
              your trial version.
            </Text>

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outline,
                },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}
              >
                Included in trial
              </Text>
              {TRIAL_INCLUDED_FEATURES.map((feature) => (
                <View key={feature.key} style={styles.featureRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#15803d"
                    style={styles.featureIcon}
                  />
                  <Text
                    style={[styles.featureText, { color: paperTheme.colors.onSurface }]}
                  >
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.sectionCard,
                styles.unavailableCard,
                {
                  backgroundColor:
                    resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
                  borderColor: resolvedTheme === 'dark' ? '#7f1d1d' : '#fecaca',
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: '#b91c1c' }]}>
                Not available in trial
              </Text>
              {TRIAL_UNAVAILABLE_FEATURES.map((message) => (
                <View key={message} style={styles.featureRow}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#dc2626"
                    style={styles.featureIcon}
                  />
                  <Text style={[styles.unavailableText, { color: '#991b1b' }]}>
                    {message}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              s.primaryButton,
              { backgroundColor: paperTheme.colors.primary },
              trialLoading && styles.primaryButtonDisabled,
            ]}
            onPress={() => void onStartTrial()}
            activeOpacity={0.9}
            disabled={trialLoading}
          >
            {trialLoading ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[s.primaryButtonText, { color: paperTheme.colors.onPrimary }]}>
                Start trial
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  unavailableCard: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  featureIcon: {
    marginTop: 1,
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  unavailableText: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
});
