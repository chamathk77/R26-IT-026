import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

interface CommonAlertProps {
    visible: boolean;
    type: "success" | "error" | "pending"; // 1 = success, 2 = error/warning
    title: string;
    message: string;
    buttons:0| 1 | 2; // 1 = single button, 2 = two buttons
    positiveButtonText?: string;
    negativeButtonText?: string;
    onPositivePress?: () => void;
    onNegativePress?: () => void;
    onClose?: () => void;

    // for singup alerts

    MoreDetails?: boolean,
    OtherDescirption?: string,
    OtherButtonPress?: () => void,
    OtherButtonText?: string
}

const { width } = Dimensions.get('window');

const CommonAlert: React.FC<CommonAlertProps> = ({
    visible,
    type,
    title,
    message,
    buttons,
    positiveButtonText = 'OK',
    negativeButtonText = 'Cancel',
    onPositivePress,
    onNegativePress,
    onClose,

    // for singup alerts
    MoreDetails,
    OtherButtonPress,
    OtherButtonText,
    OtherDescirption
}) => {
    const { resolvedTheme, paperTheme } = useTheme();


    const handlePositivePress = () => {
        if (onPositivePress) {
            onPositivePress();
        }
        if (onClose) {
            onClose();
        }
    };

    const handleNegativePress = () => {
        if (onNegativePress) {
            onNegativePress();
        }
        if (onClose) onClose();
    };

    const handleOtherButtonPress = () => {
        if (OtherButtonPress) {
            OtherButtonPress();
        }
        if (onClose) {
            onClose();
        }
    };

    const renderIcon = () => {
        const iconName =
            type === 'success'
                ? 'checkmark-circle'
                : type === 'error'
                    ? 'close-circle'
                    : 'time';

        const iconColor =
            type === 'success'
                ? '#16A34A'
                : type === 'error'
                    ? '#DC2626'
                    : paperTheme.colors.primary;

        return <Ionicons name={iconName} size={88} color={iconColor} />;
    };

    const getPositiveButtonStyle = () => {
        if (type === "error" && buttons === 2) {
            return { backgroundColor: "#FF0000" };
        }
        if (type === "error" && buttons === 1) {
            return { backgroundColor: paperTheme.colors.primary };
        }
        if (type === "success" && buttons === 2) {
            return { backgroundColor: paperTheme.colors.primary };
        }
        if (type === "success" && buttons === 1) {
            return { backgroundColor: paperTheme.colors.primary };
        }
        if (type === "pending" && buttons === 1) {
            return { backgroundColor: paperTheme.colors.primary };
        }
        if (type === "pending" && buttons === 2) {
            return { backgroundColor: paperTheme.colors.primary };
        }
    };

    const getNegativeButtonStyle = () => {
        if (type === "error" && buttons === 2) {
            return { backgroundColor: "#AAAAAA" };
        }
        if (type === "success" && buttons === 2) {
            return { backgroundColor: "#AAAAAA" };
        }
        if (type === "pending" && buttons === 2) {
            return { backgroundColor: "#AAAAAA" };
        }
        // return { color: paperTheme.colors.onPrimary };
    }

    return (
        <Modal
            visible={visible}
            onDismiss={onClose}
            contentContainerStyle={styles.modalContent}
        >
            <View style={[styles.alertContainer, { backgroundColor: resolvedTheme === 'light' ? paperTheme.colors.background : paperTheme.colors.secondary }]}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    {renderIcon()}
                </View>

                {/* Title */}
                {title.length > 0 ? <Text style={[styles.title, { color: resolvedTheme === 'light' ? "#4B4A96" : "#FFFFFF" }]}>{title}</Text> : <View style={{
                    height: 10, marginBottom: 20,
                    marginTop: 20,
                }} />}

                {/* Message */}
                {message.length > 0 ? <Text style={[styles.message, { color: resolvedTheme === 'light' ? "#5A5A5A" : "#FFFFFF" }]}>{message}</Text> : <View style={{
                    height: 10, marginBottom: 10,
                    marginTop: 0,
                }} />}

                {/* Buttons */}
               {buttons !== 0?<View style={[styles.buttonContainer, buttons == 1 ? { justifyContent: 'center' } : {justifyContent: 'space-between', marginTop: 10 ,}]}>
                  
                    {buttons === 2 && (
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.cancelButton,
                                getNegativeButtonStyle()
                            ]}
                            onPress={handleNegativePress}
                        >
                            <Text style={[styles.buttonText, { color: paperTheme.colors.onPrimary }]}>
                                {negativeButtonText}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            getPositiveButtonStyle()
                        ]}
                        onPress={handlePositivePress}
                    >
                        <Text style={[styles.buttonText,
                        { color: paperTheme.colors.onPrimary }


                        ]}>
                            {positiveButtonText}
                        </Text>
                    </TouchableOpacity>

                </View>:<View />}




                {MoreDetails == true &&
                    <>
                        {OtherDescirption && <Text style={{ fontSize: 16, color: resolvedTheme === 'light' ? "#5A5A5A" : "#FFFFFF", fontFamily: fonts.PoppinsRegular, marginTop: 15,marginBottom: 5 }}>
                            {OtherDescirption}
                        </Text>}

                        <TouchableOpacity onPress={handleOtherButtonPress} >
                            <Text style={{
                                fontSize: 16, color: "#FF0000", fontFamily: fonts.PoppinsSemiBold,
                                textDecorationLine: "underline"
                            }}>
                                {OtherButtonText}
                            </Text>

                        </TouchableOpacity>
                    </>
                }

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContent: {
        backgroundColor: 'transparent',
        padding: 20,
        margin: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 24,
        width: width * 0.85,
        maxWidth:400,
        alignItems: 'center',
        shadowColor: '#888888',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 4,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        position: 'absolute',
        zIndex: 1,
        top: -40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        marginTop: 40,
        fontFamily: fonts.InterBold,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        fontFamily: fonts.PoppinsRegular,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 20,
        // backgroundColor:'yellow',
        paddingHorizontal:10
        
    
    },
    button: {
        // width: "50%",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        minWidth: 120,
    },
    cancelButton: {
        // Additional cancel button styles if needed
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: fonts.PoppinsBold,
    }
});

export default CommonAlert; 