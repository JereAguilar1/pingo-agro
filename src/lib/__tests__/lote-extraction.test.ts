import { describe, expect, it } from "vitest";
import { parseLoteFromTextLocal } from "@/lib/lote-extraction";

describe("parseLoteFromTextLocal", () => {
  it("extrae hectáreas, cultivo, localidad, estadio y rinde objetivo de una descripción hablada", () => {
    const r = parseLoteFromTextLocal(
      "Tengo un lote de 85 hectáreas de maíz en Gardey, estadio V6, rinde objetivo 10 toneladas por hectárea"
    );
    expect(r.hectares).toBe(85);
    expect(r.crop).toBe("Maíz");
    expect(r.locality).toBe("Gardey");
    expect(r.municipality).toBe("Tandil");
    expect(r.phenology).toBe("V6");
    expect(r.targetYieldTonHa).toBe(10);
  });

  it("extrae datos de suelo cuando se mencionan", () => {
    const r = parseLoteFromTextLocal(
      "El análisis de suelo dio 66 de nitrógeno y 14 de fósforo, con un pH de 6.1"
    );
    expect(r.soilNitrateKgHa).toBe(66);
    expect(r.soilPhosphorusPpm).toBe(14);
    expect(r.ph).toBe(6.1);
  });

  it("distingue el cultivo principal del antecesor cuando ambos se mencionan", () => {
    const r = parseLoteFromTextLocal("Tengo un lote de 60 hectáreas de soja en Vela, antecesor maíz");
    expect(r.crop).toBe("Soja");
    expect(r.previousCrop).toBe("Maíz");
    expect(r.locality).toBe("Vela");
  });

  it("no inventa campos que no se mencionaron", () => {
    const r = parseLoteFromTextLocal("Un lote de soja de 40 hectáreas");
    expect(r.soilNitrateKgHa).toBeUndefined();
    expect(r.phenology).toBeUndefined();
    expect(r.crop).toBe("Soja");
    expect(r.hectares).toBe(40);
  });
});
