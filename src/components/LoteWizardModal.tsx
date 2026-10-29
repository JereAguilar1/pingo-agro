"use client";

import { useState } from "react";
import { LoteApplicationRecord, ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";

interface Props {
  isOpen: boolean;
  initialLote?: ProducerLote | null;
  onClose: () => void;
  onSaveLote: (lote: ProducerLote) => void;
}

const QUICK_APPLICATIONS: Omit<LoteApplicationRecord, "id">[] = [
  {
    date: "2026-09-12",
    category: "Herbicida barbecho",
    productName: "Gesaprim 90 WG (Atrazina)",
    activeIngredient: "Atrazina 90%",
    modeOfAction: "Fotosistema II (Grupo C1)",
    dose: "1,2 kg/ha",
    notes: "Residual en barbecho químico",
  },
  {
    date: "2026-09-25",
    category: "Herbicida barbecho",
    productName: "Metsulfurón 60 WG + 2,4-D",
    activeIngredient: "Metsulfurón metil 60% + 2,4-D",
    modeOfAction: "Inhibidor ALS (Grupo B) + Auxínico (O)",
    dose: "6 g/ha + 1,5 l/ha",
    notes: "Control de hoja ancha en barbecho",
  },
  {
    date: "2026-10-08",
    category: "Herbicida preemergente",
    productName: "Dual Gold (S-Metolacloro)",
    activeIngredient: "S-Metolacloro 96%",
    modeOfAction: "Inhibidor VLCFA (Grupo K3)",
    dose: "1,3 l/ha",
    notes: "Preemergente para gramíneas anuales y Amaranthus",
  },
  {
    date: "2026-10-18",
    category: "Fertilizante",
    productName: "MAP (Fosfato Monoamónico 11-52-0)",
    activeIngredient: "Fósforo 52% P2O5 + N 11%",
    dose: "90 kg/ha",
    notes: "Arrancador en la línea de siembra",
  },
  {
    date: "2026-11-10",
    category: "Fertilizante",
    productName: "Urea Granulada (46-0-0)",
    activeIngredient: "Nitrógeno 46%",
    dose: "150 kg/ha",
    notes: "Refertilización en V5–V6",
  },
];

const COMMON_WEEDS_PESTS = [
  "Rama negra (Conyza bonariensis)",
  "Yuyo colorado (Amaranthus hybridus)",
  "Raigrás anual (Lolium multiflorum)",
  "Sorgo de Alepo (Sorghum halepense)",
  "Nabón (Raphanus sativus)",
  "Oruga cogollera (Spodoptera frugiperda)",
  "Isoca de la espiga / Diatraea",
];

export function LoteWizardModal({ isOpen, initialLote, onClose, onSaveLote }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Ubicación Satelital y Entorno
  const [name, setName] = useState(initialLote?.name || "Lote 12 — El Mirador");
  const [municipality, setMunicipality] = useState(initialLote?.municipality || "Tandil");
  const [locality, setLocality] = useState(initialLote?.locality || "Gardey");
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    initialLote?.coordinates || { lat: -37.2785, lng: -59.3612 }
  );
  const [polygon, setPolygon] = useState<[number, number][]>(
    initialLote?.polygon || [
      [-37.275, -59.366],
      [-37.275, -59.356],
      [-37.283, -59.356],
      [-37.283, -59.366],
    ]
  );
  const [hectares, setHectares] = useState(String(initialLote?.hectares || 85));
  const [relief, setRelief] = useState<ProducerLote["relief"]>(initialLote?.relief || "Loma");
  const [sensitiveZoneType, setSensitiveZoneType] = useState<ProducerLote["sensitiveZoneType"]>(
    initialLote?.sensitiveZoneType || "Escuela rural"
  );
  const [sensitiveZoneDistanceM, setSensitiveZoneDistanceM] = useState(
    String(initialLote?.sensitiveZoneDistanceM ?? 550)
  );

  // Paso 2: Suelo y Campaña Actual
  const [crop, setCrop] = useState(initialLote?.crop || "Maíz");
  const [hybrid, setHybrid] = useState(initialLote?.hybrid || "DK 72-10 Trecepta (Vip3A)");
  const [plantingDate, setPlantingDate] = useState(
    initialLote?.plantingDate || "2026-10-18 (Temprano)"
  );
  const [phenology, setPhenology] = useState(initialLote?.phenology || "V6 (6 hojas)");
  const [previousCrop, setPreviousCrop] = useState(initialLote?.previousCrop || "Soja 1ra");
  const [targetYield, setTargetYield] = useState(String(initialLote?.targetYieldTonHa || 10));
  const [rowSpacingCm, setRowSpacingCm] = useState(String(initialLote?.rowSpacingCm || 52));
  const [targetDensity, setTargetDensity] = useState(
    String(initialLote?.targetDensityPlantsHa || 72000)
  );
  const [toscaDepth, setToscaDepth] = useState(String(initialLote?.toscaDepthCm || 105));
  const [soilN, setSoilN] = useState(String(initialLote?.soilNitrateKgHa || 64));
  const [soilP, setSoilP] = useState(String(initialLote?.soilPhosphorusPpm || 14));
  const [soilMO, setSoilMO] = useState(String(initialLote?.organicMatterPercent || 4.6));
  const [soilPh, setSoilPh] = useState(String(initialLote?.ph || 6.1));
  const [soilTexture, setSoilTexture] = useState<ProducerLote["soilTexture"]>(
    initialLote?.soilTexture || "Franco"
  );

  // Paso 3: Qué se le echó previamente + Malezas/Plagas
  const [applications, setApplications] = useState<LoteApplicationRecord[]>(
    initialLote?.previousApplications || [
      {
        id: "app-init-1",
        date: "2026-09-12",
        category: "Herbicida barbecho",
        productName: "Gesaprim 90 WG + Roundup Full II",
        activeIngredient: "Atrazina 90% + Glifosato 66%",
        modeOfAction: "Fotosistema II (C1) + EPSPS (G)",
        dose: "1,2 kg/ha + 2,5 l/ha",
      },
    ]
  );
  const [appDate, setAppDate] = useState("2026-10-05");
  const [appCategory, setAppCategory] =
    useState<LoteApplicationRecord["category"]>("Herbicida barbecho");
  const [appProduct, setAppProduct] = useState("");
  const [appActive, setAppActive] = useState("");
  const [appMode, setAppMode] = useState("");
  const [appDose, setAppDose] = useState("");

  const [selectedWeeds, setSelectedWeeds] = useState<string[]>(
    initialLote?.detectedPestsAndWeeds || ["Rama negra (Conyza bonariensis)"]
  );

  if (!isOpen) return null;

  function addCustomApplication() {
    if (!appProduct.trim()) return;
    const item: LoteApplicationRecord = {
      id: `app-${Date.now()}`,
      date: appDate,
      category: appCategory,
      productName: appProduct.trim(),
      activeIngredient: appActive.trim() || appProduct.trim(),
      modeOfAction: appMode.trim() || undefined,
      dose: appDose.trim() || "Dosis estándar marbete",
    };
    setApplications((prev) => [...prev, item]);
    setAppProduct("");
    setAppActive("");
    setAppMode("");
    setAppDose("");
  }

  function addQuickApplication(preset: Omit<LoteApplicationRecord, "id">) {
    setApplications((prev) => [
      ...prev,
      {
        ...preset,
        id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
    ]);
  }

  function toggleWeed(weed: string) {
    setSelectedWeeds((prev) =>
      prev.includes(weed) ? prev.filter((w) => w !== weed) : [...prev, weed]
    );
  }

  function handleSave() {
    const saved: ProducerLote = {
      id: initialLote?.id || `lote-${Date.now()}`,
      name: name.trim() || "Nuevo Lote",
      municipality: municipality.trim() || "Tandil",
      locality: locality.trim() || undefined,
      coordinates: center,
      polygon,
      hectares: parseFloat(hectares) || 80,
      relief,
      sensitiveZoneType,
      sensitiveZoneDistanceM: parseFloat(sensitiveZoneDistanceM) || 0,
      crop,
      hybrid: hybrid.trim() || "Híbrido Maíz",
      plantingDate,
      phenology,
      previousCrop,
      targetYieldTonHa: parseFloat(targetYield) || 9.5,
      rowSpacingCm: parseFloat(rowSpacingCm) || 52,
      targetDensityPlantsHa: parseFloat(targetDensity) || 70000,
      toscaDepthCm: parseFloat(toscaDepth) || 90,
      soilNitrateKgHa: parseFloat(soilN) || 60,
      soilPhosphorusPpm: parseFloat(soilP) || 14,
      organicMatterPercent: parseFloat(soilMO) || 4.5,
      ph: parseFloat(soilPh) || 6.2,
      soilTexture,
      previousApplications: applications,
      detectedPestsAndWeeds: selectedWeeds,
    };
    onSaveLote(saved);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4">
      <div
        className="w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-xl flex flex-col overflow-hidden"
        style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
        >
          <div>
            <h2 className="font-bold text-base sm:text-lg" style={{ color: "var(--surco-ink)" }}>
              {initialLote ? `Editar Proyecto: ${initialLote.name}` : "🌾 Crear Nuevo Proyecto de Lote"}
            </h2>
            <p className="text-xs" style={{ color: "var(--surco-ink-soft)" }}>
              Paso {step} de 3 ·{" "}
              {step === 1
                ? "Ubicación con Imagen Satelital y Entorno"
                : step === 2
                ? "Análisis de Suelo y Campaña Actual"
                : "Historial de Aplicaciones Previas y Malezas"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
          >
            Cancelar
          </button>
        </div>

        {/* Stepper */}
        <div
          className="grid grid-cols-3 border-b text-xs font-semibold"
          style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg)" }}
        >
          {[
            { n: 1 as const, label: "1. Mapa Satelital y Lote" },
            { n: 2 as const, label: "2. Suelo y Cultivo" },
            { n: 3 as const, label: "3. Qué se le echó antes" },
          ].map((item) => (
            <button
              key={item.n}
              type="button"
              onClick={() => setStep(item.n)}
              className="py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer"
              style={{
                borderColor: step === item.n ? "var(--surco-green)" : "transparent",
                color: step === item.n ? "var(--surco-green)" : "var(--surco-ink-soft)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs sm:text-sm">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="font-medium text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    Nombre del Lote / Establecimiento
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Lote 4 — La Loma (Est. San Pedro)"
                    className="px-3 py-2 rounded-lg border bg-white text-sm"
                    style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    Superficie (ha)
                  </label>
                  <input
                    type="number"
                    value={hectares}
                    onChange={(e) => setHectares(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
                    style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
                  />
                </div>
              </div>

              <SatelliteLoteMap
                center={center}
                polygon={polygon}
                onChangeCenter={(newCenter, preset) => {
                  setCenter(newCenter);
                  if (preset) {
                    setMunicipality(preset.municipality);
                    setLocality(preset.locality);
                  }
                }}
                onChangePolygon={(newPoly, calcHa) => {
                  setPolygon(newPoly);
                  if (calcHa > 0) setHectares(String(calcHa));
                }}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    Partido / Municipio
                  </label>
                  <input
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    Localidad / Paraje
                  </label>
                  <input
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    Posición / Relieve
                  </label>
                  <select
                    value={relief}
                    onChange={(e) => setRelief(e.target.value as ProducerLote["relief"])}
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  >
                    <option value="Loma">Loma</option>
                    <option value="Media loma">Media loma</option>
                    <option value="Plano">Plano</option>
                    <option value="Bajo dulce">Bajo dulce (riesgo helada)</option>
                    <option value="Bajo alcalino">Bajo alcalino</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    Zona sensible cercana
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={sensitiveZoneType}
                      onChange={(e) =>
                        setSensitiveZoneType(e.target.value as ProducerLote["sensitiveZoneType"])
                      }
                      className="flex-1 px-2 py-1.5 rounded-lg border bg-white text-xs"
                      style={{ borderColor: "var(--surco-border)" }}
                    >
                      <option value="Escuela rural">Escuela</option>
                      <option value="Curso de agua / Arroyo">Arroyo</option>
                      <option value="Zona periurbana">Periurbano</option>
                      <option value="Ninguna cercana">Ninguna</option>
                    </select>
                    <input
                      type="number"
                      value={sensitiveZoneDistanceM}
                      onChange={(e) => setSensitiveZoneDistanceM(e.target.value)}
                      placeholder="m"
                      title="Distancia en metros"
                      className="w-16 px-2 py-1.5 rounded-lg border bg-white text-xs"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--surco-green)" }}>
                🌱 Cultivo de la Campaña y Manejo
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Cultivo
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  >
                    <option value="Maíz">Maíz</option>
                    <option value="Soja">Soja</option>
                    <option value="Trigo">Trigo</option>
                    <option value="Girasol">Girasol</option>
                    <option value="Cebada">Cebada</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Híbrido / Variedad y Biotecnología
                  </label>
                  <input
                    value={hybrid}
                    onChange={(e) => setHybrid(e.target.value)}
                    placeholder="Ej. DK 72-10 Trecepta (Vip3A)"
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Estadio Fenológico Actual
                  </label>
                  <input
                    value={phenology}
                    onChange={(e) => setPhenology(e.target.value)}
                    placeholder="Ej. Barbecho, V6, VT, R1"
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Fecha de Siembra
                  </label>
                  <input
                    value={plantingDate}
                    onChange={(e) => setPlantingDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Rinde Objetivo (t/ha)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={targetYield}
                    onChange={(e) => setTargetYield(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Cultivo Antecesor
                  </label>
                  <input
                    value={previousCrop}
                    onChange={(e) => setPreviousCrop(e.target.value)}
                    placeholder="Ej. Soja 1ra / Trigo-Soja 2da"
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
              </div>

              <div className="font-semibold text-xs uppercase tracking-wider pt-2" style={{ color: "var(--surco-green)" }}>
                🧪 Análisis de Suelo y Perfil Edáfico
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Profundidad a Tosca (cm)
                  </label>
                  <input
                    type="number"
                    value={toscaDepth}
                    onChange={(e) => setToscaDepth(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    N-NO3 Suelo 0–60 cm (kg N/ha)
                  </label>
                  <input
                    type="number"
                    value={soilN}
                    onChange={(e) => setSoilN(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Fósforo P Bray 0–20 cm (ppm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={soilP}
                    onChange={(e) => setSoilP(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Materia Orgánica (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={soilMO}
                    onChange={(e) => setSoilMO(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    pH del suelo
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={soilPh}
                    onChange={(e) => setSoilPh(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                    Textura
                  </label>
                  <select
                    value={soilTexture}
                    onChange={(e) =>
                      setSoilTexture(e.target.value as ProducerLote["soilTexture"])
                    }
                    className="px-3 py-2 rounded-lg border bg-white text-xs"
                    style={{ borderColor: "var(--surco-border)" }}
                  >
                    <option value="Franco">Franco</option>
                    <option value="Franco-arcilloso">Franco-arcilloso</option>
                    <option value="Franco-arenoso">Franco-arenoso</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <div className="font-semibold text-xs uppercase tracking-wider mb-1.5" style={{ color: "var(--surco-green)" }}>
                  🚜 ¿Qué se le echó previamente al lote? (Herbicidas, Fitosanitarios y Fertilizantes)
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className="text-[11px]" style={{ color: "var(--surco-ink-soft)" }}>
                    Agregar rápido:
                  </span>
                  {QUICK_APPLICATIONS.map((preset) => (
                    <button
                      key={preset.productName}
                      type="button"
                      onClick={() => addQuickApplication(preset)}
                      className="px-2 py-1 rounded-md border text-[11px] cursor-pointer hover:opacity-80"
                      style={{
                        background: "var(--surco-bg)",
                        borderColor: "var(--surco-border)",
                        color: "var(--surco-ink)",
                      }}
                    >
                      + {preset.productName.split("(")[0].trim()}
                    </button>
                  ))}
                </div>

                {/* Lista de aplicaciones cargadas */}
                <div className="flex flex-col gap-1.5 mb-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
                    >
                      <div>
                        <span className="font-mono font-semibold mr-2" style={{ color: "var(--surco-green)" }}>
                          {app.date}
                        </span>
                        <strong>{app.productName}</strong> ({app.activeIngredient}) ·{" "}
                        <span className="font-medium">{app.dose}</span>
                        {app.modeOfAction && (
                          <span className="ml-1.5 text-[11px]" style={{ color: "var(--surco-ink-soft)" }}>
                            [{app.modeOfAction}]
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setApplications((prev) => prev.filter((item) => item.id !== app.id))
                        }
                        className="text-xs px-1.5 py-0.5 rounded hover:bg-red-50 text-red-700 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Agregar aplicación manual */}
                <div
                  className="rounded-xl border p-3 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs"
                  style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
                >
                  <input
                    type="date"
                    value={appDate}
                    onChange={(e) => setAppDate(e.target.value)}
                    className="px-2 py-1.5 rounded border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <select
                    value={appCategory}
                    onChange={(e) =>
                      setAppCategory(e.target.value as LoteApplicationRecord["category"])
                    }
                    className="px-2 py-1.5 rounded border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  >
                    <option value="Herbicida barbecho">Herbicida barbecho</option>
                    <option value="Herbicida preemergente">Preemergente</option>
                    <option value="Herbicida postemergente">Postemergente</option>
                    <option value="Fertilizante">Fertilizante</option>
                    <option value="Insecticida">Insecticida</option>
                    <option value="Fungicida">Fungicida</option>
                  </select>
                  <input
                    placeholder="Producto (ej. Atrazina)"
                    value={appProduct}
                    onChange={(e) => setAppProduct(e.target.value)}
                    className="px-2 py-1.5 rounded border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    placeholder="Principio activo"
                    value={appActive}
                    onChange={(e) => setAppActive(e.target.value)}
                    className="px-2 py-1.5 rounded border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    placeholder="Dosis (ej. 1.5 l/ha)"
                    value={appDose}
                    onChange={(e) => setAppDose(e.target.value)}
                    className="px-2 py-1.5 rounded border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <button
                    type="button"
                    onClick={addCustomApplication}
                    className="px-3 py-1.5 rounded font-semibold text-white cursor-pointer"
                    style={{ background: "var(--surco-green)" }}
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Malezas y plagas presentes en el lote */}
              <div className="pt-2">
                <div className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color: "var(--surco-green)" }}>
                  🌿 Malezas o Plagas detectadas en este Lote
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_WEEDS_PESTS.map((w) => {
                    const active = selectedWeeds.includes(w);
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => toggleWeed(w)}
                        className="px-2.5 py-1 rounded-full border text-xs transition-colors cursor-pointer"
                        style={{
                          background: active ? "var(--surco-green)" : "var(--surco-bg)",
                          borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          color: active ? "#ffffff" : "var(--surco-ink)",
                        }}
                      >
                        {active ? "✓ " : "+ "}
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3.5 border-t flex items-center justify-between"
          style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
        >
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-3.5 py-2 rounded-xl border text-xs font-medium cursor-pointer"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              >
                ← Anterior
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                Siguiente paso →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                ✓ Guardar Proyecto de Lote
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
