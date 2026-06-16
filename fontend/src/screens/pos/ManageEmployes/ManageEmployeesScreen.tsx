import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import {
  deleteSalePerson_Service,
  fetchSalePersons_Service,
} from '../../../services/SalePersonService';
import {
  formatSalePersonJoinedDate,
  getSalePersonFullName,
  SalePerson,
} from '../../../type/salePerson';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import { resolveProductImageUri } from '../../../utils/productImage';
import { cardShadow } from '../../settings/shared/settingsDetailStyles';
import { softShadow } from '../ManageInventory/inventoryUiStyles';
import { Portal } from 'react-native-paper';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageEmployees'>;

function EmployeeAvatar({
  image,
  paperTheme,
}: {
  image?: string | null;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
}) {
  const imageUri = resolveProductImageUri(image);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.avatar} />;
  }

  return (
    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: paperTheme.colors.primaryContainer }]}>
      <Ionicons name="person" size={28} color={paperTheme.colors.primary} />
    </View>
  );
}

function EmployeeCard({
  employee,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  swipeableRef,
  paperTheme,
  resolvedTheme,
}: {
  employee: SalePerson;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const fullName = getSalePersonFullName(employee);

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
            accessibilityLabel={`Delete ${fullName}`}
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
          { backgroundColor: paperTheme.colors.surface },
          cardShadow(resolvedTheme),
        ]}
      >
        <TouchableOpacity activeOpacity={0.92} onPress={onToggle} style={styles.cardHeader}>
          <EmployeeAvatar image={employee.image} paperTheme={paperTheme} />
          <View style={styles.cardBody}>
            <Text style={[styles.cardName, { color: paperTheme.colors.onSurface }]} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={[styles.cardPosition, { color: paperTheme.colors.primary }]} numberOfLines={1}>
              {employee.position}
            </Text>
            <Text style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
              ID · {employee.salePersonId}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={paperTheme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>

        {expanded ? (
          <View
            style={[
              styles.cardDetails,
              { borderTopColor: paperTheme.colors.outlineVariant },
            ]}
          >
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={paperTheme.colors.onSurfaceVariant} />
              <Text style={[styles.detailText, { color: paperTheme.colors.onSurface }]}>
                Joined {formatSalePersonJoinedDate(employee.createdAt)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="storefront-outline" size={16} color={paperTheme.colors.onSurfaceVariant} />
              <Text style={[styles.detailText, { color: paperTheme.colors.onSurface }]}>
                Shop {employee.shopId}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onEdit}
              style={[styles.editBtn, { backgroundColor: paperTheme.colors.primary }]}
            >
              <Ionicons name="create-outline" size={18} color={paperTheme.colors.onPrimary} />
              <Text style={[styles.editBtnText, { color: paperTheme.colors.onPrimary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Swipeable>
  );
}

export default function ManageEmployeesScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const { items: employees, loading, count } = useSelector(
    (state: RootState) => state.SalePersonReducer.list,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const loadSalePersons = useCallback(async () => {
    if (!shopId) {
      setTimeout(() => {
        show_Alert(
          'error',
          'Error',
          'Shop not found. Please log in again.',
          1,
          false,
          'OK',
          () => {},
        );
      }, 150);
      return;
    }

    try {
      await dispatch(fetchSalePersons_Service()).unwrap();
    } catch (error: unknown) {
      console.log('error in loadSalePersons', error);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load employees. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadSalePersons();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, shopId, show_Alert]);

  const confirmDeleteEmployee = useCallback(
    (employee: SalePerson) => {
      const fullName = getSalePersonFullName(employee);
      const closeSwipe = () => swipeableRefs.current.get(employee._id)?.close();

      show_Alert(
        'error',
        'Delete employee?',
        `Are you sure you want to delete "${fullName}"? This cannot be undone.`,
        2,
        false,
        'Delete',
        async () => {
          try {
            await dispatch(deleteSalePerson_Service(employee._id)).unwrap();
            swipeableRefs.current.get(employee._id)?.close();
            if (expandedId === employee._id) {
              setExpandedId(null);
            }
          } catch (err: unknown) {
            const handled = await handleSessionExpiredApiError(err, show_Alert);
            if (handled) return;

            setTimeout(() => {
              show_Alert(
                'error',
                'Delete failed',
                getApiErrorMessage(err, 'Could not delete employee. Please try again.'),
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
    [dispatch, expandedId, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSalePersons();
    }, [loadSalePersons]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSalePersons();
    } finally {
      setRefreshing(false);
    }
  }, [loadSalePersons]);

  const employeeCount = count || employees.length;

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage Employees"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.primary}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <View style={styles.content}>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: paperTheme.colors.primaryContainer },
              softShadow(resolvedTheme),
            ]}
          >
            <View style={[styles.heroIconWrap, { backgroundColor: paperTheme.colors.primary }]}>
              <Ionicons name="people" size={24} color={paperTheme.colors.onPrimary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroEyebrow, { color: paperTheme.colors.onPrimaryContainer }]}>
                Your team
              </Text>
              <Text style={[styles.heroTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                {employeeCount} employee{employeeCount === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.heroSub, { color: paperTheme.colors.onPrimaryContainer }]}>
                Shop {shopId.toUpperCase() || '—'}
              </Text>
            </View>
          </View>

          {loading && employees.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    void onRefresh();
                  }}
                  tintColor={paperTheme.colors.primary}
                  colors={[paperTheme.colors.primary]}
                />
              }
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item }) => (
                <EmployeeCard
                  employee={item}
                  expanded={expandedId === item._id}
                  onToggle={() =>
                    setExpandedId((current) => (current === item._id ? null : item._id))
                  }
                  onEdit={() => navigation.navigate('AddEmployee', { salePersonId: item._id })}
                  onDelete={() => confirmDeleteEmployee(item)}
                  swipeableRef={(ref) => {
                    if (ref) swipeableRefs.current.set(item._id, ref);
                    else swipeableRefs.current.delete(item._id);
                  }}
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="person-outline" size={40} color={paperTheme.colors.outline} />
                  <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                    No employees yet
                  </Text>
                  <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Add your first team member for this shop.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <View style={[styles.footer, { backgroundColor: paperTheme.colors.background }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AddEmployee')}
            style={[styles.addBtn, { backgroundColor: paperTheme.colors.primary }]}
          >
            <Ionicons name="person-add-outline" size={20} color={paperTheme.colors.onPrimary} />
            <Text style={[styles.addBtnText, { color: paperTheme.colors.onPrimary }]}>
              Add new employee
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Portal>
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
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1, gap: 2 },
  heroEyebrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
  },
  heroSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    opacity: 0.9,
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  cardPosition: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },
  cardMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
  },
  editBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  swipeDeleteWrap: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  swipeDeleteBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    width: 88,
    height: '92%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeDeleteText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  addBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});
