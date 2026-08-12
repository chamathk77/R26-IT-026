import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { AppDispatch } from '../../store/store';
import { fetchTables_Service } from '../../services/TableService';
import { ShopTable, TablePickerItem, toTablePickerItems } from '../../type/table';
import TablePickerGrid from './TablePickerGrid';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../CommonAlert/CommonAlert';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectTable: (table: TablePickerItem) => void;
  selectedTableId?: string | null;
  freeTablesOnly?: boolean;
  title?: string;
  subtitle?: string;
};

export default function TablePickerModal({
  visible,
  onClose,
  onSelectTable,
  selectedTableId = null,
  freeTablesOnly = false,
  title,
  subtitle,
}: Props) {
  const { paperTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible: alertVisible, hideAlert, show_Alert } = useCommonAlert();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TablePickerItem[]>([]);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dispatch(fetchTables_Service()).unwrap();
      const tables = Array.isArray(response.data) ? response.data : [];
      setItems(toTablePickerItems(tables as ShopTable[]));
    } catch (error: unknown) {
      setItems([]);

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
    } finally {
      setLoading(false);
    }
  }, [dispatch, show_Alert]);

  useEffect(() => {
    if (visible) {
      void loadTables();
    }
  }, [visible, loadTables]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]} />

          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>
                {title ?? (freeTablesOnly ? 'Select table' : 'Table status')}
              </Text>
              <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                {subtitle ??
                  (freeTablesOnly
                    ? 'Only free tables can be selected'
                    : 'Grouped by prefix · Green free · Red occupied')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#15803d' }]} />
              <Text style={[styles.legendText, { color: paperTheme.colors.onSurfaceVariant }]}>Free</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
              <Text style={[styles.legendText, { color: paperTheme.colors.onSurfaceVariant }]}>Occupied</Text>
            </View>
          </View>

          <TablePickerGrid
            items={items}
            loading={loading}
            selectedTableId={selectedTableId}
            freeTablesOnly={freeTablesOnly}
            onSelectTable={(table) => {
              onSelectTable(table);
              onClose();
            }}
            emptyMessage="No tables yet. Add them in Settings → Manage tables."
          />
        </Pressable>
      </Pressable>

      {alertConfig && (
        <CommonAlert
          visible={alertVisible}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
});
