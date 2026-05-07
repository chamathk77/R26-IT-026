import React, { useState } from 'react';
import { Alert, Keyboard, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../constants/fonts';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { signup_Service } from '../../services/AuthService';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { devLog } from '../../utils/devLog';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUpScreen'>;

export default function SignUpScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  const onCreateAccount = async () => {

    try {
      if (
        !name.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !role.trim() ||
        !password.trim() ||
        !confirmPassword.trim()
      ) {
        Alert.alert('Validation', 'Please fill in all fields.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Validation', 'Passwords do not match.');
        return;
      }
      const response = await dispatch(
        signup_Service({ name, email, phone: phone.trim(), role, password }),
      ).unwrap();
      devLog('Signup response:', response);
      Alert.alert('Success', 'Signup successful');

      Keyboard.dismiss();
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
      

      setName('');
      setEmail('');
      setPhone('');
      setRole('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsRoleMenuOpen(false);
    
    } catch (error) {
      devLog('Signup error:', error);
      Alert.alert('Error', 'Signup failed');
      
    }
    Keyboard.dismiss();
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: paperTheme.colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollViewContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            enableResetScrollToCoords={false}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 50}
          >
            <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
              <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>Create Account</Text>
              <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>
                Fill in your details to sign up.
              </Text>

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <PaperTextInput
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9b9ca5"
                  keyboardType="default"
                  value={name}
                  onChangeText={setName}
                  cursorColor="#a16207"
                  theme={paperTheme}
                />
              </View>

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <PaperTextInput
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  placeholder="Enter your email"
                  placeholderTextColor="#9b9ca5"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  cursorColor="#a16207"
                  theme={paperTheme}
                />
              </View>

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>PHONE</Text>
              <View style={styles.inputWrapper}>
                <PaperTextInput
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9b9ca5"
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  cursorColor="#a16207"
                  theme={paperTheme}
                />
              </View>

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>ROLE</Text>
              <TouchableOpacity style={styles.inputWrapper} onPress={() => setIsRoleMenuOpen((prev) => !prev)}>
                <Text style={[styles.dropdownValue, { color: role ? '#18181b' : '#9b9ca5' }]}>
                  {role || 'Select your role'}
                </Text>
                <Text style={styles.dropdownArrow}>{isRoleMenuOpen ? '^' : 'v'}</Text>
              </TouchableOpacity>

              {isRoleMenuOpen && (
                <View style={styles.dropdownMenu}>
                  {['admin', 'owner', 'staff'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setRole(option);
                        setIsRoleMenuOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <PaperTextInput
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  right={
                    <PaperTextInput.Icon
                      icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setShowPassword((prev) => !prev)}
                    />
                  }
                  placeholder="Enter password"
                  placeholderTextColor="#9b9ca5"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  cursorColor="#a16207"
                  theme={paperTheme}
                />
              </View>

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <PaperTextInput
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  right={
                    <PaperTextInput.Icon
                      icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                    />
                  }
                  placeholder="Confirm password"
                  placeholderTextColor="#9b9ca5"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  cursorColor="#a16207"
                  theme={paperTheme}
                />
              </View>

              <TouchableOpacity style={[styles.button, { backgroundColor: paperTheme.colors.primary }]} onPress={onCreateAccount}>
                <Text style={[styles.buttonText, { color: paperTheme.colors.onPrimary }]}>SIGN UP</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
                <Text style={[styles.loginText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Already have an account? <Text style={styles.loginLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eeedf5',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 24,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 2.1,
    marginBottom: 8,
  },
  inputWrapper: {
    height: 66,
    backgroundColor: '#ececf1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    color: '#18181b',
    backgroundColor: 'transparent',
  },
  inputContent: {
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    color: '#18181b',
  },
  dropdownValue: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
  },
  dropdownArrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#57534e',
    marginLeft: 8,
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    color: '#18181b',
    textTransform: 'capitalize',
  },
  button: {
    height: 60,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  buttonText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    letterSpacing: 2,
  },
  loginText: {
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    textAlign: 'center',
  },
  loginLink: {
    fontFamily: fonts.InterBold,
    color: '#8a6500',
  },
});
