import { Platform, StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../constants/fonts';
import { KitchenTicket, KitchenTicketStatus } from '../../type/kitchen';

type ThemeColors = MD3Theme['colors'] & {
  success?: string;
  onSuccess?: string;
  successContainer?: string;
  onSuccessContainer?: string;
};

export function getKitchenStatusAccent(status: KitchenTicketStatus, colors: ThemeColors): string {
  switch (status) {
    case 'pending':
      return colors.primary;
    case 'preparing':
      return colors.secondary;
    case 'ready':
      return colors.success ?? '#15803D';
    case 'served':
      return colors.primary;
    case 'cancelled':
      return colors.error;
    default:
      return colors.primary;
  }
}

export function getKitchenStatusLabel(status: KitchenTicketStatus): string {
  switch (status) {
    case 'pending':
      return 'New';
    case 'preparing':
      return 'Cooking';
    case 'ready':
      return 'Ready';
    case 'served':
      return 'Served';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function matchesKitchenTicketSearch(
  ticket: KitchenTicket,
  query: string,
  options?: { showTableManagement?: boolean },
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const kotNumber = String(ticket.ticketNumber);
  const cartNumber = String(ticket.cartNumber);
  const orderLabel = (ticket.orderLabel ?? '').toLowerCase();

  if (kotNumber.includes(normalized)) return true;
  if (cartNumber.includes(normalized)) return true;

  if (options?.showTableManagement && orderLabel.includes(normalized)) {
    return true;
  }

  if (orderLabel.includes(normalized)) return true;

  const orderType = (ticket.orderType ?? '').toLowerCase();
  return (
    orderType.includes(normalized) ||
    (orderType === 'takeaway' && 'take'.includes(normalized)) ||
    (orderType === 'dine_in' && ('dine'.includes(normalized) || 'table'.includes(normalized)))
  );
}

export function getKitchenSearchPlaceholder(showTableManagement: boolean): string {
  if (showTableManagement) return 'Search table or order #…';
  return 'Search order #…';
}

export type KitchenOrderTypeFilter = 'all' | 'dine_in' | 'takeaway';

export function matchesKitchenOrderTypeFilter(
  ticket: KitchenTicket,
  filter: KitchenOrderTypeFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'dine_in') return ticket.orderType === 'dine_in';
  return ticket.orderType === 'takeaway' || ticket.orderType === 'delivery';
}

export function kitchenCardShadow(resolvedTheme: 'light' | 'dark') {
  if (Platform.OS === 'android') {
    return { elevation: resolvedTheme === 'dark' ? 3 : 5 };
  }
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: resolvedTheme === 'dark' ? 0.28 : 0.08,
    shadowRadius: 14,
  };
}

export function kitchenButtonShadow(resolvedTheme: 'light' | 'dark') {
  if (Platform.OS === 'android') {
    return { elevation: resolvedTheme === 'dark' ? 2 : 4 };
  }
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: resolvedTheme === 'dark' ? 0.24 : 0.12,
    shadowRadius: 10,
  };
}

export const kitchenUi = StyleSheet.create({
  sectionEyebrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modernSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  compactSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  itemSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  itemSurfaceCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  orderTypeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  orderTypeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orderTypeFilterChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
  },
});
