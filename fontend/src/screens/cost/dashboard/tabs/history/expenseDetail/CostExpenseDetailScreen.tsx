import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import CommonAlert from '../../../../../../components/CommonAlert/CommonAlert';
import CommonHeader from '../../../../../../components/CommonHeader/CommonHeader';
import DatePickerField from '../../../../../../components/DatePickerField/DatePickerField';
import SlideToast from '../../../../../../components/SlideToast/SlideToast';
import { useTheme } from '../../../../../../context/ThemeContext';
import { useCommonAlert } from '../../../../../../hooks/useCommonAlert';
import { RootStackParamList } from '../../../../../../navigation/RootStackParamsList';
import { fetchCostCategories_Service } from '../../../../../../services/CostCategoryService';
import {
  deleteCostExpense_Service,
  fetchCostExpenseById_Service,
  getCostExpenseImageUrl,
  updateCostExpense_Service,
} from '../../../../../../services/CostExpenseService';
import { AppDispatch, RootState } from '../../../../../../store/store';
import { CostCategory } from '../../../../../../type/costCategory';
import { CostExpense, UpdateCostExpenseRequest } from '../../../../../../type/costExpense';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../../utils/apiErrorAlert';
import {
  SettingsDetailRow,
  SettingsEmptyState,
  SettingsSection,
} from '../../../../../settings/shared/SettingsDetailComponents';
import { cardShadow } from '../../../../../settings/shared/settingsDetailStyles';
import { addExpenseStyles as formStyles } from '../../dashboard/addExpenses/addExpenseStyles';
import { costCardShadow } from '../../../shared/costDashboardStyles';
import { formatCostAmount } from '../../../shared/costDashboardMockData';
import { expenseDetailShadow, expenseDetailStyles as styles } from './expenseDetailStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'CostExpenseDetail'>;

function formatExpenseDate(isoDate?: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function toDateInputValue(isoDate?: string): string {
  if (!isoDate) return '';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCategoryIdFromExpense(expense: CostExpense): string {
  if (typeof expense.categoryId === 'object' && expense.categoryId?._id) {
    return expense.categoryId._id;
  }
  return String(expense.categoryId ?? '');
}

function getCategoryName(expense: CostExpense): string {
  if (typeof expense.categoryId === 'object' && expense.categoryId?.name) {
    return expense.categoryId.name;
  }
  return expense.categoryName || 'Uncategorized';
}

function getCategoryColor(expense: CostExpense, fallback: string): string {
  if (typeof expense.categoryId === 'object' && expense.categoryId?.colorCode) {
    return expense.categoryId.colorCode;
  }
  return fallback;
}

function getPersonName(person: CostExpense['createdBy']): string {
  if (typeof person === 'object' && person?.name) {
    return person.name;
  }
  return '—';
}

function resolveCategoryFromExpense(
  expense: CostExpense,
  categories: CostCategory[],
): CostCategory | null {
  const categoryId = getCategoryIdFromExpense(expense);
  const fromList = categories.find((item) => item._id === categoryId);
  if (fromList) return fromList;

  if (typeof expense.categoryId === 'object' && expense.categoryId?._id) {
    return {
      _id: expense.categoryId._id,
      name: expense.categoryId.name ?? expense.categoryName,
      colorCode: expense.categoryId.colorCode ?? '#64748b',
      shopId: expense.shopId ?? '',
    };
  }

  if (categoryId && expense.categoryName) {
    return {
      _id: categoryId,
      name: expense.categoryName,
      colorCode: '#64748b',
      shopId: expense.shopId ?? '',
    };
  }

  return null;
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
      ? 'Please allow photo library access to attach proof.'
      : 'Photo library access is turned off. Enable Photos permission in Settings.',
    1,
    false,
    'OK',
    () => {},
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
      ? 'Please allow camera access to take a proof photo.'
      : 'Camera access is turned off. Enable Camera permission in Settings.',
    1,
    false,
    'OK',
    () => {},
  );
  return false;
}

function StatChip({
  icon,
  label,
  value,
  paperTheme,
  resolvedTheme,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
  tint?: string;
}) {
  const accent = tint ?? paperTheme.colors.primary;

  return (
    <View
      style={[
        styles.statChip,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, { color: paperTheme.colors.onSurface }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function ExpenseHero({
  expense,
  paperTheme,
  resolvedTheme,
}: {
  expense: CostExpense;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
}) {
  const accentColor = getCategoryColor(expense, paperTheme.colors.primary);

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: `${accentColor}33`,
        },
        expenseDetailShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.heroAccent, { backgroundColor: accentColor }]} />
      <View style={[styles.heroAccentSecondary, { backgroundColor: accentColor }]} />

      <Text style={[styles.heroEyebrow, { color: accentColor }]}>Expense</Text>

      <View style={styles.heroTopRow}>
        <View
          style={[
            styles.heroIconWrap,
            {
              backgroundColor: `${accentColor}16`,
              borderColor: `${accentColor}33`,
            },
          ]}
        >
          <Ionicons name="receipt-outline" size={26} color={accentColor} />
        </View>

        <View style={styles.heroBody}>
          <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
            {expense.expenseName}
          </Text>
          <Text style={[styles.heroSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            {expense.expenseId}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: `${accentColor}12`,
                  borderColor: `${accentColor}33`,
                },
              ]}
            >
              <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.categoryBadgeText, { color: accentColor }]}>
                {getCategoryName(expense)}
              </Text>
            </View>

            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: expense.isProduct
                    ? paperTheme.colors.tertiaryContainer
                    : paperTheme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color: expense.isProduct
                      ? paperTheme.colors.tertiary
                      : paperTheme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {expense.isProduct ? 'Product' : 'General'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.amountPanel,
          {
            backgroundColor: `${paperTheme.colors.error}10`,
            borderWidth: 1,
            borderColor: `${paperTheme.colors.error}22`,
          },
        ]}
      >
        <Text style={[styles.amountLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Total amount
        </Text>
        <Text style={[styles.amountValue, { color: paperTheme.colors.error }]}>
          -{formatCostAmount(expense.amount)}
        </Text>
      </View>
    </View>
  );
}

