import { coordsValidas, formatearCoords } from "../geolocalizacion";

describe("coordsValidas", () => {
  it("acepta coords en rango", () => {
    expect(coordsValidas({ lat: 5.6919, lng: -76.658 })).toBe(true);
    expect(coordsValidas({ lat: 0, lng: 0 })).toBe(true);
  });

  it("rechaza fuera de rango o no finitas", () => {
    expect(coordsValidas({ lat: 91, lng: 0 })).toBe(false);
    expect(coordsValidas({ lat: 0, lng: 181 })).toBe(false);
    expect(coordsValidas({ lat: NaN, lng: 0 })).toBe(false);
    expect(coordsValidas({ lat: 0, lng: Infinity })).toBe(false);
  });
});

describe("formatearCoords", () => {
  it("formatea con 5 decimales", () => {
    expect(formatearCoords({ lat: 5.691912, lng: -76.658123 })).toBe("5.69191, -76.65812");
  });
});
