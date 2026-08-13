import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
} from "react-native";
import { COLORS } from "../../../constants/theme";
import { ErroresSignup, SignupCoordinadorInput, validarSignupCoordinador } from "../domain";

interface Props {
  /** Registro real (inyectado). Crea cuenta + solicitud PENDIENTE. */
  onSubmit: (input: SignupCoordinadorInput) => Promise<void>;
  /** Callback opcional tras registro exitoso (p. ej. navegar). */
  onExito?: () => void;
}

interface CampoProps extends Pick<TextInputProps, "keyboardType" | "autoCapitalize" | "secureTextEntry"> {
  testID: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
}

function Campo({ testID, placeholder, value, onChangeText, error, ...rest }: CampoProps) {
  return (
    <View style={styles.campo}>
      <TextInput
        testID={testID}
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
      {error ? (
        <Text testID={`${testID}-error`} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Registro de coordinador de zona. Valida en el dispositivo (sin red) y, si pasa,
 * delega en `onSubmit` (crea cuenta + solicitud PENDIENTE). El acceso privilegiado
 * NO es inmediato: queda pendiente de aprobación (human-in-the-loop).
 */
export function FormularioRegistroCoordinador({ onSubmit, onExito }: Props) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zona, setZona] = useState("");
  const [organizacion, setOrganizacion] = useState("");
  const [errores, setErrores] = useState<ErroresSignup>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function enviar() {
    const input: SignupCoordinadorInput = {
      nombreCompleto: nombreCompleto.trim(),
      email: email.trim(),
      password,
      telefono: telefono.trim(),
      zona: zona.trim(),
      organizacion: organizacion.trim() || undefined,
    };
    const errs = validarSignupCoordinador(input);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setEnviando(true);
    setError(null);
    try {
      await onSubmit(input);
      setOk(true);
      onExito?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el registro.");
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>Solicitud enviada ✓</Text>
        <Text style={styles.muted}>
          Un coordinador revisará tu solicitud. Mientras tanto puedes usar la app como
          visitante (consultar y compartir la lista de personas buscadas).
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Registro de coordinador de zona</Text>
      <Text style={styles.muted}>
        Creas tu cuenta y una solicitud que un coordinador aprueba. No obtienes acceso
        privilegiado hasta la aprobación.
      </Text>

      <Campo
        testID="reg-nombre"
        placeholder="Nombre completo"
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        error={errores.nombreCompleto}
      />
      <Campo
        testID="reg-email"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        error={errores.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Campo
        testID="reg-password"
        placeholder="Contraseña (mín. 8 caracteres)"
        value={password}
        onChangeText={setPassword}
        error={errores.password}
        secureTextEntry
      />
      <Campo
        testID="reg-telefono"
        placeholder="Teléfono / WhatsApp"
        value={telefono}
        onChangeText={setTelefono}
        error={errores.telefono}
        keyboardType="phone-pad"
      />
      <Campo
        testID="reg-zona"
        placeholder="Zona que vas a coordinar"
        value={zona}
        onChangeText={setZona}
        error={errores.zona}
      />
      <Campo
        testID="reg-organizacion"
        placeholder="Organización / albergue (opcional)"
        value={organizacion}
        onChangeText={setOrganizacion}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        testID="reg-enviar"
        style={[styles.boton, enviando && styles.botonDisabled]}
        onPress={enviar}
        disabled={enviando}
        accessibilityRole="button"
      >
        {enviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Crear cuenta y solicitar</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: COLORS.background, flexGrow: 1 },
  titulo: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  muted: { fontSize: 13, color: COLORS.textMuted },
  campo: { gap: 4 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: { borderColor: COLORS.flagRedSoft },
  boton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  botonDisabled: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: COLORS.flagRedSoft, fontSize: 13 },
});
