import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  Modal,
  Pressable,
  RefreshControl,
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
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import {
  bulkCreateTables_Service,
  bulkDeleteTables_Service,
  deleteTable_Service,
  fetchTables_Service,
} from '../../../services/TableService';
import { ShopTable, getTableDisplayLabel, groupTablesByPrefix } from '../../../type/table';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../settings/shared/settingsDetailStyles';
import { SettingsEmptyState } from '../../settings/shared/SettingsDetailComponents';
import { inventoryUi, softShadow } from '../../pos/ManageInventory/inventoryUiStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageTables'>;

function TableCard({
  item,
  paperTheme,
  resolvedTheme,
  selectionMode,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  swipeableRef,
}: {
  item: ShopTable;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
}) {
  const cardContent = (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={selectionMode ? onToggleSelect : onEdit}
      style={[
        styles.card,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: selected ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
          borderWidth: selected ? 2 : 1,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      {selectionMode ? (
        <View
          style={[
            styles.selectIndicator,
            {
              backgroundColor: selected ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
              borderColor: selected ? paperTheme.colors.primary : paperTheme.colors.outline,
            },
          ]}
        >
          {selected ? <Ionicons name="checkmark" size={14} color={paperTheme.colors.onPrimary} /> : null}
        </View>
      ) : null}

      <View style={[styles.numberBadge, { backgroundColor: `${paperTheme.colors.tertiary}18` }]}>
        <Text style={[styles.numberBadgeText, { color: paperTheme.colors.tertiary }]}>
          {item.tableNumber}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]} numberOfLines={1}>
          {getTableDisplayLabel(item)}
        </Text>
        <Text style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {item.zone ? `${item.zone} · ` : ''}
          {item.capacity ? `${item.capacity} seats` : 'No capacity set'}
        </Text>
      </View>

      {!selectionMode ? (
        <View style={[styles.editBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}>
          <Ionicons name="create-outline" size={18} color={paperTheme.colors.primary} />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (selectionMode) {
    return cardContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeDeleteWrap}>
          <TouchableOpacity style={styles.swipeDeleteBtn} activeOpacity={0.85} onPress={onDelete}>
            <Ionicons name="trash" size={22} color="#FFFFFF" />
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {cardContent}
    </Swipeable>
  );
}

export default function ManageTablesScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const [tables, setTables] = useState<ShopTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkCount, setBulkCount] = useState('35');
  const [bulkPrefix, setBulkPrefix] = useState('T');

  const bulkPreview = useMemo(() => {
    const prefix = bulkPrefix.trim();
    const count = Number.parseInt(bulkCount.replace(/\D/g, ''), 10);
    if (!Number.isInteger(count) || count < 1) {
      return prefix ? `${prefix}1, ${prefix}2, …` : '1, 2, 3, …';
    }
    const first = prefix ? `${prefix}1` : '1';
    const second = prefix ? `${prefix}2` : '2';
    const last = prefix ? `${prefix}${count}` : String(count);
    return `${first}, ${second}, … ${last}`;
  }, [bulkCount, bulkPrefix]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const tableSections = useMemo(
    () =>
      groupTablesByPrefix(tables).map((group) => ({
        title: group.title,
        data: group.tables,
      })),
    [tables],
  );
  const allTables = useMemo(
    () => tableSections.flatMap((section) => section.data),
    [tableSections],
  );
  const selectedCount = selectedIds.size;
  const allSelected = allTables.length > 0 && selectedCount === allTables.length;

  const loadTables = useCallback(async () => {
    try {
      const response = await dispatch(fetchTables_Service()).unwrap();
      setTables(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load tables. Please try again.'),
        1,
        true,
        'OK',
      );
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadTables().finally(() => setLoading(false));
    }, [loadTables]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTables();
    } finally {
      setRefreshing(false);
    }
  }, [loadTables]);

  const closeBulkModal = useCallback(() => {
    if (bulkSaving) return;
    setBulkModalVisible(false);
  }, [bulkSaving]);

  const handleBulkCreate = useCallback(async () => {
    const count = Number.parseInt(bulkCount.replace(/\D/g, ''), 10);
    const prefix = bulkPrefix.trim();

    if (!prefix) {
      show_Alert('error', 'Prefix required', 'Enter a table prefix such as T or Table.', 1, true, 'OK');
      return;
    }

    if (!Number.isInteger(count) || count < 1 || count > 200) {
      show_Alert('error', 'Invalid count', 'Enter a number between 1 and 200.', 1, true, 'OK');
      return;
    }

    setBulkSaving(true);
    try {
      const response = await dispatch(
        bulkCreateTables_Service({
          count,
          startNumber: 1,
          prefix,
        }),
      ).unwrap();

      setBulkModalVisible(false);
      await loadTables();
      show_Alert(
        'success',
        'Tables created',
        response.message ?? `${response.count} tables created.`,
        1,
        true,
        'OK',
      );
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Bulk create failed',
        getApiErrorMessage(
          error,
          'Could not create tables. A table number may already exist in this branch.',
        ),
        1,
        true,
        'OK',
      );
    } finally {
      setBulkSaving(false);
    }
  }, [bulkCount, bulkPrefix, dispatch, loadTables, show_Alert]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleTableSelection = useCallback((tableId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(allTables.map((table) => table._id)));
  }, [allTables]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const performBulkDelete = useCallback(
    async (ids: string[]) => {
      setBulkDeleting(true);
      try {
        const response = await dispatch(bulkDeleteTables_Service({ ids })).unwrap();
        setTables((prev) => prev.filter((entry) => !ids.includes(entry._id)));
        exitSelectionMode();
        show_Alert(
          'success',
          'Tables removed',
          response.message ?? `${response.count} tables removed.`,
          1,
          true,
          'OK',
        );
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Delete failed',
          getApiErrorMessage(error, 'Could not delete selected tables.'),
          1,
          true,
          'OK',
        );
      } finally {
        setBulkDeleting(false);
      }
    },
    [dispatch, exitSelectionMode, show_Alert],
  );

  const confirmBulkDelete = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      show_Alert('error', 'No selection', 'Select at least one table to delete.', 1, true, 'OK');
      return;
    }

    show_Alert(
      'error',
      'Delete tables',
      `Remove ${ids.length} selected table${ids.length === 1 ? '' : 's'}?`,
      2,
      false,
      'Delete',
      () => {
        void performBulkDelete(ids);
      },
      'Cancel',
      () => {},
    );
  }, [performBulkDelete, selectedIds, show_Alert]);

  const confirmDelete = useCallback(
    (table: ShopTable) => {
      swipeableRefs.current.get(table._id)?.close();
      show_Alert(
        'error',
        'Delete table',
        `Remove ${getTableDisplayLabel(table)}?`,
        2,
        false,
        'Delete',
        () => {
          void (async () => {
            try {
              await dispatch(deleteTable_Service(table._id)).unwrap();
              setTables((prev) => prev.filter((entry) => entry._id !== table._id));
            } catch (error: unknown) {
              const handled = await handleSessionExpiredApiError(error, show_Alert);
              if (handled) return;

              show_Alert(
                'error',
                'Delete failed',
                getApiErrorMessage(error, 'Could not delete this table.'),
                1,
                true,
                'OK',
              );
            }
          })();
        },
        'Cancel',
        () => {},
      );
    },
    [dispatch, show_Alert],
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, styles.screen, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage tables"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <View style={styles.topActionsRow}>
          <TouchableOpacity
            onPress={() => setBulkModalVisible(true)}
            disabled={selectionMode}
            style={[
              styles.bulkSetupBtn,
              {
                backgroundColor: paperTheme.colors.primaryContainer,
                borderColor: `${paperTheme.colors.primary}33`,
                opacity: selectionMode ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Bulk add tables"
          >
            <Ionicons name="grid-outline" size={18} color={paperTheme.colors.primary} />
            <Text style={[styles.bulkSetupText, { color: paperTheme.colors.primary }]}>Bulk setup</Text>
          </TouchableOpacity>

          {allTables.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                if (selectionMode) {
                  exitSelectionMode();
                  return;
                }
                setSelectionMode(true);
              }}
              style={[
                styles.selectModeBtn,
                {
                  backgroundColor: selectionMode
                    ? paperTheme.colors.secondaryContainer
                    : paperTheme.colors.surfaceVariant,
                  borderColor: paperTheme.colors.outlineVariant,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={selectionMode ? 'Cancel selection' : 'Select tables'}
            >
              <Ionicons
                name={selectionMode ? 'close' : 'checkbox-outline'}
                size={18}
                color={selectionMode ? paperTheme.colors.onSecondaryContainer : paperTheme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.selectModeText,
                  {
                    color: selectionMode
                      ? paperTheme.colors.onSecondaryContainer
                      : paperTheme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {selectionMode ? 'Cancel' : 'Select'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {selectionMode ? (
          <View
            style={[
              styles.selectionToolbar,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <TouchableOpacity
              onPress={allSelected ? handleClearSelection : handleSelectAll}
              style={styles.selectionToolbarBtn}
            >
              <Ionicons
                name={allSelected ? 'close-circle-outline' : 'checkmark-done-outline'}
                size={18}
                color={paperTheme.colors.primary}
              />
              <Text style={[styles.selectionToolbarBtnText, { color: paperTheme.colors.primary }]}>
                {allSelected ? 'Clear all' : 'Select all'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.selectionCountText, { color: paperTheme.colors.onSurfaceVariant }]}>
              {selectedCount} selected
            </Text>

            <TouchableOpacity
              onPress={confirmBulkDelete}
              disabled={selectedCount === 0 || bulkDeleting}
              style={[
                styles.deleteSelectedBtn,
                {
                  backgroundColor: '#dc2626',
                  opacity: selectedCount === 0 || bulkDeleting ? 0.5 : 1,
                },
              ]}
            >
              {bulkDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.deleteSelectedText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={[inventoryUi.sectionEyebrow, styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Restaurant tables
        </Text>

        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <SectionList
            sections={tableSections}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={paperTheme.colors.primary} />
            }
            ListEmptyComponent={
              <SettingsEmptyState
                icon="restaurant-outline"
                title="No tables yet"
                description="Add tables one by one or use bulk setup for your dining floor."
                paperTheme={paperTheme}
              />
            }
            renderSectionHeader={({ section }) => (
              <Text style={[styles.sectionHeaderTitle, { color: paperTheme.colors.onSurface }]}>
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => (
              <TableCard
                item={item}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
                selectionMode={selectionMode}
                selected={selectedIds.has(item._id)}
                onToggleSelect={() => toggleTableSelection(item._id)}
                onEdit={() => navigation.navigate('TableForm', { table: item })}
                onDelete={() => confirmDelete(item)}
                swipeableRef={(ref) => {
                  if (ref) swipeableRefs.current.set(item._id, ref);
                  else swipeableRefs.current.delete(item._id);
                }}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            SectionSeparatorComponent={() => <View style={{ height: 14 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {!selectionMode ? (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: paperTheme.colors.primary }, softShadow(resolvedTheme)]}
            onPress={() => navigation.navigate('TableForm', undefined)}
            accessibilityRole="button"
            accessibilityLabel="Add table"
          >
            <Ionicons name="add" size={28} color={paperTheme.colors.onPrimary} />
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      <Modal visible={bulkModalVisible} transparent animationType="fade" onRequestClose={closeBulkModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeBulkModal}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: paperTheme.colors.surface }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Bulk add tables</Text>
            <Text style={[styles.modalBody, { color: paperTheme.colors.onSurfaceVariant }]}>
              Creates unique table numbers for this branch, e.g. T1, T2, T3.
            </Text>

            <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
              Prefix (letters or numbers) *
            </Text>
            <TextInput
              value={bulkPrefix}
              onChangeText={setBulkPrefix}
              style={[
                styles.fieldInput,
                {
                  backgroundColor: paperTheme.colors.surfaceVariant,
                  color: paperTheme.colors.onSurface,
                },
              ]}
              placeholder="T"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              autoCapitalize="characters"
            />

            <Text style={[styles.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>How many?</Text>
            <TextInput
              value={bulkCount}
              onChangeText={setBulkCount}
              keyboardType="number-pad"
              style={[
                styles.fieldInput,
                {
                  backgroundColor: paperTheme.colors.surfaceVariant,
                  color: paperTheme.colors.onSurface,
                },
              ]}
              placeholder="35"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            />

            <Text style={[styles.previewText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Preview: {bulkPreview}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}
                onPress={closeBulkModal}
                disabled={bulkSaving}
              >
                <Text style={[styles.modalBtnText, { color: paperTheme.colors.onSurface }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: paperTheme.colors.primary, opacity: bulkSaving ? 0.7 : 1 }]}
                onPress={() => void handleBulkCreate()}
                disabled={bulkSaving}
              >
                {bulkSaving ? (
                  <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: paperTheme.colors.onPrimary }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginBottom: 10,
    marginTop: 4,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 96,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  numberBadge: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  cardMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteWrap: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  swipeDeleteBtn: {
    width: 84,
    height: '88%',
    borderRadius: 16,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
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
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectModeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectionToolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionToolbarBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  selectionCountText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 84,
    justifyContent: 'center',
  },
  deleteSelectedText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#fff',
  },
  selectIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkSetupText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  modalBody: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    marginTop: 4,
  },
  fieldInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
  },
  previewText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});
