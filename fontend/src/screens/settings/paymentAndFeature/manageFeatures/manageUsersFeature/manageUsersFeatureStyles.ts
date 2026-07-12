import { StyleSheet } from 'react-native';
import { fonts } from '../../../../../constants/fonts';
import { manageFeaturesSharedStyles } from '../shared/manageFeaturesSharedStyles';

export const manageUsersFeatureStyles = StyleSheet.create({
  ...manageFeaturesSharedStyles,
  usersHeroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  usersHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usersHeroBody: {
    flex: 1,
  },
  usersHeroTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginBottom: 4,
  },
  usersHeroDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  summaryCardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  summaryRowLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
  },
  summaryRowValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  summaryRowValueStrong: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  savedCapacityHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.35,
    marginVertical: 10,
  },
  billingNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  billingBreakdown: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontFamily: fonts.PoppinsRegular,
    fontSize: 16,
  },
  inputContent: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 16,
  },
  usersHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  billingTopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  billingTopIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingTopBody: {
    flex: 1,
  },
  billingTopLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginBottom: 2,
  },
  billingTopValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  pendingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  pendingCardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  pendingCardDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  cancelScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cancelScheduleButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});
