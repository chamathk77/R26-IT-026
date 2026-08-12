import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fonts } from '../../../constants/fonts';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { formatDisplayDate } from '../../../components/DatePickerField/DatePickerField';
import { useTheme } from '../../../context/ThemeContext';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import {
  assignKpiHistorySalesPerson_Service,
  fetchKpiHistoryByOrderId_Service,
} from '../../../services/KpiService';
import { fetchSalePersonsForLoggedUserBranch_Service } from '../../../services/SalePersonService';
import {
  resetKpiAssignSalesPerson,
  resetKpiHistoryDetail,
} from '../../../store/reducers/KpiReducer';
import { AppDispatch, RootState } from '../../../store/store';
import { SalePerson } from '../../../type/salePerson';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import {
  formatCheckoutTime,
  getPaymentLabel,
} from '../../pos/HistoryScreens/historyFormat';
import { formatKpiAmount, getKpiSalePersonName } from '../shared/kpiMockData';
import { kpiCardShadow } from '../shared/kpiStyles';
import {
  KpiModalListSkeleton,
  KpiUnassignedOrderDetailSkeleton,
} from '../shared/kpiSkeletonComponents';
import { formatDisplayOrderNumber } from '../../../utils/orderNumber';
import { unassignedOrderDetailStyles as styles } from './unassignedOrderDetailStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'KpiUnassignedOrderDetail'>;

