import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import CartOrderTypeBadge from '../../components/restaurant/CartOrderTypeBadge';
import ServedKitchenTicketsModal from '../../components/restaurant/ServedKitchenTicketsModal';
import {
  fetchKitchenTickets_Service,
  fetchServedKitchenTickets_Service,
  updateKitchenTicketStatus_Service,
} from '../../services/KitchenService';
import { fetchPendingCartSessions_Service } from '../../services/CartService';
import { AppDispatch, RootState } from '../../store/store';
import { KitchenTicket, KitchenTicketStatus } from '../../type/kitchen';
import { getApiErrorMessage, handleSessionExpiredApiError } from '../../utils/apiErrorAlert';
import { hasKitchenOrders, hasTableManagement, isRestaurantShop } from '../../utils/industryHelper';
import { useShopIndustry } from '../../hooks/useShopIndustry';
import { kitchenButtonShadow, kitchenCardShadow, kitchenUi, getKitchenStatusAccent, getKitchenStatusLabel, matchesKitchenTicketSearch, getKitchenSearchPlaceholder, matchesKitchenOrderTypeFilter, KitchenOrderTypeFilter } from '../../components/restaurant/kitchenUiStyles';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Kitchen'>;

type FilterKey = 'all' | 'pending' | 'preparing' | 'ready';

const STAT_FILTERS: Array<{
  key: Exclude<FilterKey, 'all'>;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'pending', label: 'New', icon: 'sparkles-outline' },
  { key: 'preparing', label: 'Cooking', icon: 'flame-outline' },
  { key: 'ready', label: 'Ready', icon: 'checkmark-done-outline' },
];

function formatTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function OrderTypeFilterChip({
  label,
  active,
  onPress,
  icon,
  paperTheme,
  accentColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  accentColor?: string;
}) {
  const accent = accentColor ?? paperTheme.colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        kitchenUi.orderTypeFilterChip,
        {
          backgroundColor: active ? `${accent}18` : paperTheme.colors.surfaceVariant,
          borderColor: active ? `${accent}55` : 'transparent',
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={12}
          color={active ? accent : paperTheme.colors.onSurfaceVariant}
        />
      ) : null}
      <Text
        style={[
          kitchenUi.orderTypeFilterChipText,
          { color: active ? accent : paperTheme.colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatFilterCard({
  filterKey,
  count,
  active,
  onPress,
  paperTheme,
  resolvedTheme,
}: {
  filterKey: Exclude<FilterKey, 'all'>;
  count: number;
  active: boolean;
  onPress: () => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const meta = STAT_FILTERS.find((item) => item.key === filterKey)!;
  const accent = getKitchenStatusAccent(filterKey, paperTheme.colors as any);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        kitchenUi.statCard,
        {
          backgroundColor: active ? `${accent}12` : paperTheme.colors.surface,
          borderColor: active ? `${accent}55` : paperTheme.colors.outlineVariant,
        },
      ]}
    >
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: active ? `${accent}20` : paperTheme.colors.surfaceVariant },
        ]}
      >
        <Ionicons name={meta.icon} size={14} color={accent} />
      </View>
      <Text style={[kitchenUi.statValue, { color: paperTheme.colors.onSurface }]}>{count}</Text>
      <Text style={[kitchenUi.statLabel, { color: active ? accent : paperTheme.colors.onSurfaceVariant }]}>
        {meta.label}
      </Text>
    </TouchableOpacity>
  );
}

function StatusBadge({
  status,
}: {
  status: KitchenTicketStatus;
}) {
  const { paperTheme } = useTheme();
  const accent = getKitchenStatusAccent(status, paperTheme.colors as any);
  const iconMap: Partial<Record<KitchenTicketStatus, keyof typeof Ionicons.glyphMap>> = {
    pending: 'sparkles-outline',
    preparing: 'flame-outline',
    ready: 'checkmark-done-outline',
  };

  return (
    <View style={[styles.statusPill, { backgroundColor: `${accent}16` }]}>
      {iconMap[status] ? <Ionicons name={iconMap[status]!} size={11} color={accent} /> : null}
      <Text style={[styles.statusPillText, { color: accent }]}>{getKitchenStatusLabel(status)}</Text>
    </View>
  );
}

