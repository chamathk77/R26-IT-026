import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const retentionActionStyles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
    lineHeight: 18,
    marginBottom: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#ffffff',
  },

  // KPI & Filter Row
  filterBar: {
    marginBottom: 12,
  },
  chipScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
  },

  // Cards
  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress bar in cards
  progressBarContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  progressBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  progressBarPercent: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 12,
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
  },

  // Active status filter banner
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  filterBannerText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    flex: 1,
  },
  filterBannerClear: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  filterBannerClearText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },

  // Loading, Empty, and Error States
  loadingBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  errorBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  templateHeader: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  templateList: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  templateText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
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
  modalTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  modalSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectChipText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
  },
  dateInputsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInputCol: {
    flex: 1,
  },
  statusHelperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
  },
  statusHelperText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  quickDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickDateText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  submitBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },
  fieldErrorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
  },

  // Detail Modal Specific
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  detailValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  detailDescBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailDescText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
  },

  // Main Action Buttons Row (Solid Buttons, NO DROPDOWN)
  mainButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  retentionMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  retentionMainBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  retentionMainBtnCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  retentionMainBtnCountText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 11,
    color: '#ffffff',
  },
  retentionAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  retentionAddBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },

  // Status Filter Buttons (Shown in Popup Modal)
  statusButtonsBar: {
    marginBottom: 12,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  statusTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusTabBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  statusTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  statusTabBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
  },

  // Popup Modal Container
  retentionPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  retentionPopupCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    maxHeight: '92%',
  },
  popupHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popupAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  popupAddBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    color: '#ffffff',
  },

  // Main Section Card on Settings Page
  mainSectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  statusSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  statusSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusSummaryPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
});
