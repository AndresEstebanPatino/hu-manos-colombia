import {
  validarSignupCoordinador,
  signupEsValido,
  emailValido,
  SignupCoordinadorInput,
} from "../onboarding";

function input(over: Partial<SignupCoordinadorInput> = {}): SignupCoordinadorInput {
  return {
    nombreCompleto: "María Mosquera",
    email: "maria@albergue.org",
    password: "clave-segura-1",
    telefono: "+57 300 123 4567",
    zona: "Bahía Solano",
    organizacion: "Albergue San José",
    ...over,
  };
}

describe("emailValido", () => {
  it.each([
    ["maria@albergue.org", true],
    ["a@b.co", true],
    ["sin-arroba.org", false],
    ["@dominio.com", false],
    ["maria@dominio", false],
    ["maria@@dominio.com", false],
    ["maria@.com", false],
    ["maria@dominio.", false],
  ])("%s -> %s", (email, esperado) => {
    expect(emailValido(email)).toBe(esperado);
  });
});

describe("validarSignupCoordinador", () => {
  it("acepta un registro completo y válido", () => {
    expect(validarSignupCoordinador(input())).toEqual({});
    expect(signupEsValido(input())).toBe(true);
  });

  it("exige nombre completo", () => {
    expect(validarSignupCoordinador(input({ nombreCompleto: "Ma" })).nombreCompleto).toBeDefined();
  });

  it("exige email válido", () => {
    expect(validarSignupCoordinador(input({ email: "no-es-email" })).email).toBeDefined();
  });

  it("exige contraseña de al menos 8 caracteres", () => {
    expect(validarSignupCoordinador(input({ password: "corta" })).password).toBeDefined();
  });

  it("exige teléfono con al menos 7 dígitos", () => {
    expect(validarSignupCoordinador(input({ telefono: "12 34" })).telefono).toBeDefined();
    // formato con separadores pero suficientes dígitos: válido
    expect(validarSignupCoordinador(input({ telefono: "300-123-4567" })).telefono).toBeUndefined();
  });

  it("exige zona", () => {
    expect(validarSignupCoordinador(input({ zona: "" })).zona).toBeDefined();
  });

  it("la organización es opcional (su ausencia no invalida)", () => {
    expect(signupEsValido(input({ organizacion: undefined }))).toBe(true);
  });

  it("acumula múltiples errores a la vez", () => {
    const errores = validarSignupCoordinador(
      input({ nombreCompleto: "", email: "x", password: "1", telefono: "", zona: "" })
    );
    expect(Object.keys(errores).sort()).toEqual(
      ["email", "nombreCompleto", "password", "telefono", "zona"].sort()
    );
  });
});
