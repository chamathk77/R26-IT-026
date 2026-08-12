import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import SlideToast from '../../../../components/SlideToast/SlideToast';
import { formatDisplayDate } from '../../../../components/DatePickerField/DatePickerField';
import { useTheme } from '../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { fetchKpiHistorySummary_Service } from '../../../../services/KpiService';
import { fetchSalePersonsForLoggedUserBranch_Service } from '../../../../services/SalePersonService';
import { resetKpiHistorySummary } from '../../../../store/reducers/KpiReducer';
import { AppDispatch, RootState } from '../../../../store/store';
import { KpiHistoryRecord } from '../../../../type/kpi';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import {
  formatCheckoutTime,
  getPaymentLabel,
} from '../../../pos/HistoryScreens/historyFormat';
import { formatKpiAmount } from '../../shared/kpiMockData';
import { kpiCardShadow, kpiStyles } from '../../shared/kpiStyles';
import { KpiHistorySummaryListSkeleton } from '../../shared/kpiSkeletonComponents';
import HistorySummaryFilterCard from './HistorySummaryFilterCard';
import { historySummaryTabStyles as styles } from './historySummaryTabStyles';

type HistoryFilters = {
  salesPersonId: string | null;
  startDate: string;
  endDate: string;
};

function HistorySummaryRecordCard({
  record,
  paperTheme,
  resolvedTheme,
}: {
  record: KpiHistoryRecord;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const paymentLabel = getPaymentLabel(record.paymentOption);
  const accent = paperTheme.colors.primary;

  return (
    <View
      style={[
        styles.recordCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
          borderLeftWidth: 3,
          borderLeftColor: accent,
        },
        kpiCardShadow(resolvedTheme),
      ]}
    >
      <View style={styles.recordTop}>
        <View style={[styles.recordIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons name="receipt-outline" size={18} color={accent} />
        </View>

        <View style={styles.recordBody}>
          <Text style={[styles.recordOrderId, { color: paperTheme.colors.onSurface }]}>
            {record.cartNumber != null && record.cartNumber > 0
              ? `#${record.cartNumber}`
              : record.orderId?.trim() || '—'}
          </Text>
          <Text style={[styles.recordMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {formatCheckoutTime(record.checkOutTime)}
          </Text>
          <Text style={[styles.recordMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {record.customerName?.trim() || 'Walk-in customer'}
            {record.customerMobile?.trim() ? ` · ${record.customerMobile.trim()}` : ''}
          </Text>
        </View>

        <Text style={[styles.recordAmount, { color: accent }]}>
          {formatKpiAmount(record.totalAmount)}
        </Text>
      </View>

      <View style={styles.recordFooter}>
        <View
          style={[
            styles.paymentChip,
            { backgroundColor: paperTheme.colors.primaryContainer },
          ]}
        >
          <Text style={[styles.paymentChipText, { color: paperTheme.colors.onPrimaryContainer }]}>
            {paymentLabel}
          </Text>
        </View>
        <Text style={[styles.recordMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
          {record.items.length} item{record.items.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}

export default function HistorySummaryTabScreen() {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const salePersons = useSelector((state: RootState) => state.SalePersonReducer.branchList.items);
  const salePersonsLoading = useSelector(
    (state: RootState) => state.SalePersonReducer.branchList.loading,
  );
  const {
    items,
    loading,
    loadingMore,
    pagination,
    summary,
    filters: loadedFilters,
    success,
  } = useSelector((state: RootState) => state.KpiReducer.historySummary);

  const [draftFilters, setDraftFilters] = useState<HistoryFilters>({
    salesPersonId: null,
    startDate: '',
    endDate: '',
  });
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);
  const appliedFiltersRef = useRef<HistoryFilters>(draftFilters);
  const hasLoadedSummaryRef = useRef(false);

  const hasCompleteDateRange = Boolean(draftFilters.startDate.trim() && draftFilters.endDate.trim());
  const hasPartialDateRange = Boolean(
    (draftFilters.startDate.trim() && !draftFilters.endDate.trim()) ||
      (!draftFilters.startDate.trim() && draftFilters.endDate.trim()),
  );

  const showSlideToast = useCallback((message: string) => {
    setSlideToastMessage(message);
  }, []);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
  }, []);

  const loadSalePersons = useCallback(async () => {
    try {
      await dispatch(fetchSalePersonsForLoggedUserBranch_Service()).unwrap();
    } catch (error: unknown) {
      await handleSessionExpiredApiError(error, show_Alert);
    }
  }, [dispatch, show_Alert]);

  const loadHistorySummary = useCallback(
    async (filters: HistoryFilters, page = 1, append = false) => {
      if (!filters.salesPersonId || !filters.startDate.trim() || !filters.endDate.trim()) {
        return;
      }

      try {
        await dispatch(
          fetchKpiHistorySummary_Service({
            salesPersonId: filters.salesPersonId,
            startDate: filters.startDate.trim(),
            endDate: filters.endDate.trim(),
            page,
            limit: 20,
            append,
          }),
        ).unwrap();
        hasLoadedSummaryRef.current = true;
        appliedFiltersRef.current = filters;
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load history summary. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadHistorySummary(filters, page, append);
          },
          'Cancel',
          () => {},
        );
      }
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSalePersons();
      if (hasLoadedSummaryRef.current && appliedFiltersRef.current.salesPersonId) {
        void loadHistorySummary(appliedFiltersRef.current, 1, false);
      }
    }, [loadHistorySummary, loadSalePersons]),
  );

  const handleReset = useCallback(() => {
    setDraftFilters({ salesPersonId: null, startDate: '', endDate: '' });
    hasLoadedSummaryRef.current = false;
    dispatch(resetKpiHistorySummary());
  }, [dispatch]);

  const handleGetHistorySummary = useCallback(() => {
    if (draftFilters.startDate.trim() && !draftFilters.endDate.trim()) {
      showSlideToast('Select end date before getting history');
      return;
    }

    if (!draftFilters.startDate.trim() || !draftFilters.endDate.trim()) {
      showSlideToast('Select start date and end date');
      return;
    }

    if (!draftFilters.salesPersonId) {
      show_Alert(
        'error',
        'Sales person required',
        salePersons.length === 0 && !salePersonsLoading
          ? 'No sales persons are assigned to this branch. Add employees in Manage Employees first.'
          : 'Please select a sales person before loading history.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    void loadHistorySummary(draftFilters, 1, false);
  }, [draftFilters, loadHistorySummary, salePersons.length, salePersonsLoading, showSlideToast, show_Alert]);

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingMore || loading) return;
    void loadHistorySummary(appliedFiltersRef.current, (pagination.page ?? 1) + 1, true);
  }, [loadHistorySummary, loading, loadingMore, pagination]);

  const filterLabel = useMemo(() => {
    if (!hasCompleteDateRange) return '';
    return `${formatDisplayDate(draftFilters.startDate)} – ${formatDisplayDate(draftFilters.endDate)}`;
  }, [draftFilters.endDate, draftFilters.startDate, hasCompleteDateRange]);

  const selectedPersonLabel = useMemo(() => {
    if (loadedFilters?.salesPersonName) return loadedFilters.salesPersonName;
    if (!draftFilters.salesPersonId) return '';
    const person = salePersons.find((item) => item._id === draftFilters.salesPersonId);
    return person ? `${person.firstName} ${person.lastName}`.trim() : '';
  }, [draftFilters.salesPersonId, loadedFilters?.salesPersonName, salePersons]);

  const renderRecord = useCallback(
    ({ item }: { item: KpiHistoryRecord }) => (
      <HistorySummaryRecordCard
        record={item}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />
    ),
    [paperTheme, resolvedTheme],
  );

  const listHeader = (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <HistorySummaryFilterCard
        salePersons={salePersons}
        selectedSalesPersonId={draftFilters.salesPersonId}
        startDate={draftFilters.startDate}
        endDate={draftFilters.endDate}
        loading={loading}
        onSelectSalesPerson={(id) => {
          setDraftFilters((current) => ({ ...current, salesPersonId: id }));
          hasLoadedSummaryRef.current = false;
          dispatch(resetKpiHistorySummary());
        }}
        onStartDateChange={(value) => {
          setDraftFilters((current) => ({ ...current, startDate: value }));
          hasLoadedSummaryRef.current = false;
          dispatch(resetKpiHistorySummary());
        }}
        onEndDateChange={(value) => {
          setDraftFilters((current) => ({ ...current, endDate: value }));
          hasLoadedSummaryRef.current = false;
          dispatch(resetKpiHistorySummary());
        }}
        onReset={handleReset}
        onActionPress={handleGetHistorySummary}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />

      {hasPartialDateRange ? (
        <View
          style={[
            styles.pendingBanner,
            {
              backgroundColor: paperTheme.colors.secondaryContainer,
              borderColor: `${paperTheme.colors.secondary}33`,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={16} color={paperTheme.colors.secondary} />
          <Text style={[styles.pendingText, { color: paperTheme.colors.onSecondaryContainer }]}>
            Select both start and end dates.
          </Text>
        </View>
      ) : null}

      {success && summary ? (
        <>
          <View style={styles.summaryStrip}>
            <View
              style={[
                styles.summaryChip,
                {
                  backgroundColor: paperTheme.colors.primaryContainer,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
              ]}
            >
              <Text style={[styles.summaryChipLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
                Orders
              </Text>
              <Text style={[styles.summaryChipValue, { color: paperTheme.colors.primary }]}>
                {summary.orderCount}
              </Text>
            </View>
            <View
              style={[
                styles.summaryChip,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                kpiCardShadow(resolvedTheme),
              ]}
            >
              <Text style={[styles.summaryChipLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Total sales
              </Text>
              <Text style={[styles.summaryChipValue, { color: paperTheme.colors.onSurface }]}>
                {formatKpiAmount(summary.totalSalesAmount)}
              </Text>
            </View>
          </View>
          <Text style={[styles.resultsMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {filterLabel}
            {selectedPersonLabel ? ` · ${selectedPersonLabel}` : ''}
          </Text>
        </>
      ) : null}
    </View>
  );

  const showListSkeleton = loading && !loadingMore;

  const listEmpty = showListSkeleton ? (
    <KpiHistorySummaryListSkeleton
      boneColor={paperTheme.colors.surfaceVariant}
      cardColor={paperTheme.colors.surface}
      borderColor={paperTheme.colors.outlineVariant}
    />
  ) : (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: paperTheme.colors.surfaceVariant,
          borderColor: paperTheme.colors.outlineVariant,
        },
      ]}
    >
      <Ionicons name="list-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
      <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
        {success ? 'No sales found' : 'Search sales history'}
      </Text>
      <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
        {success
          ? 'No submitted sales were assigned to this person in the selected date range.'
          : 'Pick a sales person, choose dates, then tap Get history.'}
      </Text>
    </View>
  );

  const listFooter =
    pagination?.hasNextPage && items.length > 0 ? (
      <TouchableOpacity
        style={[
          styles.loadMoreBtn,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          kpiCardShadow(resolvedTheme),
        ]}
        onPress={handleLoadMore}
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator color={paperTheme.colors.primary} />
        ) : (
          <Text style={[styles.loadMoreText, { color: paperTheme.colors.primary }]}>Load more</Text>
        )}
      </TouchableOpacity>
    ) : null;

  return (
    <>
      <FlatList
        style={kpiStyles.tabContent}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 ? { flexGrow: 1 } : null,
        ]}
        data={showListSkeleton ? [] : items}
        keyExtractor={(item) => item._id}
        renderItem={renderRecord}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <SlideToast message={slideToastMessage} onDismiss={hideSlideToast} paperTheme={paperTheme} />

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
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        </Portal>
      ) : null}
    </>
  );
}
