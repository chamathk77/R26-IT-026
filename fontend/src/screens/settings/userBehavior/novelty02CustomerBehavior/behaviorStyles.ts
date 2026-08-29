import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const behaviorStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topicFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topicFilterBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  sectionSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  },
  retryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },

  // Insight cards — one elevated tile per finding, icon chip colored by tone.
  insightStack: {
    gap: 10,
    marginBottom: 4,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    lineHeight: 18,
  },

  // Upcoming High-Demand Selling Items
  upcomingStack: {
    gap: 10,
    marginBottom: 6,
  },
  upcomingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  upcomingNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  upcomingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingName: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    flex: 1,
  },
  upcomingDemandBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  upcomingDemandText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  upcomingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  upcomingChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  upcomingAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  upcomingAdviceText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
  },

  // Sales Trend Chart Styles
  trendCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  trendBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  trendMethodText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  trendChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    height: 120,
    paddingTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  trendBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  trendBarFill: {
    width: '75%',
    maxWidth: 24,
    minHeight: 4,
    borderRadius: 6,
  },
  trendPointLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  trendInspectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  trendInspectionValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
  },
  trendInspectionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
  },

  // Busiest hours — refined bar strip with interactive selection
  peakBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  peakBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  activeHourCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeHourLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activeHourIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeHourTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
  },
  activeHourSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 1,
  },
  activeHourStats: {
    alignItems: 'flex-end',
  },
  activeHourRevenue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  activeHourOrders: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    marginTop: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 140,
    paddingTop: 10,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
    paddingVertical: 2,
  },
  barTrack: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 6,
  },
  barSelected: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    transform: [{ scaleY: 1.05 }],
  },
  barLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 9,
  },

  // Weekend vs weekday — single proportional split bar.
  splitBarLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  splitBarSideLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  splitBarValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
    marginTop: 2,
  },
  splitBarTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 12,
  },
  splitBarSegment: {
    height: '100%',
  },
  splitBarCaption: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  // Leaderboard rows for top/slow products.
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 12,
  },
  leaderboardBody: {
    flex: 1,
    minWidth: 0,
  },
  leaderboardName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  leaderboardTrack: {
    height: 6,
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  leaderboardFill: {
    height: '100%',
    borderRadius: 999,
  },
  leaderboardMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 5,
  },
  leaderboardValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
    textAlign: 'right',
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 6,
  },
  tagText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },

  // Customer segments — pie + custom legend.
  pieRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 4,
  },
  legendBody: {
    flex: 1,
    minWidth: 0,
  },
  legendLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  legendMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 2,
  },
  legendValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    textAlign: 'right',
  },
  legendValueLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
    textAlign: 'right',
  },
  methodPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  methodPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  engineBadgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  engineBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },

  footNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },

  // Date range filter bar (1D, 3D, 7D, 2W, 1M, 6M, 1Y)
  dateFilterContainer: {
    marginBottom: 12,
    marginTop: 4,
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Dedicated Report Action Bar
  reportActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  printPrimaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  printPrimaryActionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },
  shareSecondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  shareSecondaryActionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },

  // Export Footer Card
  exportFooterCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  exportFooterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  exportFooterTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  exportFooterSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  dateChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },

  // Category filter tabs (horizontal scrollable chip-style tabs)
  tabBarContainer: {
    marginBottom: 14,
  },
  tabBarContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },

  // Empty tab placeholder
  emptyTabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  emptyTabText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },

  // Modal / Popup styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  modalSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
  },
  modalStatBox: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  modalStatLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginBottom: 4,
  },
  modalStatValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  modalTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  modalTipText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
  },
  modalDoneBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },

  // Timeframe Filter Modal Styles
  filterOptionStack: {
    gap: 8,
    marginVertical: 12,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filterOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterOptionLabel: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
  },
  filterOptionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 15,
  },
  // Feature Selection for Print Modal
  featureHeaderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  featureSelectAllText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  featureOptionStack: {
    gap: 6,
    marginVertical: 6,
  },
  featureOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  featureOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureOptionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  featureOptionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
    lineHeight: 14,
  },
});
