const APP_ICON = './assets/icon.png';

module.exports = ({ config }) => ({
  ...config,
  icon: APP_ICON,
  userInterfaceStyle: 'automatic',
  plugins: [
    ...(config.plugins || []),
    'expo-font',
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
      'expo-image-picker',
      {
        photosPermission:
          'We need photo library access so you can choose product images from your device.',
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
    icon: APP_ICON,
    splash: {
      image: APP_ICON,
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      NSCameraUsageDescription:
        'We need camera access to capture photos for verification.',
      NSPhotoLibraryUsageDescription:
        'We need photo library access to upload verification images.',
      NSMicrophoneUsageDescription:
        'We need microphone access when recording audio in the app.',
      NSLocalNetworkUsageDescription:
        'SmartCost needs local network access to connect to your LAN receipt printer.',
    },
  },
  android: {
    ...config.android,
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
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    ...config.web,
    favicon: APP_ICON,
  },
});
