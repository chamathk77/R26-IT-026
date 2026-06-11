import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { fetchCategories_Service } from '../../../services/CategoryService';
import { deleteProduct_Service, fetchProducts_Service } from '../../../services/ProductService';
import { Category } from '../../../type/category';
import { getProductCategoryId, Product } from '../../../type/product';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../utils/apiErrorAlert';
import { resolveProductImageUri } from '../../../utils/productImage';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../settings/shared/settingsDetailStyles';
import { SettingsEmptyState } from '../../settings/shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageInventory'>;

type CategoryFilter = 'all' | string;

const ALL_CATEGORY_OPTION = { key: 'all' as const, label: 'All' };

function formatAmount(amount: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function getCategoryColor(categories: Category[], product: Product): string {
  const categoryId = getProductCategoryId(product);
  return categories.find((c) => c._id === categoryId)?.colorCode ?? '#64748b';
}

function FilterChipRow({
  options,
  selected,
  onSelect,
  paperTheme,
}: {
  options: { key: CategoryFilter; label: string; colorCode?: string }[];
  selected: CategoryFilter;
  onSelect: (value: CategoryFilter) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={inventoryStyles.filterRow}
    >
      {options.map((option) => {
        const isActive = selected === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[
              inventoryStyles.filterChip,
              {
                backgroundColor: isActive ? paperTheme.colors.primary : paperTheme.colors.surface,
                borderColor: isActive ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
              },
            ]}
          >
            {option.colorCode ? (
              <View style={[inventoryStyles.filterDot, { backgroundColor: option.colorCode }]} />
            ) : null}
            <Text
              style={[
                inventoryStyles.filterChipText,
                { color: isActive ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function ProductCard({
  product,
  categories,
  paperTheme,
  resolvedTheme,
  onEdit,
  onDelete,
  swipeableRef,
}: {
  product: Product;
  categories: Category[];
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  onEdit: () => void;
  onDelete: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
}) {
  const imageUri = resolveProductImageUri(product.image);
  const categoryColor = getCategoryColor(categories, product);

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={inventoryStyles.swipeDeleteWrap}>
          <TouchableOpacity style={inventoryStyles.swipeDeleteBtn} onPress={onDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onEdit}
        style={[
          inventoryStyles.productCard,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          cardShadow(resolvedTheme),
        ]}
      >
        <View style={[inventoryStyles.categoryAccent, { backgroundColor: categoryColor }]} />

        <View style={inventoryStyles.productRow}>
          <View style={inventoryStyles.thumbWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={inventoryStyles.thumb} resizeMode="cover" />
            ) : (
              <View
                style={[
                  inventoryStyles.thumbPlaceholder,
                  { backgroundColor: paperTheme.colors.surfaceVariant },
                ]}
              >
                <Ionicons name="cube-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </View>
            )}
          </View>

          <View style={inventoryStyles.productBody}>
            <Text
              style={[inventoryStyles.productName, { color: paperTheme.colors.onSurface }]}
              numberOfLines={1}
            >
              {product.productName}
            </Text>
            <Text
              style={[inventoryStyles.categoryLabel, { color: paperTheme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {product.categoryName}
            </Text>
            <View style={inventoryStyles.metaChipRow}>
              <View
                style={[
                  inventoryStyles.metaChip,
                  { backgroundColor: paperTheme.colors.surfaceVariant },
                ]}
              >
                <Text style={[inventoryStyles.metaChipText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {product.type === 'service' ? 'Service' : 'Product'}
                </Text>
              </View>
              {product.isInventoryAvailable ? (
                <View style={[inventoryStyles.metaChip, inventoryStyles.qtyChip]}>
                  <Text style={inventoryStyles.qtyChipText}>Qty {product.qty ?? 0}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={inventoryStyles.priceColumn}>
            <Text style={[inventoryStyles.amountText, { color: paperTheme.colors.primary }]}>
              {formatAmount(product.amount)}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.onSurfaceVariant} />
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function ManageInventoryScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const { items: categories, loading: categoriesLoading } = useSelector(
    (state: RootState) => state.CategoryReducer.list,
  );
  const { items: products, loading: productsLoading, count: productCount } = useSelector(
    (state: RootState) => state.ProductReducer.list,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loading = categoriesLoading || productsLoading;

  const categoryFilterOptions = useMemo(
    () => [
      ALL_CATEGORY_OPTION,
      ...categories.map((category) => ({
        key: category._id,
        label: category.name,
        colorCode: category.colorCode,
      })),
    ],
    [categories],
  );

  const filteredProducts = useMemo(() => {
    let list = products;

    if (categoryFilter !== 'all') {
      list = list.filter((product) => getProductCategoryId(product) === categoryFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((product) => {
        const categoryName = product.categoryName.toLowerCase();
        return (
          product.productName.toLowerCase().includes(query) ||
          categoryName.includes(query) ||
          (product.barcode?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    return list;
  }, [products, categoryFilter, searchQuery]);

  const loadInventory = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCategories_Service()).unwrap(),
        dispatch(fetchProducts_Service()).unwrap(),
      ]);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: string }).message)
            : 'Could not load inventory. Please try again.';
        show_Alert(
          'error',
          'Load failed',
          message,
          2,
          false,
          'Retry',
          () => {
            void loadInventory();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadInventory();
    }, [loadInventory]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInventory();
    } finally {
      setRefreshing(false);
    }
  }, [loadInventory]);

  const confirmDeleteProduct = useCallback(
    (item: Product) => {
      const closeSwipe = () => swipeableRefs.current.get(item._id)?.close();

      show_Alert(
        'error',
        'Delete product?',
        `Are you sure you want to delete "${item.productName}"? This cannot be undone.`,
        2,
        false,
        'Yes',
        async () => {
          try {
            await dispatch(deleteProduct_Service(item._id)).unwrap();
            swipeableRefs.current.get(item._id)?.close();
            await loadInventory();
          } catch (error: unknown) {
            const handled = await handleSessionExpiredApiError(error, show_Alert);
            if (handled) return;
            const message =
              error && typeof error === 'object' && 'message' in error
                ? String((error as { message?: string }).message)
                : 'Could not delete product';
            show_Alert('error', 'Error', message, 1, true, 'OK');
          }
        },
        'Cancel',
        closeSwipe,
      );
    },
    [dispatch, show_Alert, loadInventory],
  );

  const renderListHeader = () => (
    <View style={inventoryStyles.headerContent}>
      <View style={inventoryStyles.statsRow}>
        <View style={inventoryStyles.statsTextBlock}>
          <Text style={[inventoryStyles.statsTitle, { color: paperTheme.colors.onSurface }]}>
            Catalog
          </Text>
          <Text style={[inventoryStyles.statsSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            {filteredProducts.length} shown · {productCount} total
          </Text>
        </View>
        <TouchableOpacity
          style={[inventoryStyles.addProductBtn, { backgroundColor: paperTheme.colors.primary }]}
          onPress={() => navigation.navigate('AddProduct')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={20} color={paperTheme.colors.onPrimary} />
          <Text style={[inventoryStyles.addProductBtnText, { color: paperTheme.colors.onPrimary }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          inventoryStyles.filtersCard,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          cardShadow(resolvedTheme),
        ]}
      >
        <View
          style={[
            inventoryStyles.searchWrap,
            {
              backgroundColor: paperTheme.colors.background,
              borderColor: paperTheme.colors.outlineVariant,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products…"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            style={[inventoryStyles.searchInput, { color: paperTheme.colors.onSurface }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[inventoryStyles.filterSectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Category
        </Text>
        <FilterChipRow
          options={categoryFilterOptions}
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          paperTheme={paperTheme}
        />
      </View>

      <Text style={[inventoryStyles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Products
      </Text>
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, inventoryStyles.screen, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage Inventory"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={inventoryStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={paperTheme.colors.primary} />
          }
          ListHeaderComponent={renderListHeader}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              categories={categories}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
              onEdit={() =>
                navigation.navigate('EditProduct', {
                  id: item._id,
                  productName: item.productName,
                  categoryId: getProductCategoryId(item),
                  categoryName: item.categoryName,
                  type: item.type,
                  amount: item.amount,
                  cost: item.cost,
                  isInventoryAvailable: item.isInventoryAvailable,
                  barcode: item.barcode,
                  qty: item.qty,
                  image: item.image,
                })
              }
              onDelete={() => confirmDeleteProduct(item)}
              swipeableRef={(ref) => {
                if (ref) swipeableRefs.current.set(item._id, ref);
                else swipeableRefs.current.delete(item._id);
              }}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <SettingsEmptyState
                icon="cube-outline"
                title="No products found"
                description={
                  products.length === 0
                    ? 'Add your first product to start managing inventory.'
                    : 'Try another category or clear your search.'
                }
                paperTheme={paperTheme}
              />
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />

        {loading && (
          <View
            style={[
              inventoryStyles.loadingOverlay,
              {
                backgroundColor:
                  resolvedTheme === 'dark' ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.78)',
              },
            ]}
          >
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[inventoryStyles.loadingText, { color: paperTheme.colors.onSurface }]}>
              Loading inventory...
            </Text>
          </View>
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

const inventoryStyles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
  },
  headerContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  statsTextBlock: {
    flex: 1,
  },
  statsTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    lineHeight: 26,
  },
  statsSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  addProductBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  filtersCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  filterSectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 2,
    paddingRight: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    flexShrink: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  productCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 18,
  },
  thumbWrap: {
    width: 52,
    height: 52,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  categoryLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  metaChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
  },
  qtyChip: {
    backgroundColor: '#dcfce7',
  },
  qtyChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    color: '#15803d',
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    minWidth: 72,
  },
  amountText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    textAlign: 'right',
  },
  swipeDeleteWrap: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  swipeDeleteBtn: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: '100%',
    borderRadius: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 15,
  },
});
