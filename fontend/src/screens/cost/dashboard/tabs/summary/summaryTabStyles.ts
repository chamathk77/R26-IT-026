import { StyleSheet } from 'react-native';
import { fonts } from '../../../../../constants/fonts';

export const summaryTabStyles = StyleSheet.create({
  filterCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  filterCardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  filterHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  pendingRangeBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingRangeText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
