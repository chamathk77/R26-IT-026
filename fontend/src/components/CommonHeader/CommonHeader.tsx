import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IconButton, MD3Colors } from "react-native-paper"; 
import { fonts } from "../../constants/fonts";
import { useTheme } from "../../context/ThemeContext";

interface CommonHeader {
  onPressLeftBtn?: () => void;
  onPressRightBtn?: () => void;
  titleColor?: string;
  iconColor?: string;
  title: string;
  isOptions?: boolean;
}

const  CommonHeader = (props: CommonHeader) => {

  const { resolvedTheme, paperTheme } = useTheme();
  return (
    <View style={styles.header}>
      <View
        style={styles.backButton}
      // onPress={() => (props.onPressLeftBtn ? props.onPressLeftBtn() : null)}
      >
        {props.onPressLeftBtn ? <IconButton
          icon="arrow-left"
          iconColor={ props.iconColor ? props.iconColor : paperTheme.colors.primary}
          size={23}
          onPress={() => (props.onPressLeftBtn ? props.onPressLeftBtn() : null)}
        /> : null}
      </View>

      <View style={{ flex: 3,justifyContent:'center',alignItems:'center' }} >
        <Text 
          style={[styles.headerTitle, { color: props.titleColor ? props.titleColor : paperTheme.colors.primary }]}
          numberOfLines={1}
        >
          {props.title}
        </Text>
      </View>


      <View
        style={styles.forwardButton}
      // onPress={() => (props.onPressLeftBtn ? props.onPressLeftBtn() : null)}
      >
        {props.onPressRightBtn? <IconButton
          icon={props.isOptions ? "dots-vertical" : "arrow-right"}
          iconColor={props.iconColor ? props.iconColor : paperTheme.colors.primary}
          size={23}
          onPress={() => (props.onPressRightBtn ? props.onPressRightBtn() : null)}
        /> : null}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    height:50,
    // backgroundColor:'red'
   
   
    
  },
  backButton: {
    flex: 1,
    alignItems: "flex-start",

  },
  forwardButton: {
    flex: 1,
   
    alignItems: "flex-end",
  },
  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    fontFamily: fonts.PoppinsRegular,
    flexShrink: 1,
  },
});

export default CommonHeader;
