import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import { softShadow } from '../../screens/pos/ManageInventory/inventoryUiStyles';

type CheckoutPaymentModalProps = {
  visible: boolean;
  amount: number;
  customerName: string;
  customerPhone: string;
  selectedMethod: CheckoutPaymentMethod;
  loading?: boolean;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onSelectMethod: (method: CheckoutPaymentMethod) => void;
  onClose: () => void;
  onProceed: () => void;
};

export default function CheckoutPaymentModal({
  visible,
  amount,
  customerName,
  customerPhone,
  selectedMethod,
  loading = false,
  paperTheme,
  resolvedTheme,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onSelectMethod,
  onClose,
  onProceed,
}: CheckoutPaymentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
          <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>Checkout</Text>
          <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            Enter customer details and select a payment method.
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
                Customer name
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

              <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Phone number
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
                  placeholder="07X XXX XXXX"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  keyboardType="phone-pad"
                  autoComplete={Platform.OS === 'android' ? 'tel' : 'tel-device'}
                  textContentType="telephoneNumber"
                  editable={!loading}
                  style={[styles.input, { color: paperTheme.colors.onSurface }]}
                />
              </View>
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
              disabled={loading}
              style={[
                styles.proceedBtn,
                {
                  backgroundColor: paperTheme.colors.primary,
                  opacity: loading ? 0.75 : 1,
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
      </TouchableOpacity>
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
});
