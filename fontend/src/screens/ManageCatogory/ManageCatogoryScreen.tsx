import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { AppDispatch, RootState } from '../../store/store';
import { deleteCategory_Service, fetchCategories_Service } from '../../services/CategoryService';
import { Category } from '../../type/category';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { devLog } from '../../utils/devLog';
import CommonAlert from '../../components/CommonAlert/CommonAlert';

/** RTK unwrap() rejects with rejectWithValue payload ({ message }), not always Error. */
function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ManageCatogory'>;

export default function ManageCatogoryScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, loading, error } = useSelector(
    (state: RootState) => state.CategoryReducer.list,
  );
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCategories_Service()).unwrap();
    } catch (error: any) {
      devLog('Load categories error:', error);
      show_Alert('error', 'Error', error.message, 1, true, 'OK');
    }
  }, [dispatch, show_Alert]);

  const confirmDeleteCategory = useCallback(
    (item: Category) => {
      const closeSwipe = () => swipeableRefs.current.get(item._id)?.close();

      show_Alert(
        'error',
        'Delete category?',
        `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
        2,
        false,
        'Delete',
        async () => {
          try {
            await dispatch(deleteCategory_Service(item._id)).unwrap();
            swipeableRefs.current.get(item._id)?.close();
            await loadCategories();
          } catch (err: unknown) {
            show_Alert('error', 'Error', thunkErrorMessage(err, 'Could not delete category'), 1, true, 'OK');
          }
        },
        'Cancel',
        closeSwipe,
      );
    },
    [dispatch, show_Alert, loadCategories],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally { 
      setRefreshing(false);
    }
  }, [loadCategories]);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: paperTheme.colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={paperTheme.colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
              Manage Catogory
            </Text>
            <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              Add, edit, and organize POS categories
            </Text>
          </View>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{error}</Text>
        ) : null}

        {loading && !refreshing && categories.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={categories}
            keyExtractor={(item: Category) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={paperTheme.colors.primary}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              categories.length === 0 && styles.listEmptyGrow,
            ]}
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  No categories yet. Add one below.
                </Text>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <Swipeable
                ref={(ref) => {
                  if (ref) swipeableRefs.current.set(item._id, ref);
                  else swipeableRefs.current.delete(item._id);
                }}
                friction={2}
                overshootRight={false}
                renderRightActions={() => (
                  <View style={styles.swipeDeleteWrap}>
                    <TouchableOpacity
                      style={styles.swipeDeleteBtn}
                      activeOpacity={0.85}
                      onPress={() => confirmDeleteCategory(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                      <Text style={styles.swipeDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              >
                <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
                  <View style={[styles.dot, { backgroundColor: item.colorCode }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.name}`}
                    onPress={() => navigation.navigate('CreateCatogory', { category: item })}
                  >
                    <Ionicons name="create-outline" size={18} color={paperTheme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </Swipeable>
            )}
          />
        )}

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: paperTheme.colors.primary }]}
          onPress={() => navigation.navigate('CreateCatogory', {})}
        >
          <Ionicons name="add" size={20} color={paperTheme.colors.onPrimary} />
          <Text style={[styles.addBtnText, { color: paperTheme.colors.onPrimary }]}>
            Add New Catogory
          </Text>
        </TouchableOpacity>


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
  safe: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  listContent: { paddingBottom: 20, flexGrow: 1 },
  listEmptyGrow: { justifyContent: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  errorText: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginBottom: 8 },
  emptyText: { fontFamily: fonts.PoppinsRegular, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontFamily: fonts.PoppinsBold },
  subtitle: { fontSize: 13, fontFamily: fonts.PoppinsRegular, marginTop: 2 },
  swipeDeleteWrap: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 0,
  },
  swipeDeleteBtn: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 4,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  card: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  cardTitle: { fontSize: 16, fontFamily: fonts.PoppinsSemiBold },
  cardMeta: { fontSize: 13, fontFamily: fonts.PoppinsRegular },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
});
