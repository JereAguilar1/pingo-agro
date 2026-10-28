import { describe, expect, it } from "vitest";
import { doseToProduct, nitrogenContent } from "@/lib/calculations";

describe("nitrogenContent", () => {
  it("100 kg de urea al 46% contienen 46 kg de N", () => {
    const out = nitrogenContent(100, 46);
    expect(out.resultSummary).toContain("46");
    expect(out.steps[1].result).toBe("46 kg de N");
  });

  it("incluye la aclaración de que no es la cantidad absorbida por el cultivo", () => {
    const out = nitrogenContent(100, 46);
    expect(out.disclaimer.toLowerCase()).toContain("absorb");
  });
});

describe("doseToProduct", () => {
  it("60 kg N/ha, urea 46%, 12 ha -> ~1565.22 kg de urea", () => {
    const out = doseToProduct(60, 46, 12);
    expect(out.steps[0].result).toBe("130.4348 kg/ha");
    expect(out.steps[1].result).toBe("1565.22 kg");
  });

  it("aclara que no valida la pertinencia agronómica de la dosis", () => {
    const out = doseToProduct(60, 46, 12);
    expect(out.disclaimer.toLowerCase()).toContain("dosis");
  });
});
