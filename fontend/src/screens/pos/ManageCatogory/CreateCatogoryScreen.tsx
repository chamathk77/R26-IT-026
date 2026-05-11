import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { AppDispatch, RootState } from '../../../store/store';
import { createCategory_Service, updateCategory_Service } from '../../../services/CategoryService';
import { devLog } from '../../../utils/devLog';
import { Category } from '../../../type/category';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import CommonAlert from '../../../components/CommonAlert';

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

export default function CreateCatogoryScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const categoryParam = route.params?.category;
  const isEdit = Boolean(categoryParam?._id);

  const createLoading = useSelector((state: RootState) => state.CategoryReducer.create.loading);
  const updateLoading = useSelector((state: RootState) => state.CategoryReducer.update.loading);
  const saving = isEdit ? updateLoading : createLoading;

  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  /** Baseline for edit mode — save enabled only when user changes something */
  const [initialSnapshot, setInitialSnapshot] = useState<{
    n: string;
    d: string;
    c: string;
  } | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const cat = route.params?.category;
    if (cat?._id) {
      const color = resolveColorFromCategory(cat);
      setName(cat.name ?? '');
      setDescription(cat.description ?? '');
      setSelectedColor(color);
      setInitialSnapshot({
        n: (cat.name ?? '').trim(),
        d: (cat.description ?? '').trim(),
        c: color.trim().toUpperCase(),
      });
    } else {
      setName('');
      setDescription('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setInitialSnapshot(null);
    }
  }, [route.params?.category]);

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
    if (isEdit) return isDirty;
    return true;
  }, [name, description, isEdit, isDirty]);

  const onSave = async () => {
    if (!canSave || saving) return;
    const body = {
      name: name.trim(),
      description: description.trim(),
      colorCode: selectedColor.trim().toUpperCase(),
    };
    try {
      if (isEdit && categoryParam?._id) {
        await dispatch(
          updateCategory_Service({
            id: categoryParam._id,
            ...body,
          }),
        ).unwrap();
        devLog('Update category saved');
      } else {
        const response: unknown = await dispatch(createCategory_Service(body)).unwrap();
        devLog('Create category response:', response);
      }
      navigation.goBack();
    } catch (err: unknown) {
      devLog('Create category error:', err);
      show_Alert('error', 'Error', 'Could not save category', 1, true, 'OK');
    }
  };

  const headerTitle = isEdit ? 'Edit Catogory' : 'Create Catogory';
  const saveLabel = isEdit ? 'Save changes' : 'Save Catogory';

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />


      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}>
      <CommonHeader
            title={headerTitle}
            titleColor={paperTheme.colors.onBackground}
            iconColor={paperTheme.colors.onBackground}
            onPressLeftBtn={() => navigation.goBack()}
          />
      
      
        <View style={{
          flex: 1,
          paddingHorizontal: 16, paddingTop: 8
        }}>
   

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'flex-end',
              }}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                Category Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Beverages"
                placeholderTextColor={paperTheme.colors.outline}
                style={[
                  styles.input,
                  { backgroundColor: paperTheme.colors.surface, color: paperTheme.colors.onSurface },
                ]}
              />

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Short description for this category"
                placeholderTextColor={paperTheme.colors.outline}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: paperTheme.colors.surface, color: paperTheme.colors.onSurface },
                ]}
              />

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                Pick a Color
              </Text>
              <View style={styles.colorsRow}>
                {COLOR_OPTIONS.map((color) => {
                  const active = selectedColor.toUpperCase() === color.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color, borderColor: active ? '#111' : 'transparent' },
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {active ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.previewCard, { backgroundColor: paperTheme.colors.surface }]}>
                <View style={[styles.previewDot, { backgroundColor: selectedColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewTitle, { color: paperTheme.colors.onSurface }]}>
                    {name.trim() || 'Category name preview'}
                  </Text>
                  <Text style={[styles.previewDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {description.trim() || 'Description preview will appear here.'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                disabled={!canSave || saving}
                onPress={onSave}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      canSave && !saving ? paperTheme.colors.primary : paperTheme.colors.outline,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                    {saveLabel}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
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
  safe: { flex: 1, },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontFamily: fonts.PoppinsBold },
  label: { fontSize: 13, fontFamily: fonts.PoppinsMedium, marginBottom: 8, marginTop: 8 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  textArea: { minHeight: 96 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 8 },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  previewCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  previewDot: { width: 14, height: 14, borderRadius: 7 },
  previewTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
  previewDesc: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginTop: 2 },
  saveBtn: {
    marginTop: 'auto',
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
});
