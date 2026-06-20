import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Portal } from 'react-native-paper';
import { RootStackParamList } from '../../../../../../navigation/RootStackParamsList';
import { fonts } from '../../../../../../constants/fonts';
import { useTheme } from '../../../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../../../store/store';
import CommonHeader from '../../../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../../../components/CommonAlert/CommonAlert';
import SlideToast from '../../../../../../components/SlideToast/SlideToast';
import { useCommonAlert } from '../../../../../../hooks/useCommonAlert';
import { fetchCostCategories_Service } from '../../../../../../services/CostCategoryService';
import { createCostExpense_Service } from '../../../../../../services/CostExpenseService';
import { CostCategory } from '../../../../../../type/costCategory';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../../utils/apiErrorAlert';
import { costCardShadow } from '../../../shared/costDashboardStyles';
import DatePickerField from '../../../../../../components/DatePickerField/DatePickerField';
import { addExpenseStyles as styles } from './addExpenseStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCostExpense'>;

function getTodayDateValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export default function AddCostExpenseScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const categories = useSelector(
    (state: RootState) => state.CostCategoryReducer?.list?.items ?? [],
  );
  const categoriesLoading = useSelector(
    (state: RootState) => state.CostCategoryReducer?.list?.loading ?? false,
  );
  const saving = useSelector(
    (state: RootState) => state.CostExpenseReducer?.create?.loading ?? false,
  );

  const [expenseName, setExpenseName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CostCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [isProduct, setIsProduct] = useState(false);
  const [qty, setQty] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayDateValue);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCostCategories_Service()).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load categories. Please try again.'),
        2,
        false,
        'Retry',
        () => {
          void loadCategories();
        },
        'Cancel',
        () => {},
      );
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories]),
  );

  const canSave = useMemo(() => {
    if (!expenseName.trim() || !selectedCategory || !amount.trim()) return false;
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) return false;
    if (isProduct) {
      const parsedQty = Number(qty);
      if (Number.isNaN(parsedQty) || parsedQty <= 0) return false;
    }
    return true;
  }, [amount, expenseName, isProduct, qty, selectedCategory]);

  const pickFromGallery = useCallback(async () => {
    const allowed = await ensureMediaLibraryPermission(show_Alert);
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMimeType(asset.mimeType ?? null);
      setImageFileName(asset.fileName ?? null);
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
      setImageUri(asset.uri);
      setImageMimeType(asset.mimeType ?? null);
      setImageFileName(asset.fileName ?? null);
    }
  }, [show_Alert]);

  const handleSave = useCallback(async () => {
    if (!canSave || saving || !selectedCategory) return;

    const parsedAmount = Number(amount);
    const parsedQty = isProduct ? Number(qty) : undefined;

    try {
      const result = await dispatch(
        createCostExpense_Service({
          expenseName: expenseName.trim(),
          categoryId: selectedCategory._id,
          categoryName: selectedCategory.name,
          amount: parsedAmount,
          isProduct,
          qty: parsedQty,
          purchaseDate: expenseDate.trim() || undefined,
          imageUri,
          imageMimeType,
          imageFileName,
        }),
      ).unwrap();

      const expenseId = result.data?.expenseId;
      setSlideToastMessage(
        expenseId
          ? `Expense ${expenseId} created successfully`
          : 'Expense created successfully',
      );
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Save failed',
        getApiErrorMessage(error, 'Could not save expense. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [
    amount,
    canSave,
    dispatch,
    expenseName,
    expenseDate,
    imageUri,
    imageMimeType,
    imageFileName,
    isProduct,
    qty,
    saving,
    selectedCategory,
    show_Alert,
  ]);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
    navigation.goBack();
  }, [navigation]);

  const renderCategoryOption = ({ item }: { item: CostCategory }) => {
    const selected = selectedCategory?._id === item._id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryOption,
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
        <View style={[styles.categoryDot, { backgroundColor: item.colorCode }]} />
        <View style={styles.categoryOptionBody}>
          <Text style={[styles.categoryOptionName, { color: paperTheme.colors.onSurface }]}>
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
          title="New expense"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

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
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: paperTheme.colors.primaryContainer,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
                costCardShadow(resolvedTheme),
              ]}
            >
              <Text style={[styles.heroTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                Record an expense
              </Text>
              <Text style={[styles.heroSub, { color: paperTheme.colors.onPrimaryContainer }]}>
                Add cost details and optional receipt or proof photo.
              </Text>
            </View>

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                costCardShadow(resolvedTheme),
              ]}
            >
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                Expense details
              </Text>

              <View>
                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Expense name
                </Text>
                <TextInput
                  value={expenseName}
                  onChangeText={setExpenseName}
                  placeholder="e.g. Office supplies"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  style={[
                    styles.input,
                    {
                      backgroundColor: paperTheme.colors.background,
                      borderColor: paperTheme.colors.outlineVariant,
                      color: paperTheme.colors.onSurface,
                    },
                  ]}
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Category
                </Text>
                <TouchableOpacity
                  style={[
                    styles.categoryPicker,
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
                        style={[styles.categoryDot, { backgroundColor: selectedCategory.colorCode }]}
                      />
                      <Text
                        style={[styles.categoryPickerText, { color: paperTheme.colors.onSurface }]}
                      >
                        {selectedCategory.name}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.categoryPickerText,
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
                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Amount (Rs.)
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
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
                  label="Expense date"
                  value={expenseDate}
                  onChange={setExpenseDate}
                  placeholder="Today"
                  maximumDate={new Date()}
                  paperTheme={paperTheme}
                />
                <Text style={[styles.toggleSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Defaults to today. Tap to pick another date, or clear to use today on save.
                </Text>
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleTitle, { color: paperTheme.colors.onSurface }]}>
                    Is product?
                  </Text>
                  <Text style={[styles.toggleSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Enable to track quantity for inventory-style purchases.
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
                  <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Quantity
                  </Text>
                  <TextInput
                    value={qty}
                    onChangeText={setQty}
                    placeholder="Enter quantity"
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
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

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outlineVariant,
                },
                costCardShadow(resolvedTheme),
              ]}
            >
              <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
                Proof image (optional)
              </Text>
              <Text style={[styles.toggleSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                Attach a receipt or photo as expense proof.
              </Text>

              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => {
                      setImageUri(null);
                      setImageMimeType(null);
                      setImageFileName(null);
                    }}
                    style={[styles.imageBtn, { borderColor: paperTheme.colors.outlineVariant }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                    <Text style={[styles.imageBtnText, { color: paperTheme.colors.error }]}>
                      Remove image
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={[
                      styles.imageBtn,
                      {
                        backgroundColor: paperTheme.colors.primaryContainer,
                        borderColor: `${paperTheme.colors.primary}33`,
                      },
                    ]}
                  >
                    <Ionicons name="camera-outline" size={18} color={paperTheme.colors.primary} />
                    <Text style={[styles.imageBtnText, { color: paperTheme.colors.primary }]}>
                      Camera
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickFromGallery}
                    style={[
                      styles.imageBtn,
                      {
                        backgroundColor: paperTheme.colors.surfaceVariant,
                        borderColor: paperTheme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <Ionicons name="images-outline" size={18} color={paperTheme.colors.onSurface} />
                    <Text style={[styles.imageBtnText, { color: paperTheme.colors.onSurface }]}>
                      Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: canSave
                    ? paperTheme.colors.primary
                    : paperTheme.colors.surfaceVariant,
                  opacity: saving ? 0.7 : 1,
                },
                costCardShadow(resolvedTheme),
              ]}
              onPress={handleSave}
              disabled={!canSave || saving}
              activeOpacity={0.92}
            >
              {saving ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={canSave ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.saveBtnText,
                      {
                        color: canSave
                          ? paperTheme.colors.onPrimary
                          : paperTheme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Save expense
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

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
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalVisible(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: paperTheme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
            <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>
              Select category
            </Text>

            {categoriesLoading && categories.length === 0 ? (
              <ActivityIndicator color={paperTheme.colors.primary} style={{ marginVertical: 24 }} />
            ) : categories.length === 0 ? (
              <View style={styles.emptyCategories}>
                <Ionicons
                  name="folder-open-outline"
                  size={36}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Text
                  style={[styles.emptyCategoriesText, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  No categories yet. Create a category first, then add expenses.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCategoryModalVisible(false);
                    navigation.navigate('ManageCostCategories');
                  }}
                  style={{
                    marginTop: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: paperTheme.colors.primary,
                  }}
                >
                  <Text style={{ fontFamily: fonts.PoppinsSemiBold, color: paperTheme.colors.onPrimary }}>
                    Add category
                  </Text>
                </TouchableOpacity>
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
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        </Portal>
      ) : null}
    </>
  );
}
