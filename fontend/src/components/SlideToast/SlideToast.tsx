import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../constants/fonts';

type SlideToastProps = {
  message: string | null;
  onDismiss: () => void;
  paperTheme: MD3Theme;
  durationMs?: number;
  tone?: 'default' | 'success';
};

const SLIDE_OFFSET = -120;

export default function SlideToast({
  message,
  onDismiss,
  paperTheme,
  durationMs = 2000,
  tone = 'default',
}: SlideToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    translateY.setValue(SLIDE_OFFSET);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SLIDE_OFFSET,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, durationMs);

    return () => clearTimeout(hideTimer);
  }, [durationMs, message, onDismiss, opacity, translateY]);

  if (!message) return null;

  const isSuccess = tone === 'success';
  const backgroundColor = isSuccess ? '#dcfce7' : paperTheme.colors.primaryContainer;
  const borderColor = isSuccess ? '#86efac' : `${paperTheme.colors.primary}44`;
  const iconColor = isSuccess ? '#15803d' : paperTheme.colors.primary;
  const textColor = isSuccess ? '#166534' : paperTheme.colors.onPrimaryContainer;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor,
            borderColor,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={18} color={iconColor} />
        <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  message: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    lineHeight: 20,
  },
});
