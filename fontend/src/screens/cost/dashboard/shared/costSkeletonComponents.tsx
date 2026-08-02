import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { dashboardTabStyles as tabStyles } from '../tabs/dashboard/dashboardTabStyles';
import { costCategoryStyles } from '../tabs/dashboard/categories/costCategoryStyles';
import { costDashboardStyles as historyStyles } from './costDashboardStyles';
import { expenseDetailStyles } from '../tabs/history/expenseDetail/expenseDetailStyles';

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

export function CostOverviewSkeleton({
  boneColor,
  cardColor,
  borderColor,
  categoryCount = 3,
}: {
  boneColor: string;
  cardColor: string;
  borderColor: string;
  categoryCount?: number;
}) {
  const pulse = useSkeletonPulse();

  return (
    <View style={skeletonStyles.overviewWrap}>
      <View style={[tabStyles.overviewHero, { backgroundColor: cardColor, borderColor }]}>
        <SkeletonBone width="38%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
        <View style={tabStyles.heroTitleRow}>
          <View style={[tabStyles.heroTitleBlock, { gap: 8 }]}>
            <SkeletonBone width="72%" height={22} borderRadius={8} color={boneColor} opacity={pulse} />
            <SkeletonBone width="90%" height={13} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
          <SkeletonBone width={52} height={52} borderRadius={16} color={boneColor} opacity={pulse} />
        </View>
        <SkeletonBone width="100%" height={56} borderRadius={18} color={boneColor} opacity={pulse} />
      </View>

      <View style={tabStyles.statGrid}>
        {[0, 1].map((index) => (
          <View
            key={`stat-${index}`}
            style={[tabStyles.statChip, { backgroundColor: cardColor, borderColor }]}
          >
            <SkeletonBone width={34} height={34} borderRadius={10} color={boneColor} opacity={pulse} />
            <SkeletonBone width="55%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="40%" height={20} borderRadius={8} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>

      {Array.from({ length: categoryCount }, (_, index) => (
        <View
          key={`category-${index}`}
          style={[tabStyles.categoryCard, { backgroundColor: cardColor, borderColor }]}
        >
          <View style={tabStyles.categoryTopRow}>
            <SkeletonBone width={44} height={44} borderRadius={14} color={boneColor} opacity={pulse} />
            <View style={[tabStyles.categoryBody, { gap: 6 }]}>
              <SkeletonBone width="68%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
              <SkeletonBone width="42%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            </View>
            <SkeletonBone width={72} height={15} borderRadius={8} color={boneColor} opacity={pulse} />
          </View>
          <SkeletonBone width="100%" height={8} borderRadius={999} color={boneColor} opacity={pulse} />
          <View style={tabStyles.progressFooter}>
            <SkeletonBone width={36} height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="38%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CostHistoryListSkeleton({
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
            historyStyles.historyRecordCard,
            skeletonStyles.historyCardSpacing,
            { backgroundColor: cardColor, borderColor },
          ]}
        >
          <View style={historyStyles.historyRecordTop}>
            <SkeletonBone width={40} height={40} borderRadius={12} color={boneColor} opacity={pulse} />
            <View style={[historyStyles.historyRecordTitleBlock, { gap: 6 }]}>
              <SkeletonBone width="78%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
              <SkeletonBone width="52%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            </View>
            <View style={[historyStyles.historyRecordTrailing, { gap: 6 }]}>
              <SkeletonBone width={72} height={16} borderRadius={8} color={boneColor} opacity={pulse} />
              <SkeletonBone width={18} height={18} borderRadius={9} color={boneColor} opacity={pulse} />
            </View>
          </View>
          <SkeletonBone width="38%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
        </View>
      ))}
    </View>
  );
}

export function CostCategoryListSkeleton({
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
    <View style={skeletonStyles.categoryList}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`category-${index}`}
          style={[
            costCategoryStyles.card,
            skeletonStyles.categoryCardSpacing,
            { backgroundColor: cardColor, borderColor },
          ]}
        >
          <SkeletonBone width={44} height={44} borderRadius={14} color={boneColor} opacity={pulse} />
          <View style={[costCategoryStyles.cardBody, { gap: 6 }]}>
            <SkeletonBone width="62%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
            <SkeletonBone width="78%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="42%" height={20} borderRadius={10} color={boneColor} opacity={pulse} />
          </View>
          <SkeletonBone width={36} height={36} borderRadius={12} color={boneColor} opacity={pulse} />
        </View>
      ))}
    </View>
  );
}

export function CostCategoryFormSkeleton({
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
    <View style={skeletonStyles.formWrap}>
      <View style={[costCategoryStyles.previewCard, { backgroundColor: cardColor, borderColor }]}>
        <SkeletonBone width={44} height={44} borderRadius={14} color={boneColor} opacity={pulse} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBone width="58%" height={16} borderRadius={8} color={boneColor} opacity={pulse} />
          <SkeletonBone width="34%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
        </View>
      </View>

      <View
        style={[
          costCategoryStyles.formSection,
          { backgroundColor: cardColor, borderColor, gap: 12 },
        ]}
      >
        <SkeletonBone width="42%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
        <SkeletonBone width="100%" height={48} borderRadius={12} color={boneColor} opacity={pulse} />
        <SkeletonBone width="34%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
        <View style={skeletonStyles.colorGrid}>
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonBone
              key={`color-${index}`}
              width={36}
              height={36}
              borderRadius={18}
              color={boneColor}
              opacity={pulse}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function CostExpenseDetailSkeleton({
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
    <View style={skeletonStyles.detailWrap}>
      <View style={[expenseDetailStyles.heroCard, { backgroundColor: cardColor, borderColor, gap: 10 }]}>
        <SkeletonBone width="48%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
        <SkeletonBone width="82%" height={24} borderRadius={8} color={boneColor} opacity={pulse} />
        <SkeletonBone width="56%" height={13} borderRadius={6} color={boneColor} opacity={pulse} />
        <SkeletonBone width="38%" height={28} borderRadius={10} color={boneColor} opacity={pulse} />
      </View>

      <View style={expenseDetailStyles.statsRow}>
        {[0, 1, 2].map((index) => (
          <View
            key={`stat-${index}`}
            style={[expenseDetailStyles.statChip, { backgroundColor: cardColor, borderColor }]}
          >
            <SkeletonBone width={32} height={32} borderRadius={10} color={boneColor} opacity={pulse} />
            <SkeletonBone width="70%" height={10} borderRadius={5} color={boneColor} opacity={pulse} />
            <SkeletonBone width="85%" height={12} borderRadius={6} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>

      <View style={[expenseDetailStyles.sectionCard, { backgroundColor: cardColor, borderColor }]}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={`field-${index}`} style={skeletonStyles.detailField}>
            <SkeletonBone width="34%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
            <SkeletonBone width="100%" height={46} borderRadius={12} color={boneColor} opacity={pulse} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CostCategoryModalSkeleton({
  boneColor,
  count = 5,
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
  overviewWrap: {
    gap: 14,
  },
  historyList: {
    paddingTop: 2,
  },
  historyCardSpacing: {
    marginBottom: 10,
  },
  categoryList: {
    paddingTop: 2,
  },
  categoryCardSpacing: {
    marginBottom: 12,
  },
  formWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  detailField: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  modalList: {
    paddingVertical: 8,
  },
  modalRowSpacing: {
    marginBottom: 10,
  },
});