export default function CostExpenseDetailScreen({ navigation, route }: Props) {
  const { expenseId } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const categories = useSelector(
    (state: RootState) => state.CostCategoryReducer?.list?.items ?? [],
  );
  const categoriesLoading = useSelector(
    (state: RootState) => state.CostCategoryReducer?.list?.loading ?? false,
  );
  const { loadingId, updating, deleting, byId, error: detailError } = useSelector(
    (state: RootState) => state.CostExpenseReducer.detail,
  );

  const expense = byId[expenseId] ?? null;
  const loading = loadingId === expenseId && !expense;
  const proofImageUrl = expense ? getCostExpenseImageUrl(expense.image) : null;

  const [selectedCategory, setSelectedCategory] = useState<CostCategory | null>(null);
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isProduct, setIsProduct] = useState(false);
  const [qty, setQty] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newImageMimeType, setNewImageMimeType] = useState<string | null>(null);
  const [newImageFileName, setNewImageFileName] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);

  const syncFormFromExpense = useCallback(
    (nextExpense: CostExpense) => {
      setSelectedCategory(resolveCategoryFromExpense(nextExpense, categories));
      setExpenseName(nextExpense.expenseName);
      setAmount(String(nextExpense.amount));
      setExpenseDate(toDateInputValue(nextExpense.purchaseDate));
      setIsProduct(nextExpense.isProduct);
      setQty(nextExpense.isProduct && nextExpense.qty != null ? String(nextExpense.qty) : '');
      setNewImageUri(null);
      setNewImageMimeType(null);
      setNewImageFileName(null);
      setImageRemoved(false);
    },
    [categories],
  );

  useEffect(() => {
    if (!expense) return;
    syncFormFromExpense(expense);
  }, [expense?._id, expense?.updatedAt]);

  useEffect(() => {
    if (!expense || selectedCategory) return;
    const resolved = resolveCategoryFromExpense(expense, categories);
    if (resolved) {
      setSelectedCategory(resolved);
    }
  }, [categories, expense, selectedCategory]);

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCostCategories_Service()).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
    }
  }, [dispatch, show_Alert]);

  const loadExpenseDetail = useCallback(async () => {
    if (byId[expenseId]) return;
    try {
      await dispatch(fetchCostExpenseById_Service(expenseId)).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load expense details. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadExpenseDetail();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [byId, dispatch, expenseId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      void loadExpenseDetail();
    }, [loadCategories, loadExpenseDetail]),
  );

  const originalCategoryId = expense ? getCategoryIdFromExpense(expense) : '';
  const originalExpenseName = expense?.expenseName ?? '';
  const originalAmount = expense ? String(expense.amount) : '';
  const originalDate = expense ? toDateInputValue(expense.purchaseDate) : '';
  const originalIsProduct = expense?.isProduct ?? false;
  const originalQty =
    expense?.isProduct && expense.qty != null ? String(expense.qty) : '';
  const hadOriginalImage = Boolean(proofImageUrl);

  const hasChanges = useMemo(() => {
    if (!expense) return false;

    if (expenseName.trim() !== originalExpenseName.trim()) return true;
    if (selectedCategory?._id !== originalCategoryId) return true;
    if (amount !== originalAmount) return true;
    if (expenseDate !== originalDate) return true;
    if (isProduct !== originalIsProduct) return true;
    if (isProduct && qty !== originalQty) return true;
    if (newImageUri) return true;
    if (imageRemoved && hadOriginalImage) return true;

    return false;
  }, [
    amount,
    expense,
    expenseDate,
    expenseName,
    hadOriginalImage,
    imageRemoved,
    isProduct,
    newImageUri,
    originalAmount,
    originalCategoryId,
    originalDate,
    originalExpenseName,
    originalIsProduct,
    originalQty,
    qty,
    selectedCategory?._id,
  ]);

  const canUpdate = useMemo(() => {
    if (!hasChanges || !expenseName.trim() || !selectedCategory || !amount.trim()) return false;
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) return false;
    if (isProduct) {
      const parsedQty = Number(qty);
      if (Number.isNaN(parsedQty) || parsedQty <= 0) return false;
    }
    return true;
  }, [amount, expenseName, hasChanges, isProduct, qty, selectedCategory]);

  const displayImageUri = newImageUri
    ? newImageUri
    : imageRemoved
      ? null
      : proofImageUrl;

  const pickFromGallery = useCallback(async () => {
    const allowed = await ensureMediaLibraryPermission(show_Alert);
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setNewImageUri(asset.uri);
      setNewImageMimeType(asset.mimeType ?? null);
      setNewImageFileName(asset.fileName ?? null);
      setImageRemoved(false);
    }
  }, [show_Alert]);

  const takePhoto = useCallback(async () => {
    const allowed = await ensureCameraPermission(show_Alert);
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setNewImageUri(asset.uri);
      setNewImageMimeType(asset.mimeType ?? null);
      setNewImageFileName(asset.fileName ?? null);
      setImageRemoved(false);
    }
  }, [show_Alert]);

  const buildUpdatePayload = useCallback((): UpdateCostExpenseRequest | null => {
    if (!expense || !selectedCategory) return null;

    const payload: UpdateCostExpenseRequest = { id: expense._id };

    if (expenseName.trim() !== originalExpenseName.trim()) {
      payload.expenseName = expenseName.trim();
    }

    if (selectedCategory._id !== originalCategoryId) {
      payload.categoryId = selectedCategory._id;
      payload.categoryName = selectedCategory.name;
    }

    const parsedAmount = Number(amount);
    if (amount !== originalAmount) {
      payload.amount = parsedAmount;
    }

    if (expenseDate !== originalDate && expenseDate.trim()) {
      payload.purchaseDate = expenseDate.trim();
    }

    if (isProduct !== originalIsProduct) {
      payload.isProduct = isProduct;
    }

    if (isProduct && qty !== originalQty) {
      payload.qty = Number(qty);
    } else if (!isProduct && originalIsProduct) {
      payload.isProduct = false;
    }

    if (newImageUri) {
      payload.imageUri = newImageUri;
      payload.imageMimeType = newImageMimeType;
      payload.imageFileName = newImageFileName;
    } else if (imageRemoved && hadOriginalImage) {
      payload.removeImage = true;
    }

    const hasPayloadFields = Object.keys(payload).some(
      (key) => key !== 'id',
    );
    return hasPayloadFields ? payload : null;
  }, [
    amount,
    expense,
    expenseDate,
    expenseName,
    hadOriginalImage,
    imageRemoved,
    isProduct,
    newImageUri,
    newImageMimeType,
    newImageFileName,
    originalAmount,
    originalCategoryId,
    originalDate,
    originalExpenseName,
    originalIsProduct,
    originalQty,
    qty,
    selectedCategory,
  ]);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
    navigation.goBack();
  }, [navigation]);

  const handleUpdate = useCallback(async () => {
    if (!canUpdate || updating || !expense) return;

    const payload = buildUpdatePayload();
    if (!payload) return;

    try {
      const result = await dispatch(updateCostExpense_Service(payload)).unwrap();
      if (result.data) {
        syncFormFromExpense(result.data);
      }
      setSlideToastMessage('Expense updated successfully');
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Update failed',
        getApiErrorMessage(error, 'Could not update expense. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [
    buildUpdatePayload,
    canUpdate,
    dispatch,
    expense,
    show_Alert,
    syncFormFromExpense,
    updating,
  ]);

  const handleDelete = useCallback(() => {
    if (!expense || deleting) return;

    show_Alert(
      'error',
      'Delete expense?',
      `Are you sure you want to delete "${expense.expenseName}" (${expense.expenseId})? This cannot be undone.`,
      2,
      false,
      'Delete',
      async () => {
        try {
          await dispatch(deleteCostExpense_Service(expense._id)).unwrap();
          setSlideToastMessage('Expense deleted');
        } catch (error: unknown) {
          const handled = await handleSessionExpiredApiError(error, show_Alert);
          if (handled) return;

          show_Alert(
            'error',
            'Delete failed',
            getApiErrorMessage(error, 'Could not delete expense. Please try again.'),
            1,
            false,
            'OK',
            () => {},
          );
        }
      },
      'Cancel',
      () => {},
    );
  }, [deleting, dispatch, expense, show_Alert]);

  const renderCategoryOption = ({ item }: { item: CostCategory }) => {
    const selected = selectedCategory?._id === item._id;
    return (
      <TouchableOpacity
        style={[
          formStyles.categoryOption,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: selected ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
          },
          costCardShadow(resolvedTheme),
        ]}
        onPress={() => {
          setSelectedCategory(item);
          setCategoryModalVisible(false);
        }}
      >
        <View style={[formStyles.categoryDot, { backgroundColor: item.colorCode }]} />
        <View style={formStyles.categoryOptionBody}>
          <Text style={[formStyles.categoryOptionName, { color: paperTheme.colors.onSurface }]}>
            {item.name}
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
        style={[styles.screen, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Expense details"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={paperTheme.colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading expense...
            </Text>
          </View>
        ) : !expense ? (
          <SettingsEmptyState
            icon="receipt-outline"
            title="Expense not found"
            description={detailError || 'This expense could not be loaded. Go back and try again.'}
            paperTheme={paperTheme}
          />
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ExpenseHero expense={expense} paperTheme={paperTheme} resolvedTheme={resolvedTheme} />

              <View style={styles.statsRow}>
                <StatChip
                  icon="calendar-outline"
                  label="Purchase date"
                  value={formatExpenseDate(expense.purchaseDate)}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
                <StatChip
                  icon="cube-outline"
                  label="Quantity"
                  value={
                    expense.isProduct
                      ? expense.qty != null
                        ? String(expense.qty)
                        : '—'
                      : 'N/A'
                  }
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                  tint={paperTheme.colors.tertiary}
                />
                <StatChip
                  icon="person-outline"
                  label="Recorded by"
                  value={getPersonName(expense.createdBy)}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                  tint={paperTheme.colors.secondary}
                />
              </View>

              <View
                style={[
                  styles.editSection,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.editSectionTitle, { color: paperTheme.colors.onSurface }]}>
                  Edit expense
                </Text>

                <View>
                  <Text style={[formStyles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Expense name
                  </Text>
                  <TextInput
                    value={expenseName}
                    onChangeText={setExpenseName}
                    placeholder="e.g. Office supplies"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    style={[
                      formStyles.input,
                      {
                        backgroundColor: paperTheme.colors.background,
                        borderColor: paperTheme.colors.outlineVariant,
                        color: paperTheme.colors.onSurface,
                      },
                    ]}
                  />
                </View>

                <View>
                  <Text style={[formStyles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Category
                  </Text>
                  <TouchableOpacity
                    style={[
                      formStyles.categoryPicker,
                      {
                        backgroundColor: paperTheme.colors.background,
                        borderColor: paperTheme.colors.outlineVariant,
                      },
                    ]}
                    onPress={() => setCategoryModalVisible(true)}
                  >
                    {selectedCategory ? (
                      <>
                        <View
                          style={[
                            formStyles.categoryDot,
                            { backgroundColor: selectedCategory.colorCode },
                          ]}
                        />
                        <Text
                          style={[
                            formStyles.categoryPickerText,
                            { color: paperTheme.colors.onSurface },
                          ]}
                        >
                          {selectedCategory.name}
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={[
                          formStyles.categoryPickerText,
                          { color: paperTheme.colors.onSurfaceVariant },
                        ]}
                      >
                        Select a category
                      </Text>
                    )}
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={paperTheme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text style={[formStyles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Amount (Rs.)
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={[
                      formStyles.input,
                      {
                        backgroundColor: paperTheme.colors.background,
                        borderColor: paperTheme.colors.outlineVariant,
                        color: paperTheme.colors.onSurface,
                      },
                    ]}
                  />
                </View>

                <View>
                  <DatePickerField
                    label="Purchase date"
                    value={expenseDate}
                    onChange={setExpenseDate}
                    placeholder="Select date"
                    maximumDate={new Date()}
                    paperTheme={paperTheme}
                  />
                </View>

                <View style={formStyles.toggleRow}>
                  <View style={formStyles.toggleText}>
                    <Text style={[formStyles.toggleTitle, { color: paperTheme.colors.onSurface }]}>
                      Is product?
                    </Text>
                    <Text style={[formStyles.toggleSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      When off, quantity is cleared automatically.
                    </Text>
                  </View>
                  <Switch
                    value={isProduct}
                    onValueChange={(value) => {
                      setIsProduct(value);
                      if (!value) setQty('');
                    }}
                    trackColor={{
                      false: paperTheme.colors.surfaceVariant,
                      true: `${paperTheme.colors.primary}88`,
                    }}
                    thumbColor={isProduct ? paperTheme.colors.primary : paperTheme.colors.outline}
                  />
                </View>

                {isProduct ? (
                  <View>
                    <Text style={[formStyles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Quantity
                    </Text>
                    <TextInput
                      value={qty}
                      onChangeText={setQty}
                      placeholder="Enter quantity"
                      placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                      keyboardType="number-pad"
                      style={[
                        formStyles.input,
                        {
                          backgroundColor: paperTheme.colors.background,
                          borderColor: paperTheme.colors.outlineVariant,
                          color: paperTheme.colors.onSurface,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>

              <SettingsSection
                title="Record info"
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              >
                <SettingsDetailRow
                  icon="finger-print-outline"
                  label="Expense ID"
                  value={expense.expenseId || '—'}
                  paperTheme={paperTheme}
                />
                <SettingsDetailRow
                  icon="person-outline"
                  label="Created by"
                  value={getPersonName(expense.createdBy)}
                  paperTheme={paperTheme}
                />
                <SettingsDetailRow
                  icon="time-outline"
                  label="Created"
                  value={formatDateTime(expense.createdAt)}
                  paperTheme={paperTheme}
                />
                <SettingsDetailRow
                  icon="create-outline"
                  label="Last updated by"
                  value={getPersonName(expense.updatedBy)}
                  paperTheme={paperTheme}
                />
                <SettingsDetailRow
                  icon="refresh-outline"
                  label="Last updated"
                  value={formatDateTime(expense.updatedAt)}
                  paperTheme={paperTheme}
                  isLast
                />
              </SettingsSection>

              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Proof image
              </Text>
              <View
                style={[
                  styles.proofCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                {displayImageUri ? (
                  <>
                    <TouchableOpacity
                      style={styles.proofImageWrap}
                      onPress={() => void Linking.openURL(displayImageUri)}
                      activeOpacity={0.92}
                    >
                      <Image
                        source={{ uri: displayImageUri }}
                        style={[
                          styles.proofImage,
                          { backgroundColor: paperTheme.colors.surfaceVariant },
                        ]}
                        resizeMode="cover"
                      />
                      <View style={styles.proofOverlay}>
                        <Ionicons name="expand-outline" size={18} color="#ffffff" />
                        <Text style={styles.proofOverlayText}>View full image</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setNewImageUri(null);
                        setNewImageMimeType(null);
                        setNewImageFileName(null);
                        setImageRemoved(true);
                      }}
                      style={[
                        formStyles.imageBtn,
                        {
                          margin: 12,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                      <Text style={[formStyles.imageBtnText, { color: paperTheme.colors.error }]}>
                        Remove image
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.proofEmpty}>
                    <View
                      style={[
                        styles.proofEmptyIcon,
                        { backgroundColor: paperTheme.colors.surfaceVariant },
                      ]}
                    >
                      <Ionicons
                        name="image-outline"
                        size={28}
                        color={paperTheme.colors.onSurfaceVariant}
                      />
                    </View>
                    <Text style={[styles.proofEmptyTitle, { color: paperTheme.colors.onSurface }]}>
                      No proof attached
                    </Text>
                    <Text
                      style={[styles.proofEmptySub, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      Add a receipt or proof photo for this expense.
                    </Text>
                    <View style={[formStyles.imageActions, { width: '100%', paddingHorizontal: 12 }]}>
                      <TouchableOpacity
                        onPress={takePhoto}
                        style={[
                          formStyles.imageBtn,
                          {
                            backgroundColor: paperTheme.colors.primaryContainer,
                            borderColor: `${paperTheme.colors.primary}33`,
                          },
                        ]}
                      >
                        <Ionicons name="camera-outline" size={18} color={paperTheme.colors.primary} />
                        <Text style={[formStyles.imageBtnText, { color: paperTheme.colors.primary }]}>
                          Camera
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={pickFromGallery}
                        style={[
                          formStyles.imageBtn,
                          {
                            backgroundColor: paperTheme.colors.surfaceVariant,
                            borderColor: paperTheme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <Ionicons
                          name="images-outline"
                          size={18}
                          color={paperTheme.colors.onSurface}
                        />
                        <Text style={[formStyles.imageBtnText, { color: paperTheme.colors.onSurface }]}>
                          Gallery
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {displayImageUri ? (
                  <View style={[formStyles.imageActions, { padding: 12, paddingTop: 0 }]}>
                    <TouchableOpacity
                      onPress={takePhoto}
                      style={[
                        formStyles.imageBtn,
                        {
                          backgroundColor: paperTheme.colors.primaryContainer,
                          borderColor: `${paperTheme.colors.primary}33`,
                        },
                      ]}
                    >
                      <Ionicons name="camera-outline" size={18} color={paperTheme.colors.primary} />
                      <Text style={[formStyles.imageBtnText, { color: paperTheme.colors.primary }]}>
                        Replace (camera)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={pickFromGallery}
                      style={[
                        formStyles.imageBtn,
                        {
                          backgroundColor: paperTheme.colors.surfaceVariant,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Ionicons name="images-outline" size={18} color={paperTheme.colors.onSurface} />
                      <Text style={[formStyles.imageBtnText, { color: paperTheme.colors.onSurface }]}>
                        Replace (gallery)
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <View style={styles.actionRow}>
                {hasChanges ? (
                  <TouchableOpacity
                    style={[
                      styles.updateBtn,
                      {
                        backgroundColor: canUpdate
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surfaceVariant,
                        opacity: updating ? 0.7 : 1,
                      },
                      costCardShadow(resolvedTheme),
                    ]}
                    onPress={handleUpdate}
                    disabled={!canUpdate || updating}
                    activeOpacity={0.92}
                  >
                    {updating ? (
                      <ActivityIndicator color={paperTheme.colors.onPrimary} />
                    ) : (
                      <>
                        <Ionicons
                          name="save-outline"
                          size={20}
                          color={
                            canUpdate
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSurfaceVariant
                          }
                        />
                        <Text
                          style={[
                            styles.updateBtnText,
                            {
                              color: canUpdate
                                ? paperTheme.colors.onPrimary
                                : paperTheme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          Update expense
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    {
                      borderColor: `${paperTheme.colors.error}44`,
                      backgroundColor: `${paperTheme.colors.error}10`,
                      opacity: deleting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleDelete}
                  disabled={deleting}
                  activeOpacity={0.92}
                >
                  {deleting ? (
                    <ActivityIndicator color={paperTheme.colors.error} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                      <Text style={[styles.deleteBtnText, { color: paperTheme.colors.error }]}>
                        Delete expense
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        <SlideToast
          message={slideToastMessage}
          onDismiss={hideSlideToast}
          paperTheme={paperTheme}
          tone="success"
          durationMs={2200}
        />
      </SafeAreaView>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable style={formStyles.modalBackdrop} onPress={() => setCategoryModalVisible(false)}>
          <Pressable
            style={[formStyles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[formStyles.modalHandle, { backgroundColor: paperTheme.colors.outlineVariant }]}
            />
            <Text style={[formStyles.modalTitle, { color: paperTheme.colors.onSurface }]}>
              Select category
            </Text>

            {categoriesLoading && categories.length === 0 ? (
              <ActivityIndicator color={paperTheme.colors.primary} style={{ marginVertical: 24 }} />
            ) : categories.length === 0 ? (
              <View style={formStyles.emptyCategories}>
                <Ionicons
                  name="folder-open-outline"
                  size={36}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Text
                  style={[formStyles.emptyCategoriesText, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  No categories available.
                </Text>
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item._id}
                renderItem={renderCategoryOption}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </Pressable>
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
            MoreDetails={alertConfig.MoreDetails}
          />
        </Portal>
      ) : null}
    </>
  );
}
