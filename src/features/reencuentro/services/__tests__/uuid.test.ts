import { generarIdCliente } from "../uuid";

describe("generarIdCliente", () => {
  it("tiene formato UUID v4", () => {
    expect(generarIdCliente()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("genera ids distintos (clave de idempotencia estable por reporte)", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generarIdCliente()));
    expect(ids.size).toBe(500);
  });
});
