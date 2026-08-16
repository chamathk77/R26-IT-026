import { StyleSheet } from 'react-native';
import { fonts } from '../../../constants/fonts';

export const userBehaviorStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  rangeChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  rangeChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  statTrend: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    marginTop: 8,
  },
  featureRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featureTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureName: {
    flex: 1,
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  featureShare: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
  },
  featureTrack: {
    height: 7,
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  featureFill: {
    height: '100%',
    borderRadius: 999,
  },
  featureMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  memberMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  memberActions: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    textAlign: 'right',
  },
  memberActionsLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
    textAlign: 'right',
  },
  activityRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  activityDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  activityTime: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 4,
  },
  peakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 8,
    height: 150,
  },
  peakBarWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  peakBar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 6,
  },
  peakLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  footNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
