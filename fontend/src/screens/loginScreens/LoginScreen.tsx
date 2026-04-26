import { useState } from 'react';
import { Alert, Keyboard, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput as PaperTextInput } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useRef } from 'react';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

const appVersion = require('../../../package.json').version;


type Props = NativeStackScreenProps<RootStackParamList, "LoginScreen">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { paperTheme, resolvedTheme } = useTheme();
  const scrollRef = useRef<any>(null);
  const emailInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);

  const onLogin = () => {
    // if (!email.trim() || !password.trim()) {
    //   Alert.alert('Validation', 'Please enter both institutional email and password.');
    //   return;
    // }

    // Alert.alert('Login', `Welcome back, ${email}!`);
    Keyboard.dismiss();
    navigation.navigate('AuthenticationScreen');
  };

  const onSignUp = () => {
    Keyboard.dismiss();
    navigation.navigate('AuthenticationScreen');
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
        nestedScrollEnabled={true}
        >
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollViewContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          enableResetScrollToCoords={false}
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 50}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          innerRef={(ref: any) => {
            // Assign ref to use for scrollToFocusedInput
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            scrollRef.current = ref;
          }}
        >
          <View style={styles.lottieWrapper}>
            <LottieView
              source={require('../../../assets/Lottie/management.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
          <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
            <View>
              <Text style={[styles.heading, { color: paperTheme.colors.onSurface }]}>Sign In</Text>
              <Text style={[styles.subheading, { color: paperTheme.colors.onSurfaceVariant }]}>Please provide your academic credentials.</Text>

              <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}> EMAIL</Text>
              <View style={styles.inputWrapper}>
                <PaperTextInput
                  ref={emailInputRef}
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  // left={<PaperTextInput.Icon icon="at" />}
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

              <View style={styles.passwordRow}>
                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>PASSWORD</Text>
              </View>

              <View style={[styles.inputWrapper]}>
                <PaperTextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.inputContent}
                  // left={<PaperTextInput.Icon icon="lock-outline" />}
                  right={
                    <PaperTextInput.Icon
                      icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setShowPassword((prev) => !prev)}
                    />
                  }
                  placeholder="••••••••••••"
                  placeholderTextColor="#9b9ca5"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  cursorColor="#a16207"
                  theme={paperTheme}
                />
              </View>

              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={() => navigation.navigate('EnterEmailScreen')}>
                <Text style={[styles.forgotPassword, { color: paperTheme.colors.onSurfaceVariant, borderBottomWidth: 0.3, borderBottomColor: paperTheme.colors.onSurfaceVariant }]}>Forgot Password ?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, { backgroundColor: paperTheme.colors.primary, borderRadius: 15 }]} onPress={onLogin}>
                <Text style={[styles.buttonText, { color: paperTheme.colors.onPrimary, fontSize: 14 }]}>SIGN IN &gt;</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={[styles.dividerText, { color: paperTheme.colors.onSurfaceVariant }]}>Or Authenticate With</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity onPress={onSignUp}>
                <Text style={[styles.registerText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  New staff or student? <Text style={styles.registerLink}>Register Account</Text>
                </Text>
              </TouchableOpacity>
            </View>

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

  },
  lottieWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height:250,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    color: '#171717',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: fonts.InterRegular,
    fontSize: 15,
    color: '#52525b',
    marginBottom: 30,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#52525b',
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
    marginBottom: 20,
  },
  inputIcon: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    color: '#57534e',
    marginRight: 12,
    width: 26,
    alignItems: 'center',
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
    fontSize: 17,
    color: '#18181b',

  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotPassword: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    color: '#a16207',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -12,
    marginBottom: 8,
  },
  button: {
    height: 60,
    backgroundColor: '#c48d00',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 26,
    shadowColor: '#6b4f00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 3,
  },
  buttonText: {
    fontFamily: fonts.PoppinsBold,
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e4e4e7',
  },
  dividerText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    color: '#9a9aa4',
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },
  registerText: {
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    color: '#3f3f46',
    textAlign: 'center',
  },
  registerLink: {
    fontFamily: fonts.InterBold,
    color: '#8a6500',
  },
  encryptionText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    color: '#9a9aa4',
    textAlign: 'center',
    letterSpacing: 3,
  },
});
