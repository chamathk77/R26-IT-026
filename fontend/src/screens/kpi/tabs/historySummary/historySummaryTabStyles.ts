import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const historySummaryTabStyles = StyleSheet.create({
  emptyState: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  pendingText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyBody: {
    flex: 1,
    gap: 2,
  },
  historyOrder: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  historyMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  historyAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
});
