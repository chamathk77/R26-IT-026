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
import { Portal } from 'react-native-paper';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { fonts } from '../../../../constants/fonts';
import { useTheme } from '../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../store/store';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import {
  deleteShopUser_Service,
  fetchShopUsers_Service,
} from '../../../../services/ManageUsersService';
import { ShopUser } from '../../../../type/manageUser';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../utils/apiErrorAlert';
import { cardShadow } from '../../shared/settingsDetailStyles';
import { SettingsBadge, SettingsEmptyState } from '../../shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageAccount'>;

function getRoleBadgeTone(role: string): 'primary' | 'success' | 'warning' | 'neutral' {
  if (role === 'owner') return 'warning';
  if (role === 'admin') return 'primary';
  return 'neutral';
}

function UserCard({
  user,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  swipeableRef,
  paperTheme,
  resolvedTheme,
}: {
  user: ShopUser;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const isOwner = user.role === 'owner';
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const card = (
    <View
      style={[
        styles.card,
        { backgroundColor: paperTheme.colors.surface },
        cardShadow(resolvedTheme),
      ]}
    >
      <TouchableOpacity activeOpacity={0.92} onPress={onToggle} style={styles.cardHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: paperTheme.colors.primaryContainer },
          ]}
        >
          <Text style={[styles.avatarText, { color: paperTheme.colors.primary }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: paperTheme.colors.onSurface }]} numberOfLines={1}>
            {user.name}
          </Text>
          <Text
            style={[styles.cardSub, { color: paperTheme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {user.phoneNumber}
          </Text>
          <Text
            style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {user.email}
          </Text>
        </View>
        <SettingsBadge
          label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          tone={getRoleBadgeTone(user.role)}
          paperTheme={paperTheme}
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
            <Ionicons name="mail-outline" size={16} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: paperTheme.colors.onSurface }]}>
              {user.email}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: paperTheme.colors.onSurface }]}>
              {user.phoneNumber}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="git-branch-outline" size={16} color={paperTheme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: paperTheme.colors.onSurface }]}>
              {user.allowedBranchIds?.length
                ? `${user.allowedBranchIds.length} branch${user.allowedBranchIds.length > 1 ? 'es' : ''} assigned`
                : 'No branch assigned'}
            </Text>
          </View>

          {!isOwner ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onEdit}
              style={[styles.editBtn, { backgroundColor: paperTheme.colors.primary }]}
            >
              <Ionicons name="create-outline" size={18} color={paperTheme.colors.onPrimary} />
              <Text style={[styles.editBtnText, { color: paperTheme.colors.onPrimary }]}>
                Edit user
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.ownerHint, { color: paperTheme.colors.onSurfaceVariant }]}>
              Owner account cannot be edited here.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );

  if (isOwner) {
    return card;
  }

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
          >
            <Ionicons name="trash" size={22} color="#FFFFFF" />
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {card}
    </Swipeable>
  );
}

