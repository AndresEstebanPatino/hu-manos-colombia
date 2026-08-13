import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../src/constants/theme";

export default function AcercaDeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleOpenEmail = async () => {
    const emailUrl = "mailto:andresp199519@gmail.com?subject=Reporte%20Hu-Mano%20Colombia";
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen || Platform.OS === "web") {
        await Linking.openURL(emailUrl);
      } else {
        await Linking.openURL("mailto:andresp199519@gmail.com");
      }
    } catch {
      Linking.openURL("mailto:andresp199519@gmail.com");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(tabs)");
            }
          }}
        >
          <Ionicons name="arrow-back-sharp" size={20} color={COLORS.primary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.navBarTitle}>Políticas y Sobre la App</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 30, 40) },
        ]}
      >
        {/* Banner Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>🤝 Sobre Hu-Mano Colombia</Text>
          <Text style={styles.heroBody}>
            Hu-Mano Colombia nació en medio de una emergencia, en cuestión de días, con el único propósito de ayudar a conectar a quienes necesitan apoyo con quienes pueden darlo. La hice yo solo, como desarrollador, motivado por el deseo de aportar con lo que sé hacer.
          </Text>
          <Text style={styles.heroSubText}>Por eso es importante que sepas:</Text>
        </View>

        {/* Sección: Es una app en construcción (Amarillo) */}
        <View style={styles.constructionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>⚠️</Text>
            <Text style={styles.constructionTitle}>Es una app en construcción</Text>
          </View>
          <Text style={styles.cardBodyText}>
            Fue desarrollada en muy poco tiempo y sigue en desarrollo activo. Puede tener errores, caídas, o funciones que no siempre trabajen perfecto. Iré mejorándola y agregando funciones con el tiempo, según lo que la comunidad necesite.
          </Text>
        </View>

        {/* Sección: Sin ánimo de lucro (Verde) */}
        <View style={styles.nonProfitCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>💙</Text>
            <Text style={styles.nonProfitTitle}>Sin ánimo de lucro</Text>
          </View>
          <Text style={styles.cardBodyText}>
            Esta app no me genera ninguna ganancia personal. No se cobra nada por usarla, y las ayudas que se coordinan aquí son 100% gratuitas. Si alguien te pide dinero a cambio de ayuda, algo anda mal — repórtalo de inmediato.
          </Text>
        </View>

        {/* Sección: Seguridad ante todo (Rojo) */}
        <View style={styles.securityCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>🔒</Text>
            <Text style={styles.securityTitle}>Seguridad ante todo</Text>
          </View>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bulletBold}>NUNCA</Text> transfieras dinero, ni compartas claves o datos bancarios con nadie que contactes por esta app.
            </Text>
            <Text style={styles.bulletItem}>
              • Verifica la información cuando puedas, especialmente para ayudas grandes — apóyate en canales oficiales como Cruz Roja, Bomberos, Defensa Civil o la Línea 123.
            </Text>
            <Text style={styles.bulletItem}>
              • Esta app <Text style={styles.bulletBold}>NO</Text> verifica la identidad real de quienes se registran. Usa tu sentido común al coordinar encuentros con otras personas.
            </Text>
            <Text style={styles.bulletItem}>
              • Si vas a recoger o entregar ayuda en persona, procura ir acompañado de alguien que conozcas — en grupo es más seguro que solo.
            </Text>
            <Text style={styles.bulletItem}>
              • Si eres menor de edad, hazlo siempre acompañado de un adulto responsable.
            </Text>
          </View>
        </View>

        {/* Sección: ¿Ves algo sospechoso? */}
        <View style={styles.standardCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>🚩</Text>
            <Text style={styles.cardTitle}>¿Ves algo sospechoso?</Text>
          </View>
          <Text style={styles.cardBodyText}>
            Usa el botón de "Reportar" dentro de cada solicitud si te parece una posible estafa. Toda cuenta o publicación reportada será revisada, y quien use esta app para hacer daño será eliminado de la plataforma.
          </Text>
        </View>

        {/* Sección: Sobre tu información */}
        <View style={styles.standardCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>📍</Text>
            <Text style={styles.cardTitle}>Sobre tu información</Text>
          </View>
          <Text style={styles.cardBodyText}>
            La ubicación, el número de contacto y demás datos que publiques en una solicitud de ayuda son visibles públicamente para que otros puedan encontrarte y ayudarte. No compartas información que no quieras que sea pública.
          </Text>
        </View>

        {/* Sección: Correo Interactivo */}
        <View style={styles.contactCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>🙋</Text>
            <Text style={styles.cardTitle}>¿Encontraste un error o tienes una sugerencia?</Text>
          </View>
          <Text style={styles.cardBodyText}>Escríbeme directamente:</Text>
          <TouchableOpacity
            style={styles.emailButton}
            onPress={handleOpenEmail}
            activeOpacity={0.85}
          >
            <Ionicons name="mail" size={18} color="#FFFFFF" />
            <Text style={styles.emailButtonText}>andresp199519@gmail.com</Text>
          </TouchableOpacity>
        </View>

        {/* Sección: Un compromiso, no una promesa perfecta */}
        <View style={styles.commitmentCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.emojiIcon}>❤️</Text>
            <Text style={styles.cardTitle}>Un compromiso, no una promesa perfecta</Text>
          </View>
          <Text style={styles.cardBodyText}>
            Hice esta app porque quería ayudar desde lo que sé hacer. No puedo garantizar que todo funcione perfecto, ni puedo controlar cómo cada persona la use — pero sí puedo prometerte que seguiré trabajando en mejorarla, escuchando lo que necesiten, y cuidando que sea un espacio seguro. Como desarrollador, no puedo hacerme responsable de acuerdos, encuentros o transacciones entre usuarios — esa parte depende de cada uno cuidarse y actuar con sentido común.
          </Text>
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>
              Cuídense entre ustedes. Esa es, al final, la idea de todo esto.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  navBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 10,
  },
  heroSubText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  emojiIcon: {
    fontSize: 20,
  },
  cardBodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },
  // App en construcción (Amarillo)
  constructionCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  constructionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#B45309",
  },
  // Sin ánimo de lucro (Verde)
  nonProfitCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },
  nonProfitTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#047857",
  },
  // Seguridad ante todo (Rojo)
  securityCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#B91C1C",
  },
  bulletList: {
    gap: 8,
    marginTop: 4,
  },
  bulletItem: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.text,
  },
  bulletBold: {
    fontWeight: "800",
    color: COLORS.danger,
  },
  // Tarjeta Estándar
  standardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  // Tarjeta de Contacto
  contactCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Compromiso
  commitmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quoteBox: {
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  quoteText: {
    fontSize: 14,
    fontWeight: "700",
    fontStyle: "italic",
    color: COLORS.primary,
    textAlign: "center",
  },
});
