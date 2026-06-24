import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { fonts } from '../../../../constants/fonts';
import { ONBOARDING_STEPS } from './onboardingConstants';
import { OnboardingStep } from '../../../../type/onboarding';

type Props = {
  currentStep: OnboardingStep;
};

export default function OnboardingStepIndicator({ currentStep }: Props) {
  const { paperTheme } = useTheme();

  return (
    <View style={styles.wrapper}>
      {ONBOARDING_STEPS.map((item, index) => {
        const isActive = item.step === currentStep;
        const isCompleted = item.step < currentStep;
        const isLast = index === ONBOARDING_STEPS.length - 1;

        return (
          <View key={item.step} style={styles.stepRow}>
            <View style={styles.stepColumn}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: isActive || isCompleted
                      ? paperTheme.colors.primary
                      : paperTheme.colors.surfaceVariant,
                    borderColor: isActive
                      ? paperTheme.colors.primary
                      : paperTheme.colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    {
                      color: isActive || isCompleted
                        ? paperTheme.colors.onPrimary
                        : paperTheme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {item.step}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isActive
                      ? paperTheme.colors.primary
                      : paperTheme.colors.onSurfaceVariant,
                    fontFamily: isActive ? fonts.PoppinsSemiBold : fonts.PoppinsRegular,
                  },
                ]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: isCompleted
                      ? paperTheme.colors.primary
                      : paperTheme.colors.surfaceVariant,
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  stepRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 72,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  circleText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 1,
  },
  connector: {
    height: 2,
    flex: 1,
    marginTop: 15,
    marginHorizontal: 4,
    borderRadius: 1,
  },
});
