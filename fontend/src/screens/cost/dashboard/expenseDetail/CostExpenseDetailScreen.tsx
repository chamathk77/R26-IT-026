import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import { useTheme } from '../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import {
  fetchCostExpenseById_Service,
  getCostExpenseImageUrl,
} from '../../../../services/CostExpenseService';
import { AppDispatch, RootState } from '../../../../store/store';
import { CostExpense } from '../../../../type/costExpense';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import {
  SettingsDetailRow,
  SettingsEmptyState,
  SettingsSection,
} from '../../../settings/shared/SettingsDetailComponents';
import { cardShadow } from '../../../settings/shared/settingsDetailStyles';
import { formatCostAmount } from '../shared/costDashboardMockData';
import { expenseDetailShadow, expenseDetailStyles as styles } from './expenseDetailStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'CostExpenseDetail'>;

function formatExpenseDate(isoDate?: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getCategoryName(expense: CostExpense): string {
  if (typeof expense.categoryId === 'object' && expense.categoryId?.name) {
    return expense.categoryId.name;
  }
  return expense.categoryName || 'Uncategorized';
}

function getCategoryColor(expense: CostExpense, fallback: string): string {
  if (typeof expense.categoryId === 'object' && expense.categoryId?.colorCode) {
    return expense.categoryId.colorCode;
  }
  return fallback;
}

function getCreatedByName(expense: CostExpense): string {
  if (typeof expense.createdBy === 'object' && expense.createdBy?.name) {
    return expense.createdBy.name;
  }
  return '—';
}

function StatChip({
  icon,
  label,
  value,
  paperTheme,
  resolvedTheme,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
  tint?: string;
}) {
  const accent = tint ?? paperTheme.colors.primary;

  return (
    <View
      style={[
        styles.statChip,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, { color: paperTheme.colors.onSurface }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function ExpenseHero({
  expense,
  paperTheme,
  resolvedTheme,
}: {
  expense: CostExpense;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
}) {
  const accentColor = getCategoryColor(expense, paperTheme.colors.primary);

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: `${accentColor}33`,
        },
        expenseDetailShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.heroAccent, { backgroundColor: accentColor }]} />
      <View style={[styles.heroAccentSecondary, { backgroundColor: accentColor }]} />

      <Text style={[styles.heroEyebrow, { color: accentColor }]}>Expense</Text>

      <View style={styles.heroTopRow}>
        <View
          style={[
            styles.heroIconWrap,
            {
              backgroundColor: `${accentColor}16`,
              borderColor: `${accentColor}33`,
            },
          ]}
        >
          <Ionicons name="receipt-outline" size={26} color={accentColor} />
        </View>

        <View style={styles.heroBody}>
          <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
            {expense.expenseName}
          </Text>
          <Text style={[styles.heroSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            {expense.expenseId}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: `${accentColor}12`,
                  borderColor: `${accentColor}33`,
                },
              ]}
            >
              <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.categoryBadgeText, { color: accentColor }]}>
                {getCategoryName(expense)}
              </Text>
            </View>

            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: expense.isProduct
                    ? paperTheme.colors.tertiaryContainer
                    : paperTheme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color: expense.isProduct
                      ? paperTheme.colors.tertiary
                      : paperTheme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {expense.isProduct ? 'Product' : 'General'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.amountPanel,
          {
            backgroundColor: `${paperTheme.colors.error}10`,
            borderWidth: 1,
            borderColor: `${paperTheme.colors.error}22`,
          },
        ]}
      >
        <Text style={[styles.amountLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Total amount
        </Text>
        <Text style={[styles.amountValue, { color: paperTheme.colors.error }]}>
          -{formatCostAmount(expense.amount)}
        </Text>
      </View>
    </View>
  );
}

