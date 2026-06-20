import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const addExpenseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scroll: {
    paddingBottom: 120,
    gap: 14,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    overflow: 'hidden',
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
  },
  heroSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  fieldLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  categoryPicker: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryPickerText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  toggleSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginTop: 4,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  imageBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  imageBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 17,
    marginBottom: 12,
  },
  categoryOption: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  categoryOptionBody: {
    flex: 1,
  },
  categoryOptionName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyCategoriesText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
