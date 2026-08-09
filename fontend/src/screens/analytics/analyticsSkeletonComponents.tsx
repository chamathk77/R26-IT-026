import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { analyticsStyles as styles } from './analyticsStyles';

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return pulse;
}

function SkeletonBone({
  width,
  height,
  borderRadius = 8,
  style,
  color,
  opacity,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
  color: string;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function AnalyticsOverviewSkeleton({
  boneColor,
  cardColor,
  borderColor,
}: {
  boneColor: string;
  cardColor: string;
  borderColor: string;
}) {
  const pulse = useSkeletonPulse();

  return (
    <View style={skeletonStyles.wrap}>
      <View style={[styles.heroCard, { backgroundColor: cardColor, borderColor, gap: 10 }]}>
        <SkeletonBone width="28%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
        <SkeletonBone width="62%" height={30} borderRadius={10} color={boneColor} opacity={pulse} />
        <View style={styles.heroMetaRow}>
          <SkeletonBone width={96} height={24} borderRadius={999} color={boneColor} opacity={pulse} />
          <SkeletonBone width={120} height={24} borderRadius={999} color={boneColor} opacity={pulse} />
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {[0, 1].map((index) => (
          <View
            key={`metric-${index}`}
            style={[styles.metricCard, { backgroundColor: cardColor, borderColor }]}
          >
            <SkeletonBone width={36} height={36} borderRadius={12} color={boneColor} opacity={pulse} />
            <SkeletonBone width="55%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="72%" height={18} borderRadius={8} color={boneColor} opacity={pulse} />
            <SkeletonBone width="48%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>

      <View style={[styles.insightCard, { backgroundColor: cardColor, borderColor, gap: 12 }]}>
        <SkeletonBone width="42%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
        {Array.from({ length: 4 }, (_, index) => (
          <View key={`insight-${index}`} style={styles.insightRow}>
            <SkeletonBone width="42%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="28%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
});
