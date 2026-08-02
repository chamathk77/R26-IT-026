import { StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';

export const analyticsStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  filterCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  filterTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  periodChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  customToggleText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  applyBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  applyBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  rangeLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginLeft: 2,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -20,
    opacity: 0.16,
  },
  heroEyebrow: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  heroAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    minWidth: 150,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  metricValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  metricSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  insightCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  insightTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  insightLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  insightValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyWrap: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
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
});
