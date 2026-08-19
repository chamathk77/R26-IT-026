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
    fontSize: 16,
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

  // Busiest hours — refined bar strip with a floating peak badge.
  peakBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 130,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
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
    minHeight: 4,
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

  footNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
