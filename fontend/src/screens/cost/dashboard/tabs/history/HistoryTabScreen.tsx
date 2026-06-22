import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Portal, MD3Theme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import DatePickerField, {
  formatDisplayDate,
} from '../../../../../components/DatePickerField/DatePickerField';
import CommonAlert from '../../../../../components/CommonAlert/CommonAlert';
import { useTheme } from '../../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../../hooks/useCommonAlert';
import { RootStackParamList } from '../../../../../navigation/RootStackParamsList';
import { fetchCostCategories_Service } from '../../../../../services/CostCategoryService';
import { fetchCostHistory_Service } from '../../../../../services/CostExpenseService';
import { AppDispatch, RootState } from '../../../../../store/store';
import { CostCategory } from '../../../../../type/costCategory';
import { CostExpense, FetchCostHistoryParams } from '../../../../../type/costExpense';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import { SettingsEmptyState } from '../../../../settings/shared/SettingsDetailComponents';
import { addExpenseStyles as modalStyles } from '../dashboard/addExpenses/addExpenseStyles';
import {
  costCardShadow,
  costDashboardStyles as styles,
} from '../../shared/costDashboardStyles';
import { formatCostAmount } from '../../shared/costDashboardMockData';

type HistoryFilters = {
  startDate: string;
  endDate: string;
  categoryId: string;
};

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange(): HistoryFilters {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: formatDateValue(start),
    endDate: formatDateValue(end),
    categoryId: '',
  };
}

function parseDateValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parts = value.split('-').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

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