export default function CostExpenseDetailScreen({ navigation, route }: Props) {
  const { expenseId } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const { loadingId, byId, error: detailError } = useSelector(
    (state: RootState) => state.CostExpenseReducer.detail,
  );

  const expense = byId[expenseId] ?? null;
  const loading = loadingId === expenseId && !expense;
  const proofImageUrl = expense ? getCostExpenseImageUrl(expense.image) : null;

  const loadExpenseDetail = useCallback(async () => {
    if (byId[expenseId]) return;
    try {
      await dispatch(fetchCostExpenseById_Service(expenseId)).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load expense details. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadExpenseDetail();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [byId, dispatch, expenseId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadExpenseDetail();
    }, [loadExpenseDetail]),
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.screen, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Expense details"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={paperTheme.colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading expense...
            </Text>
          </View>
        ) : !expense ? (
          <SettingsEmptyState
            icon="receipt-outline"
            title="Expense not found"
            description={detailError || 'This expense could not be loaded. Go back and try again.'}
            paperTheme={paperTheme}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <ExpenseHero expense={expense} paperTheme={paperTheme} resolvedTheme={resolvedTheme} />

            <View style={styles.statsRow}>
              <StatChip
                icon="calendar-outline"
                label="Purchase date"
                value={formatExpenseDate(expense.purchaseDate)}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
              <StatChip
                icon="cube-outline"
                label="Quantity"
                value={
                  expense.isProduct
                    ? expense.qty != null
                      ? String(expense.qty)
                      : '—'
                    : 'N/A'
                }
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
                tint={paperTheme.colors.tertiary}
              />
              <StatChip
                icon="person-outline"
                label="Recorded by"
                value={getCreatedByName(expense)}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
                tint={paperTheme.colors.secondary}
              />
            </View>

            <SettingsSection
              title="Record info"
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            >
              <SettingsDetailRow
                icon="finger-print-outline"
                label="Expense ID"
                value={expense.expenseId || '—'}
                paperTheme={paperTheme}
              />
              <SettingsDetailRow
                icon="pricetag-outline"
                label="Category"
                value={getCategoryName(expense)}
                paperTheme={paperTheme}
              />
              <SettingsDetailRow
                icon="cash-outline"
                label="Amount"
                value={formatCostAmount(expense.amount)}
                paperTheme={paperTheme}
              />
              <SettingsDetailRow
                icon="calendar-outline"
                label="Purchase date"
                value={formatExpenseDate(expense.purchaseDate)}
                paperTheme={paperTheme}
              />
              <SettingsDetailRow
                icon="layers-outline"
                label="Expense type"
                value={expense.isProduct ? 'Product purchase' : 'General expense'}
                paperTheme={paperTheme}
              />
              {expense.isProduct ? (
                <SettingsDetailRow
                  icon="cube-outline"
                  label="Quantity"
                  value={expense.qty != null ? String(expense.qty) : '—'}
                  paperTheme={paperTheme}
                />
              ) : null}
              <SettingsDetailRow
                icon="time-outline"
                label="Created"
                value={formatDateTime(expense.createdAt)}
                paperTheme={paperTheme}
              />
              <SettingsDetailRow
                icon="refresh-outline"
                label="Last updated"
                value={formatDateTime(expense.updatedAt)}
                paperTheme={paperTheme}
                isLast
              />
            </SettingsSection>

            <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
              Proof image
            </Text>
            <View
              style={[
                styles.proofCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                cardShadow(resolvedTheme),
              ]}
            >
              {proofImageUrl ? (
                <TouchableOpacity
                  style={styles.proofImageWrap}
                  onPress={() => void Linking.openURL(proofImageUrl)}
                  activeOpacity={0.92}
                >
                  <Image
                    source={{ uri: proofImageUrl }}
                    style={[
                      styles.proofImage,
                      { backgroundColor: paperTheme.colors.surfaceVariant },
                    ]}
                    resizeMode="cover"
                  />
                  <View style={styles.proofOverlay}>
                    <Ionicons name="expand-outline" size={18} color="#ffffff" />
                    <Text style={styles.proofOverlayText}>View full image</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.proofEmpty}>
                  <View
                    style={[
                      styles.proofEmptyIcon,
                      { backgroundColor: paperTheme.colors.surfaceVariant },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={paperTheme.colors.onSurfaceVariant}
                    />
                  </View>
                  <Text style={[styles.proofEmptyTitle, { color: paperTheme.colors.onSurface }]}>
                    No proof attached
                  </Text>
                  <Text
                    style={[styles.proofEmptySub, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    This expense was saved without a receipt or proof photo.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {alertConfig ? (
        <Portal>
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
            MoreDetails={alertConfig.MoreDetails}
          />
        </Portal>
      ) : null}
    </>
  );
}
