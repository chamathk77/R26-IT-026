import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fonts } from '../../../constants/fonts';
import {
  isValidCheckoutPhone,
  sanitizeCheckoutPhone,
} from '../../../type/checkoutPayment';

type Props = {
  visible: boolean;
  initialMobile: string;
  loading: boolean;
  onClose: () => void;
  onSend: (mobile: string) => void;
  paperTheme: {
    colors: {
      background: string;
      onSurface: string;
      onSurfaceVariant: string;
      outlineVariant: string;
      surfaceVariant: string;
      primary: string;
      onPrimary: string;
      error: string;
    };
  };
};

export default function ResendBillModal({
  visible,
  initialMobile,
  loading,
  onClose,
  onSend,
  paperTheme,
}: Props) {
  const [mobile, setMobile] = useState(initialMobile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMobile(sanitizeCheckoutPhone(initialMobile));
      setError(null);
    }
  }, [visible, initialMobile]);

  const handleSend = () => {
    Keyboard.dismiss();
    const sanitized = sanitizeCheckoutPhone(mobile);
    if (!isValidCheckoutPhone(sanitized)) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setError(null);
    onSend(sanitized);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>Resend bill SMS</Text>
          <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            Send the digital receipt link to the customer phone number below.
          </Text>

          <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
            Customer mobile
          </Text>
          <TextInput
            value={mobile}
            onChangeText={(value) => {
              setMobile(sanitizeCheckoutPhone(value));
              if (error) setError(null);
            }}
            placeholder="07XXXXXXXX"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!loading}
            style={[
              styles.input,
              {
                color: paperTheme.colors.onSurface,
                backgroundColor: paperTheme.colors.surfaceVariant,
                borderColor: error ? paperTheme.colors.error : paperTheme.colors.outlineVariant,
              },
            ]}
          />
          {error ? (
            <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{error}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={loading}
              onPress={onClose}
              style={[
                styles.actionBtn,
                styles.cancelBtn,
                { borderColor: paperTheme.colors.outlineVariant },
              ]}
            >
              <Text style={[styles.cancelText, { color: paperTheme.colors.onSurface }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={loading}
              onPress={handleSend}
              style={[
                styles.actionBtn,
                styles.sendBtn,
                {
                  backgroundColor: paperTheme.colors.primary,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <Text style={[styles.sendText, { color: paperTheme.colors.onPrimary }]}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 4,
  },
  label: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  sendBtn: {},
  cancelText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  sendText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});