function DetailRow({
  label,
  value,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export default function UnassignedOrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const {
    loading: detailLoading,
    data: detail,
    error: detailError,
  } = useSelector((state: RootState) => state.KpiReducer.historyDetail);
  const { loading: assigning } = useSelector(
    (state: RootState) => state.KpiReducer.assignSalesPerson,
  );
  const {
    loading: salePersonsLoading,
    items: salePersons,
  } = useSelector((state: RootState) => state.SalePersonReducer.branchList);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);

  const loadOrderDetail = useCallback(async () => {
    try {
      await dispatch(fetchKpiHistoryByOrderId_Service(orderId)).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(err, 'Could not load order details. Please try again.'),
        2,
        false,
        'Retry',
        () => {
          void loadOrderDetail();
        },
        'Go back',
        () => {
          navigation.goBack();
        },
      );
    }
  }, [dispatch, navigation, orderId, show_Alert]);

  const loadSalePersons = useCallback(async () => {
    try {
      await dispatch(fetchSalePersonsForLoggedUserBranch_Service()).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(err, 'Could not load sales persons for this branch. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      dispatch(resetKpiHistoryDetail());
      dispatch(resetKpiAssignSalesPerson());
      setSelectedSalesPersonId(null);
      setPickerVisible(false);
      void loadOrderDetail();
    }, [dispatch, loadOrderDetail]),
  );

  const selectedPerson = useMemo(
    () => salePersons.find((person) => person._id === selectedSalesPersonId) ?? null,
    [salePersons, selectedSalesPersonId],
  );

  const selectedPersonName = selectedPerson ? getKpiSalePersonName(selectedPerson) : null;

  const displayOrderLabel = formatDisplayOrderNumber(detail?.cartNumber, detail?.orderId ?? orderId);

  const checkOutLabel = detail?.checkOutTime
    ? formatDisplayDate(detail.checkOutTime.slice(0, 10))
    : '—';
  const checkOutTimeLabel = detail?.checkOutTime ? formatCheckoutTime(detail.checkOutTime) : '—';

  const handleOpenPicker = () => {
    setPickerVisible(true);
    if (salePersons.length === 0 && !salePersonsLoading) {
      void loadSalePersons();
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedSalesPersonId) {
      show_Alert(
        'pending',
        'Select sales person',
        'Choose a sales person from the list before confirming.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    try {
      await dispatch(
        assignKpiHistorySalesPerson_Service({
          orderId,
          salesPersonId: selectedSalesPersonId,
        }),
      ).unwrap();

      setPickerVisible(false);
      show_Alert(
        'success',
        'Assigned',
        `${selectedPersonName ?? 'Sales person'} has been assigned to ${displayOrderLabel}.`,
        1,
        false,
        'OK',
        () => {
          navigation.goBack();
        },
      );
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Assign failed',
        getApiErrorMessage(err, 'Could not assign sales person. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  };

  const accent = resolvedTheme === 'dark' ? '#f59e0b' : '#d97706';
  const heroBg = resolvedTheme === 'dark' ? '#422006' : '#fffbeb';
  const heroBorder = '#f59e0b';

  const renderSalePersonOption = (person: SalePerson) => {
    const selected = selectedSalesPersonId === person._id;
    return (
      <TouchableOpacity
        key={person._id}
        style={[
          pickerStyles.option,
          {
            backgroundColor: selected
              ? paperTheme.colors.primaryContainer
              : paperTheme.colors.surfaceVariant,
            borderColor: selected ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
          },
        ]}
        onPress={() => setSelectedSalesPersonId(person._id)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[pickerStyles.optionLabel, { color: paperTheme.colors.onSurface }]}>
            {getKpiSalePersonName(person)}
          </Text>
          <Text style={[pickerStyles.optionSub, { color: paperTheme.colors.onSurfaceVariant }]}>
            {person.salePersonId} · {person.position}
          </Text>
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={22} color={paperTheme.colors.primary} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Unassigned order"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {detailLoading && !detail ? (
          <KpiUnassignedOrderDetailSkeleton
            boneColor={paperTheme.colors.surfaceVariant}
            cardColor={paperTheme.colors.surface}
            borderColor={paperTheme.colors.outlineVariant}
          />
        ) : detailError && !detail ? (
          <View style={pickerStyles.centered}>
            <Ionicons name="alert-circle-outline" size={40} color={paperTheme.colors.error} />
            <Text style={[pickerStyles.loadingText, { color: paperTheme.colors.onSurface }]}>
              {detailError}
            </Text>
            <TouchableOpacity
              onPress={() => void loadOrderDetail()}
              style={[pickerStyles.retryBtn, { backgroundColor: paperTheme.colors.primary }]}
            >
              <Text style={{ color: paperTheme.colors.onPrimary, fontFamily: fonts.PoppinsSemiBold }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : detail ? (
          <>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View
                style={[
                  styles.heroCard,
                  { backgroundColor: heroBg, borderColor: heroBorder },
                  kpiCardShadow(resolvedTheme),
                ]}
              >
                <View style={[styles.heroAccent, { backgroundColor: accent }]} />

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: resolvedTheme === 'dark' ? '#78350f' : '#fef3c7',
                      borderColor: accent,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={14} color={accent} />
                  <Text style={[styles.statusBadgeText, { color: accent }]}>No sales person</Text>
                </View>

                <Text
                  style={[styles.orderId, { color: resolvedTheme === 'dark' ? '#fef3c7' : '#92400e' }]}
                >
                  {displayOrderLabel}
                </Text>
                <Text
                  style={[styles.heroMeta, { color: resolvedTheme === 'dark' ? '#fcd34d' : '#b45309' }]}
                >
                  {checkOutLabel}
                </Text>

                <View
                  style={[
                    styles.amountPanel,
                    {
                      backgroundColor: resolvedTheme === 'dark' ? '#78350f44' : '#fef3c7',
                      borderColor: `${accent}55`,
                    },
                  ]}
                >
                  <Text style={[styles.amountLabel, { color: accent }]}>Total amount</Text>
                  <Text style={[styles.amountValue, { color: accent }]}>
                    {formatKpiAmount(detail.totalAmount)}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  kpiCardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                  Order info
                </Text>
                <DetailRow
                  label="Customer"
                  value={detail.customerName || '—'}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
                <DetailRow
                  label="Mobile"
                  value={detail.customerMobile || '—'}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
                <DetailRow
                  label="Payment"
                  value={getPaymentLabel(detail.paymentOption)}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
                <DetailRow
                  label="Handled by"
                  value={detail.submittedUserName || '—'}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
                <DetailRow
                  label="Checkout"
                  value={checkOutTimeLabel}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
                {detail.isDiscount ? (
                  <>
                    <DetailRow
                      label="Subtotal"
                      value={formatKpiAmount(detail.amount)}
                      labelColor={paperTheme.colors.onSurfaceVariant}
                      valueColor={paperTheme.colors.onSurface}
                    />
                    <DetailRow
                      label="Discount"
                      value={`-${formatKpiAmount(detail.discountedAmount)}`}
                      labelColor={paperTheme.colors.onSurfaceVariant}
                      valueColor={paperTheme.colors.error}
                    />
                  </>
                ) : null}
              </View>

              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  kpiCardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                  Items ({detail.items.length})
                </Text>
                {detail.items.map((item, index) => {
                  const unitCost = item.unitCost ?? 0;
                  const lineTotal = unitCost * item.qty;
                  return (
                    <View
                      key={`${item.productId}-${index}`}
                      style={[
                        styles.itemRow,
                        {
                          borderBottomColor: paperTheme.colors.outlineVariant,
                          borderBottomWidth:
                            index === detail.items.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]}>
                          {item.productName}
                        </Text>
                        <Text
                          style={[styles.itemMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                        >
                          Qty {item.qty} · Unit {formatKpiAmount(unitCost)}
                        </Text>
                      </View>
                      <Text style={[styles.itemAmount, { color: paperTheme.colors.primary }]}>
                        {formatKpiAmount(lineTotal)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {selectedPersonName ? (
                <View
                  style={[
                    styles.section,
                    {
                      backgroundColor: paperTheme.colors.primaryContainer,
                      borderColor: `${paperTheme.colors.primary}33`,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: paperTheme.colors.onPrimaryContainer }]}
                  >
                    Selected sales person
                  </Text>
                  <Text style={[styles.heroMeta, { color: paperTheme.colors.onPrimaryContainer }]}>
                    {selectedPersonName}
                  </Text>
                  <TouchableOpacity onPress={handleOpenPicker}>
                    <Text
                      style={{ color: paperTheme.colors.primary, fontFamily: fonts.PoppinsSemiBold }}
                    >
                      Change selection
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderTopColor: paperTheme.colors.outlineVariant,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
                kpiCardShadow(resolvedTheme),
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenPicker}
                style={[styles.assignBtn, { backgroundColor: paperTheme.colors.primary }]}
              >
                <Ionicons name="person-add-outline" size={20} color={paperTheme.colors.onPrimary} />
                <Text style={[styles.assignBtnText, { color: paperTheme.colors.onPrimary }]}>
                  Assign sales person
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </SafeAreaView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={pickerStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPickerVisible(false)} />
          <View style={[pickerStyles.sheet, { backgroundColor: paperTheme.colors.surface }]}>
            <View
              style={[pickerStyles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]}
            />
            <Text style={[pickerStyles.title, { color: paperTheme.colors.onSurface }]}>
              Assign sales person
            </Text>
            <Text style={[pickerStyles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
              Choose who assisted this sale for {displayOrderLabel}. Only employees assigned to this branch are shown.
            </Text>

            {salePersonsLoading ? (
              <KpiModalListSkeleton boneColor={paperTheme.colors.surfaceVariant} />
            ) : salePersons.length === 0 ? (
              <View style={pickerStyles.modalLoading}>
                <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontFamily: fonts.PoppinsRegular }}>
                  No sales persons found for this branch. Add employees in Manage Employees first.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={pickerStyles.optionList}
                contentContainerStyle={{ gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {salePersons.map(renderSalePersonOption)}
              </ScrollView>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={assigning || !selectedSalesPersonId}
              onPress={() => void handleConfirmAssign()}
              style={[
                pickerStyles.confirmBtn,
                {
                  backgroundColor: selectedSalesPersonId
                    ? paperTheme.colors.primary
                    : paperTheme.colors.surfaceVariant,
                  opacity: assigning ? 0.7 : 1,
                },
              ]}
            >
              {assigning ? (
                <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
              ) : (
                <Text
                  style={[
                    pickerStyles.confirmBtnText,
                    {
                      color: selectedSalesPersonId
                        ? paperTheme.colors.onPrimary
                        : paperTheme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Confirm assignment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {alertConfig ? (
        <Portal>
          <CommonAlert
            visible={visible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            positiveButtonText={alertConfig.positiveButtonText}
            negativeButtonText={alertConfig.negativeButtonText}
            onPositivePress={alertConfig.onPositivePress}
            onNegativePress={alertConfig.onNegativePress}
            onClose={hideAlert}
          />
        </Portal>
      ) : null}
    </>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 6,
  },
  optionList: {
    maxHeight: 280,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  optionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  optionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
});
