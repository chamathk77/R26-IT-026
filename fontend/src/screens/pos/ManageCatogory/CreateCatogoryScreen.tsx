import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import {
  createCategory_Service,
  fetchCategoryById_Service,
  updateCategory_Service,
} from '../../../services/CategoryService';
import { Category } from '../../../type/category';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { inventoryUi, softShadow } from '../ManageInventory/inventoryUiStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCatogory'>;

const COLOR_OPTIONS = [
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F97316',
  '#22C55E',
  '#0EA5E9',
  '#A855F7',
  '#E11D48',
  '#84CC16',
  '#06B6D4',
];

function resolveColorFromCategory(cat: Category): string {
  const fromDb = (cat.colorCode || '').trim().toUpperCase();
  const match = COLOR_OPTIONS.find((c) => c.toUpperCase() === fromDb);
  return match ?? cat.colorCode ?? COLOR_OPTIONS[0];
}

function applyCategoryToForm(
  cat: Category,
  setName: (v: string) => void,
  setDescription: (v: string) => void,
  setSelectedColor: (v: string) => void,
  setInitialSnapshot: (v: { n: string; d: string; c: string }) => void,
) {
  const color = resolveColorFromCategory(cat);
  setName(cat.name ?? '');
  setDescription(cat.description ?? '');
  setSelectedColor(color);
  setInitialSnapshot({
    n: (cat.name ?? '').trim(),
    d: (cat.description ?? '').trim(),
    c: color.trim().toUpperCase(),
  });
}

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

