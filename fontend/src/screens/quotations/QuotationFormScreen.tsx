import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { AppDispatch } from '../../store/store';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { useShopIndustry } from '../../hooks/useShopIndustry';
import { createQuotation_Service, updateQuotation_Service } from '../../services/QuotationService';
import { DraftQuotationLine } from '../../type/quotation';
import { Product } from '../../type/product';
import { formatCheckoutAmount } from '../../type/checkoutPayment';
import {
  calculateQuotationTotalsPreview,
  hasEnabledShopTaxes,
} from '../../utils/billingCalculation';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../settings/shared/settingsDetailStyles';
import QuotationProductPickerModal from './components/QuotationProductPickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'QuotationForm'>;

type DiscountMode = 'amount' | 'percent';

function parseAmountInput(value: string): number {
  const parsed = Number.parseFloat(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function SectionCard({
  title,
  icon,
  children,
  paperTheme,
  resolvedTheme,
  action,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  action?: React.ReactNode;
}) {
  return (
    <View style={[styles.section, cardShadow(resolvedTheme), { backgroundColor: paperTheme.colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}>
            <Ionicons name={icon} size={18} color={paperTheme.colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>{title}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export default function QuotationFormScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const scrollRef = useRef<ScrollView | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const footerHeight = 76 + Math.max(insets.bottom, 16);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollNotesIntoView = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 250 : 100);
  }, []);
  const { shop } = useShopIndustry();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const initialRecord = route.params?.quotation;
  const isEditing = Boolean(initialRecord?._id);

  const [customerName, setCustomerName] = useState(initialRecord?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(initialRecord?.customerMobile ?? '');
  const [notes, setNotes] = useState(initialRecord?.notes ?? '');
  const [includeTaxes, setIncludeTaxes] = useState(Boolean(initialRecord?.includeTaxes));
  const [discountEnabled, setDiscountEnabled] = useState(Boolean(initialRecord?.isDiscount));
  const [discountMode, setDiscountMode] = useState<DiscountMode>(
    initialRecord?.discountType === 'percent' ? 'percent' : 'amount',
  );
  const [discountValue, setDiscountValue] = useState(
    initialRecord?.isDiscount && initialRecord.discount != null ? String(initialRecord.discount) : '',
  );
  const [lines, setLines] = useState<DraftQuotationLine[]>(
    () =>
      initialRecord?.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        type: 'product',
        qty: item.qty,
        unitCost: item.unitCost ?? 0,
      })) ?? [],
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const shopHasTaxes = useMemo(() => hasEnabledShopTaxes(shop?.billingConfig), [shop?.billingConfig]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0),
    [lines],
  );

  const discountConfig = useMemo(() => {
    if (!discountEnabled) {
      return { enabled: false as const };
    }

    const parsed = parseAmountInput(discountValue);
    return {
      enabled: true as const,
      type: discountMode,
      value: parsed,
    };
  }, [discountEnabled, discountMode, discountValue]);

  const billPreview = useMemo(
    () =>
      calculateQuotationTotalsPreview({
        subtotal,
        includeTaxes,
        billingConfig: shop?.billingConfig,
        discount: discountConfig,
      }),
    [discountConfig, includeTaxes, shop?.billingConfig, subtotal],
  );

  const selectedProductIds = useMemo(() => lines.map((line) => line.productId), [lines]);

  const openPicker = useCallback(() => {
    Keyboard.dismiss();
    setPickerVisible(true);
  }, []);

  const addProductLine = useCallback(
    (product: Product) => {
      if (product.type === 'service' && (product.amount == null || product.amount <= 0)) {
        show_Alert(
          'pending',
          'Service price required',
          `Enter a custom price for ${product.productName} after adding it.`,
          1,
          false,
          'OK',
        );
      }

      setLines((current) => {
        const existingIndex = current.findIndex((line) => line.productId === product._id);
        if (existingIndex >= 0) {
          return current.map((line, index) =>
            index === existingIndex ? { ...line, qty: line.qty + 1 } : line,
          );
        }

        return [
          ...current,
          {
            productId: product._id,
            productName: product.productName,
            type: product.type,
            qty: 1,
            unitCost: product.amount ?? 0,
          },
        ];
      });
    },
    [show_Alert],
  );

  const updateLineQty = useCallback((productId: string, qty: number) => {
    setLines((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, qty: Math.max(1, qty) } : line))
        .filter((line) => line.qty > 0),
    );
  }, []);

  const updateLinePrice = useCallback((productId: string, value: string) => {
    const parsed = parseAmountInput(value);
    setLines((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, unitCost: Math.max(0, parsed) } : line,
      ),
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const handleSave = useCallback(async () => {
    if (lines.length === 0) {
      show_Alert('error', 'Add items', 'Add at least one product or service line.', 1, true, 'OK');
      return;
    }

    const invalidService = lines.find(
      (line) => line.type === 'service' && (!Number.isFinite(line.unitCost) || line.unitCost <= 0),
    );
    if (invalidService) {
      show_Alert(
        'error',
        'Missing price',
        `Enter a valid price for ${invalidService.productName}.`,
        1,
        true,
        'OK',
      );
      return;
    }

    if (discountEnabled) {
      const parsedDiscount = parseAmountInput(discountValue);
      if (parsedDiscount <= 0) {
        show_Alert('error', 'Invalid discount', 'Enter a valid discount value.', 1, true, 'OK');
        return;
      }
      if (discountMode === 'percent' && parsedDiscount > 100) {
        show_Alert('error', 'Invalid discount', 'Percentage discount cannot exceed 100%.', 1, true, 'OK');
        return;
      }
    }

    Keyboard.dismiss();
    setSaving(true);
    try {
      const parsedDiscount = parseAmountInput(discountValue);
      const payload = {
        customerName: customerName.trim(),
        customerMobile: customerPhone.trim(),
        notes: notes.trim(),
        includeTaxes,
        isDiscount: discountEnabled,
        discountType: discountMode,
        discount: discountEnabled ? parsedDiscount : 0,
        items: lines.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          unitCost: line.unitCost,
        })),
      };

      if (isEditing && initialRecord) {
        await dispatch(updateQuotation_Service({ id: initialRecord._id, ...payload })).unwrap();
        show_Alert(
          'success',
          'Quotation updated',
          'Your changes have been saved.',
          2,
          false,
          'View quotation',
          () => {
            navigation.replace('QuotationDetail', { quotationId: initialRecord._id });
          },
          'Done',
          () => navigation.goBack(),
        );
      } else {
        const response = await dispatch(createQuotation_Service(payload)).unwrap();
        const created = response.data;
        show_Alert(
          'success',
          'Quotation created',
          `${created.quotationNumber} is ready to share with your customer.`,
          2,
          false,
          'View quotation',
          () => {
            navigation.replace('QuotationDetail', { quotationId: created._id, justCreated: true });
          },
          'Back to list',
          () => navigation.navigate('QuotationsList'),
        );
      }
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Save failed',
        getApiErrorMessage(error, 'Could not save this quotation.'),
        1,
        false,
        'OK',
        () => {},
      );
    } finally {
      setSaving(false);
    }
  }, [
    customerName,
    customerPhone,
    discountEnabled,
    discountMode,
    discountValue,
    dispatch,
    includeTaxes,
    initialRecord,
    isEditing,
    lines,
    navigation,
    notes,
    show_Alert,
  ]);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[sharedStyles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <CommonHeader
          title={isEditing ? 'Edit quotation' : 'New quotation'}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
        >
          <KeyboardAwareScrollView
            style={styles.keyboardScroll}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: keyboardVisible ? 48 : 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            enableAutomaticScroll
            enableResetScrollToCoords={false}
            extraScrollHeight={Platform.OS === 'ios' ? 140 : 160}
            extraHeight={Platform.OS === 'android' ? 120 : undefined}
            bottomOffset={keyboardVisible ? 24 : footerHeight}
            keyboardOpeningTime={0}
            showsVerticalScrollIndicator={false}
            innerRef={(ref) => {
              scrollRef.current = ref;
            }}
          >
          <View style={[styles.summaryStrip, { backgroundColor: paperTheme.colors.primaryContainer }]}>
            <View>
              <Text style={[styles.summaryStripLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
                Quote preview
              </Text>
              <Text style={[styles.summaryStripTotal, { color: paperTheme.colors.primary }]}>
                {formatCheckoutAmount(billPreview.totalAmount)}
              </Text>
            </View>
            <View style={styles.summaryStripMeta}>
              <Text style={[styles.summaryStripMetaText, { color: paperTheme.colors.onPrimaryContainer }]}>
                {lines.length} line{lines.length === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.summaryStripMetaText, { color: paperTheme.colors.onPrimaryContainer }]}>
                {includeTaxes ? 'Taxes on' : 'Taxes off'}
              </Text>
            </View>
          </View>

          <SectionCard title="Customer" icon="person-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Customer name (optional)"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              style={[styles.input, { color: paperTheme.colors.onSurface, backgroundColor: paperTheme.colors.surfaceVariant }]}
            />
            <TextInput
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Phone (optional)"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              keyboardType="phone-pad"
              style={[styles.input, styles.inputLast, { color: paperTheme.colors.onSurface, backgroundColor: paperTheme.colors.surfaceVariant }]}
            />
          </SectionCard>

          <SectionCard
            title="Line items"
            icon="list-outline"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            action={
              <TouchableOpacity
                onPress={openPicker}
                style={[styles.addBtn, { backgroundColor: paperTheme.colors.primary }]}
              >
                <Ionicons name="add" size={18} color={paperTheme.colors.onPrimary} />
                <Text style={[styles.addBtnText, { color: paperTheme.colors.onPrimary }]}>Add item</Text>
              </TouchableOpacity>
            }
          >
            {lines.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openPicker}
                style={[styles.emptyPicker, { borderColor: paperTheme.colors.outlineVariant, backgroundColor: paperTheme.colors.surfaceVariant }]}
              >
                <Ionicons name="layers-outline" size={28} color={paperTheme.colors.primary} />
                <Text style={[styles.emptyPickerTitle, { color: paperTheme.colors.onSurface }]}>
                  No items yet
                </Text>
                <Text style={[styles.emptyPickerText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Tap to open full-screen catalog with category filters
                </Text>
              </TouchableOpacity>
            ) : (
              lines.map((line) => {
                const lineTotal = line.qty * line.unitCost;
                return (
                  <View
                    key={line.productId}
                    style={[styles.lineCard, { backgroundColor: paperTheme.colors.surfaceVariant }]}
                  >
                    <View style={styles.lineTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lineName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
                          {line.productName}
                        </Text>
                        <Text style={[styles.lineTotal, { color: paperTheme.colors.primary }]}>
                          {formatCheckoutAmount(lineTotal)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeLine(line.productId)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.lineControls}>
                      <View style={styles.qtyWrap}>
                        <TouchableOpacity
                          onPress={() => updateLineQty(line.productId, line.qty - 1)}
                          style={[styles.qtyBtn, { backgroundColor: paperTheme.colors.surface }]}
                        >
                          <Ionicons name="remove" size={16} color={paperTheme.colors.onSurface} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyValue, { color: paperTheme.colors.onSurface }]}>{line.qty}</Text>
                        <TouchableOpacity
                          onPress={() => updateLineQty(line.productId, line.qty + 1)}
                          style={[styles.qtyBtn, { backgroundColor: paperTheme.colors.primary }]}
                        >
                          <Ionicons name="add" size={16} color={paperTheme.colors.onPrimary} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        value={line.unitCost > 0 ? String(line.unitCost) : ''}
                        onChangeText={(value) => updateLinePrice(line.productId, value)}
                        placeholder="Unit price"
                        placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                        keyboardType="decimal-pad"
                        style={[styles.priceInput, { color: paperTheme.colors.onSurface, backgroundColor: paperTheme.colors.surface }]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Discount" icon="pricetag-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
            <View style={styles.taxRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taxTitle, { color: paperTheme.colors.onSurface }]}>Apply discount</Text>
                <Text style={[styles.taxHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Reduce the quote total by a fixed amount or percentage.
                </Text>
              </View>
              <Switch
                value={discountEnabled}
                onValueChange={setDiscountEnabled}
                trackColor={{
                  false: paperTheme.colors.surfaceVariant,
                  true: `${paperTheme.colors.primary}88`,
                }}
                thumbColor={discountEnabled ? paperTheme.colors.primary : paperTheme.colors.outline}
              />
            </View>

            {discountEnabled ? (
              <>
                <Text style={[styles.discountLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Discount type
                </Text>
                <View style={styles.discountModeRow}>
                  <TouchableOpacity
                    onPress={() => setDiscountMode('amount')}
                    style={[
                      styles.discountModeChip,
                      {
                        backgroundColor:
                          discountMode === 'amount' ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountModeChipText,
                        {
                          color:
                            discountMode === 'amount'
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSurface,
                        },
                      ]}
                    >
                      Amount (Rs.)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDiscountMode('percent')}
                    style={[
                      styles.discountModeChip,
                      {
                        backgroundColor:
                          discountMode === 'percent' ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountModeChipText,
                        {
                          color:
                            discountMode === 'percent'
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSurface,
                        },
                      ]}
                    >
                      Percentage (%)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.discountLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {discountMode === 'amount' ? 'Discount amount' : 'Discount percentage'}
                </Text>
                <View style={[styles.discountInputWrap, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                  {discountMode === 'amount' ? (
                    <Text style={[styles.discountInputPrefix, { color: paperTheme.colors.onSurfaceVariant }]}>Rs.</Text>
                  ) : null}
                  <TextInput
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder={discountMode === 'amount' ? '0.00' : '0'}
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={[styles.discountInput, { color: paperTheme.colors.onSurface }]}
                  />
                  {discountMode === 'percent' ? (
                    <Text style={[styles.discountInputPrefix, { color: paperTheme.colors.onSurfaceVariant }]}>%</Text>
                  ) : null}
                </View>
              </>
            ) : null}
          </SectionCard>

          <SectionCard title="Taxes & total" icon="receipt-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
            <View style={styles.taxRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taxTitle, { color: paperTheme.colors.onSurface }]}>Include taxes</Text>
                <Text style={[styles.taxHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {shopHasTaxes
                    ? 'Apply enabled shop tax lines from dashboard billing settings.'
                    : 'No taxes configured for this shop in the dashboard.'}
                </Text>
              </View>
              <Switch
                value={includeTaxes}
                onValueChange={setIncludeTaxes}
                disabled={!shopHasTaxes}
                trackColor={{
                  false: paperTheme.colors.surfaceVariant,
                  true: `${paperTheme.colors.primary}88`,
                }}
                thumbColor={includeTaxes ? paperTheme.colors.primary : paperTheme.colors.outline}
              />
            </View>

            <View style={[styles.summaryBox, { backgroundColor: paperTheme.colors.background }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>
                  {formatCheckoutAmount(billPreview.subtotal)}
                </Text>
              </View>
              {billPreview.discountAmount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {discountMode === 'percent' && discountEnabled
                      ? `Discount (${parseAmountInput(discountValue) || 0}%)`
                      : 'Discount'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: paperTheme.colors.error }]}>
                    -{formatCheckoutAmount(billPreview.discountAmount)}
                  </Text>
                </View>
              ) : null}
              {includeTaxes
                ? billPreview.taxBreakdown.map((entry) => (
                    <View key={entry.id} style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                        {entry.label}
                      </Text>
                      <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>
                        {formatCheckoutAmount(entry.amount)}
                      </Text>
                    </View>
                  ))
                : null}
              <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: paperTheme.colors.onSurface }]}>Quote total</Text>
                <Text style={[styles.totalValue, { color: paperTheme.colors.primary }]}>
                  {formatCheckoutAmount(billPreview.totalAmount)}
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Notes" icon="document-text-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onFocus={scrollNotesIntoView}
              placeholder="Optional notes for this quotation"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              multiline
              textAlignVertical="top"
              style={[styles.notesInput, { color: paperTheme.colors.onSurface, backgroundColor: paperTheme.colors.surfaceVariant }]}
            />
          </SectionCard>

          {keyboardVisible ? <View style={styles.keyboardSpacer} /> : null}
        </KeyboardAwareScrollView>

        {!keyboardVisible ? (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: paperTheme.colors.surface,
                borderTopColor: paperTheme.colors.outlineVariant,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View>
              <Text style={[styles.footerLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Total</Text>
              <Text style={[styles.footerTotal, { color: paperTheme.colors.primary }]}>
                {formatCheckoutAmount(billPreview.totalAmount)}
              </Text>
            </View>
            <TouchableOpacity
              disabled={saving}
              onPress={() => void handleSave()}
              style={[styles.saveBtn, { backgroundColor: paperTheme.colors.primary, opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={paperTheme.colors.onPrimary} />
                  <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                    {isEditing ? 'Save changes' : 'Create quotation'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
        </KeyboardAvoidingView>

        <QuotationProductPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelectProduct={addProductLine}
          selectedProductIds={selectedProductIds}
        />

        {alertConfig ? (
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
            closeOnBackdropPress={alertConfig.closeOnBackdropPress}
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    flexGrow: 1,
  },
  keyboardSpacer: {
    height: 24,
  },
  summaryStrip: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStripLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 4,
  },
  summaryStripTotal: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 28,
  },
  summaryStripMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  summaryStripMetaText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  section: {
    borderRadius: 18,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    marginBottom: 10,
  },
  inputLast: {
    marginBottom: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  emptyPicker: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyPickerTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  emptyPickerText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  lineCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  lineName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  lineTotal: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  priceInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  taxTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  taxHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  discountLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  discountModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  discountModeChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  discountModeChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  discountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  discountInputPrefix: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  discountInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: 10,
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  summaryValue: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  totalValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  footerTotal: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 22,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 170,
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});
