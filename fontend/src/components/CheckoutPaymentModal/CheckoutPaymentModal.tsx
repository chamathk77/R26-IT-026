import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../constants/fonts';
import {
  CHECKOUT_PAYMENT_OPTIONS,
  CheckoutPaymentMethod,
  formatCheckoutAmount,
  sanitizeCheckoutPhone,
} from '../../type/checkoutPayment';
import { getSalePersonFullName, SalePerson } from '../../type/salePerson';
import { softShadow } from '../../screens/pos/ManageInventory/inventoryUiStyles';

type CheckoutPaymentModalProps = {
  visible: boolean;
  amount: number;
  customerName: string;
  customerPhone: string;
  selectedMethod: CheckoutPaymentMethod;
  salePersons: SalePerson[];
  selectedSalesPersonId: string | null;
  salePersonsLoading?: boolean;
  loading?: boolean;
  proceedDisabled?: boolean;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onSelectMethod: (method: CheckoutPaymentMethod) => void;
  onSelectSalesPerson: (id: string | null) => void;
  onClose: () => void;
  onProceed: () => void;
};

type SalesPersonOption = {
  id: string | null;
  label: string;
  subLabel?: string;
};

function getSalesPersonLabel(
  salePersons: SalePerson[],
  selectedSalesPersonId: string | null,
): string {
  if (!selectedSalesPersonId) return 'No sales person';
  const person = salePersons.find((item) => item._id === selectedSalesPersonId);
  if (!person) return 'No sales person';
  return getSalePersonFullName(person);
}

