import { Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type ShowAlertFn = (
  type: 'success' | 'error' | 'pending',
  title: string,
  message: string,
  buttons: 0 | 1 | 2,
  MoreDetails?: boolean,
  positiveButtonText?: string,
  onPositivePress?: () => void,
  negativeButtonText?: string,
  onNegativePress?: () => void,
) => void;

function showPermissionDeniedAlert(
  show_Alert: ShowAlertFn,
  {
    title,
    message,
    settingsMessage,
    canAskAgain,
  }: {
    title: string;
    message: string;
    settingsMessage: string;
    canAskAgain: boolean;
  },
) {
  if (!canAskAgain) {
    show_Alert(
      'error',
      title,
      settingsMessage,
      2,
      false,
      'Open Settings',
      () => {
        void Linking.openSettings();
      },
      'Cancel',
      () => {},
    );
    return;
  }

  show_Alert('error', title, message, 1, false, 'OK', () => {});
}

export async function ensureMediaLibraryPermission(show_Alert: ShowAlertFn): Promise<boolean> {
  let permission = await ImagePicker.getMediaLibraryPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }

  if (permission.granted) {
    return true;
  }

  showPermissionDeniedAlert(show_Alert, {
    title: 'Photo library access required',
    message:
      'Please allow photo library access when prompted so you can choose a receipt image.',
    settingsMessage:
      'Photo library access is turned off. Open Settings and enable Photos permission for this app.',
    canAskAgain: permission.canAskAgain,
  });
  return false;
}

export async function ensureCameraPermission(show_Alert: ShowAlertFn): Promise<boolean> {
  let permission = await ImagePicker.getCameraPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestCameraPermissionsAsync();
  }

  if (permission.granted) {
    return true;
  }

  showPermissionDeniedAlert(show_Alert, {
    title: 'Camera access required',
    message:
      'Please allow camera access when prompted so you can take a photo of your receipt.',
    settingsMessage:
      'Camera access is turned off. Open Settings and enable Camera permission for this app.',
    canAskAgain: permission.canAskAgain,
  });
  return false;
}

export async function pickReceiptFromGallery(show_Alert: ShowAlertFn): Promise<string | null> {
  const hasPermission = await ensureMediaLibraryPermission(show_Alert);
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  });

  if (!result.canceled && result.assets[0]?.uri) {
    return result.assets[0].uri;
  }

  return null;
}

export async function takeReceiptPhoto(show_Alert: ShowAlertFn): Promise<string | null> {
  const hasPermission = await ensureCameraPermission(show_Alert);
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  });

  if (!result.canceled && result.assets[0]?.uri) {
    return result.assets[0].uri;
  }

  return null;
}