export default function CreateCatogoryScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const categoryId = route.params?.category?._id ?? route.params?.categoryId;
  const isEdit = Boolean(categoryId);

  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const createLoading = useSelector((state: RootState) => state.CategoryReducer.create.loading);
  const updateLoading = useSelector((state: RootState) => state.CategoryReducer.update.loading);
  const saving = isEdit ? updateLoading : createLoading;

  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<{
    n: string;
    d: string;
    c: string;
  } | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const loadCategoryDetail = useCallback(async () => {
    if (!categoryId) return;

    if (!shopId) {
      setTimeout(() => {
        show_Alert(
          'error',
          'Error',
          'Shop not found. Please log in again.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
      }, 150);
      return;
    }

    setLoadingDetail(true);
    setDetailError(null);

    try {
      const response = await dispatch(fetchCategoryById_Service(categoryId)).unwrap();
      applyCategoryToForm(
        response.data,
        setName,
        setDescription,
        setSelectedColor,
        setInitialSnapshot,
      );
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      const message = getApiErrorMessage(error, 'Could not load category. Please try again.');
      setDetailError(message);

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          message,
          2,
          false,
          'Retry',
          () => {
            void loadCategoryDetail();
          },
          'Go back',
          () => navigation.goBack(),
        );
      }, 150);
    } finally {
      setLoadingDetail(false);
    }
  }, [categoryId, dispatch, navigation, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      if (categoryId) {
        void loadCategoryDetail();
        return;
      }

      setName('');
      setDescription('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setInitialSnapshot(null);
      setDetailError(null);
    }, [categoryId, loadCategoryDetail]),
  );

  const isDirty = useMemo(() => {
    if (!isEdit || !initialSnapshot) return true;
    return (
      name.trim() !== initialSnapshot.n ||
      description.trim() !== initialSnapshot.d ||
      selectedColor.trim().toUpperCase() !== initialSnapshot.c
    );
  }, [isEdit, initialSnapshot, name, description, selectedColor]);

  const canSave = useMemo(() => {
    const valid = name.trim().length > 0 && description.trim().length > 0;
    if (!valid) return false;
    if (isEdit) return isDirty && !loadingDetail;
    return true;
  }, [name, description, isEdit, isDirty, loadingDetail]);

  const onSave = async () => {
    if (!canSave || saving) return;

    const body = {
      name: name.trim(),
      description: description.trim(),
      colorCode: selectedColor.trim().toUpperCase(),
    };

    try {
      if (isEdit && categoryId) {
        await dispatch(
          updateCategory_Service({
            id: categoryId,
            ...body,
          }),
        ).unwrap();

        setTimeout(() => {
          show_Alert(
            'success',
            'Category updated',
            'Your changes were saved successfully.',
            1,
            false,
            'OK',
            () => navigation.goBack(),
          );
        }, 150);
        return;
      }

      await dispatch(createCategory_Service(body)).unwrap();

      setTimeout(() => {
        show_Alert(
          'success',
          'Category created',
          'The new category was saved successfully.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
      }, 150);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Save failed',
          getApiErrorMessage(error, 'Could not save category. Please try again.'),
          1,
          false,
          'OK',
          () => {},
        );
      }, 150);
    }
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />

      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
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
                {isEdit ? 'Edit category' : 'New category'}
              </Text>
              <View style={[styles.modeBadge, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                <Text style={[styles.modeBadgeText, { color: paperTheme.colors.primary }]}>
                  {isEdit ? 'Update' : 'Create'}
                </Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              Name, description, and a color for POS grouping
            </Text>
          </View>
        </View>

        {loadingDetail ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading category...
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {detailError ? (
                <View style={[styles.errorBanner, { backgroundColor: paperTheme.colors.errorContainer }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={paperTheme.colors.error} />
                  <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{detailError}</Text>
                </View>
              ) : null}

              <FormSection title="Category details" icon="document-text-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
                <Text style={[inventoryUi.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Category name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Beverages"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  editable={!loadingDetail}
                  style={[
                    inventoryUi.fieldInput,
                    {
                      backgroundColor: paperTheme.colors.background,
                      borderColor: paperTheme.colors.outlineVariant,
                      color: paperTheme.colors.onSurface,
                    },
                  ]}
                />

                <Text style={[inventoryUi.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Short description for staff and reports"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loadingDetail}
                  style={[
                    inventoryUi.fieldInput,
                    inventoryUi.fieldInputLast,
                    styles.textArea,
                    {
                      backgroundColor: paperTheme.colors.background,
                      borderColor: paperTheme.colors.outlineVariant,
                      color: paperTheme.colors.onSurface,
                    },
                  ]}
                />
              </FormSection>

              <FormSection title="Brand color" icon="color-palette-outline" paperTheme={paperTheme} resolvedTheme={resolvedTheme}>
                <Text style={[inventoryUi.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Pick a color
                </Text>
                <View style={styles.colorsGrid}>
                  {COLOR_OPTIONS.map((color) => {
                    const active = selectedColor.toUpperCase() === color.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircleOuter,
                          active && { borderColor: paperTheme.colors.primary },
                        ]}
                        onPress={() => setSelectedColor(color)}
                        disabled={loadingDetail}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.colorCircle, { backgroundColor: color }]}>
                          {active ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: paperTheme.colors.background,
                      borderColor: paperTheme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={[styles.previewAccent, { backgroundColor: selectedColor }]} />
                  <View style={[styles.previewSwatch, { backgroundColor: selectedColor }]}>
                    <Ionicons name="pricetag" size={20} color="#fff" />
                  </View>
                  <View style={styles.previewBody}>
                    <Text style={[styles.previewTitle, { color: paperTheme.colors.onSurface }]}>
                      {name.trim() || 'Category name preview'}
                    </Text>
                    <Text style={[styles.previewDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {description.trim() || 'Description preview will appear here.'}
                    </Text>
                    <Text style={[styles.previewColorCode, { color: paperTheme.colors.primary }]}>
                      {selectedColor.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </FormSection>

              <TouchableOpacity
                disabled={!canSave || saving}
                onPress={onSave}
                activeOpacity={0.9}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      canSave && !saving ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
                  },
                  canSave && !saving && softShadow(resolvedTheme),
                  saving && styles.btnDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color={paperTheme.colors.onPrimary} />
                    <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                      {isEdit ? 'Save changes' : 'Save category'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

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

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontFamily: fonts.PoppinsRegular, fontSize: 14 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontFamily: fonts.PoppinsRegular, fontSize: 13, flex: 1 },
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
  textArea: { minHeight: 100 },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorCircleOuter: {
    padding: 3,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  previewSwatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  previewBody: {
    flex: 1,
    minWidth: 0,
  },
  previewTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
  previewDesc: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginTop: 2, lineHeight: 18 },
  previewColorCode: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.4,
  },
  saveBtn: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16 },
  btnDisabled: { opacity: 0.75 },
});