function ModernActionButton({
  label,
  icon,
  onPress,
  disabled,
  loading,
  backgroundColor,
  textColor,
  resolvedTheme,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  backgroundColor: string;
  textColor: string;
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        styles.actionBtnFlex,
        kitchenButtonShadow(resolvedTheme),
        { backgroundColor, opacity: disabled ? 0.72 : 1 },
      ]}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          <View style={[styles.actionIconWrap, { backgroundColor: `${textColor}18` }]}>
            <Ionicons name={icon} size={14} color={textColor} />
          </View>
          <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function KitchenScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { shop } = useShopIndustry();
  const isRestaurant = isRestaurantShop(shop);
  const showKitchen = hasKitchenOrders(shop);
  const showTableManagement = hasTableManagement(shop);
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const commonAlert = useMemo(() => {
    if (!alertConfig) return null;

    return (
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
      />
    );
  }, [alertConfig, hideAlert, visible]);
  const { items, loading } = useSelector((state: RootState) => state.KitchenReducer.tickets);
  const { items: servedItems, loading: servedLoading } = useSelector(
    (state: RootState) => state.KitchenReducer.servedTickets,
  );
  const { loadingTicketId } = useSelector((state: RootState) => state.KitchenReducer.updateStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [servedModalVisible, setServedModalVisible] = useState(false);
  const [servedRefreshing, setServedRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<KitchenOrderTypeFilter>('all');

  const loadOpenTickets = useCallback(async () => {
    if (!showKitchen) return;
    try {
      await dispatch(fetchKitchenTickets_Service({})).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load kitchen tickets.'),
        1,
        true,
        'OK',
      );
    }
  }, [dispatch, showKitchen, show_Alert]);

  const loadServedTickets = useCallback(async () => {
    if (!showKitchen) return;
    try {
      await dispatch(fetchServedKitchenTickets_Service({ limit: 50 })).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load served orders.'),
        1,
        true,
        'OK',
      );
    }
  }, [dispatch, showKitchen, show_Alert]);

  const loadTickets = useCallback(async () => {
    await Promise.all([loadOpenTickets(), loadServedTickets()]);
  }, [loadOpenTickets, loadServedTickets]);

  const openServedModal = useCallback(() => {
    setServedModalVisible(true);
    void loadServedTickets();
  }, [loadServedTickets]);

  const closeServedModal = useCallback(() => {
    setServedModalVisible(false);
  }, []);

  const refreshServedModal = useCallback(async () => {
    setServedRefreshing(true);
    try {
      await loadServedTickets();
    } finally {
      setServedRefreshing(false);
    }
  }, [loadServedTickets]);

  useFocusEffect(
    useCallback(() => {
      void loadTickets();
    }, [loadTickets]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTickets();
    } finally {
      setRefreshing(false);
    }
  }, [loadTickets]);

  const searchMatchedItems = useMemo(() => {
    return items.filter((ticket) =>
      matchesKitchenTicketSearch(ticket, tableSearchQuery, { showTableManagement }),
    );
  }, [items, showTableManagement, tableSearchQuery]);

  const orderTypeMatchedItems = useMemo(() => {
    if (!isRestaurant || orderTypeFilter === 'all') return searchMatchedItems;
    return searchMatchedItems.filter((ticket) => matchesKitchenOrderTypeFilter(ticket, orderTypeFilter));
  }, [isRestaurant, orderTypeFilter, searchMatchedItems]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') return orderTypeMatchedItems;
    return orderTypeMatchedItems.filter((ticket) => ticket.status === statusFilter);
  }, [orderTypeMatchedItems, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: orderTypeMatchedItems.length,
      pending: orderTypeMatchedItems.filter((ticket) => ticket.status === 'pending').length,
      preparing: orderTypeMatchedItems.filter((ticket) => ticket.status === 'preparing').length,
      ready: orderTypeMatchedItems.filter((ticket) => ticket.status === 'ready').length,
    };
  }, [orderTypeMatchedItems]);

  const orderTypeCounts = useMemo(() => {
    return {
      all: searchMatchedItems.length,
      takeaway: searchMatchedItems.filter((ticket) => matchesKitchenOrderTypeFilter(ticket, 'takeaway'))
        .length,
      dine_in: searchMatchedItems.filter((ticket) => matchesKitchenOrderTypeFilter(ticket, 'dine_in')).length,
    };
  }, [searchMatchedItems]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    tableSearchQuery.trim().length > 0 ||
    (isRestaurant && orderTypeFilter !== 'all');
  const searchPlaceholder = useMemo(
    () => getKitchenSearchPlaceholder(showTableManagement),
    [showTableManagement],
  );

  const handleUpdateStatus = useCallback(
    async (ticket: KitchenTicket, nextStatus: KitchenTicketStatus) => {
      try {
        await dispatch(
          updateKitchenTicketStatus_Service({
            ticketId: ticket._id,
            status: nextStatus,
          }),
        ).unwrap();

        if (nextStatus === 'served') {
          void loadServedTickets();
        }

        if (nextStatus === 'cancelled' && ticket.orderType === 'dine_in') {
          void dispatch(fetchPendingCartSessions_Service());
        }
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;
        show_Alert(
          'error',
          'Update failed',
          getApiErrorMessage(error, 'Could not update ticket status.'),
          1,
          true,
          'OK',
        );
      }
    },
    [dispatch, loadServedTickets, show_Alert],
  );

  const handleCancelTicket = useCallback(
    (ticket: KitchenTicket) => {
      show_Alert(
        'error',
        'Cancel KOT?',
        `Cancel kitchen send for Order #${ticket.cartNumber}?`,
        2,
        true,
        'Cancel KOT',
        () => {
          void handleUpdateStatus(ticket, 'cancelled');
        },
        'Keep',
        () => {},
      );
    },
    [handleUpdateStatus, show_Alert],
  );

  const renderTicket = useCallback(
    ({ item: ticket }: { item: KitchenTicket }) => {
      const isUpdating = loadingTicketId === ticket._id;
      const statusAccent = getKitchenStatusAccent(ticket.status, paperTheme.colors as any);
      const orderAccent =
        ticket.orderType === 'dine_in' ? paperTheme.colors.tertiary : paperTheme.colors.primary;
      const successContainer = (paperTheme.colors as any).successContainer ?? '#DCFCE7';
      const onSuccessContainer = (paperTheme.colors as any).onSuccessContainer ?? '#14532D';

      return (
        <View
          style={[
            styles.ticketCard,
            kitchenCardShadow(resolvedTheme),
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: `${statusAccent}28`,
            },
          ]}
        >
          <View style={[styles.ticketAccent, { backgroundColor: statusAccent }]} />

          <View style={styles.ticketHeader}>
            <View style={styles.ticketTitleBlock}>
              <View style={styles.kotNumberRow}>
                <View style={[styles.kotIconWrap, { backgroundColor: `${statusAccent}16` }]}>
                  <Ionicons name="receipt-outline" size={14} color={statusAccent} />
                </View>
                <Text style={[styles.ticketNumber, { color: paperTheme.colors.onSurface }]}>
                  Order #{ticket.cartNumber}
                </Text>
              </View>
              {ticket.ticketNumber > 1 ? (
                <Text style={[styles.orderRef, { color: paperTheme.colors.onSurfaceVariant }]}>
                  KOT #{ticket.ticketNumber}
                  {ticket.orderLabel ? ` · ${ticket.orderLabel}` : ''}
                </Text>
              ) : (
                <Text style={[styles.orderRef, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {ticket.orderLabel ? ticket.orderLabel : 'Kitchen ticket'}
                </Text>
              )}
            </View>
            <StatusBadge status={ticket.status} />
          </View>

          <View style={styles.ticketMetaRow}>
            {isRestaurant && ticket.orderType ? (
              <CartOrderTypeBadge
                orderType={ticket.orderType}
                orderLabel={ticket.orderLabel}
                showTableManagement={showTableManagement}
                compact
              />
            ) : null}
            <Text style={[styles.timeText, { color: paperTheme.colors.onSurfaceVariant }]}>
              {formatTime(ticket.createdAt)}
            </Text>
          </View>

          <View style={styles.itemsBlock}>
            {ticket.items.map((item) => (
              <View
                key={`${ticket._id}-${item.productId}`}
                style={[kitchenUi.itemSurfaceCompact, { backgroundColor: paperTheme.colors.background }]}
              >
                {item.productNumber ? (
                  <View style={[styles.itemNumber, { backgroundColor: `${orderAccent}14` }]}>
                    <Text style={[styles.itemNumberText, { color: orderAccent }]}>{item.productNumber}</Text>
                  </View>
                ) : null}
                <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemQty, { color: statusAccent }]}>x{item.quantity}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionsRow}>
            {ticket.status === 'pending' ? (
              <ModernActionButton
                label="Start cooking"
                icon="flame-outline"
                backgroundColor={paperTheme.colors.primaryContainer}
                textColor={paperTheme.colors.onPrimaryContainer}
                disabled={isUpdating}
                loading={isUpdating}
                resolvedTheme={resolvedTheme}
                onPress={() => {
                  void handleUpdateStatus(ticket, 'preparing');
                }}
              />
            ) : null}

            {ticket.status === 'preparing' ? (
              <ModernActionButton
                label="Mark ready"
                icon="checkmark-circle-outline"
                backgroundColor={paperTheme.colors.primary}
                textColor={paperTheme.colors.onPrimary}
                disabled={isUpdating}
                loading={isUpdating}
                resolvedTheme={resolvedTheme}
                onPress={() => {
                  void handleUpdateStatus(ticket, 'ready');
                }}
              />
            ) : null}

            {ticket.status === 'ready' ? (
              <ModernActionButton
                label="Mark served"
                icon="hand-left-outline"
                backgroundColor={successContainer}
                textColor={onSuccessContainer}
                disabled={isUpdating}
                loading={isUpdating}
                resolvedTheme={resolvedTheme}
                onPress={() => {
                  void handleUpdateStatus(ticket, 'served');
                }}
              />
            ) : null}

            <TouchableOpacity
              style={styles.cancelLinkBtn}
              disabled={isUpdating}
              onPress={() => handleCancelTicket(ticket)}
              activeOpacity={0.75}
            >
              <Ionicons name="close-circle-outline" size={14} color={paperTheme.colors.error} />
              <Text style={[styles.cancelLinkText, { color: paperTheme.colors.error }]}>Cancel order</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      handleCancelTicket,
      handleUpdateStatus,
      isRestaurant,
      loadingTicketId,
      paperTheme,
      resolvedTheme,
      showTableManagement,
    ],
  );

  if (!showKitchen) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}>
        <View style={styles.centerState}>
          <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
            Kitchen not enabled
          </Text>
          <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
            Enable kitchen orders for this restaurant shop to use this tab.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={[kitchenUi.sectionEyebrow, { color: paperTheme.colors.primary }]}>
              Live queue
            </Text>
            <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Kitchen</Text>
            <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              {filteredTickets.length} open ticket{filteredTickets.length === 1 ? '' : 's'}
              {tableSearchQuery.trim()
                ? ` · ${filteredTickets.length} of ${items.length} match`
                : ''}
              {statusFilter !== 'all' ? ` · ${getKitchenStatusLabel(statusFilter)} only` : ''}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                kitchenUi.headerIconBtn,
                kitchenButtonShadow(resolvedTheme),
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
              ]}
              onPress={() => {
                void onRefresh();
              }}
              disabled={refreshing}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Refresh kitchen tickets"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={paperTheme.colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                kitchenUi.headerIconBtn,
                kitchenButtonShadow(resolvedTheme),
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
              ]}
              onPress={openServedModal}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="View served orders"
            >
              <Ionicons name="time-outline" size={20} color={paperTheme.colors.primary} />
              {servedItems.length > 0 ? (
                <View style={[styles.servedBadge, { backgroundColor: paperTheme.colors.primary }]}>
                  <Text style={[styles.servedBadgeText, { color: paperTheme.colors.onPrimary }]}>
                    {servedItems.length > 99 ? '99+' : servedItems.length}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        {isRestaurant ? (
          <View style={styles.searchSection}>
            <View
              style={[
                kitchenUi.compactSearchBar,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderWidth: 1,
                  borderColor: tableSearchQuery.trim()
                    ? `${paperTheme.colors.primary}44`
                    : paperTheme.colors.outlineVariant,
                },
              ]}
            >
              <View style={[styles.searchIconWrap, { backgroundColor: `${paperTheme.colors.primary}12` }]}>
                <Ionicons name="search-outline" size={16} color={paperTheme.colors.primary} />
              </View>
              <TextInput
                value={tableSearchQuery}
                onChangeText={setTableSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {tableSearchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setTableSearchQuery('')}
                  hitSlop={8}
                  style={[styles.clearSearchIcon, { backgroundColor: paperTheme.colors.surfaceVariant }]}
                >
                  <Ionicons name="close" size={13} color={paperTheme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={kitchenUi.orderTypeFilterRow}>
              <OrderTypeFilterChip
                label={`All (${orderTypeCounts.all})`}
                active={orderTypeFilter === 'all'}
                onPress={() => setOrderTypeFilter('all')}
                paperTheme={paperTheme}
              />
              <OrderTypeFilterChip
                label={`Takeaway (${orderTypeCounts.takeaway})`}
                active={orderTypeFilter === 'takeaway'}
                onPress={() => setOrderTypeFilter('takeaway')}
                icon="bag-handle-outline"
                paperTheme={paperTheme}
                accentColor={paperTheme.colors.primary}
              />
              <OrderTypeFilterChip
                label={`Dine-in (${orderTypeCounts.dine_in})`}
                active={orderTypeFilter === 'dine_in'}
                onPress={() => setOrderTypeFilter('dine_in')}
                icon="restaurant-outline"
                paperTheme={paperTheme}
                accentColor={paperTheme.colors.tertiary}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          {STAT_FILTERS.map((stat) => (
            <StatFilterCard
              key={stat.key}
              filterKey={stat.key}
              count={counts[stat.key]}
              active={statusFilter === stat.key}
              onPress={() => {
                setStatusFilter((current) => (current === stat.key ? 'all' : stat.key));
              }}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />
          ))}
        </View>

        {hasActiveFilters ? (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => {
              setStatusFilter('all');
              setTableSearchQuery('');
              setOrderTypeFilter('all');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.clearFilterText, { color: paperTheme.colors.primary }]}>
              Clear filters
            </Text>
            <Ionicons name="close-circle" size={16} color={paperTheme.colors.primary} />
          </TouchableOpacity>
        ) : null}

        {loading && items.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTickets}
            keyExtractor={(item) => item._id}
            renderItem={renderTicket}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void onRefresh();
                }}
                tintColor={paperTheme.colors.primary}
                colors={[paperTheme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <View style={[styles.emptyIcon, { backgroundColor: `${paperTheme.colors.primary}12` }]}>
                  <Ionicons
                    name={hasActiveFilters ? 'search-outline' : 'checkmark-done-outline'}
                    size={36}
                    color={paperTheme.colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  {hasActiveFilters ? 'No matching tickets' : 'Kitchen is clear'}
                </Text>
                <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {hasActiveFilters
                    ? showTableManagement
                      ? 'Try another table number, order type, or order #.'
                      : 'Try another order type or order #.'
                    : 'New tickets appear when orders are sent from Products.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <ServedKitchenTicketsModal
        visible={servedModalVisible}
        onClose={closeServedModal}
        tickets={servedItems}
        loading={servedLoading}
        refreshing={servedRefreshing}
        onRefresh={() => {
          void refreshServedModal();
        }}
        isRestaurant={isRestaurant}
        showTableManagement={showTableManagement}
        alertOverlay={commonAlert}
      />

      {!servedModalVisible && commonAlert}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 26,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  servedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  servedBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 12,
  },
  clearFilterText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    paddingLeft: 4,
  },
  ticketAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  ticketTitleBlock: { flex: 1, gap: 2 },
  kotNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kotIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketNumber: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  orderRef: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
    flexWrap: 'wrap',
  },
  timeText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
  },
  itemsBlock: {
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 6,
  },
  itemNumber: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  itemNumberText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 9,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  itemQty: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 12,
  },
  actionsRow: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  actionBtnFlex: {
    width: '100%',
  },
  cancelLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  cancelLinkText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
