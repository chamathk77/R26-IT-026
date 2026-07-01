import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const manageFeaturesStyles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -36,
    right: -24,
    opacity: 0.4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
