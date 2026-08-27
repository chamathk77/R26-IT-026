import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const recommendationsStyles = StyleSheet.create({
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
    textAlign: 'center',
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
  noticeTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 3,
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

  engineBadgeRow: {
    flexDirection: 'row',
    marginBottom: 14,
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

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 14,
    padding: 12,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 19,
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 2,
  },

  methodPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
  },
  methodPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },

  ruleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  ruleSentence: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleProduct: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    flexShrink: 1,
  },
  rulePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  rulePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rulePillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  ruleMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },

  attachCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  attachTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachName: {
    flex: 1,
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  attachValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  attachSentence: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  attachTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  attachFill: {
    height: '100%',
    borderRadius: 4,
  },
  attachMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },

  footNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
