import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useDummySession } from '../../context/DummySessionContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileDetails'>;

export default function ProfileDetailsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { currentUser, updateOwnProfile, deleteOwnAccount } = useDummySession();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);

  useFocusEffect(
    useCallback(() => {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone);
    }, [currentUser.email, currentUser.name, currentUser.phone]),
  );

  const save = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation', 'Please fill name, email, and phone.');
      return;
    }
    updateOwnProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    });
    Alert.alert('Saved', 'Your profile was updated.');
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will remove your dummy profile and return to login. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteOwnAccount(),
        },
      ],
    );
  };

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
          title="Profile details"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            FULL NAME
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: surface }]}>
            <PaperTextInput
              value={name}
              onChangeText={setName}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={styles.input}
              contentStyle={styles.inputContent}
              theme={paperTheme}
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            PHONE
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: surface }]}>
            <PaperTextInput
              value={phone}
              onChangeText={setPhone}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              keyboardType="phone-pad"
              style={styles.input}
              contentStyle={styles.inputContent}
              theme={paperTheme}
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            EMAIL
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: surface }]}>
            <PaperTextInput
              value={email}
              onChangeText={setEmail}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              contentStyle={styles.inputContent}
              theme={paperTheme}
            />
          </View>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            ROLE (read-only)
          </Text>
          <View style={[styles.readOnlyBox, { backgroundColor: surface }]}>
            <Text style={[styles.readOnlyText, { color: paperTheme.colors.onSurface }]}>
              {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: paperTheme.colors.primary }]}
            onPress={save}
          >
            <Text style={[styles.primaryBtnText, { color: paperTheme.colors.onPrimary }]}>
              Save changes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerOutline, { borderColor: '#dc2626' }]}
            onPress={confirmDeleteAccount}
          >
            <Text style={styles.dangerText}>Delete account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 12,
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
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  primaryBtnText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: 1,
  },
  dangerOutline: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    color: '#dc2626',
  },
});
