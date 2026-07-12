import { StyleSheet } from 'react-native';
import { fonts } from '../../../../../constants/fonts';

export const manageFeaturesSharedStyles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  retryButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  moduleCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  moduleTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  moduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleText: {
    flex: 1,
  },
  moduleTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  moduleDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  scrollWithFooter: {
    paddingBottom: 140,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  footerHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    minHeight: 52,
  },
  updateButtonDisabled: {
    opacity: 0.75,
  },
  updateButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
});
