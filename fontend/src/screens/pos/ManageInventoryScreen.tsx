import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCategories_Service } from '../../services/CategoryService';
import { Category } from '../../type/category';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { devLog } from '../../utils/devLog';
import CommonAlert from '../../components/CommonAlert/CommonAlert';

type DummyInventoryItem = {
  id: string;
  name: string;
  categoryId: string;
  sku: string;
  stock: number;
  unitPrice: number;
};

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

/** Placeholder stock items per real category (replace with API later). */
function buildDummyProductsForCategories(categories: Category[]): DummyInventoryItem[] {
  if (categories.length === 0) return [];

  const items: DummyInventoryItem[] = [];
  categories.forEach((cat, index) => {
    const n = index + 1;
    items.push(
      {
        id: `${cat._id}-dummy-1`,
        name: `${cat.name} — Demo SKU A`,
        categoryId: cat._id,
        sku: `D-${n.toString().padStart(3, '0')}-A`,
        stock: 12 + index * 3,
        unitPrice: 9.99 + index,
      },
      {
        id: `${cat._id}-dummy-2`,
        name: `${cat.name} — Demo SKU B`,
        categoryId: cat._id,
        sku: `D-${n.toString().padStart(3, '0')}-B`,
        stock: 8 + index * 2,
        unitPrice: 14.5 + index * 0.5,
      },
      {
        id: `${cat._id}-dummy-3`,
        name: `${cat.name} — Demo SKU C`,
        categoryId: cat._id,
        sku: `D-${n.toString().padStart(3, '0')}-C`,
        stock: 24 - index,
        unitPrice: 4.25 + index,
      },
    );
  });
  return items;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ManageInventory'>;

export default function ManageInventoryScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, loading, error } = useSelector(
    (state: RootState) => state.CategoryReducer.list,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const dummyProducts = useMemo(
    () => buildDummyProductsForCategories(categories),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    let list = dummyProducts;
    if (selectedCategoryId !== null) {
      list = list.filter((p) => p.categoryId === selectedCategoryId);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const cat = categories.find((c) => c._id === p.categoryId);
        const catName = cat?.name.toLowerCase() ?? '';
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          catName.includes(q)
        );
      });
    }
    return list;
  }, [dummyProducts, selectedCategoryId, searchQuery, categories]);

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCategories_Service()).unwrap();
    } catch (err: unknown) {
      devLog('Manage inventory load categories:', err);
      show_Alert('error', 'Error', thunkErrorMessage(err, 'Failed to load categories'), 1, true, 'OK');
    }
  }, [dispatch, show_Alert]);

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

  const isAllSelected = selectedCategoryId === null;

  const renderProductRow = ({ item }: { item: DummyInventoryItem }) => {
    const cat = categories.find((c) => c._id === item.categoryId);
    return (
      <View style={[styles.productRow, { backgroundColor: paperTheme.colors.surface }]}>
        <View style={[styles.productDot, { backgroundColor: cat?.colorCode ?? paperTheme.colors.outline }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.productName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {item.sku}
            {cat ? ` · ${cat.name}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}
          onPress={() =>
            navigation.navigate('EditProduct', {
              id: item.id,
              name: item.name,
              categoryId: item.categoryId,
              sku: item.sku,
              stock: item.stock,
              unitPrice: item.unitPrice,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Ionicons name="create-outline" size={20} color={paperTheme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.productRight}>
          <Text style={[styles.stockLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Stock</Text>
          <Text style={[styles.stockValue, { color: paperTheme.colors.onSurface }]}>{item.stock}</Text>
          <Text style={[styles.price, { color: paperTheme.colors.primary }]}>
            ${item.unitPrice.toFixed(2)}
          </Text>
        </View>
      </View>
    );
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
            style={[styles.backBtn, { backgroundColor: paperTheme.colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={paperTheme.colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Manage Inventory</Text>
            <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              Dummy stock per category — tap a category to filter
            </Text>
          </View>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.addProductBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
          onPress={() => navigation.navigate('AddProduct')}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle-outline" size={22} color={paperTheme.colors.onSecondaryContainer} />
          <Text style={[styles.addProductBtnText, { color: paperTheme.colors.onSecondaryContainer }]}>
            Add new product
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Categories</Text>

        {loading && !refreshing && categories.length === 0 ? (
          <View style={styles.categoriesLoading}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <View style={styles.chipsOuter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              bounces={false}
            >
            <TouchableOpacity
              onPress={() => setSelectedCategoryId(null)}
              style={[
                styles.chip,
                styles.chipTouchable,
                {
                  backgroundColor: isAllSelected ? paperTheme.colors.primary : paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outline,
                },
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={isAllSelected ? paperTheme.colors.onPrimary : paperTheme.colors.primary}
              />
              <Text
                style={[
                  styles.chipName,
                  { color: isAllSelected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface },
                ]}
                numberOfLines={1}
              >
                All products
              </Text>
            </TouchableOpacity>

            {categories.length === 0 && !loading ? (
              <Text style={[styles.emptyCategories, { color: paperTheme.colors.onSurfaceVariant }]}>
                No categories yet.
              </Text>
            ) : (
              categories.map((item) => {
                const selected = selectedCategoryId === item._id;
                return (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => setSelectedCategoryId(item._id)}
                    style={[
                      styles.chip,
                      styles.chipTouchable,
                      {
                        backgroundColor: selected ? paperTheme.colors.primary : paperTheme.colors.surface,
                        borderColor: paperTheme.colors.outline,
                      },
                    ]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: item.colorCode }]} />
                    <Text
                      style={[
                        styles.chipName,
                        {
                          color: selected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outline },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, SKU, or category…"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.listHeader, { color: paperTheme.colors.onSurfaceVariant }]}>
          {isAllSelected ? 'All dummy items' : 'This category only'} · {filteredProducts.length} shown
        </Text>

        <FlatList
          style={styles.productList}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={paperTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="cube-outline" size={40} color={paperTheme.colors.outline} />
              <Text style={[styles.emptyListTitle, { color: paperTheme.colors.onSurface }]}>
                No items match
              </Text>
              <Text style={[styles.emptyListBody, { color: paperTheme.colors.onSurfaceVariant }]}>
                {categories.length === 0
                  ? 'Add categories first, then dummy rows will appear per category.'
                  : 'Try another category or clear the search.'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />

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
  safe: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontFamily: fonts.PoppinsBold },
  subtitle: { fontSize: 13, fontFamily: fonts.PoppinsRegular, marginTop: 2 },
  errorText: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginBottom: 8 },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addProductBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesLoading: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 6 },
  /** Horizontal ScrollView can grow vertically in flex layouts; cap height to chip row. */
  chipsOuter: { maxHeight: 52, marginBottom: 8 },
  chipsRow: { gap: 10, paddingBottom: 0, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    maxWidth: 220,
    borderWidth: 1,
  },
  chipTouchable: { alignSelf: 'flex-start' },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 14, flexShrink: 1 },
  emptyCategories: { fontFamily: fonts.PoppinsRegular, fontSize: 14, paddingVertical: 8, alignSelf: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 0,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  listHeader: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 8,
  },
  productList: { flex: 1 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDot: { width: 12, height: 12, borderRadius: 6 },
  productName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
  productMeta: { fontFamily: fonts.PoppinsRegular, fontSize: 12, marginTop: 2 },
  productRight: { alignItems: 'flex-end', minWidth: 64 },
  stockLabel: { fontSize: 10, fontFamily: fonts.PoppinsRegular },
  stockValue: { fontSize: 16, fontFamily: fonts.PoppinsBold },
  price: { fontSize: 13, fontFamily: fonts.PoppinsSemiBold, marginTop: 4 },
  emptyList: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyListTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16, marginTop: 12 },
  emptyListBody: { fontFamily: fonts.PoppinsRegular, fontSize: 14, textAlign: 'center', marginTop: 6 },
});
