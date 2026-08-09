/**
 * react-native-thermal-receipt-printer ships libPrinterSDK.a with a static
 * copy of GCDAsyncSocket/CocoaAsyncSocket, which conflicts with
 * react-native-tcp-socket on iOS (duplicate linker symbols).
 *
 * LAN printing on iOS uses tcp-socket only; USB printer support stays on Android.
 */
module.exports = {
  dependencies: {
    'react-native-thermal-receipt-printer': {
      platforms: {
        ios: null,
      },
    },
  },
};
