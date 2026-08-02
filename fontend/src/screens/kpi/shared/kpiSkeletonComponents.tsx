import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { summaryTabStyles } from '../tabs/summary/summaryTabStyles';
import { historySummaryTabStyles as historyStyles } from '../tabs/historySummary/historySummaryTabStyles';
import { unassignedOrderDetailStyles as detailStyles } from '../unassignedOrder/unassignedOrderDetailStyles';

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

export function KpiSummarySkeleton({
  boneColor,
  cardColor,
  borderColor,
  personCount = 3,
}: {
  boneColor: string;
  cardColor: string;
  borderColor: string;
  personCount?: number;
}) {
  const pulse = useSkeletonPulse();

  return (
    <View style={skeletonStyles.wrap}>
      <View style={[summaryTabStyles.heroCard, { backgroundColor: cardColor, borderColor, gap: 12 }]}>
        <View style={summaryTabStyles.heroTopRow}>
          <View style={[summaryTabStyles.heroTitleBlock, { gap: 8 }]}>
            <SkeletonBone width="34%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="72%" height={22} borderRadius={8} color={boneColor} opacity={pulse} />
            <SkeletonBone width="88%" height={13} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
          <SkeletonBone width={48} height={48} borderRadius={16} color={boneColor} opacity={pulse} />
        </View>
        <SkeletonBone width="100%" height={56} borderRadius={14} color={boneColor} opacity={pulse} />
      </View>

      <View style={summaryTabStyles.statGrid}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={`stat-${index}`}
            style={[summaryTabStyles.statChip, { backgroundColor: cardColor, borderColor }]}
          >
            <SkeletonBone width={34} height={34} borderRadius={10} color={boneColor} opacity={pulse} />
            <SkeletonBone width="55%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="42%" height={16} borderRadius={8} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>

      <View style={summaryTabStyles.teamSection}>
        <SkeletonBone width="58%" height={16} borderRadius={8} color={boneColor} opacity={pulse} />
        <SkeletonBone width="72%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />

        {Array.from({ length: personCount }, (_, index) => (
          <View
            key={`person-${index}`}
            style={[summaryTabStyles.personCard, { backgroundColor: cardColor, borderColor }]}
          >
            <View style={[summaryTabStyles.personCardInner, { gap: 10 }]}>
              <View style={summaryTabStyles.personTopRow}>
                <SkeletonBone width={28} height={28} borderRadius={8} color={boneColor} opacity={pulse} />
                <SkeletonBone width={40} height={40} borderRadius={12} color={boneColor} opacity={pulse} />
                <View style={[summaryTabStyles.personBody, { gap: 6 }]}>
                  <SkeletonBone width="78%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
                  <SkeletonBone width="52%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
                </View>
                <SkeletonBone width={72} height={16} borderRadius={8} color={boneColor} opacity={pulse} />
              </View>
              <SkeletonBone width="100%" height={34} borderRadius={10} color={boneColor} opacity={pulse} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function KpiHistorySummaryListSkeleton({
  boneColor,
  cardColor,
  borderColor,
  count = 5,
}: {
  boneColor: string;
  cardColor: string;
  borderColor: string;
  count?: number;
}) {
  const pulse = useSkeletonPulse();

  return (
    <View style={skeletonStyles.historyList}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`history-${index}`}
          style={[
            historyStyles.recordCard,
            skeletonStyles.historyCardSpacing,
            { backgroundColor: cardColor, borderColor },
          ]}
        >
          <View style={historyStyles.recordTop}>
            <SkeletonBone width={38} height={38} borderRadius={12} color={boneColor} opacity={pulse} />
            <View style={[historyStyles.recordBody, { gap: 6 }]}>
              <SkeletonBone width="68%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
              <SkeletonBone width="52%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
              <SkeletonBone width="74%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            </View>
            <SkeletonBone width={64} height={14} borderRadius={7} color={boneColor} opacity={pulse} />
          </View>
          <View style={historyStyles.recordFooter}>
            <SkeletonBone width={72} height={22} borderRadius={999} color={boneColor} opacity={pulse} />
            <SkeletonBone width="28%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function KpiUnassignedOrderDetailSkeleton({
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
    <View style={detailStyles.scroll}>
      <View style={[detailStyles.heroCard, { backgroundColor: cardColor, borderColor, gap: 12 }]}>
        <SkeletonBone width={128} height={28} borderRadius={999} color={boneColor} opacity={pulse} />
        <SkeletonBone width="72%" height={24} borderRadius={8} color={boneColor} opacity={pulse} />
        <SkeletonBone width="58%" height={13} borderRadius={6} color={boneColor} opacity={pulse} />
        <SkeletonBone width="100%" height={52} borderRadius={14} color={boneColor} opacity={pulse} />
      </View>

      <View style={[detailStyles.section, { backgroundColor: cardColor, borderColor, gap: 12 }]}>
        <SkeletonBone width="38%" height={15} borderRadius={8} color={boneColor} opacity={pulse} />
        {Array.from({ length: 4 }, (_, index) => (
          <View key={`row-${index}`} style={detailStyles.detailRow}>
            <SkeletonBone width="34%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="42%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>

      <View style={[detailStyles.section, { backgroundColor: cardColor, borderColor, gap: 12 }]}>
        <SkeletonBone width="28%" height={15} borderRadius={8} color={boneColor} opacity={pulse} />
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBone
            key={`item-${index}`}
            width="100%"
            height={44}
            borderRadius={10}
            color={boneColor}
            opacity={pulse}
          />
        ))}
      </View>
    </View>
  );
}

export function KpiModalListSkeleton({
  boneColor,
  count = 4,
}: {
  boneColor: string;
  count?: number;
}) {
  const pulse = useSkeletonPulse();

  return (
    <View style={skeletonStyles.modalList}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBone
          key={`modal-${index}`}
          width="100%"
          height={52}
          borderRadius={14}
          color={boneColor}
          opacity={pulse}
          style={skeletonStyles.modalRowSpacing}
        />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  historyList: {
    paddingTop: 4,
  },
  historyCardSpacing: {
    marginBottom: 8,
  },
  modalList: {
    paddingVertical: 8,
  },
  modalRowSpacing: {
    marginBottom: 10,
  },
});
