import React from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LottieView from "lottie-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootStackParamsList";
import { fonts } from "../../constants/fonts";
import { useTheme } from "../../context/ThemeContext";
import CommonHeader from "../../components/CommonHeader/CommonHeader";

type Props = NativeStackScreenProps<RootStackParamList, "ModuleHub">;

export default function ModuleHubScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();

  const goPos = () => {
    navigation.navigate("PosMain");
  };

  const goCost = () => {
    navigation.navigate("CostManagementMain");
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={["top", "bottom"]}
      >
        <CommonHeader
          title="Select Module"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] })


          }
          // onPressRightBtn={() => navigation.goBack()}
        />
        <View style={{ paddingHorizontal: 20 }}> 
          <View style={styles.lottieWrap}>
            <LottieView
              source={require("../../../assets/Lottie/system.json")}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>

          <View style={styles.header}>
            <Text
              style={[styles.title, { color: paperTheme.colors.onBackground }]}
            >
              Welcome
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Choose where you want to work today.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.card,
              { backgroundColor: paperTheme.colors.surface },
            ]}
            onPress={goPos}
            accessibilityRole="button"
            accessibilityLabel="Open POS System"
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: paperTheme.colors.primaryContainer },
              ]}
            >
              <Ionicons
                name="cart"
                size={32}
                color={paperTheme.colors.primary}
              />
            </View>
            <View style={styles.cardText}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: paperTheme.colors.onSurface },
                ]}
              >
                POS System
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Sales counter, inventory shortcuts, cart & checkout.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={paperTheme.colors.outline}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.card,
              { backgroundColor: paperTheme.colors.surface },
            ]}
            onPress={goCost}
            accessibilityRole="button"
            accessibilityLabel="Open Cost Management and Analysis"
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: paperTheme.colors.tertiaryContainer },
              ]}
            >
              <Ionicons
                name="analytics"
                size={32}
                color={paperTheme.colors.tertiary}
              />
            </View>
            <View style={styles.cardText}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: paperTheme.colors.onSurface },
                ]}
              >
                Cost Management and Analysis
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Track spending, margins, and financial insights.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={paperTheme.colors.outline}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,

    // justifyContent: 'center',
  },
  lottieWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    height: 200,
  },
  lottie: {
    width: "100%",
    maxWidth: 280,
    height: 200,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
});
