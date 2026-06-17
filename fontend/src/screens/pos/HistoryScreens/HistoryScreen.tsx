import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { HistoryStackParamList } from '../../../navigation/HistoryStackParamList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { fetchHistory_Service } from '../../../services/HistoryService';
import {
  applyHistoryFilters,
  resetHistoryFilters,
} from '../../../store/reducers/HistoryReducer';
import { AppDispatch, RootState } from '../../../store/store';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import DatePickerField from '../../../components/DatePickerField/DatePickerField';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../utils/apiErrorAlert';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import { HistoryPaymentOption, HistoryRecord } from '../../../type/history';
import {
  formatCheckoutTime,
  getHistoryStatusLabel,
  getPaymentLabel,
  normalizeHistoryStatus,
} from './historyFormat';
import { HistoryFilterState } from '../../../store/reducers/HistoryReducer';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryList'>;

const EMPTY_DRAFT_FILTERS: HistoryFilterState = {
  from: '',
  to: '',
  paymentOption: '',
  orderId: '',
  mobile: '',
};

const PAYMENT_FILTER_OPTIONS: Array<{ id: HistoryPaymentOption | ''; label: string }> = [
  { id: '', label: 'All' },
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'online', label: 'Online payment' },
];

export default function HistoryScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, show_Alert , hideAlert} = useCommonAlert();
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const { filters, list } = useSelector((state: RootState) => state.HistoryReducer);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [draftFilters, setDraftFilters] = useState<HistoryFilterState>(filters);

  const buildFetchParams = useCallback(
    (page = 1, append = false, nextFilters = filters) => ({
      scope: 'all' as const,
      page,
      limit: 20,
      from: nextFilters.from.trim() || undefined,
      to: nextFilters.to.trim() || undefined,
      paymentOption: nextFilters.paymentOption || undefined,
      orderId: nextFilters.orderId.trim() || undefined,
      mobile: nextFilters.mobile.trim() || undefined,
      append,
    }),
    [filters],
  );

  const loadHistory = useCallback(
    async (page = 1, append = false, nextFilters = filters) => {
      if (!shopId) {
        setTimeout(() => {
          show_Alert(
            'error',
            'Error',
            'Shop not found. Please log in again.',
            1,
            false,
            'OK',
            () => {},
          );
        }, 150);
        return;
      }

      try {
        const response = await dispatch(
          fetchHistory_Service(buildFetchParams(page, append, nextFilters)),
        ).unwrap();
        console.log('response in loadHistory', response);
      } catch (error: unknown) {
        console.log('error in loadHistory', error);

        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        setTimeout(() => {
          const message =
            error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: string }).message)
              : 'Could not load history. Please try again.';
          show_Alert(
            'error',
            'Load failed',
            message,
            2,
            false,
            'Retry',
            () => {
              void loadHistory(page, append, nextFilters);
            },
            'Cancel',
            () => {},
          );
        }, 150);
      }
    },
    [buildFetchParams, dispatch, filters, shopId, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadHistory(1, false);
    }, [loadHistory]),
  );

  const openFiltersPanel = useCallback(() => {
    setDraftFilters(filters);
    setFiltersExpanded(true);
  }, [filters]);

  const handleApplyFilters = useCallback(() => {
    Keyboard.dismiss();

    const trimmedOrderId = draftFilters.orderId.trim();
    if (trimmedOrderId && trimmedOrderId.length < 6) {
      show_Alert(
        'error',
        'Invalid order ID',
        'Order ID filter must be at least 6 characters.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    setExpandedHistoryId(null);
    const nextFilters = {
      ...draftFilters,
      orderId: trimmedOrderId.toUpperCase(),
    };
    setDraftFilters(nextFilters);
    dispatch(applyHistoryFilters(nextFilters));
    setFiltersExpanded(false);
    void loadHistory(1, false, nextFilters);
  }, [dispatch, draftFilters, loadHistory, show_Alert]);

  const handleResetFilters = useCallback(() => {
    Keyboard.dismiss();
    setExpandedHistoryId(null);
    setDraftFilters(EMPTY_DRAFT_FILTERS);
    setFiltersExpanded(false);
    dispatch(resetHistoryFilters());
    void loadHistory(1, false, EMPTY_DRAFT_FILTERS);
  }, [dispatch, loadHistory]);

  const handleLoadMore = useCallback(() => {
    if (list.loading || list.loadingMore || !list.pagination?.hasNextPage) return;
    void loadHistory((list.pagination?.page ?? 1) + 1, true);
  }, [list.loading, list.loadingMore, list.pagination, loadHistory]);

  const toggleHistoryCard = useCallback((historyId: string) => {
    setExpandedHistoryId((current) => (current === historyId ? null : historyId));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.from.trim()) count += 1;
    if (filters.to.trim()) count += 1;
    if (filters.paymentOption) count += 1;
    if (filters.orderId.trim()) count += 1;
    if (filters.mobile.trim()) count += 1;
    return count;
  }, [filters.from, filters.mobile, filters.orderId, filters.paymentOption, filters.to]);

  const renderHistoryRow = ({ item }: { item: HistoryRecord }) => {
    const itemCount = item.items.length;
    const isExpanded = expandedHistoryId === item._id;
    const previewItems = item.items.slice(0, 3);
    const displayOrderId = item.orderId?.trim() || `#${item.cartNumber}`;
    const normalizedStatus = normalizeHistoryStatus(item.status);
    const isReversed = normalizedStatus === 'reversed';
    const isCanceled = normalizedStatus === 'canceled';
    const statusChip = {
      bg: isReversed
        ? paperTheme.colors.errorContainer
        : isCanceled
          ? paperTheme.colors.tertiaryContainer
          : paperTheme.colors.primaryContainer,
      text: isReversed
        ? paperTheme.colors.error
        : isCanceled
          ? paperTheme.colors.tertiary
          : paperTheme.colors.primary,
    };
    const paymentChip = (() => {
      switch (item.paymentOption) {
        case 'cash':
          return { bg: '#DCFCE7', text: '#15803D' };
        case 'card':
          return { bg: '#DBEAFE', text: '#1D4ED8' };
        case 'online':
          return { bg: '#EDE9FE', text: '#6D28D9' };
        default:
          return { bg: paperTheme.colors.surfaceVariant, text: paperTheme.colors.onSurface };
      }
    })();

    return (
      <View
        style={[
          styles.rowCard,
          {
            backgroundColor: isReversed
              ? paperTheme.colors.errorContainer
              : isCanceled
                ? paperTheme.colors.tertiaryContainer
              : isExpanded
                ? paperTheme.colors.primaryContainer
                : paperTheme.colors.surface,
            borderColor: isReversed
              ? `${paperTheme.colors.error}44`
              : isCanceled
                ? `${paperTheme.colors.tertiary}44`
              : isExpanded
                ? `${paperTheme.colors.primary}44`
                : paperTheme.colors.outlineVariant,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => toggleHistoryCard(item._id)}
          style={styles.rowPressable}
        >
          <View style={[styles.rowIcon, { backgroundColor: paperTheme.colors.primaryContainer }]}>
            <Ionicons name="receipt" size={22} color={paperTheme.colors.primary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: paperTheme.colors.onSurface }]}>
              {displayOrderId} · {itemCount} item{itemCount === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.rowMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
              Cart #{item.cartNumber}
            </Text>
            <View style={styles.rowChipWrap}>
              <View style={[styles.rowChip, { backgroundColor: paymentChip.bg }]}>
                <Text style={[styles.rowChipText, { color: paymentChip.text }]}>
                  {getPaymentLabel(item.paymentOption)}
                </Text>
              </View>
              <View style={[styles.rowChip, { backgroundColor: statusChip.bg }]}>
                <Text style={[styles.rowChipText, { color: statusChip.text }]}>
                  {getHistoryStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={[styles.rowTime, { color: paperTheme.colors.onSurfaceVariant }]}>
              {formatCheckoutTime(item.checkOutTime)}
            </Text>
            <Text style={[styles.rowMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
              {item.customerMobile ? item.customerMobile : '—'}
            </Text>
            {item.submittedUserName ? (
              <Text style={[styles.rowMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
                By {item.submittedUserName}
              </Text>
            ) : null}
          </View>
          <View style={styles.rowTrailing}>
            <Text style={[styles.rowAmount, { color: paperTheme.colors.primary }]}>
              {formatCheckoutAmount(item.totalAmount)}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={paperTheme.colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>

        {isExpanded ? (
          <View style={styles.expandedSection}>
            {item.customerName ? (
              <Text style={[styles.rowItems, { color: paperTheme.colors.onSurface }]}>
                Customer: {item.customerName}
              </Text>
            ) : null}
            {previewItems.map((entry) => (
              <Text
                key={`${item._id}-${entry.productId}`}
                style={[styles.rowItems, { color: paperTheme.colors.onSurface }]}
              >
                {entry.productName} × {entry.qty}
                {entry.unitCost != null ? ` · ${formatCheckoutAmount(entry.unitCost)}` : ''}
              </Text>
            ))}
            {item.items.length > previewItems.length ? (
              <Text style={[styles.rowItemsMuted, { color: paperTheme.colors.onSurfaceVariant }]}>
                +{item.items.length - previewItems.length} more item
                {item.items.length - previewItems.length === 1 ? '' : 's'}
              </Text>
            ) : null}
            {item.isDiscount && item.discountedAmount > 0 ? (
              <Text style={[styles.rowItems, { color: paperTheme.colors.onSurface }]}>
                Discount: -{formatCheckoutAmount(item.discountedAmount)}
              </Text>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="See full order details"
              activeOpacity={0.85}
              onPress={() => navigation.navigate('HistoryDetails', { record: item })}
              style={[styles.seeMoreBtn, { backgroundColor: paperTheme.colors.primary }]}
            >
              <Text style={[styles.seeMoreText, { color: paperTheme.colors.onPrimary }]}>
                See more
              </Text>
              <Ionicons name="arrow-forward" size={16} color={paperTheme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const listHeader = useMemo(
    () => (
      <View>
      <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>History</Text>
      <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
        All checkout history for your shop.
      </Text>

      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => (filtersExpanded ? setFiltersExpanded(false) : openFiltersPanel())}
          style={[
            styles.filterChip,
            styles.filterToggle,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outline,
            },
          ]}
        >
          <Ionicons name="options-outline" size={16} color={paperTheme.colors.onSurface} />
          <Text style={[styles.filterChipText, { color: paperTheme.colors.onSurface }]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
        {activeFilterCount > 0 ? (
          <TouchableOpacity
            onPress={handleResetFilters}
            style={[
              styles.filterChip,
              styles.filterToggle,
              {
                backgroundColor: paperTheme.colors.errorContainer,
                borderColor: paperTheme.colors.error,
              },
            ]}
          >
            <Ionicons name="close-circle-outline" size={16} color={paperTheme.colors.error} />
            <Text style={[styles.filterChipText, { color: paperTheme.colors.error }]}>
              Clear
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {filtersExpanded ? (
        <View
          style={[
            styles.filtersPanel,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
          ]}
        >
          <Text style={[styles.filterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Order ID (min 6 characters)
          </Text>
          <TextInput
            value={draftFilters.orderId}
            onChangeText={(value) =>
              setDraftFilters((current) => ({ ...current, orderId: value.toUpperCase() }))
            }
            placeholder="e.g. A1B2C3D4"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[
              styles.filterInput,
              {
                color: paperTheme.colors.onSurface,
                backgroundColor: paperTheme.colors.surfaceVariant,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          />

          <Text style={[styles.filterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Mobile number
          </Text>
          <TextInput
            value={draftFilters.mobile}
            onChangeText={(value) =>
              setDraftFilters((current) => ({ ...current, mobile: value }))
            }
            placeholder="Search by phone"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            keyboardType="phone-pad"
            returnKeyType="search"
            onSubmitEditing={handleApplyFilters}
            style={[
              styles.filterInput,
              {
                color: paperTheme.colors.onSurface,
                backgroundColor: paperTheme.colors.surfaceVariant,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          />

          <View style={styles.dateRow}>
            <DatePickerField
              label="From"
              value={draftFilters.from}
              onChange={(value) => setDraftFilters((current) => ({ ...current, from: value }))}
              placeholder="Select start date"
              maximumDate={
                draftFilters.to ? new Date(`${draftFilters.to}T23:59:59`) : undefined
              }
              paperTheme={paperTheme}
            />
            <DatePickerField
              label="To"
              value={draftFilters.to}
              onChange={(value) => setDraftFilters((current) => ({ ...current, to: value }))}
              placeholder="Select end date"
              minimumDate={
                draftFilters.from ? new Date(`${draftFilters.from}T00:00:00`) : undefined
              }
              paperTheme={paperTheme}
            />
          </View>

          <Text style={[styles.filterLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Payment option
          </Text>
          <View style={styles.paymentFilterRow}>
            {PAYMENT_FILTER_OPTIONS.map((option) => {
              const selected = draftFilters.paymentOption === option.id;
              return (
                <TouchableOpacity
                  key={option.id || 'all'}
                  onPress={() =>
                    setDraftFilters((current) => ({ ...current, paymentOption: option.id }))
                  }
                  style={[
                    styles.paymentChip,
                    {
                      backgroundColor: selected
                        ? paperTheme.colors.primary
                        : paperTheme.colors.surfaceVariant,
                      borderColor: selected
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentChipText,
                      {
                        color: selected
                          ? paperTheme.colors.onPrimary
                          : paperTheme.colors.onSurface,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              onPress={handleResetFilters}
              style={[
                styles.filterActionBtn,
                { backgroundColor: paperTheme.colors.secondaryContainer },
              ]}
            >
              <Text
                style={[
                  styles.filterActionText,
                  { color: paperTheme.colors.onSecondaryContainer },
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApplyFilters}
              style={[styles.filterActionBtn, { backgroundColor: paperTheme.colors.primary }]}
            >
              <Text style={[styles.filterActionText, { color: paperTheme.colors.onPrimary }]}>
                Search
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      </View>
    ),
    [
      activeFilterCount,
      draftFilters.from,
      draftFilters.mobile,
      draftFilters.orderId,
      draftFilters.paymentOption,
      draftFilters.to,
      filtersExpanded,
      handleApplyFilters,
      handleResetFilters,
      openFiltersPanel,
      paperTheme.colors.error,
      paperTheme.colors.errorContainer,
      paperTheme.colors.onBackground,
      paperTheme.colors.onPrimary,
      paperTheme.colors.onSecondaryContainer,
      paperTheme.colors.onSurface,
      paperTheme.colors.onSurfaceVariant,
      paperTheme.colors.outline,
      paperTheme.colors.outlineVariant,
      paperTheme.colors.primary,
      paperTheme.colors.secondaryContainer,
      paperTheme.colors.surface,
      paperTheme.colors.surfaceVariant,
    ],
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <KeyboardAwareFlatList
          style={styles.list}
          data={list.items}
          keyExtractor={(item) => item._id}
          renderItem={renderHistoryRow}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid
          enableAutomaticScroll
          enableResetScrollToCoords={false}
          extraScrollHeight={Platform.OS === 'ios' ? 32 : 96}
          keyboardOpeningTime={0}
          ListFooterComponent={
            list.loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={paperTheme.colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            list.loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={paperTheme.colors.primary} />
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="time-outline" size={40} color={paperTheme.colors.outline} />
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  No checkout history
                </Text>
                <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Completed checkouts for your shop will appear here.
                </Text>
              </View>
            )
          }
        />

        {list.loading && list.items.length > 0 ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : null}
      </SafeAreaView>

      {alertConfig ? (
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
          MoreDetails={alertConfig.MoreDetails}
          OtherDescirption={alertConfig.OtherDescirption}
          OtherButtonPress={alertConfig.OtherButtonPress}
          OtherButtonText={alertConfig.OtherButtonText}
          onClose={hideAlert}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  list: { flex: 1 },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    marginBottom: 8,
    marginTop: 8,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  filtersPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginBottom: 14,
  },
  filterLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  filterInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  paymentFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paymentChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  filterActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterActionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  rowTime: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  rowMeta: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  rowChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  rowChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rowChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  rowItems: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  rowItemsMuted: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    fontStyle: 'italic',
  },
  expandedSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  seeMoreText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  rowTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 8,
  },
  rowAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});
