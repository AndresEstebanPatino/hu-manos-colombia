import { iniciarSesionCoordinador } from "../coordinador-sesion";
import { CoordinadorAuthPort, RolPrivilegiado } from "../../domain";

function fakePort(
  roles: RolPrivilegiado[],
  user: { userId: string; email: string | null } = { userId: "u1", email: "coord@x.com" }
): CoordinadorAuthPort {
  return {
    signInWithPassword: jest.fn().mockResolvedValue(user),
    obtenerRoles: jest.fn().mockResolvedValue(roles),
  };
}

describe("iniciarSesionCoordinador", () => {
  it("resuelve la sesión y marca esCoordinador cuando tiene el rol", async () => {
    const s = await iniciarSesionCoordinador("coord@x.com", "pass", fakePort(["COORDINADOR"]));
    expect(s.userId).toBe("u1");
    expect(s.roles).toEqual(["COORDINADOR"]);
    expect(s.esCoordinador).toBe(true);
  });

  it("un usuario sin rol privilegiado no es coordinador", async () => {
    const s = await iniciarSesionCoordinador("x@x.com", "pass", fakePort([]));
    expect(s.esCoordinador).toBe(false);
  });

  it("propaga el error de credenciales inválidas", async () => {
    const port: CoordinadorAuthPort = {
      signInWithPassword: jest.fn().mockRejectedValue(new Error("Invalid login credentials")),
      obtenerRoles: jest.fn(),
    };
    await expect(iniciarSesionCoordinador("x", "y", port)).rejects.toThrow(/Invalid login/i);
    expect(port.obtenerRoles).not.toHaveBeenCalled();
  });
});
