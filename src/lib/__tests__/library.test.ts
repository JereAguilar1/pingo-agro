import { describe, it, expect } from "vitest";
import { getSourceByCode } from "../library";

describe("Biblioteca documental extendida", () => {
  it("contiene los fragmentos verificados requeridos R12, R13, R19, R24 y R25", () => {
    const requiredCodes = ["R12", "R13", "R19", "R24", "R25"];
    for (const code of requiredCodes) {
      const fragment = getSourceByCode(code);
      expect(fragment, `Fuente ${code} debe existir en la biblioteca`).toBeDefined();
      expect(fragment?.verification).toBe("verified");
      expect(fragment?.url).toBeDefined();
      expect(fragment?.url?.startsWith("http")).toBe(true);
      expect(fragment?.limitation.length).toBeGreaterThan(20);
      expect(fragment?.topics.length).toBeGreaterThan(0);
    }
  });
});
