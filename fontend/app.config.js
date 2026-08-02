const APP_ICON = './assets/icon.png';

const IOS_INFO_PLIST = {
  NSCameraUsageDescription:
    'Smart Cost uses the camera to scan product barcodes and capture product images.',
  NSPhotoLibraryUsageDescription:
    'Smart Cost uses your photo library so you can select and upload product images.',
  NSLocalNetworkUsageDescription:
    'Smart Cost uses your local network to connect to supported LAN receipt printers.',
};

module.exports = ({ config }) => ({
  ...config,
  icon: APP_ICON,
  userInterfaceStyle: 'automatic',
  plugins: [
    'expo-font',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: APP_ICON,
        imageWidth: 280,
        resizeMode: 'contain',
        backgroundColor: '#000000',
        dark: {
          image: APP_ICON,
          backgroundColor: '#000000',
        },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Smart Cost uses the camera to scan product barcodes and QR codes.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Smart Cost uses your photo library so you can select product images.',
        cameraPermission:
          'Smart Cost uses the camera so you can capture product images.',
        microphonePermission: false,
      },
    ],
  ],
  splash: {
    image: APP_ICON,
    resizeMode: 'contain',
    backgroundColor: '#000000',
    dark: {
      image: APP_ICON,
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
  },
  ios: {
    ...config.ios,
    bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.chamath.smartcost',
    buildNumber: config.ios?.buildNumber ?? '1',
    icon: APP_ICON,
    config: {
      ...config.ios?.config,
      usesNonExemptEncryption: false,
    },
    splash: {
      image: APP_ICON,
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      ...IOS_INFO_PLIST,
    },
  },
  android: {
    ...config.android,
    package: config.android?.package ?? 'com.chamath.smartcost',
    icon: APP_ICON,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    splash: {
      image: APP_ICON,
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CAMERA',
    ],
  },
  web: {
    ...config.web,
    favicon: APP_ICON,
  },
});
