import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const historySummaryTabStyles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 8,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
  },
  pendingText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  summaryChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  summaryChipLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  summaryChipValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  resultsMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 2,
  },
  recordCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recordIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  recordOrderId: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  recordMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
  },
  recordAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    textAlign: 'right',
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  paymentChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  loadMoreBtn: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 44,
  },
  loadMoreText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
});
