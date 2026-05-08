import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useDummySession } from '../../context/DummySessionContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import { UserRole } from '../../data/dummyUsers';

type Props = NativeStackScreenProps<RootStackParamList, 'EditUser'>;

const ROLE_OPTIONS_OWNER: UserRole[] = ['admin', 'staff'];

export default function EditUserScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const { users, currentUser, updateUserById } = useDummySession();

  const target = useMemo(() => users.find((u) => u.id === userId), [users, userId]);

  const [name, setName] = useState(target?.name ?? '');
  const [email, setEmail] = useState(target?.email ?? '');
  const [phone, setPhone] = useState(target?.phone ?? '');
  const [role, setRole] = useState<UserRole | null>(target?.role ?? null);

  useEffect(() => {
    if (target) {
      setName(target.name);
      setEmail(target.email);
      setPhone(target.phone);
      setRole(target.role);
    }
  }, [target]);

  const isOwnerEditor = currentUser.role === 'owner';
  const isAdminEditor = currentUser.role === 'admin';
  const isTargetStaff = target?.role === 'staff';

  /** Owner editing another user: only role is editable. */
  const contactReadOnly = isOwnerEditor;

  /** Admin may fully edit staff; cannot use this screen for non-staff (shouldn't appear in list). */
  const canEditAllContact = isAdminEditor && isTargetStaff;

  const canEditRole = isOwnerEditor || (isAdminEditor && isTargetStaff);

  const availableRoles = useMemo((): UserRole[] => {
    if (isAdminEditor && isTargetStaff) {
      return ['staff'];
    }
    if (isOwnerEditor) {
      return ROLE_OPTIONS_OWNER;
    }
    return [];
  }, [isAdminEditor, isOwnerEditor, isTargetStaff]);

  const save = useCallback(() => {
    if (!target || role == null) return;

    if (contactReadOnly) {
      updateUserById(target.id, { role });
      Alert.alert('Saved', 'Role updated.');
      navigation.goBack();
      return;
    }

    if (canEditAllContact) {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        Alert.alert('Validation', 'Fill all fields.');
        return;
      }
      updateUserById(target.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
      });
      Alert.alert('Saved', 'User updated.');
      navigation.goBack();
    }
  }, [
    canEditAllContact,
    contactReadOnly,
    email,
    name,
    navigation,
    phone,
    role,
    target,
    updateUserById,
  ]);

  if (!target || role == null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Edit user"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <Text style={{ padding: 16, fontFamily: fonts.PoppinsRegular }}>User not found.</Text>
      </SafeAreaView>
    );
  }

  const surface = paperTheme.colors.surface;

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
          title="Edit user"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {contactReadOnly && (
            <Text style={[styles.hint, { color: paperTheme.colors.primary }]}>
              As owner, you can change this user&apos;s role only. Other fields are read-only.
            </Text>
          )}
          {canEditAllContact && (
            <Text style={[styles.hint, { color: paperTheme.colors.onSurfaceVariant }]}>
              Admin can update staff name, contact details, and role.
            </Text>
          )}

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>FULL NAME</Text>
          <View style={[styles.inputWrap, { backgroundColor: surface }]}>
            <PaperTextInput
              value={name}
              onChangeText={setName}
              editable={!contactReadOnly}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={[styles.input, contactReadOnly && styles.dim]}
              contentStyle={styles.inputContent}
              theme={paperTheme}
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>PHONE</Text>
          <View style={[styles.inputWrap, { backgroundColor: surface }]}>
            <PaperTextInput
              value={phone}
              onChangeText={setPhone}
              editable={!contactReadOnly}
              keyboardType="phone-pad"
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={[styles.input, contactReadOnly && styles.dim]}
              contentStyle={styles.inputContent}
              theme={paperTheme}
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>EMAIL</Text>
          <View style={[styles.inputWrap, { backgroundColor: surface }]}>
            <PaperTextInput
              value={email}
              onChangeText={setEmail}
              editable={!contactReadOnly}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={[styles.input, contactReadOnly && styles.dim]}
              contentStyle={styles.inputContent}
              theme={paperTheme}
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>ROLE</Text>
          {canEditRole ? (
            <View style={styles.roleRow}>
              {availableRoles.map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: active ? paperTheme.colors.primary : surface,
                        borderColor: paperTheme.colors.outline,
                      },
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: active ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface },
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.readOnlyBox, { backgroundColor: surface }]}>
              <Text style={[styles.readOnlyText, { color: paperTheme.colors.onSurface }]}>
                {role}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: paperTheme.colors.primary }]}
            onPress={save}
          >
            <Text style={[styles.primaryBtnText, { color: paperTheme.colors.onPrimary }]}>
              Save
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  hint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 19,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
  },
  inputWrap: {
    borderRadius: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'transparent',
    fontFamily: fonts.InterRegular,
    fontSize: 16,
  },
  dim: {
    opacity: 0.75,
  },
  inputContent: {
    fontFamily: fonts.InterRegular,
    fontSize: 16,
  },
  readOnlyBox: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  readOnlyText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 16,
    textTransform: 'capitalize',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  roleChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: 1,
  },
});
