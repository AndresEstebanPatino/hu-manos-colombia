import { urlReverse, textoDeRespuesta, NominatimGeocoder } from "../nominatim-geocoder";

describe("urlReverse", () => {
  it("arma la URL de reverse con los parámetros correctos", () => {
    expect(urlReverse({ lat: 5.69, lng: -76.65 })).toBe(
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=5.69&lon=-76.65&zoom=14&addressdetails=1"
    );
  });
});

describe("textoDeRespuesta", () => {
  it("prioriza localidad + región", () => {
    const json = { address: { city: "Quibdó", state: "Chocó", country: "Colombia" } };
    expect(textoDeRespuesta(json)).toBe("Quibdó, Chocó");
  });

  it("usa town/village si no hay city", () => {
    expect(textoDeRespuesta({ address: { village: "Bahía Solano", state: "Chocó" } })).toBe(
      "Bahía Solano, Chocó"
    );
  });

  it("cae a display_name recortado a 2 partes", () => {
    const json = { display_name: "Calle 1, Quibdó, Chocó, Colombia" };
    expect(textoDeRespuesta(json)).toBe("Calle 1, Quibdó");
  });

  it("devuelve null si no hay nada útil", () => {
    expect(textoDeRespuesta({})).toBeNull();
    expect(textoDeRespuesta(null)).toBeNull();
    expect(textoDeRespuesta("x")).toBeNull();
  });
});

describe("NominatimGeocoder.describir", () => {
  const geocoder = new NominatimGeocoder();

  afterEach(() => {
    // @ts-expect-error limpiar el mock global
    global.fetch = undefined;
  });

  it("devuelve el texto parseado de una respuesta OK", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ address: { city: "Quibdó", state: "Chocó" } }),
    }) as unknown as typeof fetch;

    await expect(geocoder.describir({ lat: 5.69, lng: -76.65 })).resolves.toBe("Quibdó, Chocó");
  });

  it("cae al fallback lat,lng si la respuesta no es OK", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(geocoder.describir({ lat: 5.69123, lng: -76.65 })).resolves.toBe("5.69123, -76.65000");
  });

  it("devuelve null si fetch lanza", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("sin red")) as unknown as typeof fetch;
    await expect(geocoder.describir({ lat: 5.69, lng: -76.65 })).resolves.toBeNull();
  });
});