export default function ManageAccountScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const maxUsers = useSelector(
    (state: RootState) => state.AuthReducer.Login.shopData?.maxUsers ?? 3,
  );
  const listState = useSelector((state: RootState) => state.ManageUsersReducer?.list);
  const users = listState?.items ?? [];
  const loading = listState?.loading ?? false;
  const count = listState?.count ?? 0;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const loadUsers = useCallback(async () => {
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
      await dispatch(fetchShopUsers_Service()).unwrap();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load users. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadUsers();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, shopId, show_Alert]);

  const confirmDeleteUser = useCallback(
    (user: ShopUser) => {
      const closeSwipe = () => swipeableRefs.current.get(user._id)?.close();

      show_Alert(
        'error',
        'Delete user?',
        `Are you sure you want to delete "${user.name}"? This cannot be undone.`,
        2,
        false,
        'Delete',
        async () => {
          try {
            await dispatch(deleteShopUser_Service(user._id)).unwrap();
            swipeableRefs.current.get(user._id)?.close();
            if (expandedId === user._id) {
              setExpandedId(null);
            }
          } catch (err: unknown) {
            const handled = await handleSessionExpiredApiError(err, show_Alert);
            if (handled) return;

            setTimeout(() => {
              show_Alert(
                'error',
                'Delete failed',
                getApiErrorMessage(err, 'Could not delete user. Please try again.'),
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
      void loadUsers();
    }, [loadUsers]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUsers();
    } finally {
      setRefreshing(false);
    }
  }, [loadUsers]);

  const userCount = count || users.length;
  const atUserLimit = userCount >= maxUsers;

  const listHeader = (
    <View style={styles.headerBlock}>
      <View
        style={[
          styles.usageCard,
          {
            backgroundColor: paperTheme.colors.primaryContainer,
            borderColor: `${paperTheme.colors.primary}33`,
          },
        ]}
      >
        <View style={styles.usageRow}>
          <Ionicons name="people" size={22} color={paperTheme.colors.primary} />
          <View style={styles.usageTextWrap}>
            <Text style={[styles.usageTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
              Shop users
            </Text>
            <Text style={[styles.usageSub, { color: paperTheme.colors.onPrimaryContainer }]}>
              {userCount} of {maxUsers} slots used
            </Text>
          </View>
        </View>
        <View style={styles.usageMeterTrack}>
          <View
            style={[
              styles.usageMeterFill,
              {
                backgroundColor: paperTheme.colors.primary,
                width: `${Math.min(100, (userCount / Math.max(maxUsers, 1)) * 100)}%`,
              },
            ]}
          />
        </View>
        {atUserLimit ? (
          <Text style={[styles.limitHint, { color: paperTheme.colors.error }]}>
            Maximum user count reached. Contact admin to add more.
          </Text>
        ) : null}
      </View>

      <Text style={[styles.caption, { color: paperTheme.colors.onSurfaceVariant }]}>
        Tap a user to expand details. Owner is read-only. Swipe left on admin or staff to delete.
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
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage account"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {loading && users.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={listHeader}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={paperTheme.colors.primary}
              />
            }
            ListEmptyComponent={
              <SettingsEmptyState
                icon="people-outline"
                title="No users yet"
                description="Create admin or staff accounts for your shop."
                paperTheme={paperTheme}
              />
            }
            renderItem={({ item }) => (
              <UserCard
                user={item}
                expanded={expandedId === item._id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === item._id ? null : item._id))
                }
                onEdit={() => navigation.navigate('ManageUserForm', { userId: item._id })}
                onDelete={() => confirmDeleteUser(item)}
                swipeableRef={(ref) => {
                  if (ref) swipeableRefs.current.set(item._id, ref);
                  else swipeableRefs.current.delete(item._id);
                }}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
              />
            )}
          />
        )}

        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: atUserLimit
                ? paperTheme.colors.surfaceVariant
                : paperTheme.colors.primary,
            },
            cardShadow(resolvedTheme),
          ]}
          activeOpacity={atUserLimit ? 1 : 0.9}
          onPress={() => {
            if (atUserLimit) {
              show_Alert(
                'error',
                'User limit reached',
                'Your maximum user count is exceeded. Please contact admin.',
                1,
                false,
                'OK',
                () => {},
              );
              return;
            }
            navigation.navigate('ManageUserForm');
          }}
        >
          <Ionicons name="person-add" size={24} color={paperTheme.colors.onPrimary} />
          <Text style={[styles.fabText, { color: paperTheme.colors.onPrimary }]}>
            New user
          </Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  usageCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  usageTextWrap: { flex: 1 },
  usageTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  usageSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 2,
    opacity: 0.9,
  },
  usageMeterTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  usageMeterFill: {
    height: '100%',
    borderRadius: 999,
  },
  limitHint: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginTop: 10,
  },
  caption: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  cardSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 2,
  },
  cardMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  cardDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  editBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  ownerHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  swipeDeleteWrap: {
    justifyContent: 'center',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeDeleteBtn: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    height: '100%',
    gap: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
  },
  fabText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
