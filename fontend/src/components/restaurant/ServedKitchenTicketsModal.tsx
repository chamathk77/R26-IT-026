import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { KitchenTicket } from '../../type/kitchen';
import CartOrderTypeBadge from './CartOrderTypeBadge';
import {
  kitchenButtonShadow,
  kitchenCardShadow,
  kitchenUi,
  matchesKitchenTicketSearch,
  getKitchenSearchPlaceholder,
  matchesKitchenOrderTypeFilter,
  KitchenOrderTypeFilter,
} from './kitchenUiStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  tickets: KitchenTicket[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  isRestaurant: boolean;
  showTableManagement: boolean;
  alertOverlay?: React.ReactNode;
};

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
  paperTheme: MD3Theme;
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

function ServedTicketCard({
  ticket,
  paperTheme,
  isRestaurant,
  showTableManagement,
  resolvedTheme,
}: {
  ticket: KitchenTicket;
  paperTheme: MD3Theme;
  isRestaurant: boolean;
  showTableManagement: boolean;
  resolvedTheme: 'light' | 'dark';
}) {
  const accent =
    ticket.orderType === 'dine_in' ? paperTheme.colors.tertiary : paperTheme.colors.primary;
  const tableLabel =
    showTableManagement && ticket.orderLabel?.trim() ? ticket.orderLabel.trim() : null;

  return (
    <View
      style={[
        styles.ticketCard,
        kitchenCardShadow(resolvedTheme),
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: `${paperTheme.colors.primary}22`,
        },
      ]}
    >
      <View style={[styles.ticketAccent, { backgroundColor: accent }]} />

      <View style={styles.ticketHeader}>
        <View style={styles.ticketTitleBlock}>
          <View style={styles.kotNumberRow}>
            <View style={[styles.kotIconWrap, { backgroundColor: `${accent}16` }]}>
              <Ionicons name="receipt-outline" size={16} color={accent} />
            </View>
            <Text style={[styles.ticketNumber, { color: paperTheme.colors.onSurface }]}>
              Order #{ticket.cartNumber}
            </Text>
          </View>
          <Text style={[styles.orderRef, { color: paperTheme.colors.onSurfaceVariant }]}>
            {ticket.ticketNumber > 1 ? `KOT #${ticket.ticketNumber}` : 'Served ticket'}
            {tableLabel ? ` · Table ${tableLabel}` : ''}
          </Text>
        </View>
        <View style={[styles.servedPill, { backgroundColor: `${paperTheme.colors.primary}16` }]}>
          <Ionicons name="checkmark-circle" size={13} color={paperTheme.colors.primary} />
          <Text style={[styles.servedPillText, { color: paperTheme.colors.primary }]}>Served</Text>
        </View>
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
        <View style={[styles.timePill, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
          <Ionicons name="time-outline" size={11} color={paperTheme.colors.onSurfaceVariant} />
          <Text style={[styles.timeText, { color: paperTheme.colors.onSurfaceVariant }]}>
            {formatTime(ticket.updatedAt ?? ticket.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.itemsBlock}>
        {ticket.items.map((item) => (
          <View
            key={`${ticket._id}-${item.productId}`}
            style={[kitchenUi.itemSurface, { backgroundColor: paperTheme.colors.background }]}
          >
            {item.productNumber ? (
              <View style={[styles.itemNumber, { backgroundColor: `${paperTheme.colors.tertiary}18` }]}>
                <Text style={[styles.itemNumberText, { color: paperTheme.colors.tertiary }]}>
                  {item.productNumber}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.itemQty, { color: accent }]}>x{item.quantity}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ServedKitchenTicketsModal({
  visible,
  onClose,
  tickets,
  loading,
  refreshing = false,
  onRefresh,
  isRestaurant,
  showTableManagement,
  alertOverlay,
}: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<KitchenOrderTypeFilter>('all');

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setOrderTypeFilter('all');
    }
  }, [visible]);

  const searchMatchedTickets = useMemo(() => {
    return tickets.filter((ticket) =>
      matchesKitchenTicketSearch(ticket, searchQuery, { showTableManagement }),
    );
  }, [searchQuery, showTableManagement, tickets]);

  const filteredTickets = useMemo(() => {
    if (!isRestaurant || orderTypeFilter === 'all') return searchMatchedTickets;
    return searchMatchedTickets.filter((ticket) => matchesKitchenOrderTypeFilter(ticket, orderTypeFilter));
  }, [isRestaurant, orderTypeFilter, searchMatchedTickets]);

  const orderTypeCounts = useMemo(() => {
    return {
      all: searchMatchedTickets.length,
      takeaway: searchMatchedTickets.filter((ticket) => matchesKitchenOrderTypeFilter(ticket, 'takeaway'))
        .length,
      dine_in: searchMatchedTickets.filter((ticket) => matchesKitchenOrderTypeFilter(ticket, 'dine_in'))
        .length,
    };
  }, [searchMatchedTickets]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || (isRestaurant && orderTypeFilter !== 'all');

  const searchPlaceholder = useMemo(
    () => getKitchenSearchPlaceholder(showTableManagement),
    [showTableManagement],
  );

  const renderTicket = useCallback(
    ({ item: ticket }: { item: KitchenTicket }) => (
      <ServedTicketCard
        ticket={ticket}
        paperTheme={paperTheme}
        isRestaurant={isRestaurant}
        showTableManagement={showTableManagement}
        resolvedTheme={resolvedTheme}
      />
    ),
    [isRestaurant, paperTheme, resolvedTheme, showTableManagement],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.header, { borderBottomColor: paperTheme.colors.outlineVariant }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.headerBtn,
              kitchenButtonShadow(resolvedTheme),
              { backgroundColor: paperTheme.colors.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close served orders"
          >
            <Ionicons name="chevron-down" size={22} color={paperTheme.colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[kitchenUi.sectionEyebrow, { color: paperTheme.colors.primary }]}>
              History
            </Text>
            <Text style={[styles.headerTitle, { color: paperTheme.colors.onBackground }]}>
              Served orders
            </Text>
            <Text style={[styles.headerSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {filteredTickets.length} of {tickets.length} served
            </Text>
          </View>

          {onRefresh ? (
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshing}
              style={[
                styles.headerBtn,
                kitchenButtonShadow(resolvedTheme),
                { backgroundColor: paperTheme.colors.surface },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Refresh served orders"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={paperTheme.colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        <View style={styles.searchSection}>
          <View
            style={[
              kitchenUi.modernSearchBar,
              kitchenCardShadow(resolvedTheme),
              {
                backgroundColor: paperTheme.colors.surface,
                borderWidth: 1,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.searchIconWrap, { backgroundColor: `${paperTheme.colors.primary}12` }]}>
              <Ionicons name="search-outline" size={18} color={paperTheme.colors.primary} />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={[styles.clearSearchIcon, { backgroundColor: paperTheme.colors.surfaceVariant }]}
              >
                <Ionicons name="close" size={14} color={paperTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isRestaurant ? (
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
          ) : null}
        </View>

        {loading && tickets.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            <Text style={[styles.centerStateText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading served orders…
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTickets}
            keyExtractor={(item) => item._id}
            renderItem={renderTicket}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={paperTheme.colors.primary}
                  colors={[paperTheme.colors.primary]}
                />
              ) : undefined
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <View
                  style={[
                    styles.emptyIcon,
                    kitchenCardShadow(resolvedTheme),
                    { backgroundColor: paperTheme.colors.surface },
                  ]}
                >
                  <Ionicons name="search-outline" size={32} color={paperTheme.colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  {hasActiveFilters ? 'No matches' : 'No served orders yet'}
                </Text>
                <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {hasActiveFilters
                    ? showTableManagement
                      ? 'Try another table number, order type, or order #.'
                      : 'Try another order type or order #.'
                    : 'Completed kitchen tickets will appear here.'}
                </Text>
                {hasActiveFilters ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setOrderTypeFilter('all');
                    }}
                    style={[
                      styles.clearSearchBtn,
                      kitchenButtonShadow(resolvedTheme),
                      { backgroundColor: paperTheme.colors.primary },
                    ]}
                  >
                    <Text style={[styles.clearSearchText, { color: paperTheme.colors.onPrimary }]}>
                      Clear filters
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        )}
      </SafeAreaView>
      {alertOverlay}
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
  },
  headerSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearSearchIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  ticketCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    paddingLeft: 6,
  },
  ticketAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  ticketTitleBlock: { flex: 1, gap: 4 },
  kotNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kotIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketNumber: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 19,
  },
  orderRef: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  servedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  servedPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  itemsBlock: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  itemNumber: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  itemNumberText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  itemQty: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  centerStateText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
  clearSearchBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  clearSearchText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});
