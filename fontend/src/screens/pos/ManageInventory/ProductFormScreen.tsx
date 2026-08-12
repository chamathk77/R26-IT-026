import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import {
  createProduct_Service,
  deleteProduct_Service,
  updateProduct_Service,
} from '../../../services/ProductService';
import { fetchCategories_Service } from '../../../services/CategoryService';
import { Category } from '../../../type/category';
import { InventoryProductFormParams } from '../../../type/inventory';
import { resolveProductImageUri } from '../../../utils/productImage';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../utils/apiErrorAlert';
import CommonAlert from '../../../components/CommonAlert';
import BarcodeScannerModal from './BarcodeScannerModal';
import { inventoryUi, softShadow } from './inventoryUiStyles';
import { hasWarrantyModule } from '../../../utils/featureHelper';

type FormMode = 'add' | 'edit';

type EditSnapshot = {
  productName: string;
  categoryId: string;
  type: 'product' | 'service';
  amount: string;
  cost: string;
  isInventoryAvailable: boolean;
  barcode: string;
  productNumber: string;
  qty: string;
  warrantyAvailable: boolean;
  warrantyMonths: string;
  imageUri: string | null;
};

function isLocalImageUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):\/\//i.test(uri);
}

async function ensureMediaLibraryPermission(
  show_Alert: ReturnType<typeof useCommonAlert>['show_Alert'],
): Promise<boolean> {
  let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (permission.granted) return true;
  show_Alert(
    'error',
    'Photo library access required',
    permission.canAskAgain
      ? 'Please allow photo library access to choose a product image.'
      : 'Photo library access is turned off. Enable Photos permission for this app in Settings.',
    1,
    true,
    'OK',
  );
  return false;
}

async function ensureCameraPermission(
  show_Alert: ReturnType<typeof useCommonAlert>['show_Alert'],
): Promise<boolean> {
  let permission = await ImagePicker.getCameraPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestCameraPermissionsAsync();
  }
  if (permission.granted) return true;
  show_Alert(
    'error',
    'Camera access required',
    permission.canAskAgain
      ? 'Please allow camera access to take a product photo.'
      : 'Camera access is turned off. Enable Camera permission for this app in Settings.',
    1,
    true,
    'OK',
  );
  return false;
}

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

type ProductFormContentProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  mode: FormMode;
  initial?: InventoryProductFormParams;
};

