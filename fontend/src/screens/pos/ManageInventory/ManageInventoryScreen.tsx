import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
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
import { inventoryUi, softShadow } from './inventoryUiStyles';
import { SettingsEmptyState } from '../../settings/shared/SettingsDetailComponents';
import BarcodeScannerModal from './BarcodeScannerModal';

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
  resolvedTheme,
}: {
  options: { key: CategoryFilter; label: string; colorCode?: string }[];
  selected: CategoryFilter;
  onSelect: (value: CategoryFilter) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={inventoryStyles.filterRow}
    >
      {options.map((option) => {
        const isActive = selected === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => {
              Keyboard.dismiss();
              onSelect(option.key);
            }}
            style={[
              inventoryStyles.filterChip,
              isActive && softShadow(resolvedTheme),
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
  const isService = product.type === 'service';

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={inventoryStyles.swipeDeleteWrap}>
          <TouchableOpacity style={inventoryStyles.swipeDeleteBtn} onPress={onDelete} activeOpacity={0.85}>
            <Ionicons name="trash" size={22} color="#FFFFFF" />
            <Text style={inventoryStyles.swipeDeleteText}>Delete</Text>
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
        <View style={inventoryStyles.productRow}>
          <View style={inventoryStyles.thumbWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={inventoryStyles.thumb} resizeMode="cover" />
            ) : (
              <View
                style={[
                  inventoryStyles.thumbPlaceholder,
                  { backgroundColor: `${categoryColor}18` },
                ]}
              >
                <Ionicons name="cube-outline" size={22} color={categoryColor} />
              </View>
            )}
            {product.isInventoryAvailable ? (
              <View style={inventoryStyles.qtyBadge}>
                <Text style={inventoryStyles.qtyBadgeText}>{product.qty ?? 0}</Text>
              </View>
            ) : null}
          </View>

          <View style={inventoryStyles.productBody}>
            <View style={inventoryStyles.productTitleRow}>
              <Text
                style={[inventoryStyles.productName, { color: paperTheme.colors.onSurface }]}
                numberOfLines={1}
              >
                {product.productName}
              </Text>
              <View
                style={[
                  inventoryStyles.pricePill,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
              >
                <Text style={[inventoryStyles.amountText, { color: paperTheme.colors.primary }]}>
                  {formatAmount(product.amount)}
                </Text>
              </View>
            </View>

            <View style={inventoryStyles.categoryRow}>
              <View style={[inventoryStyles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text
                style={[inventoryStyles.categoryLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {product.categoryName}
              </Text>
            </View>

            <View style={inventoryStyles.metaChipRow}>
              <View
                style={[
                  inventoryStyles.metaChip,
                  {
                    backgroundColor: isService
                      ? `${paperTheme.colors.tertiary}22`
                      : `${paperTheme.colors.primary}14`,
                  },
                ]}
              >
                <Ionicons
                  name={isService ? 'construct-outline' : 'pricetag-outline'}
                  size={11}
                  color={isService ? paperTheme.colors.tertiary : paperTheme.colors.primary}
                />
                <Text
                  style={[
                    inventoryStyles.metaChipText,
                    {
                      color: isService ? paperTheme.colors.tertiary : paperTheme.colors.primary,
                    },
                  ]}
                >
                  {isService ? 'Service' : 'Product'}
                </Text>
              </View>
              {product.barcode ? (
                <View
                  style={[
                    inventoryStyles.metaChip,
                    { backgroundColor: paperTheme.colors.surfaceVariant },
                  ]}
                >
                  <Ionicons
                    name="barcode-outline"
                    size={11}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      inventoryStyles.metaChipText,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {product.barcode}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.outline} />
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
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState('');
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const nameSearchInputRef = useRef<TextInput>(null);

  const loading = categoriesLoading || productsLoading;

  const handleCategoryFilterSelect = useCallback((value: CategoryFilter) => {
    setCategoryFilter(value);
  }, []);

  const openBarcodeScanner = useCallback(() => {
    Keyboard.dismiss();
    setBarcodeScannerVisible(true);
  }, []);

  const handleBarcodeScanned = useCallback((code: string) => {
    setBarcodeSearchQuery(code);
    setBarcodeScannerVisible(false);
  }, []);

  const clearBarcodeSearch = useCallback(() => {
    setBarcodeSearchQuery('');
    Keyboard.dismiss();
  }, []);

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

    const nameQuery = nameSearchQuery.trim().toLowerCase();
    if (nameQuery) {
      list = list.filter((product) => {
        const categoryName = product.categoryName.toLowerCase();
        return (
          product.productName.toLowerCase().includes(nameQuery) ||
          categoryName.includes(nameQuery)
        );
      });
    }

    const barcodeQuery = barcodeSearchQuery.replace(/\s+/g, '').trim().toLowerCase();
    if (barcodeQuery) {
      list = list.filter((product) => {
        const barcode = (product.barcode ?? '').replace(/\s+/g, '').toLowerCase();
        return barcode.includes(barcodeQuery);
      });
    }

    return list;
  }, [products, categoryFilter, nameSearchQuery, barcodeSearchQuery]);

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

  const renderSummaryStrip = () => (
    <Pressable onPress={Keyboard.dismiss}>
      <View
        style={[
          inventoryStyles.summaryStrip,
          {
            backgroundColor: paperTheme.colors.surfaceVariant,
            borderColor: paperTheme.colors.outlineVariant,
          },
        ]}
      >
      <View style={inventoryStyles.summaryItem}>
        <Text style={[inventoryStyles.summaryValue, { color: paperTheme.colors.primary }]}>
          {productCount}
        </Text>
        <Text style={[inventoryStyles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Total
        </Text>
      </View>
      <View style={[inventoryStyles.summaryDivider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
      <View style={inventoryStyles.summaryItem}>
        <Text style={[inventoryStyles.summaryValue, { color: paperTheme.colors.primary }]}>
          {filteredProducts.length}
        </Text>
        <Text style={[inventoryStyles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Showing
        </Text>
      </View>
      <View style={[inventoryStyles.summaryDivider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
      <View style={inventoryStyles.summaryItem}>
        <Text style={[inventoryStyles.summaryValue, { color: paperTheme.colors.primary }]}>
          {categories.length}
        </Text>
        <Text style={[inventoryStyles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Categories
        </Text>
      </View>
      </View>
    </Pressable>
  );

  const renderFiltersBar = () => (
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
      <View style={inventoryStyles.filterTopRow}>
        <View
          style={[
            inventoryStyles.searchWrap,
            inventoryStyles.searchWrapFlex,
            {
              backgroundColor: paperTheme.colors.background,
              borderColor: paperTheme.colors.outlineVariant,
            },
          ]}
        >
          <View style={[inventoryStyles.searchIconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}>
            <Ionicons name="search" size={15} color={paperTheme.colors.primary} />
          </View>
          <TextInput
            ref={nameSearchInputRef}
            value={nameSearchQuery}
            onChangeText={setNameSearchQuery}
            placeholder="Search name or category…"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            style={[inventoryStyles.searchInput, { color: paperTheme.colors.onSurface }]}
            autoCorrect={false}
            autoCapitalize="none"
            blurOnSubmit={false}
            clearButtonMode="while-editing"
          />
          {nameSearchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setNameSearchQuery('');
                nameSearchInputRef.current?.focus();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={20} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            inventoryStyles.scanIconBtn,
            { backgroundColor: paperTheme.colors.primary },
            softShadow(resolvedTheme),
          ]}
          onPress={openBarcodeScanner}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
        >
          <Ionicons name="scan" size={22} color={paperTheme.colors.onPrimary} />
          <Text style={[inventoryStyles.scanIconBtnText, { color: paperTheme.colors.onPrimary }]}>Scan</Text>
        </TouchableOpacity>
      </View>

      {barcodeSearchQuery.length > 0 ? (
        <View
          style={[
            inventoryStyles.barcodeChip,
            {
              backgroundColor: paperTheme.colors.primaryContainer,
              borderColor: `${paperTheme.colors.primary}33`,
            },
          ]}
        >
          <Ionicons name="barcode-outline" size={15} color={paperTheme.colors.primary} />
          <Text
            style={[inventoryStyles.barcodeChipText, { color: paperTheme.colors.onPrimaryContainer }]}
            numberOfLines={1}
          >
            {barcodeSearchQuery}
          </Text>
          <TouchableOpacity
            onPress={clearBarcodeSearch}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear scanned barcode"
          >
            <Ionicons name="close-circle" size={18} color={paperTheme.colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>
      ) : null}

      <FilterChipRow
        options={categoryFilterOptions}
        selected={categoryFilter}
        onSelect={handleCategoryFilterSelect}
        paperTheme={paperTheme}
        resolvedTheme={resolvedTheme}
      />
    </View>
  );

  const productsListLabel = useMemo(
    () => (
      <Text
        style={[
          inventoryUi.sectionEyebrow,
          inventoryStyles.listSectionLabel,
          { color: paperTheme.colors.onSurfaceVariant },
        ]}
      >
        Your products
      </Text>
    ),
    [paperTheme.colors.onSurfaceVariant],
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

        <View style={inventoryStyles.listHeader}>
          {renderSummaryStrip()}
          {renderFiltersBar()}
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={inventoryStyles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={paperTheme.colors.primary} />
          }
          ListHeaderComponent={productsListLabel}
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
                    : 'Try another filter or clear your name or barcode search.'
                }
                paperTheme={paperTheme}
              />
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />

        <TouchableOpacity
          style={[
            inventoryStyles.fab,
            { backgroundColor: paperTheme.colors.primary },
            softShadow(resolvedTheme),
          ]}
          onPress={() => navigation.navigate('AddProduct')}
          activeOpacity={0.92}
        >
          <Ionicons name="add" size={28} color={paperTheme.colors.onPrimary} />
        </TouchableOpacity>

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

        <BarcodeScannerModal
          visible={barcodeScannerVisible}
          onClose={() => setBarcodeScannerVisible(false)}
          onScanned={handleBarcodeScanned}
          paperTheme={paperTheme}
        />
      </SafeAreaView>
    </>
  );
}

const inventoryStyles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
  },
  listHeader: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summaryValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    lineHeight: 17,
  },
  summaryLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  summaryDivider: {
    width: 1,
    height: 16,
  },
  filtersCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  filterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRow: {
    gap: 8,
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
    maxWidth: 150,
  },
  filterDot: {
    width: 7,
    height: 7,
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
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchWrapFlex: {
    flex: 1,
    marginBottom: 0,
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  barcodeChipText: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  scanIconBtn: {
    minWidth: 52,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  scanIconBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    lineHeight: 12,
  },
  searchIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 3,
  },
  listSectionLabel: {
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  productCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  thumbWrap: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  qtyBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
    color: '#fff',
  },
  productBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  pricePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  amountText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    flex: 1,
  },
  metaChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  metaChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    flexShrink: 1,
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
    width: 80,
    height: '100%',
    borderRadius: 20,
    gap: 4,
  },
  swipeDeleteText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
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
