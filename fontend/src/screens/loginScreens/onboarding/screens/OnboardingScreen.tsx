import React, { useCallback, useMemo } from 'react';
import {
  BackHandler,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { fonts } from '../../../../constants/fonts';
import { useTheme } from '../../../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingScreen'>;

const HORIZONTAL_PADDING = 24;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function OnboardingScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();

  const lottieSize = useMemo(
    () => Math.min(SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 32, 300),
    [],
  );

  const onLogin = () => {
    navigation.navigate('LoginScreen');
  };

  const onStartOnboarding = () => {
    navigation.navigate('OnboardOwnerScreen');
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const onHardwareBack = () => {
        BackHandler.exitApp();
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, []),
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
        translucent={false}
      />
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: paperTheme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.page}>
            <View style={styles.heroSection}>
              <View
                style={[
                  styles.lottieGlow,
                  {
                    width: lottieSize * 0.88,
                    height: lottieSize * 0.88,
                    borderRadius: lottieSize * 0.44,
                    backgroundColor: paperTheme.colors.primaryContainer,
                  },
                ]}
              />
              <View style={[styles.lottieFrame, { width: lottieSize, height: lottieSize }]}>
                <LottieView
                  source={require('../../../../../assets/Lottie/onboardLottie.json')}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
              </View>
            </View>

            <View style={styles.copySection}>
              <Text style={[styles.heading, { color: paperTheme.colors.onBackground }]}>
                Welcome to{'\n'}Smart Cost
              </Text>

              <View
                style={[
                  styles.taglinePill,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={paperTheme.colors.primary}
                  style={styles.taglineIcon}
                />
                <Text style={[styles.tagline, { color: paperTheme.colors.primary }]}>
                  All in one Mobile solution
                </Text>
              </View>

              <Text
                style={[styles.description, { color: paperTheme.colors.onSurfaceVariant }]}
              >
                Manage costs, point of sale, and business insights from one place. Sign in or
                create your profile to get started.
              </Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: paperTheme.colors.primary }]}
                onPress={onLogin}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Login to system"
              >
                <Text style={[styles.primaryButtonText, { color: paperTheme.colors.onPrimary }]}>
                  Login to system
                </Text>
                <Ionicons name="arrow-forward" size={18} color={paperTheme.colors.onPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outline,
                  },
                ]}
                onPress={onStartOnboarding}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Start onboarding"
              >
                <Text style={[styles.secondaryButtonText, { color: paperTheme.colors.onSurface }]}>
                  Start onboarding
                </Text>
                <Ionicons name="person-add-outline" size={18} color={paperTheme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 28,
    minHeight: '100%',
  },
  heroSection: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingTop: 12,
  },
  lottieGlow: {
    position: 'absolute',
    opacity: 0.55,
  },
  lottieFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  copySection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  taglinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 20,
  },
  taglineIcon: {
    marginRight: 6,
  },
  tagline: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  description: {
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    gap: 12,
    marginTop: 'auto',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#6E3A29',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  secondaryButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
});
