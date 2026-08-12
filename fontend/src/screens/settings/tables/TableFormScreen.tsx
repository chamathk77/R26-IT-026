import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { createTable_Service, updateTable_Service } from '../../../services/TableService';
import { ShopTable } from '../../../type/table';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../shared/settingsDetailStyles';
import { inventoryUi } from '../../pos/ManageInventory/inventoryUiStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'TableForm'>;

export default function TableFormScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const initialTable = route.params?.table;
  const isEditing = Boolean(initialTable?._id);

  const [tableNumber, setTableNumber] = useState(initialTable?.tableNumber ?? '');
  const [capacity, setCapacity] = useState(
    initialTable?.capacity != null ? String(initialTable.capacity) : '',
  );
  const [zone, setZone] = useState(initialTable?.zone ?? '');
  const [sortOrder, setSortOrder] = useState(
    initialTable?.sortOrder != null ? String(initialTable.sortOrder) : '',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialTable) return;
    setTableNumber(initialTable.tableNumber);
    setCapacity(initialTable.capacity != null ? String(initialTable.capacity) : '');
    setZone(initialTable.zone ?? '');
    setSortOrder(initialTable.sortOrder != null ? String(initialTable.sortOrder) : '');
  }, [initialTable]);

  const title = useMemo(() => (isEditing ? 'Edit table' : 'Add table'), [isEditing]);

  const handleSave = useCallback(async () => {
    const trimmedNumber = tableNumber.trim();
    if (!trimmedNumber) {
      show_Alert('error', 'Required', 'Table number is required.', 1, true, 'OK');
      return;
    }

    let parsedCapacity: number | null = null;
    if (capacity.trim()) {
      parsedCapacity = Number.parseInt(capacity.trim(), 10);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
        show_Alert('error', 'Invalid capacity', 'Capacity must be a positive whole number.', 1, true, 'OK');
        return;
      }
    }

    let parsedSortOrder: number | undefined;
    if (sortOrder.trim()) {
      parsedSortOrder = Number.parseInt(sortOrder.trim(), 10);
      if (!Number.isInteger(parsedSortOrder)) {
        show_Alert('error', 'Invalid sort order', 'Sort order must be a whole number.', 1, true, 'OK');
        return;
      }
    }

    Keyboard.dismiss();
    setSaving(true);
    try {
      if (isEditing && initialTable) {
        await dispatch(
          updateTable_Service({
            id: initialTable._id,
            tableNumber: trimmedNumber,
            capacity: parsedCapacity,
            zone: zone.trim(),
            sortOrder: parsedSortOrder,
          }),
        ).unwrap();
      } else {
        await dispatch(
          createTable_Service({
            tableNumber: trimmedNumber,
            capacity: parsedCapacity,
            zone: zone.trim(),
            sortOrder: parsedSortOrder,
          }),
        ).unwrap();
      }

      navigation.goBack();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Save failed',
        getApiErrorMessage(error, 'Could not save this table.'),
        1,
        true,
        'OK',
      );
    } finally {
      setSaving(false);
    }
  }, [
    capacity,
    dispatch,
    initialTable,
    isEditing,
    navigation,
    show_Alert,
    sortOrder,
    tableNumber,
    zone,
  ]);

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: { placeholder?: string; keyboardType?: 'default' | 'number-pad' },
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={[inventoryUi.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor={paperTheme.colors.onSurfaceVariant}
        keyboardType={options?.keyboardType ?? 'default'}
        style={[
          inventoryUi.fieldInput,
          {
            backgroundColor: paperTheme.colors.surfaceVariant,
            color: paperTheme.colors.onSurface,
          },
        ]}
      />
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, styles.screen, { backgroundColor: paperTheme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <CommonHeader
          title={title}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.formCard,
              { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant },
              cardShadow(resolvedTheme),
            ]}
          >
            {renderField('Table number *', tableNumber, setTableNumber, {
              placeholder: '12 or Table 12',
              keyboardType: 'default',
            })}
            {renderField('Capacity (seats)', capacity, setCapacity, {
              placeholder: '4',
              keyboardType: 'number-pad',
            })}
            {renderField('Zone', zone, setZone, {
              placeholder: 'Indoor, patio, bar…',
            })}
            {renderField('Sort order', sortOrder, setSortOrder, {
              placeholder: '0',
              keyboardType: 'number-pad',
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: paperTheme.colors.primary, opacity: saving ? 0.7 : 1 },
            ]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                {isEditing ? 'Save changes' : 'Create table'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

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
  content: {
    paddingBottom: 24,
    gap: 16,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  fieldBlock: {
    marginBottom: 4,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});
