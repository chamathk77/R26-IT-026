import { StyleSheet } from 'react-native';
import { fonts } from '../../../../../constants/fonts';
import { manageFeaturesSharedStyles } from '../shared/manageFeaturesSharedStyles';

export const manageSmsFeatureStyles = StyleSheet.create({
  ...manageFeaturesSharedStyles,
  renewalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  renewalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewalTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 2,
  },
  renewalValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  summaryLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
  },
  summaryValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    textAlign: 'right',
  },
  summaryValueStrong: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    textAlign: 'right',
  },
  packageSelectButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  packageSelectText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    flex: 1,
  },
  packageSelectHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  usageCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  usageMetric: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 28,
    marginBottom: 4,
  },
  usageCaption: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  currentPackageTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginBottom: 4,
  },
  toggleLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
});
