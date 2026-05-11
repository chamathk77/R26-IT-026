module.exports = ({ config }) => ({
  ...config,
  userInterfaceStyle: 'automatic',
  plugins: [
    ...(config.plugins || []),
    'expo-font',
    [
      'expo-image-picker',
      {
        photosPermission:
          'We need photo library access so you can choose product images from your device.',
      },
    ],
  ],
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#6161DF',
    dark: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#6161DF',
    },
  },
  ios: {
    ...config.ios,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#6161DF',
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      NSCameraUsageDescription:
        'We need camera access to capture photos for verification.',
      NSPhotoLibraryUsageDescription:
        'We need photo library access to upload verification images.',
      NSMicrophoneUsageDescription:
        'We need microphone access when recording audio in the app.',
    },
  },
  android: {
    ...config.android,
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
});
