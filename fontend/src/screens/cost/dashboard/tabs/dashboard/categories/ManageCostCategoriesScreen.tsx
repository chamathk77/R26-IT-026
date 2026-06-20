import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StatusBar,
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
import { Portal } from 'react-native-paper';
import { RootStackParamList } from '../../../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../../../store/store';
import CommonHeader from '../../../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../../../hooks/useCommonAlert';
import {
  deleteCostCategory_Service,
  fetchCostCategories_Service,
} from '../../../../../../services/CostCategoryService';
import { CostCategory } from '../../../../../../type/costCategory';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../../utils/apiErrorAlert';
import { costCardShadow } from '../../../shared/costDashboardStyles';
import { SettingsEmptyState } from '../../../../../settings/shared/SettingsDetailComponents';
import { costCategoryStyles as styles } from './costCategoryStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageCostCategories'>;

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function CategoryCard({
  item,
  paperTheme,
  resolvedTheme,
  onEdit,
  onDelete,
  swipeableRef,
}: {
  item: CostCategory;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  onEdit: () => void;
  onDelete: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
}) {
  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeDeleteWrap}>
          <TouchableOpacity
            style={styles.swipeDeleteBtn}
            activeOpacity={0.85}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Ionicons name="trash" size={22} color="#FFFFFF" />
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          costCardShadow(resolvedTheme),
        ]}
      >
        <View style={[styles.colorSwatch, { backgroundColor: item.colorCode }]}>
          <Ionicons name="folder" size={20} color="#FFFFFF" />
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
            Added by {item.createdByName || 'Unknown'} · {formatDate(item.createdAt)}
          </Text>
          <View style={[styles.colorPill, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
            <View style={[styles.colorDot, { backgroundColor: item.colorCode }]} />
            <Text style={[styles.colorText, { color: paperTheme.colors.onSurfaceVariant }]}>
              {item.colorCode}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Ionicons name="create-outline" size={20} color={paperTheme.colors.primary} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

export default function ManageCostCategoriesScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const listState = useSelector((state: RootState) => state.CostCategoryReducer?.list);
  const categories = listState?.items ?? [];
  const loading = listState?.loading ?? false;
  const error = listState?.error ?? null;
  const count = listState?.count ?? 0;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.colorCode.toLowerCase().includes(query) ||
        (item.createdByName?.toLowerCase().includes(query) ?? false),
    );
  }, [categories, searchQuery]);

  const loadCategories = useCallback(async () => {
    try {
      await dispatch(fetchCostCategories_Service()).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(err, 'Could not load cost categories. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadCategories();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, show_Alert]);

  const confirmDeleteCategory = useCallback(
    (item: CostCategory) => {
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
            await dispatch(deleteCostCategory_Service(item._id)).unwrap();
            swipeableRefs.current.get(item._id)?.close();
            show_Alert(
              'success',
              'Deleted',
              'Cost category removed successfully.',
              1,
              false,
              'OK',
              () => {},
            );
          } catch (err: unknown) {
            const handled = await handleSessionExpiredApiError(err, show_Alert);
            if (handled) return;

            setTimeout(() => {
              show_Alert(
                'error',
                'Delete failed',
                getApiErrorMessage(err, 'Could not delete category. Please try again.'),
                1,
                false,
                'OK',
                () => {},
              );
            }, 150);
          }
        },
        'Cancel',
        closeSwipe,
      );
    },
    [dispatch, show_Alert],
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

  const renderHero = () => (
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
      <View style={[styles.heroAccent, { backgroundColor: paperTheme.colors.primary }]} />
      <View style={styles.heroRow}>
        <View style={[styles.heroIcon, { backgroundColor: paperTheme.colors.primary }]}>
          <Ionicons name="folder-open" size={22} color={paperTheme.colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
            Cost categories
          </Text>
          <Text style={[styles.heroSubtitle, { color: paperTheme.colors.onPrimaryContainer }]}>
            Group expenses by category for clearer tracking
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: paperTheme.colors.surface }]}>
          <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>
            {count || categories.length}
          </Text>
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Total
          </Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: paperTheme.colors.surface }]}>
          <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>
            {filteredCategories.length}
          </Text>
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Showing
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSearch = () => (
    <View
      style={[
        styles.searchWrap,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        costCardShadow(resolvedTheme),
      ]}
    >
      <Ionicons name="search" size={18} color={paperTheme.colors.onSurfaceVariant} />
      <TextInput
        ref={searchInputRef}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search name or color…"
        placeholderTextColor={paperTheme.colors.onSurfaceVariant}
        style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      {searchQuery.length > 0 ? (
        <TouchableOpacity
          onPress={() => {
            setSearchQuery('');
            searchInputRef.current?.focus();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

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
          title="Categories"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          {renderHero()}
          {renderSearch()}

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: paperTheme.colors.errorContainer }]}>
              <Ionicons name="alert-circle-outline" size={18} color={paperTheme.colors.error} />
              <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {loading && !refreshing && categories.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={paperTheme.colors.primary} />
              <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
                Loading categories…
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={paperTheme.colors.primary}
                />
              }
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Your categories
                </Text>
              }
              ListEmptyComponent={
                !loading ? (
                  <SettingsEmptyState
                    icon="folder-open-outline"
                    title={categories.length === 0 ? 'No categories yet' : 'No categories found'}
                    description={
                      categories.length === 0
                        ? 'Create your first cost category to organize expenses.'
                        : 'Try a different search term.'
                    }
                    paperTheme={paperTheme}
                  />
                ) : null
              }
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item }) => (
                <CategoryCard
                  item={item}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                  onEdit={() => navigation.navigate('CostCategoryForm', { categoryId: item._id })}
                  onDelete={() => confirmDeleteCategory(item)}
                  swipeableRef={(ref) => {
                    if (ref) swipeableRefs.current.set(item._id, ref);
                    else swipeableRefs.current.delete(item._id);
                  }}
                />
              )}
            />
          )}
        </Pressable>

        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: paperTheme.colors.primary },
            costCardShadow(resolvedTheme),
          ]}
          onPress={() => navigation.navigate('CostCategoryForm', {})}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="Add new category"
        >
          <Ionicons name="add" size={28} color={paperTheme.colors.onPrimary} />
        </TouchableOpacity>
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