export default function CheckoutPaymentModal({
  visible,
  amount,
  customerName,
  customerPhone,
  selectedMethod,
  salePersons,
  selectedSalesPersonId,
  salePersonsLoading = false,
  loading = false,
  proceedDisabled = false,
  paperTheme,
  resolvedTheme,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onSelectMethod,
  onSelectSalesPerson,
  onClose,
  onProceed,
}: CheckoutPaymentModalProps) {
  const [salesPersonPickerVisible, setSalesPersonPickerVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSalesPersonPickerVisible(false);
    }
  }, [visible]);

  const salesPersonLabel = useMemo(
    () => getSalesPersonLabel(salePersons, selectedSalesPersonId),
    [salePersons, selectedSalesPersonId],
  );

  const salesPersonOptions = useMemo<SalesPersonOption[]>(
    () => [
      { id: null, label: 'No sales person' },
      ...salePersons.map((person) => ({
        id: person._id,
        label: `${getSalePersonFullName(person)} · ${person.position}`,
        subLabel: person.salePersonId,
      })),
    ],
    [salePersons],
  );

  const handleOpenSalesPersonPicker = () => {
    Keyboard.dismiss();
    setSalesPersonPickerVisible(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
          <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>Checkout</Text>
          <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            Phone and name are optional. Add a phone number to save the customer for future orders.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                  Customer details
                </Text>

                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Phone number <Text style={{ color: paperTheme.colors.onSurfaceVariant }}>(optional)</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: paperTheme.colors.surfaceVariant,
                      borderColor: paperTheme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Ionicons name="call-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
                  <TextInput
                    value={customerPhone}
                    onChangeText={(text) => onCustomerPhoneChange(sanitizeCheckoutPhone(text))}
                    placeholder="07XXXXXXXX"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoComplete={Platform.OS === 'android' ? 'tel' : 'tel-device'}
                    textContentType="telephoneNumber"
                    editable={!loading}
                    style={[styles.input, { color: paperTheme.colors.onSurface }]}
                  />
                </View>
                <Text style={[styles.sectionHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Leave blank for walk-in checkout. Enter 10 digits to save to customer list.
                </Text>

                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Customer name <Text style={{ color: paperTheme.colors.onSurfaceVariant }}>(optional)</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: paperTheme.colors.surfaceVariant,
                      borderColor: paperTheme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Ionicons name="person-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
                  <TextInput
                    value={customerName}
                    onChangeText={onCustomerNameChange}
                    placeholder="Enter customer name"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                    style={[styles.input, { color: paperTheme.colors.onSurface }]}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                  Sales person
                </Text>
                <Text style={[styles.sectionHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Optional. Leave unselected if no one assisted this sale.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select sales person"
                  onPress={handleOpenSalesPersonPicker}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    {
                      backgroundColor: paperTheme.colors.surfaceVariant,
                      borderColor: selectedSalesPersonId
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outlineVariant,
                      opacity: loading ? 0.7 : pressed ? 0.92 : 1,
                    },
                    selectedSalesPersonId ? softShadow(resolvedTheme) : null,
                  ]}
                >
                  <View
                    style={[
                      styles.pickerIconWrap,
                      {
                        backgroundColor: selectedSalesPersonId
                          ? paperTheme.colors.primary
                          : `${paperTheme.colors.primary}18`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={
                        selectedSalesPersonId
                          ? paperTheme.colors.onPrimary
                          : paperTheme.colors.primary
                      }
                    />
                  </View>
                  <View style={styles.pickerBody}>
                    <Text style={[styles.pickerLabel, { color: paperTheme.colors.onSurface }]}>
                      {salesPersonLabel}
                    </Text>
                    <Text style={[styles.pickerSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {salePersonsLoading
                        ? 'Loading sales persons...'
                        : salePersons.length === 0
                          ? 'No sales persons available'
                          : 'Tap to choose'}
                    </Text>
                  </View>
                  {salePersonsLoading ? (
                    <ActivityIndicator size="small" color={paperTheme.colors.primary} />
                  ) : (
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={paperTheme.colors.onSurfaceVariant}
                    />
                  )}
                </Pressable>
              </View>

              <View
                style={[styles.totalCard, { backgroundColor: paperTheme.colors.primaryContainer }]}
              >
                <Text style={[styles.totalLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
                  Amount to pay
                </Text>
                <Text style={[styles.totalValue, { color: paperTheme.colors.primary }]}>
                  {formatCheckoutAmount(amount)}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                  Payment method
                </Text>
                <View style={styles.options}>
                  {CHECKOUT_PAYMENT_OPTIONS.map((option) => {
                    const selected = selectedMethod === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Pay with ${option.label}`}
                        onPress={() => onSelectMethod(option.id)}
                        activeOpacity={0.85}
                        disabled={loading}
                        style={[
                          styles.option,
                          {
                            backgroundColor: selected
                              ? paperTheme.colors.primaryContainer
                              : paperTheme.colors.surfaceVariant,
                            borderColor: selected
                              ? paperTheme.colors.primary
                              : paperTheme.colors.outlineVariant,
                            opacity: loading ? 0.7 : 1,
                          },
                          selected ? softShadow(resolvedTheme) : null,
                        ]}
                      >
                        <View
                          style={[
                            styles.optionIconWrap,
                            {
                              backgroundColor: selected
                                ? paperTheme.colors.primary
                                : `${paperTheme.colors.primary}18`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={22}
                            color={selected ? paperTheme.colors.onPrimary : paperTheme.colors.primary}
                          />
                        </View>
                        <View style={styles.optionBody}>
                          <Text style={[styles.optionLabel, { color: paperTheme.colors.onSurface }]}>
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              styles.optionDescription,
                              { color: paperTheme.colors.onSurfaceVariant },
                            ]}
                          >
                            {option.description}
                          </Text>
                        </View>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={22} color={paperTheme.colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel payment"
                onPress={onClose}
                disabled={loading}
                style={[styles.cancelBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
              >
                <Text style={[styles.cancelText, { color: paperTheme.colors.onSecondaryContainer }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Proceed with checkout"
                onPress={onProceed}
                disabled={loading || proceedDisabled}
                style={[
                  styles.proceedBtn,
                  {
                    backgroundColor: paperTheme.colors.primary,
                    opacity: loading || proceedDisabled ? 0.55 : 1,
                  },
                  softShadow(resolvedTheme),
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Text style={[styles.proceedText, { color: paperTheme.colors.onPrimary }]}>
                      Proceed
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={paperTheme.colors.onPrimary} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {salesPersonPickerVisible ? (
            <View style={styles.pickerOverlay}>
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={() => setSalesPersonPickerVisible(false)}
              />
              <View style={[styles.pickerSheet, { backgroundColor: paperTheme.colors.surface }]}>
                <View style={[styles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
                <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>
                  Select sales person
                </Text>

                {salePersonsLoading && salePersons.length === 0 ? (
                  <View style={styles.pickerLoading}>
                    <ActivityIndicator color={paperTheme.colors.primary} />
                  </View>
                ) : (
                  <FlatList
                    data={salesPersonOptions}
                    keyExtractor={(item) => item.id ?? 'none'}
                    showsVerticalScrollIndicator={false}
                    style={styles.pickerList}
                    renderItem={({ item }) => {
                      const selected = selectedSalesPersonId === item.id;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.pickerOption,
                            {
                              backgroundColor: selected
                                ? paperTheme.colors.primaryContainer
                                : paperTheme.colors.surfaceVariant,
                              borderColor: selected
                                ? paperTheme.colors.primary
                                : paperTheme.colors.outlineVariant,
                            },
                          ]}
                          onPress={() => {
                            onSelectSalesPerson(item.id);
                            setSalesPersonPickerVisible(false);
                          }}
                        >
                          <View style={styles.pickerOptionBody}>
                            <Text
                              style={[
                                styles.pickerOptionLabel,
                                { color: paperTheme.colors.onSurface },
                              ]}
                            >
                              {item.label}
                            </Text>
                            {item.subLabel ? (
                              <Text
                                style={[
                                  styles.pickerOptionSub,
                                  { color: paperTheme.colors.onSurfaceVariant },
                                ]}
                              >
                                ID: {item.subLabel}
                              </Text>
                            ) : null}
                          </View>
                          {selected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color={paperTheme.colors.primary}
                            />
                          ) : item.id ? (
                            <Ionicons
                              name="person-circle-outline"
                              size={22}
                              color={paperTheme.colors.onSurfaceVariant}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </View>
          ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 20,
  },
  pickerSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  pickerList: {
    maxHeight: 360,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  sectionHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
  },
  fieldLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pickerLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  pickerSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  totalCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  totalValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  optionDescription: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  proceedBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  proceedText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  pickerLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  pickerOptionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pickerOptionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  pickerOptionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
});