function FormSection({
  title,
  icon,
  children,
  paperTheme,
  resolvedTheme,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <View
      style={[
        inventoryUi.sectionCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        softShadow(resolvedTheme),
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}>
          <Ionicons name={icon} size={18} color={paperTheme.colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FormFieldLabel({
  label,
  kind,
  paperTheme,
}: {
  label: string;
  kind: 'required' | 'optional' | 'conditional';
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
}) {
  const badge =
    kind === 'required'
      ? {
          text: 'Required',
          backgroundColor: `${paperTheme.colors.error}18`,
          color: paperTheme.colors.error,
        }
      : kind === 'conditional'
        ? {
            text: 'Required when on',
            backgroundColor: `${paperTheme.colors.tertiary}18`,
            color: paperTheme.colors.tertiary,
          }
        : {
            text: 'Optional',
            backgroundColor: paperTheme.colors.surfaceVariant,
            color: paperTheme.colors.onSurfaceVariant,
          };

  return (
    <View style={styles.fieldLabelRow}>
      <Text style={[inventoryUi.fieldLabel, styles.fieldLabelText, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <View style={[styles.fieldBadge, { backgroundColor: badge.backgroundColor }]}>
        <Text style={[styles.fieldBadgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    </View>
  );
}

function ProductFormContent({ navigation, mode, initial }: ProductFormContentProps) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => state.CategoryReducer.list.items);
  const shop = useSelector((state: RootState) => state.AuthReducer.Login.shopData);
  const showWarrantyFields = hasWarrantyModule(shop);

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState<'product' | 'service'>('product');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [isInventoryAvailable, setIsInventoryAvailable] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [productNumber, setProductNumber] = useState('');
  const [qty, setQty] = useState('');
  const [warrantyAvailable, setWarrantyAvailable] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<EditSnapshot | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCategories_Service()).unwrap();
    } catch {
      // Categories may already be loaded from Manage Inventory
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories]),
  );

  useEffect(() => {
    if (mode === 'edit' && initial) {
      const resolvedImage = resolveProductImageUri(initial.image) ?? null;
      const nextAmount = initial.amount != null ? String(initial.amount) : '';
      const nextCost = initial.cost != null ? String(initial.cost) : '';
      const nextBarcode = initial.barcode ?? '';
      const nextProductNumber = initial.productNumber ?? '';
      const nextQty = initial.qty != null ? String(initial.qty) : '';
      const nextWarrantyAvailable = Boolean(initial.warrantyAvailable);
      const nextWarrantyMonths =
        initial.warrantyMonths != null ? String(initial.warrantyMonths) : '';

      setProductName(initial.productName);
      setCategoryId(initial.categoryId);
      setProductType(initial.type);
      setAmount(nextAmount);
      setCost(nextCost);
      setIsInventoryAvailable(initial.isInventoryAvailable);
      setBarcode(nextBarcode);
      setProductNumber(nextProductNumber);
      setQty(nextQty);
      setWarrantyAvailable(nextWarrantyAvailable);
      setWarrantyMonths(nextWarrantyMonths);
      setImageUri(resolvedImage);
      setInitialSnapshot({
        productName: initial.productName.trim(),
        categoryId: initial.categoryId,
        type: initial.type,
        amount: nextAmount,
        cost: nextCost,
        isInventoryAvailable: initial.isInventoryAvailable,
        barcode: nextBarcode,
        productNumber: nextProductNumber,
        qty: nextQty,
        warrantyAvailable: nextWarrantyAvailable,
        warrantyMonths: nextWarrantyMonths,
        imageUri: resolvedImage,
      });
    } else {
      setProductName('');
      setCategoryId('');
      setProductType('product');
      setAmount('');
      setCost('');
      setIsInventoryAvailable(false);
      setBarcode('');
      setProductNumber('');
      setQty('');
      setWarrantyAvailable(false);
      setWarrantyMonths('');
      setImageUri(null);
      setInitialSnapshot(null);
    }
  }, [
    mode,
    initial?.id,
    initial?.productName,
    initial?.categoryId,
    initial?.type,
    initial?.amount,
    initial?.cost,
    initial?.isInventoryAvailable,
    initial?.barcode,
    initial?.productNumber,
    initial?.qty,
    initial?.warrantyAvailable,
    initial?.warrantyMonths,
    initial?.image,
  ]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === categoryId),
    [categories, categoryId],
  );

  const isDirty = useMemo(() => {
    if (mode !== 'edit' || !initialSnapshot) return true;
    return (
      productName.trim() !== initialSnapshot.productName ||
      categoryId !== initialSnapshot.categoryId ||
      productType !== initialSnapshot.type ||
      amount !== initialSnapshot.amount ||
      cost !== initialSnapshot.cost ||
      isInventoryAvailable !== initialSnapshot.isInventoryAvailable ||
      barcode !== initialSnapshot.barcode ||
      productNumber !== initialSnapshot.productNumber ||
      qty !== initialSnapshot.qty ||
      warrantyAvailable !== initialSnapshot.warrantyAvailable ||
      warrantyMonths !== initialSnapshot.warrantyMonths ||
      imageUri !== initialSnapshot.imageUri
    );
  }, [
    mode,
    initialSnapshot,
    productName,
    categoryId,
    productType,
    amount,
    cost,
    isInventoryAvailable,
    barcode,
    productNumber,
    qty,
    warrantyAvailable,
    warrantyMonths,
    imageUri,
  ]);

  const canSave = mode === 'add' || isDirty;

  const buildPayload = () => {
    const trimmedName = productName.trim();
    const categoryName = selectedCategory?.name ?? initial?.categoryName ?? '';

    const base = {
      productName: trimmedName,
      categoryId,
      categoryName,
      type: productType,
      imageUri: imageUri && isLocalImageUri(imageUri) ? imageUri : null,
    };

    const productNumberValue = productNumber.trim() || null;

    if (productType === 'service') {
      return {
        ...base,
        productNumber: productNumberValue,
      };
    }

    const amountNum = Number(amount);
    const costTrimmed = cost.trim();
    const costValue =
      costTrimmed === '' ? null : Number.isNaN(Number(costTrimmed)) ? null : Number(costTrimmed);

    return {
      ...base,
      amount: amountNum,
      cost: costValue,
      isInventoryAvailable,
      barcode: barcode.trim() || null,
      productNumber: productNumberValue,
      qty: isInventoryAvailable ? Number(qty) : null,
      ...(showWarrantyFields
        ? {
            warrantyAvailable,
            warrantyMonths:
              warrantyAvailable && warrantyMonths.trim() !== ''
                ? Number(warrantyMonths)
                : null,
          }
        : {}),
    };
  };

  const validateForm = (): string | null => {
    if (!productName.trim()) return 'Product name is required';
    if (!categoryId) return 'Category is required';
    if (!selectedCategory?.name && !initial?.categoryName) return 'Category is required';

    if (productType === 'product') {
      const amountNum = Number(amount);
      if (amount.trim() === '' || Number.isNaN(amountNum) || amountNum < 0) {
        return 'Valid amount is required for products';
      }
      if (cost.trim() !== '') {
        const costNum = Number(cost);
        if (Number.isNaN(costNum) || costNum < 0) return 'Cost must be a valid non-negative number';
      }
      if (isInventoryAvailable) {
        const qtyNum = Number(qty);
        if (qty.trim() === '' || Number.isNaN(qtyNum) || qtyNum < 0) {
          return 'Quantity is required when inventory tracking is enabled';
        }
      }

      if (showWarrantyFields && warrantyAvailable) {
        const monthsNum = Number(warrantyMonths);
        if (
          warrantyMonths.trim() === '' ||
          Number.isNaN(monthsNum) ||
          monthsNum < 1 ||
          !Number.isInteger(monthsNum)
        ) {
          return 'Warranty months must be a whole number greater than 0';
        }
      }
    }

    return null;
  };

  const onSave = async () => {
    if (!canSave || saving) return;

    const validationError = validateForm();
    if (validationError) {
      show_Alert('error', 'Error', validationError, 1, true, 'OK');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit' && initial?.id) {
        await dispatch(
          updateProduct_Service({
            id: initial.id,
            ...buildPayload(),
          }),
        ).unwrap();
        show_Alert('success', 'Success', 'Product updated successfully.', 1, true, 'OK', () => {
          navigation.goBack();
        });
      } else {
        await dispatch(createProduct_Service(buildPayload())).unwrap();
        show_Alert('success', 'Success', 'Product saved successfully.', 1, true, 'OK', () => {
          navigation.goBack();
        });
      }
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert('error', 'Error', thunkErrorMessage(error, 'Could not save product'), 1, true, 'OK');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!initial?.id || deleting) return;

    show_Alert(
      'error',
      'Delete product?',
      `Are you sure you want to delete "${initial.productName}"? This cannot be undone.`,
      2,
      false,
      'Delete',
      async () => {
        setDeleting(true);
        try {
          await dispatch(deleteProduct_Service(initial.id)).unwrap();
          show_Alert('success', 'Deleted', 'Product removed.', 1, true, 'OK', () => {
            navigation.goBack();
          });
        } catch (error: unknown) {
          const handled = await handleSessionExpiredApiError(error, show_Alert);
          if (handled) return;
          show_Alert(
            'error',
            'Error',
            thunkErrorMessage(error, 'Could not delete product'),
            1,
            true,
            'OK',
          );
        } finally {
          setDeleting(false);
        }
      },
      'Cancel',
      () => {},
    );
  };

  const pickFromGallery = useCallback(async () => {
    Keyboard.dismiss();
    const hasPermission = await ensureMediaLibraryPermission(show_Alert);
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, [show_Alert]);

  const takePhoto = useCallback(async () => {
    Keyboard.dismiss();
    const hasPermission = await ensureCameraPermission(show_Alert);
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, [show_Alert]);

  const onSelectImagePress = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const openBarcodeScanner = useCallback(() => {
    Keyboard.dismiss();
    setBarcodeScannerVisible(true);
  }, []);

  const handleBarcodeScanned = useCallback((code: string) => {
    setBarcode(code);
    setBarcodeScannerVisible(false);
  }, []);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant },
                softShadow(resolvedTheme),
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={paperTheme.colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={styles.headerTitleRow}>
                <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
                  {mode === 'add' ? 'New product' : 'Edit product'}
                </Text>
                <View style={[styles.modeBadge, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                  <Text style={[styles.modeBadgeText, { color: paperTheme.colors.primary }]}>
                    {mode === 'add' ? 'Create' : 'Update'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                Fields marked Required must be filled before saving
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <FormSection title="Basic details" icon="information-circle-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
              <FormFieldLabel label="Product name" kind="required" paperTheme={paperTheme} />
              <TextInput
                value={productName}
                onChangeText={setProductName}
                placeholder="e.g. Organic shampoo 250ml"
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                style={[
                  inventoryUi.fieldInput,
                  {
                    color: paperTheme.colors.onSurface,
                    backgroundColor: paperTheme.colors.background,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              />

              <FormFieldLabel label="Category" kind="required" paperTheme={paperTheme} />
              <TouchableOpacity
                style={[
                  inventoryUi.fieldInput,
                  styles.selectRow,
                  {
                    backgroundColor: paperTheme.colors.background,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
                onPress={() => setCategoryModalVisible(true)}
                activeOpacity={0.85}
              >
                {selectedCategory ? (
                  <View style={styles.selectInner}>
                    <View style={[styles.catDot, { backgroundColor: selectedCategory.colorCode }]} />
                    <Text style={[styles.selectText, { color: paperTheme.colors.onSurface }]}>
                      {selectedCategory.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.selectPlaceholder, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Choose a category
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>

              <FormFieldLabel label="Type" kind="required" paperTheme={paperTheme} />
              <View style={styles.typeRow}>
                {(['product', 'service'] as const).map((typeOption) => {
                  const active = productType === typeOption;
                  return (
                    <TouchableOpacity
                      key={typeOption}
                      style={[
                        styles.typeChip,
                        active && softShadow(resolvedTheme),
                        {
                          backgroundColor: active
                            ? paperTheme.colors.primary
                            : paperTheme.colors.background,
                          borderColor: active ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
                        },
                      ]}
                      onPress={() => {
                        setProductType(typeOption);
                        if (typeOption === 'service') {
                          setWarrantyAvailable(false);
                          setWarrantyMonths('');
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={typeOption === 'product' ? 'cube-outline' : 'construct-outline'}
                        size={18}
                        color={active ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: active ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface },
                        ]}
                      >
                        {typeOption === 'product' ? 'Product' : 'Service'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormFieldLabel label="Product number" kind="optional" paperTheme={paperTheme} />
              <TextInput
                value={productNumber}
                onChangeText={setProductNumber}
                placeholder="e.g. 101"
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                autoCapitalize="characters"
                style={[
                  inventoryUi.fieldInput,
                  {
                    color: paperTheme.colors.onSurface,
                    backgroundColor: paperTheme.colors.background,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              />
              <Text style={[styles.inventoryHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                Menu or POS code for quick entry on the Products tab.
              </Text>
            </FormSection>

            {productType === 'product' ? (
              <FormSection title="Pricing & stock" icon="wallet-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
                <View style={styles.twoColRow}>
                  <View style={styles.twoColField}>
                    <FormFieldLabel label="Amount" kind="required" paperTheme={paperTheme} />
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                      keyboardType="decimal-pad"
                      style={[
                        inventoryUi.fieldInput,
                        inventoryUi.fieldInputLast,
                        {
                          color: paperTheme.colors.onSurface,
                          backgroundColor: paperTheme.colors.background,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.twoColField}>
                    <FormFieldLabel label="Cost" kind="optional" paperTheme={paperTheme} />
                    <TextInput
                      value={cost}
                      onChangeText={setCost}
                      placeholder="Optional"
                      placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                      keyboardType="decimal-pad"
                      style={[
                        inventoryUi.fieldInput,
                        inventoryUi.fieldInputLast,
                        {
                          color: paperTheme.colors.onSurface,
                          backgroundColor: paperTheme.colors.background,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.inventoryCard,
                    {
                      backgroundColor: isInventoryAvailable
                        ? paperTheme.colors.primaryContainer
                        : paperTheme.colors.background,
                      borderColor: isInventoryAvailable
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outlineVariant,
                    },
                  ]}
                  onPress={() => setIsInventoryAvailable((prev) => !prev)}
                  activeOpacity={0.88}
                >
                  <View
                    style={[
                      styles.inventoryIconWrap,
                      {
                        backgroundColor: isInventoryAvailable
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={22}
                      color={
                        isInventoryAvailable
                          ? paperTheme.colors.onPrimary
                          : paperTheme.colors.onSurfaceVariant
                      }
                    />
                  </View>
                  <View style={styles.inventoryTextBlock}>
                    <Text style={[styles.inventoryTitle, { color: paperTheme.colors.onSurface }]}>
                      Track inventory
                    </Text>
                    <Text style={[styles.inventoryHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Enable stock tracking for this branch
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inventoryStatusBadge,
                      {
                        backgroundColor: isInventoryAvailable
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inventoryStatusText,
                        {
                          color: isInventoryAvailable
                            ? paperTheme.colors.onPrimary
                            : paperTheme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {isInventoryAvailable ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isInventoryAvailable ? (
                  <>
                    <FormFieldLabel label="Stock quantity (this branch)" kind="required" paperTheme={paperTheme} />
                    <TextInput
                      value={qty}
                      onChangeText={setQty}
                      placeholder="0"
                      placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                      keyboardType="number-pad"
                      style={[
                        inventoryUi.fieldInput,
                        {
                          color: paperTheme.colors.onSurface,
                          backgroundColor: paperTheme.colors.background,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.inventoryHint,
                        { color: paperTheme.colors.onSurfaceVariant },
                      ]}
                    >
                      Stock is tracked per branch. Other branches start at 0.
                    </Text>
                  </>
                ) : null}

                <FormFieldLabel label="Barcode" kind="optional" paperTheme={paperTheme} />
                <View style={styles.barcodeRow}>
                  <TextInput
                    value={barcode}
                    onChangeText={setBarcode}
                    placeholder="Scan or type barcode"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    autoCapitalize="characters"
                    style={[
                      inventoryUi.fieldInput,
                      styles.barcodeInput,
                      inventoryUi.fieldInputLast,
                      {
                        color: paperTheme.colors.onSurface,
                        backgroundColor: paperTheme.colors.background,
                        borderColor: paperTheme.colors.outlineVariant,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={[
                      styles.scanBarcodeBtn,
                      { backgroundColor: paperTheme.colors.primary },
                      softShadow(resolvedTheme),
                    ]}
                    onPress={openBarcodeScanner}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="scan" size={22} color={paperTheme.colors.onPrimary} />
                    <Text style={[styles.scanBarcodeBtnText, { color: paperTheme.colors.onPrimary }]}>Scan</Text>
                  </TouchableOpacity>
                </View>
              </FormSection>
            ) : null}

            {showWarrantyFields && productType === 'product' ? (
              <FormSection title="Warranty" icon="shield-checkmark-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
                <TouchableOpacity
                  style={[
                    styles.inventoryCard,
                    {
                      backgroundColor: warrantyAvailable
                        ? paperTheme.colors.primaryContainer
                        : paperTheme.colors.background,
                      borderColor: warrantyAvailable
                        ? paperTheme.colors.primary
                        : paperTheme.colors.outlineVariant,
                    },
                  ]}
                  onPress={() => {
                    setWarrantyAvailable((prev) => {
                      const next = !prev;
                      if (!next) setWarrantyMonths('');
                      return next;
                    });
                  }}
                  activeOpacity={0.88}
                >
                  <View
                    style={[
                      styles.inventoryIconWrap,
                      {
                        backgroundColor: warrantyAvailable
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={22}
                      color={
                        warrantyAvailable
                          ? paperTheme.colors.onPrimary
                          : paperTheme.colors.onSurfaceVariant
                      }
                    />
                  </View>
                  <View style={styles.inventoryTextBlock}>
                    <Text style={[styles.inventoryTitle, { color: paperTheme.colors.onSurface }]}>
                      Warranty available
                    </Text>
                    <Text style={[styles.inventoryHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Track warranty period on bills for this product
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inventoryStatusBadge,
                      {
                        backgroundColor: warrantyAvailable
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inventoryStatusText,
                        {
                          color: warrantyAvailable
                            ? paperTheme.colors.onPrimary
                            : paperTheme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {warrantyAvailable ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {warrantyAvailable ? (
                  <>
                    <FormFieldLabel
                      label="Warranty months"
                      kind="conditional"
                      paperTheme={paperTheme}
                    />
                    <TextInput
                      value={warrantyMonths}
                      onChangeText={setWarrantyMonths}
                      placeholder="e.g. 12"
                      placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                      keyboardType="number-pad"
                      style={[
                        inventoryUi.fieldInput,
                        {
                          color: paperTheme.colors.onSurface,
                          backgroundColor: paperTheme.colors.background,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    />
                    <Text style={[styles.inventoryHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Whole number of months shown on the customer bill (e.g. 6, 12, 24).
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.inventoryHint, { color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }]}>
                    Turn warranty on to set how many months this product is covered.
                  </Text>
                )}
              </FormSection>
            ) : null}

            <FormSection title="Product photo" icon="camera-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
              <FormFieldLabel label="Product image" kind="optional" paperTheme={paperTheme} />
              {imageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBadge}
                    onPress={() => setImageUri(null)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.imagePlaceholder,
                    { backgroundColor: paperTheme.colors.surfaceVariant },
                  ]}
                >
                  <Ionicons name="image-outline" size={40} color={paperTheme.colors.onSurfaceVariant} />
                  <Text style={[styles.imagePlaceholderTitle, { color: paperTheme.colors.onSurface }]}>
                    No product image
                  </Text>
                  <Text
                    style={[styles.imagePlaceholderHint, { color: paperTheme.colors.onSurfaceVariant }]}
                  >
                    Take a photo or choose one from your gallery
                  </Text>
                </View>
              )}

              <View style={styles.imageActionColumn}>
                <TouchableOpacity
                  style={[
                    styles.imageActionBtn,
                    styles.imageActionBtnPrimary,
                    { backgroundColor: paperTheme.colors.primary },
                  ]}
                  onPress={() => void takePhoto()}
                  onPressIn={onSelectImagePress}
                  activeOpacity={0.88}
                >
                  <View style={styles.imageActionIconCircle}>
                    <Ionicons name="camera" size={24} color={paperTheme.colors.primary} />
                  </View>
                  <View style={styles.imageActionLabelBlock}>
                    <Text style={[styles.imageActionBtnTitle, { color: paperTheme.colors.onPrimary }]}>
                      Take photo
                    </Text>
                    <Text style={[styles.imageActionBtnSub, { color: 'rgba(255,255,255,0.85)' }]}>
                      Open camera
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.onPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.imageActionBtn,
                    styles.imageActionBtnSecondary,
                    {
                      backgroundColor: paperTheme.colors.surface,
                      borderColor: paperTheme.colors.primary,
                    },
                  ]}
                  onPress={() => void pickFromGallery()}
                  onPressIn={onSelectImagePress}
                  activeOpacity={0.88}
                >
                  <View
                    style={[
                      styles.imageActionIconCircle,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Ionicons name="images" size={24} color={paperTheme.colors.primary} />
                  </View>
                  <View style={styles.imageActionLabelBlock}>
                    <Text style={[styles.imageActionBtnTitle, { color: paperTheme.colors.onSurface }]}>
                      Choose gallery
                    </Text>
                    <Text style={[styles.imageActionBtnSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Pick from device
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.primary} />
                </TouchableOpacity>
              </View>
              {imageUri ? (
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                  <Text style={[styles.removeImageText, { color: paperTheme.colors.error }]}>Remove photo</Text>
                </TouchableOpacity>
              ) : null}
            </FormSection>

            <View style={styles.formActions}>
              {canSave ? (
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: paperTheme.colors.primary },
                    softShadow(resolvedTheme),
                    saving && styles.btnDisabled,
                  ]}
                  onPress={onSave}
                  activeOpacity={0.9}
                  disabled={saving || deleting}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
                  ) : (
                    <Ionicons name="checkmark-circle" size={22} color={paperTheme.colors.onPrimary} />
                  )}
                  <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                    {saving ? 'Saving...' : mode === 'add' ? 'Save product' : 'Save changes'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {mode === 'edit' && initial ? (
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    {
                      backgroundColor: paperTheme.colors.errorContainer,
                      borderColor: paperTheme.colors.error,
                    },
                    (saving || deleting) && styles.btnDisabled,
                  ]}
                  onPress={onDelete}
                  activeOpacity={0.9}
                  disabled={saving || deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={paperTheme.colors.error} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={paperTheme.colors.error} />
                  )}
                  <Text style={[styles.deleteBtnText, { color: paperTheme.colors.error }]}>
                    {deleting ? 'Deleting...' : 'Delete product'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>

          <Modal
            visible={categoryModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setCategoryModalVisible(false)}
            >
              <View
                style={[styles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
                onStartShouldSetResponder={() => true}
              >
                <View style={[styles.modalHandle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
                <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Select category</Text>
                <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                  {categories.length === 0 ? (
                    <Text style={[styles.modalEmpty, { color: paperTheme.colors.onSurfaceVariant }]}>
                      No categories loaded. Add categories first from Manage Categories.
                    </Text>
                  ) : (
                    categories.map((cat: Category) => {
                      const active = cat._id === categoryId;
                      return (
                        <TouchableOpacity
                          key={cat._id}
                          style={[
                            styles.modalRow,
                            { borderBottomColor: paperTheme.colors.outline },
                            active && { backgroundColor: paperTheme.colors.primaryContainer },
                          ]}
                          onPress={() => {
                            setCategoryId(cat._id);
                            setCategoryModalVisible(false);
                          }}
                        >
                          <View style={[styles.catDot, { backgroundColor: cat.colorCode }]} />
                          <Text style={[styles.modalRowText, { color: paperTheme.colors.onSurface }]}>
                            {cat.name}
                          </Text>
                          {active ? (
                            <Ionicons name="checkmark" size={20} color={paperTheme.colors.primary} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: paperTheme.colors.secondaryContainer }]}
                  onPress={() => setCategoryModalVisible(false)}
                >
                  <Text style={[styles.modalCloseText, { color: paperTheme.colors.onSecondaryContainer }]}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          <BarcodeScannerModal
            visible={barcodeScannerVisible}
            onClose={() => setBarcodeScannerVisible(false)}
            onScanned={handleBarcodeScanned}
            paperTheme={paperTheme}
          />
        </KeyboardAvoidingView>

        {alertConfig && (
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
        )}
      </SafeAreaView>
    </>
  );
}

export function AddProductScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'AddProduct'>) {
  return <ProductFormContent navigation={navigation} mode="add" />;
}

export function EditProductScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'EditProduct'>) {
  return <ProductFormContent navigation={navigation} mode="edit" initial={route.params} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  title: { fontSize: 22, fontFamily: fonts.PoppinsBold, lineHeight: 28 },
  modeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  subtitle: { fontSize: 13, fontFamily: fonts.PoppinsRegular, marginTop: 4, lineHeight: 18 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  fieldLabelText: {
    flex: 1,
    marginBottom: 0,
  },
  fieldBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fieldBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  selectText: { fontFamily: fonts.PoppinsRegular, fontSize: 15, flex: 1 },
  selectPlaceholder: { fontFamily: fonts.PoppinsRegular, fontSize: 15, flex: 1 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  twoColField: {
    flex: 1,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  inventoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  inventoryTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  inventoryHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  inventoryStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  inventoryStatusText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  barcodeInput: {
    flex: 1,
    marginBottom: 0,
  },
  scanBarcodeBtn: {
    minWidth: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scanBarcodeBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  removeImageBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  imagePlaceholderTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginTop: 4,
  },
  imagePlaceholderHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  imageActionColumn: {
    gap: 10,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  imageActionBtnPrimary: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  imageActionBtnSecondary: {
    borderWidth: 2,
  },
  imageActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageActionLabelBlock: {
    flex: 1,
    minWidth: 0,
  },
  imageActionBtnTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  imageActionBtnSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
  },
  removeImageText: { fontFamily: fonts.PoppinsMedium, fontSize: 14 },
  formActions: {
    gap: 12,
    marginTop: 4,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.75,
  },
  saveBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    maxHeight: '72%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontFamily: fonts.PoppinsBold, fontSize: 18, marginBottom: 8 },
  modalList: { maxHeight: 360 },
  modalEmpty: { fontFamily: fonts.PoppinsRegular, fontSize: 14, paddingVertical: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  modalRowText: { flex: 1, fontFamily: fonts.PoppinsRegular, fontSize: 16 },
  modalClose: {
    marginVertical: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
});
