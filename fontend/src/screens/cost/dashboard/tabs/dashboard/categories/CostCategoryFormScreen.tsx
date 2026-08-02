import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
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
import { Portal } from 'react-native-paper';
import { RootStackParamList } from '../../../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../../../store/store';
import CommonHeader from '../../../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../../../hooks/useCommonAlert';
import {
  createCostCategory_Service,
  fetchCostCategoryById_Service,
  updateCostCategory_Service,
} from '../../../../../../services/CostCategoryService';
import { CostCategory } from '../../../../../../type/costCategory';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../../utils/apiErrorAlert';
import { costCardShadow } from '../../../shared/costDashboardStyles';
import { CostCategoryFormSkeleton } from '../../../shared/costSkeletonComponents';
import { COLOR_OPTIONS, costCategoryStyles as styles } from './costCategoryStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'CostCategoryForm'>;

function resolveColor(colorCode: string): string {
  const normalized = colorCode.trim().toUpperCase();
  const match = COLOR_OPTIONS.find((c) => c.toUpperCase() === normalized);
  return match ?? (normalized.startsWith('#') ? normalized : COLOR_OPTIONS[0]);
}

function applyCategoryToForm(
  category: CostCategory,
  setName: (v: string) => void,
  setSelectedColor: (v: string) => void,
  setInitialSnapshot: (v: { n: string; c: string }) => void,
) {
  const color = resolveColor(category.colorCode);
  setName(category.name ?? '');
  setSelectedColor(color);
  setInitialSnapshot({
    n: (category.name ?? '').trim(),
    c: color.trim().toUpperCase(),
  });
}

export default function CostCategoryFormScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const categoryId = route.params?.categoryId;
  const isEdit = Boolean(categoryId);

  const createLoading = useSelector(
    (state: RootState) => state.CostCategoryReducer?.create?.loading ?? false,
  );
  const updateLoading = useSelector(
    (state: RootState) => state.CostCategoryReducer?.update?.loading ?? false,
  );
  const saving = isEdit ? updateLoading : createLoading;

  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<{ n: string; c: string } | null>(null);

  const loadCategoryDetail = useCallback(async () => {
    if (!categoryId) return;

    setLoadingDetail(true);
    setDetailError(null);
    try {
      const result = await dispatch(fetchCostCategoryById_Service(categoryId)).unwrap();
      applyCategoryToForm(result.data, setName, setSelectedColor, setInitialSnapshot);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      const message = getApiErrorMessage(error, 'Could not load category details.');
      setDetailError(message);
      setTimeout(() => {
        show_Alert('error', 'Load failed', message, 1, false, 'OK', () => navigation.goBack());
      }, 150);
    } finally {
      setLoadingDetail(false);
    }
  }, [categoryId, dispatch, navigation, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      if (categoryId) {
        void loadCategoryDetail();
        return;
      }

      setName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setInitialSnapshot(null);
      setDetailError(null);
    }, [categoryId, loadCategoryDetail]),
  );

  const isDirty = useMemo(() => {
    if (!isEdit || !initialSnapshot) return true;
    return (
      name.trim() !== initialSnapshot.n ||
      selectedColor.trim().toUpperCase() !== initialSnapshot.c
    );
  }, [isEdit, initialSnapshot, name, selectedColor]);

  const canSave = useMemo(() => {
    if (name.trim().length === 0) return false;
    if (isEdit) return isDirty && !loadingDetail;
    return true;
  }, [name, isEdit, isDirty, loadingDetail]);

  const onSave = async () => {
    if (!canSave || saving) return;

    const body = {
      name: name.trim(),
      colorCode: selectedColor.trim().toUpperCase(),
    };

    try {
      if (isEdit && categoryId) {
        await dispatch(
          updateCostCategory_Service({
            id: categoryId,
            ...body,
          }),
        ).unwrap();

        show_Alert(
          'success',
          'Category updated',
          'Your changes were saved successfully.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
        return;
      }

      await dispatch(createCostCategory_Service(body)).unwrap();

      show_Alert(
        'success',
        'Category created',
        'The new cost category was saved successfully.',
        1,
        false,
        'OK',
        () => navigation.goBack(),
      );
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Save failed',
        getApiErrorMessage(error, 'Could not save category. Please try again.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paperTheme.colors.background }}
        edges={['top']}
      >
        <CommonHeader
          title={isEdit ? 'Edit category' : 'New category'}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {loadingDetail ? (
          <CostCategoryFormSkeleton
            boneColor={paperTheme.colors.surfaceVariant}
            cardColor={paperTheme.colors.surface}
            borderColor={paperTheme.colors.outlineVariant}
          />
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              contentContainerStyle={[styles.formScroll, { paddingHorizontal: 16 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {detailError ? (
                <View
                  style={[styles.errorBanner, { backgroundColor: paperTheme.colors.errorContainer }]}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={paperTheme.colors.error} />
                  <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>
                    {detailError}
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  costCardShadow(resolvedTheme),
                ]}
              >
                <View style={[styles.colorSwatch, { backgroundColor: selectedColor }]}>
                  <Ionicons name="folder" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                    {name.trim() || 'Category name'}
                  </Text>
                  <Text style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {selectedColor.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.formSection,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  costCardShadow(resolvedTheme),
                ]}
              >
                <View style={styles.formSectionHeader}>
                  <View
                    style={[
                      styles.formSectionIcon,
                      { backgroundColor: paperTheme.colors.primaryContainer },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={paperTheme.colors.primary}
                    />
                  </View>
                  <Text style={[styles.formSectionTitle, { color: paperTheme.colors.onSurface }]}>
                    Category details
                  </Text>
                </View>

                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Category name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Utilities, Rent, Supplies"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  editable={!loadingDetail}
                  style={[
                    styles.fieldInput,
                    {
                      backgroundColor: paperTheme.colors.background,
                      borderColor: paperTheme.colors.outlineVariant,
                      color: paperTheme.colors.onSurface,
                    },
                  ]}
                />

                <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Color
                </Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((color) => {
                    const selected = selectedColor.toUpperCase() === color.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() => setSelectedColor(color)}
                        style={[
                          styles.colorOption,
                          {
                            backgroundColor: color,
                            borderWidth: selected ? 3 : 0,
                            borderColor: paperTheme.colors.onBackground,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select color ${color}`}
                      >
                        {selected ? (
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
                onPress={onSave}
                disabled={!canSave || saving}
                activeOpacity={0.92}
              >
                {saving ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name={isEdit ? 'save-outline' : 'add-circle-outline'}
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
                      {isEdit ? 'Save changes' : 'Create category'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

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