function ExpenseDetailRow({
  label,
  value,
  paperTheme,
}: {
  label: string;
  value: string;
  paperTheme: MD3Theme;
}) {
  return (
    <View style={styles.historyDetailRow}>
      <Text style={[styles.historyDetailLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[styles.historyDetailValue, { color: paperTheme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

function ExpenseHistoryCard({
  expense,
  paperTheme,
  resolvedTheme,
  isExpanded,
  onToggle,
  onOpenDetails,
}: {
  expense: CostExpense;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
  isExpanded: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
}) {
  const accentColor = getCategoryColor(expense, paperTheme.colors.primary);

  return (
    <View
      style={[
        styles.historyRecordCard,
        {
          backgroundColor: isExpanded
            ? paperTheme.colors.primaryContainer
            : paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
          borderLeftColor: accentColor,
        },
        costCardShadow(resolvedTheme),
      ]}
    >
      <TouchableOpacity activeOpacity={0.92} onPress={onToggle}>
        <View style={styles.historyRecordTop}>
          <View
            style={[
              styles.historyRecordIcon,
              { backgroundColor: `${accentColor}22` },
            ]}
          >
            <Ionicons name="receipt-outline" size={20} color={accentColor} />
          </View>

          <View style={styles.historyRecordTitleBlock}>
            <Text style={[styles.historyRecordTitle, { color: paperTheme.colors.onSurface }]}>
              {expense.expenseName}
            </Text>
            <Text style={[styles.historyRecordSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {getCategoryName(expense)}
              {expense.expenseId ? ` · ${expense.expenseId}` : ''}
            </Text>
          </View>

          <View style={styles.historyRecordTrailing}>
            <Text style={[styles.historyRecordAmount, { color: paperTheme.colors.error }]}>
              -{formatCostAmount(expense.amount)}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={paperTheme.colors.onSurfaceVariant}
            />
          </View>
        </View>

        <View style={styles.historyRecordMetaRow}>
          <View style={styles.historyRecordMetaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Text
              style={[styles.historyRecordMetaText, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              {formatExpenseDate(expense.purchaseDate)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded ? (
        <View
          style={[
            styles.historyExpandedSection,
            { borderTopColor: paperTheme.colors.outlineVariant },
          ]}
        >
          <ExpenseDetailRow
            label="Category"
            value={getCategoryName(expense)}
            paperTheme={paperTheme}
          />
          <ExpenseDetailRow
            label="Amount"
            value={formatCostAmount(expense.amount)}
            paperTheme={paperTheme}
          />
          <ExpenseDetailRow
            label="Purchase date"
            value={formatExpenseDate(expense.purchaseDate)}
            paperTheme={paperTheme}
          />
          <ExpenseDetailRow
            label="Product expense"
            value={expense.isProduct ? 'Yes' : 'No'}
            paperTheme={paperTheme}
          />

          <TouchableOpacity
            style={[
              styles.historySeeMoreBtn,
              {
                backgroundColor: paperTheme.colors.primary,
              },
              costCardShadow(resolvedTheme),
            ]}
            onPress={onOpenDetails}
            activeOpacity={0.9}
          >
            <Text style={[styles.historySeeMoreBtnText, { color: paperTheme.colors.onPrimary }]}>
              See more details
            </Text>
            <Ionicons name="arrow-forward" size={16} color={paperTheme.colors.onPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function getExpenseSortTime(expense: CostExpense): number {
  const createdAt = expense.createdAt ? new Date(expense.createdAt).getTime() : Number.NaN;
  if (!Number.isNaN(createdAt)) return createdAt;

  const purchaseDate = expense.purchaseDate ? new Date(expense.purchaseDate).getTime() : Number.NaN;
  if (!Number.isNaN(purchaseDate)) return purchaseDate;

  return 0;
}

function sortExpensesLatestFirst(expenses: CostExpense[]): CostExpense[] {
  return [...expenses].sort((left, right) => {
    const timeDiff = getExpenseSortTime(right) - getExpenseSortTime(left);
    if (timeDiff !== 0) return timeDiff;
    return right._id.localeCompare(left._id);
  });
}

function buildHistoryRequest(
  filters: HistoryFilters,
  page: number,
  append: boolean,
): FetchCostHistoryParams {
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    categoryId: filters.categoryId || undefined,
    page,
    limit: 20,
    append,
  };
}

export default function HistoryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const categories = useSelector(
    (state: RootState) => state.CostCategoryReducer?.list?.items ?? [],
  );
  const categoriesLoading = useSelector(
    (state: RootState) => state.CostCategoryReducer?.list?.loading ?? false,
  );
  const { items, loading, loadingMore, pagination } = useSelector(
    (state: RootState) => state.CostExpenseReducer.history,
  );
  const sortedItems = useMemo(() => sortExpensesLatestFirst(items), [items]);

  const initialRange = useMemo(() => getCurrentMonthRange(), []);

  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(initialRange);
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(initialRange);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const appliedFiltersRef = useRef(appliedFilters);
  appliedFiltersRef.current = appliedFilters;

  const selectedDraftCategory = useMemo(
    () => categories.find((category) => category._id === draftFilters.categoryId) ?? null,
    [categories, draftFilters.categoryId],
  );

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCostCategories_Service()).unwrap();
    } catch (error: unknown) {
      await handleSessionExpiredApiError(error, show_Alert);
    }
  }, [dispatch, show_Alert]);

  const loadHistory = useCallback(
    async (filters: HistoryFilters, page = 1, append = false) => {
      try {
        await dispatch(fetchCostHistory_Service(buildHistoryRequest(filters, page, append))).unwrap();
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        setTimeout(() => {
          show_Alert(
            'error',
            'Load failed',
            getApiErrorMessage(error, 'Could not load expense history. Please try again.'),
            2,
            false,
            'Retry',
            () => {
              void loadHistory(filters, page, append);
            },
            'Cancel',
            () => {},
          );
        }, 150);
      }
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      void loadHistory(appliedFiltersRef.current, 1, false);
    }, [loadCategories, loadHistory]),
  );

  const validateDraftFilters = useCallback((): HistoryFilters | null => {
    const start = draftFilters.startDate.trim();
    const end = draftFilters.endDate.trim();

    if (start && !end) {
      show_Alert(
        'error',
        'End date required',
        'Please select an end date before searching.',
        1,
        false,
        'OK',
        () => {},
      );
      return null;
    }

    if (end && !start) {
      show_Alert(
        'error',
        'Start date required',
        'Please select a start date before searching.',
        1,
        false,
        'OK',
        () => {},
      );
      return null;
    }

    if (start && end) {
      const startDate = parseDateValue(start);
      const endDate = parseDateValue(end);
      if (startDate && endDate && startDate > endDate) {
        show_Alert(
          'error',
          'Invalid date range',
          'Start date cannot be after end date.',
          1,
          false,
          'OK',
          () => {},
        );
        return null;
      }
    }

    return {
      startDate: start,
      endDate: end,
      categoryId: draftFilters.categoryId,
    };
  }, [draftFilters, show_Alert]);

  const handleSearch = useCallback(() => {
    const nextFilters = validateDraftFilters();
    if (!nextFilters) return;
    setExpandedExpenseId(null);
    setAppliedFilters(nextFilters);
    appliedFiltersRef.current = nextFilters;
    void loadHistory(nextFilters, 1, false);
  }, [loadHistory, validateDraftFilters]);

  const handleReset = useCallback(() => {
    const nextFilters = getCurrentMonthRange();
    setExpandedExpenseId(null);
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    appliedFiltersRef.current = nextFilters;
    void loadHistory(nextFilters, 1, false);
  }, [loadHistory]);

  const toggleExpenseCard = useCallback((expenseId: string) => {
    setExpandedExpenseId((current) => (current === expenseId ? null : expenseId));
  }, []);

  const openExpenseDetails = useCallback(
    (expenseId: string) => {
      navigation.navigate('CostExpenseDetail', { expenseId });
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingMore || loading) return;
    void loadHistory(appliedFiltersRef.current, (pagination.page ?? 1) + 1, true);
  }, [loadHistory, loading, loadingMore, pagination]);

  const handleSelectCategory = useCallback((category: CostCategory | null) => {
    setDraftFilters((current) => ({
      ...current,
      categoryId: category?._id ?? '',
    }));
    setCategoryModalVisible(false);
  }, []);

  const renderCategoryOption = useCallback(
    ({ item }: { item: CostCategory | null }) => {
      const isAll = item === null;
      const active = isAll
        ? !draftFilters.categoryId
        : draftFilters.categoryId === item._id;

      return (
        <TouchableOpacity
          style={[
            modalStyles.categoryOption,
            {
              backgroundColor: active
                ? paperTheme.colors.primaryContainer
                : paperTheme.colors.surface,
              borderColor: active
                ? paperTheme.colors.primary
                : paperTheme.colors.outlineVariant,
            },
          ]}
          onPress={() => handleSelectCategory(item)}
        >
          {isAll ? (
            <Ionicons name="layers-outline" size={18} color={paperTheme.colors.primary} />
          ) : (
            <View style={[styles.filterCategoryDot, { backgroundColor: item.colorCode }]} />
          )}
          <View style={modalStyles.categoryOptionBody}>
            <Text
              style={[modalStyles.categoryOptionName, { color: paperTheme.colors.onSurface }]}
            >
              {isAll ? 'All categories' : item.name}
            </Text>
          </View>
          {active ? (
            <Ionicons name="checkmark-circle" size={18} color={paperTheme.colors.primary} />
          ) : null}
        </TouchableOpacity>
      );
    },
    [draftFilters.categoryId, handleSelectCategory, paperTheme.colors],
  );

  const renderExpenseRow = useCallback(
    ({ item }: { item: CostExpense }) => (
      <ExpenseHistoryCard
        expense={item}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
        isExpanded={expandedExpenseId === item._id}
        onToggle={() => toggleExpenseCard(item._id)}
        onOpenDetails={() => openExpenseDetails(item._id)}
      />
    ),
    [expandedExpenseId, openExpenseDetails, paperTheme, resolvedTheme, toggleExpenseCard],
  );

  const listHeader = (
    <View style={styles.historyFilterSection}>
      <Text style={[styles.historyFilterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Filters
      </Text>

      <View>
        <Text style={[styles.historyFilterFieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Category
        </Text>
        <TouchableOpacity
          style={[
            styles.historyFilterCategoryPicker,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
          onPress={() => setCategoryModalVisible(true)}
        >
          {selectedDraftCategory ? (
            <>
              <View
                style={[
                  styles.filterCategoryDot,
                  { backgroundColor: selectedDraftCategory.colorCode },
                ]}
              />
              <Text
                style={[styles.historyFilterCategoryText, { color: paperTheme.colors.onSurface }]}
              >
                {selectedDraftCategory.name}
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.historyFilterCategoryText,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              All categories
            </Text>
          )}
          <Ionicons name="chevron-down" size={16} color={paperTheme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={styles.historyFilterDateRow}>
        <View style={{ flex: 1 }}>
          <DatePickerField
            label="Start date"
            value={draftFilters.startDate}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, startDate: value }))
            }
            maximumDate={parseDateValue(draftFilters.endDate) ?? undefined}
            compact
            paperTheme={paperTheme}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DatePickerField
            label="End date"
            value={draftFilters.endDate}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, endDate: value }))
            }
            minimumDate={parseDateValue(draftFilters.startDate) ?? undefined}
            compact
            paperTheme={paperTheme}
          />
        </View>
      </View>

      <Text style={[styles.historyFilterSummary, { color: paperTheme.colors.onSurfaceVariant }]}>
        Showing {formatDisplayDate(appliedFilters.startDate)} – {formatDisplayDate(appliedFilters.endDate)}
        {pagination?.total != null
          ? ` · ${pagination.total} record${pagination.total === 1 ? '' : 's'}`
          : ''}
      </Text>

      <View style={styles.historyFilterActionRow}>
        <TouchableOpacity
          style={[
            styles.historyFilterActionBtn,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
          onPress={handleReset}
          disabled={loading || loadingMore}
        >
          <Ionicons name="refresh-outline" size={16} color={paperTheme.colors.onSurface} />
          <Text style={[styles.historyFilterActionBtnText, { color: paperTheme.colors.onSurface }]}>
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.historyFilterActionBtn,
            {
              backgroundColor: paperTheme.colors.primary,
              borderWidth: 0,
              opacity: loading ? 0.7 : 1,
            },
            costCardShadow(resolvedTheme),
          ]}
          onPress={handleSearch}
          disabled={loading || loadingMore}
        >
          {loading ? (
            <ActivityIndicator color={paperTheme.colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="search-outline" size={16} color={paperTheme.colors.onPrimary} />
              <Text style={[styles.historyFilterActionBtnText, { color: paperTheme.colors.onPrimary }]}>
                Search
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.historyRecordsLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Expense history
      </Text>
    </View>
  );

  const listEmpty = loading ? (
    <View style={styles.emptyWrap}>
      <ActivityIndicator color={paperTheme.colors.primary} />
      <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
        Loading expenses...
      </Text>
    </View>
  ) : (
    <SettingsEmptyState
      icon="receipt-outline"
      title="No expenses found"
      description="Try another date range or category, then search again."
      paperTheme={paperTheme}
    />
  );

  const listFooter =
    pagination?.hasNextPage && sortedItems.length > 0 ? (
      <TouchableOpacity
        style={[
          styles.historyLoadMoreBtn,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          costCardShadow(resolvedTheme),
        ]}
        onPress={handleLoadMore}
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator color={paperTheme.colors.primary} />
        ) : (
          <Text style={[styles.loadMoreText, { color: paperTheme.colors.primary, fontSize: 13 }]}>
            Load more
          </Text>
        )}
      </TouchableOpacity>
    ) : null;

  return (
    <>
      <FlatList
        style={styles.tabContent}
        contentContainerStyle={[
          styles.historyScrollContent,
          items.length === 0 ? { flexGrow: 1 } : null,
        ]}
        data={sortedItems}
        keyExtractor={(item) => item._id}
        renderItem={renderExpenseRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable style={modalStyles.modalBackdrop} onPress={() => setCategoryModalVisible(false)}>
          <Pressable
            style={[modalStyles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View
              style={[modalStyles.modalHandle, { backgroundColor: paperTheme.colors.outlineVariant }]}
            />
            <Text style={[modalStyles.modalTitle, { color: paperTheme.colors.onSurface }]}>
              Select category
            </Text>

            {categoriesLoading && categories.length === 0 ? (
              <ActivityIndicator color={paperTheme.colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={[null, ...categories]}
                keyExtractor={(item, index) => (item ? item._id : `all-${index}`)}
                renderItem={renderCategoryOption}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
