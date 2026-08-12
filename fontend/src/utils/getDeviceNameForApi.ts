import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Human-readable device label for API fields like `device_name` (model/brand, not the user's device nickname when possible).
 */
export function getDeviceNameForApi(): string {
  if (Platform.OS === 'web') {
    return 'Web';
  }
  if (!Device.isDevice) {
    return `${Platform.OS} simulator`;
  }
  const brand = Device.brand?.trim() ?? '';
  const model = (Device.modelName || Device.modelId || '').trim();
  const fromModel = [brand, model].filter(Boolean).join(' ').trim();
  if (fromModel) {
    return fromModel;
  }
  return Device.deviceName?.trim() || `${Platform.OS} device`;
}
