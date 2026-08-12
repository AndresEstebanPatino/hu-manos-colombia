import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../src/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Página no encontrada" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esta pantalla no existe.</Text>

        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Volver al Inicio de Hu-Mano Colombia</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
  },
});
