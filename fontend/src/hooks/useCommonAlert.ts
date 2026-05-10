import { useCallback, useState } from 'react';

interface AlertConfig {
  type: "success" | "error" | "pending";
  title: string;
  message: string;
  buttons: 0 | 1 | 2;
  positiveButtonText?: string;
  negativeButtonText?: string;
  onPositivePress?: () => void;
  onNegativePress?: () => void;

  MoreDetails?: boolean,
  OtherDescirption?: string,
  OtherButtonPress?: () => void,
  OtherButtonText?: string
}

export const useCommonAlert = () => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setAlertConfig(null);
    }, 100);
  }, []);

  // const showSuccess = (
  //   title: string,
  //   message: string,
  //   onPress?: () => void,
  //   buttonText: string = 'OK'
  // ) => {
  //   showAlert({
  //     type: ,
  //     title,
  //     message,
  //     buttons: 1,
  //     positiveButtonText: buttonText,
  //     onPositivePress: onPress,
  //   });
  // };

  // const showError = (
  //   title: string,
  //   message: string,
  //   onPress?: () => void,
  //   buttonText: string = 'OK'
  // ) => {
  //   showAlert({
  //     type: 2,
  //     title,
  //     message,
  //     buttons: 1,
  //     positiveButtonText: buttonText,
  //     onPositivePress: onPress,
  //   });
  // };

  // const showErrorConfirm = (
  //   title: string,
  //   message: string,
  //   onConfirm?: () => void,
  //   onCancel?: () => void,
  //   confirmText: string = 'Confirm',
  //   cancelText: string = 'Cancel'
  // ) => {
  //   showAlert({
  //     type: 2,
  //     title,
  //     message,
  //     buttons: 2,
  //     positiveButtonText: confirmText,
  //     negativeButtonText: cancelText,
  //     onPositivePress: onConfirm,
  //     onNegativePress: onCancel,
  //   });
  // };


  // const showSuccessConfirm = (
  //   title: string,
  //   message: string,
  //   onConfirm?: () => void,
  //   onCancel?: () => void,
  //   confirmText: string = 'Confirm',
  //   cancelText: string = 'Cancel'
  // ) => {
  //   showAlert({
  //     type: 1,
  //     title,
  //     message,
  //     buttons: 2,
  //     positiveButtonText: confirmText,
  //     negativeButtonText: cancelText,
  //     onPositivePress: onConfirm,
  //     onNegativePress: onCancel,
  //   });
  // };


  // const showErrorAlert_SignUp = (
  //   title: string,
  //   message: string,
  //   onPress?: () => void,
  //   buttonText: string = 'OK',

  //   // for sign up process alerts 
  //   MoreDetails: boolean = true,
  //   OtherDescirption = "Changed Mind?",
  //   OtherButtonPress?: () => void,
  //   OtherButtonText = "Cancel Request"
  // ) => {
  //   showAlert({
  //     type: 2,
  //     title,
  //     message,
  //     buttons: 1,
  //     positiveButtonText: buttonText,
  //     onPositivePress: onPress,

  //     // for sign up process alerts 
  //     MoreDetails: MoreDetails,
  //     OtherDescirption: OtherDescirption,
  //     OtherButtonPress: OtherButtonPress,
  //     OtherButtonText: OtherButtonText




  //   });
  // };


  const show_Alert = useCallback(
    (
      type: 'success' | 'error' | 'pending',
      title: string,
      message: string,
      buttons: 0 | 1 | 2,
      MoreDetails: boolean = false,
      positiveButtonText: string = 'OK',
      onPositivePress?: () => void,
      negativeButtonText: string = 'Cancel',
      onNegativePress?: () => void,
      OtherDescirption = 'Changed Mind?',
      OtherButtonPress?: () => void,
      OtherButtonText = 'Cancel Request',
    ) => {
      showAlert({
        type,
        title,
        message,
        buttons,
        positiveButtonText,
        onPositivePress,
        negativeButtonText,
        onNegativePress,
        MoreDetails,
        OtherDescirption,
        OtherButtonPress,
        OtherButtonText,
      });
    },
    [showAlert],
  );









  return {
    alertConfig,
    visible,
    showAlert,
    hideAlert,
    show_Alert,
    // showSuccess,
    // showError,
    // showErrorConfirm,
    // showSuccessConfirm,
    // showErrorAlert_SignUp,

  };
}; 