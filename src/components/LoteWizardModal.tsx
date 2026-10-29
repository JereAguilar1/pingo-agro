"use client";

import { useState, useEffect } from "react";
import { ProducerLote, LoteApplicationRecord } from "@/lib/types";
import {
  IconCheck,
  IconMapPin,
  IconPlus,
  IconArrowLeft,
  IconTrash,
} from "./Icons";
import { SatelliteLoteMap } from "./SatelliteLoteMap";

interface Props {
  isOpen?: boolean;
  initialLote?: ProducerLote | null;
  onClose: () => void;
  onSave?: (lote: ProducerLote) => void;
  onSaveLote?: (lote: ProducerLote) => void;
}

const COMMON_WEEDS_PESTS = [
  "Rama negra (Conyza)",
  "Yuyo colorado (Amaranthus)",
  "Raigrás anual (Lolium)",
  "Capín (Echinochloa)",
  "Sorgo de Alepo",
  "Nabo / Nabón (Brassica)",
  "Oruga cogollera (Spodoptera)",
  "Chinche de los cuernos (Dichelops)",
  "Isoca bolillera (Helicoverpa)",
  "Roya común / Roya anaranjada",
];

const QUICK_APPLICATIONS: Omit<LoteApplicationRecord, "id" | "date">[] = [
  {
    category: "Herbicida barbecho",
    productName: "Glifosato Full II + 2,4-D Enlist",
    activeIngredient: "Glifosato 54% + 2,4-D colina",
    modeOfAction: "EPSPS (G) + Auxínico (O)",
    dose: "2,2 l/ha + 1,2 l/ha",
  },
  {
    category: "Herbicida preemergente",
    productName: "Atrazina Gesaprim 90 WG + Dual Gold",
    activeIngredient: "Atrazina 90% + S-Metolacloro",
    modeOfAction: "Fotosistema II (C1) + VLCFA (K3)",
    dose: "1,5 kg/ha + 1,2 l/ha",
  },
  {
    category: "Herbicida preemergente",
    productName: "Fierce RM (Flumioxazin + Pyroxasulfone)",
    activeIngredient: "Flumioxazin + Pyroxasulfone",
    modeOfAction: "PPO (14) + K3 (15)",
    dose: "250 g/ha",
  },
  {
    category: "Fertilizante",
    productName: "MAP (Fosfato Monoamónico) a la siembra",
    activeIngredient: "11-52-0",
    modeOfAction: "Nutrición P + N arrancador",
    dose: "85 kg/ha",
  },
  {
    category: "Fertilizante",
    productName: "Urea granulada / SolMIX en V5-V6",
    activeIngredient: "Nitrógeno 46%",
    modeOfAction: "Nutrición N macollaje / V6",
    dose: "160 kg/ha",
  },
];

const CROP_OPTIONS = [
  { label: "Maíz", defaultSpace: "52", defaultDensity: "72000", defaultYield: "10" },
  { label: "Soja", defaultSpace: "42", defaultDensity: "320000", defaultYield: "4.2" },
  { label: "Trigo", defaultSpace: "19", defaultDensity: "2800000", defaultYield: "5.5" },
  { label: "Girasol", defaultSpace: "52", defaultDensity: "55000", defaultYield: "3.2" },
  { label: "Cebada", defaultSpace: "19", defaultDensity: "2600000", defaultYield: "5.8" },
];

const PHENOLOGY_PRESETS: Record<string, string[]> = {
  Maíz: ["Barbecho", "VE", "V2", "V4", "V6", "V8", "VT", "R1", "R4"],
  Soja: ["Barbecho", "VE", "V2", "V4", "R1", "R3", "R5"],
  Trigo: ["Barbecho", "Emergencia", "Z2.1", "Z3.1", "Z3.9", "Espigazón"],
  Girasol: ["Barbecho", "VE", "V4", "V8", "R1", "R5", "R9"],
  Cebada: ["Barbecho", "Emergencia", "Z2.2", "Z3.1", "Hoja bandera", "Espigazón"],
};

const LOCALITY_PRESETS = ["Gardey", "Vela", "Iraola", "De la Canal", "Azucena", "Fulton"];

const RELIEF_OPTIONS: NonNullable<ProducerLote["relief"]>[] = [
  "Plano",
  "Loma",
  "Media loma",
  "Bajo dulce",
  "Bajo alcalino",
];

const SENSITIVE_ZONE_OPTIONS: { value: NonNullable<ProducerLote["sensitiveZoneType"]>; label: string; defaultDist: string }[] = [
  { value: "Ninguna cercana", label: "Ninguna cercana", defaultDist: "1500" },
  { value: "Escuela rural", label: "Escuela rural", defaultDist: "300" },
  { value: "Curso de agua / Arroyo", label: "Curso de agua / Arroyo", defaultDist: "150" },
  { value: "Zona periurbana", label: "Zona periurbana", defaultDist: "250" },
];

export function LoteWizardModal({ isOpen = true, initialLote, onClose, onSave, onSaveLote }: Props) {
  const isEditing = Boolean(initialLote);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Ubicación y Polígono
  const [name, setName] = useState(initialLote?.name ?? "");
  const [hectares, setHectares] = useState(String(initialLote?.hectares ?? 75));
  const [municipality, setMunicipality] = useState(initialLote?.municipality ?? "Tandil");
  const [locality, setLocality] = useState(initialLote?.locality ?? "Gardey");
  const [relief, setRelief] = useState<ProducerLote["relief"]>(initialLote?.relief ?? "Media loma");
  const [sensitiveZoneType, setSensitiveZoneType] = useState<ProducerLote["sensitiveZoneType"]>(
    initialLote?.sensitiveZoneType ?? "Ninguna cercana"
  );
  const [sensitiveZoneDistanceM, setSensitiveZoneDistanceM] = useState(
    String(initialLote?.sensitiveZoneDistanceM ?? 1200)
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    initialLote?.coordinates ?? { lat: -37.282, lng: -59.356 }
  );
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>(
    initialLote?.polygon ?? [
      [-37.2785, -59.362],
      [-37.2785, -59.351],
      [-37.2855, -59.351],
      [-37.2855, -59.362],
    ]
  );

  // Paso 2: Cultivo y Suelo
  const [crop, setCrop] = useState(initialLote?.crop ?? "Maíz");
  const [hybrid, setHybrid] = useState(initialLote?.hybrid ?? "DK 72-10 VT3P");
  const [plantingDate, setPlantingDate] = useState(initialLote?.plantingDate ?? "2025-10-12");
  const [phenology, setPhenology] = useState(initialLote?.phenology ?? "V6");
  const [targetYield, setTargetYield] = useState(String(initialLote?.targetYieldTonHa ?? 10));
  const [targetDensity, setTargetDensity] = useState(String(initialLote?.targetDensityPlantsHa ?? 72000));
  const [rowSpacingCm, setRowSpacingCm] = useState(String(initialLote?.rowSpacingCm ?? 52));
  const [previousCrop, setPreviousCrop] = useState(initialLote?.previousCrop ?? "Soja 1ra");
  const [toscaDepth, setToscaDepth] = useState(String(initialLote?.toscaDepthCm ?? 85));
  const [soilN, setSoilN] = useState(String(initialLote?.soilNitrateKgHa ?? 58));
  const [soilP, setSoilP] = useState(String(initialLote?.soilPhosphorusPpm ?? 13));
  const [soilMO, setSoilMO] = useState(String(initialLote?.organicMatterPercent ?? 3.8));
  const [soilPh, setSoilPh] = useState(String(initialLote?.ph ?? 6.1));
  const [soilTexture, setSoilTexture] = useState<ProducerLote["soilTexture"]>(
    initialLote?.soilTexture ?? "Franco"
  );
  const [notes, setNotes] = useState(initialLote?.notes ?? "");

  // Paso 3: Aplicaciones previas y Malezas
  const [applications, setApplications] = useState<LoteApplicationRecord[]>(
    initialLote?.previousApplications ?? []
  );
  const [selectedWeeds, setSelectedWeeds] = useState<string[]>(
    initialLote?.detectedPestsAndWeeds ?? ["Rama negra (Conyza)"]
  );
  const [customWeedInput, setCustomWeedInput] = useState("");

  // Formulario rápido para agregar aplicación manual
  const [appDate, setAppDate] = useState("2025-09-18");
  const [appCategory, setAppCategory] =
    useState<LoteApplicationRecord["category"]>("Herbicida barbecho");
  const [appProduct, setAppProduct] = useState("");
  const [appActive, setAppActive] = useState("");
  const [appDose, setAppDose] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function toggleWeed(weed: string) {
    setSelectedWeeds((prev) =>
      prev.includes(weed) ? prev.filter((w) => w !== weed) : [...prev, weed]
    );
  }

  function addCustomWeed() {
    const clean = customWeedInput.trim();
    if (!clean) return;
    if (!selectedWeeds.includes(clean)) {
      setSelectedWeeds((prev) => [...prev, clean]);
    }
    setCustomWeedInput("");
  }

  function addQuickApplication(preset: Omit<LoteApplicationRecord, "id" | "date">) {
    const newApp: LoteApplicationRecord = {
      ...preset,
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: appDate,
    };
    setApplications((prev) => [newApp, ...prev]);
  }

  function addCustomApplication() {
    if (!appProduct.trim()) return;
    const newApp: LoteApplicationRecord = {
      id: `app-${Date.now()}`,
      date: appDate,
      category: appCategory,
      productName: appProduct.trim(),
      activeIngredient: appActive.trim() || appProduct.trim(),
      dose: appDose.trim() || "Dosis estándar de marbete",
    };
    setApplications((prev) => [newApp, ...prev]);
    setAppProduct("");
    setAppActive("");
    setAppDose("");
  }

  function handleSave() {
    const centerLat =
      polygonCoords.length > 0
        ? polygonCoords.reduce((acc, c) => acc + c[0], 0) / polygonCoords.length
        : mapCenter.lat;
    const centerLng =
      polygonCoords.length > 0
        ? polygonCoords.reduce((acc, c) => acc + c[1], 0) / polygonCoords.length
        : mapCenter.lng;

    const newLote: ProducerLote = {
      id: initialLote?.id ?? `lote-${Date.now()}`,
      name: name.trim() || `Lote ${crop} (${locality || municipality})`,
      hectares: Number(hectares) || 50,
      crop,
      hybrid: hybrid.trim() || "Sin especificar",
      plantingDate,
      phenology: phenology.trim() || "Barbecho",
      targetYieldTonHa: Number(targetYield) || 9,
      targetDensityPlantsHa: Number(targetDensity) || 70000,
      rowSpacingCm: Number(rowSpacingCm) || 52,
      previousCrop: previousCrop.trim() || "Soja",
      municipality: municipality.trim() || "Tandil",
      locality: locality.trim() || "Gardey",
      relief,
      sensitiveZoneType,
      sensitiveZoneDistanceM: Number(sensitiveZoneDistanceM) || 1000,
      coordinates: {
        lat: Number(centerLat.toFixed(5)),
        lng: Number(centerLng.toFixed(5)),
      },
      polygon: polygonCoords,
      toscaDepthCm: Number(toscaDepth) || 80,
      soilNitrateKgHa: Number(soilN) || 50,
      soilPhosphorusPpm: Number(soilP) || 12,
      organicMatterPercent: Number(soilMO) || 3.5,
      ph: Number(soilPh) || 6.2,
      soilTexture,
      previousApplications: applications,
      detectedPestsAndWeeds: selectedWeeds,
      notes: notes.trim() || undefined,
      referencePhotos: initialLote?.referencePhotos,
    };

    onSave?.(newLote);
    onSaveLote?.(newLote);
  }

  const STEPS: { id: 1 | 2 | 3; label: string; count?: number }[] = [
    { id: 1, label: "1. Ubicación y mapa" },
    { id: 2, label: "2. Cultivo y suelo" },
    { id: 3, label: "3. Aplicaciones", count: applications.length },
  ];

  const currentCropPresets = PHENOLOGY_PRESETS[crop] ?? PHENOLOGY_PRESETS.Maíz;

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--surco-bg)", color: "var(--surco-ink)" }}
    >
      {/* ===================================================================== */}
      {/* ENCABEZADO SUPERIOR (MISMO ESTILO QUE DASHBOARD DE LOTES)             */}
      {/* ===================================================================== */}
      <header
        className="shrink-0 border-b bg-white/95 backdrop-blur-md z-20"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer hover:underline shrink-0"
                style={{ color: "var(--surco-ink-soft)" }}
              >
                <IconArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <span style={{ color: "var(--surco-border)" }}>|</span>

              <div className="min-w-0 flex items-center gap-2">
                <h1
                  className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight truncate"
                  style={{ color: "var(--surco-ink)" }}
                >
                  {isEditing ? `Editar ${name || initialLote?.name}` : name ? name : "Nuevo lote"}
                </h1>
                <span
                  className="hidden sm:inline-flex text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0"
                  style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                >
                  {crop} · {hectares || "0"} ha
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer transition-all hover:opacity-95 active:scale-[0.98] shrink-0"
              style={{ background: "var(--surco-green)" }}
            >
              <IconCheck className="w-4 h-4" />
              <span>Guardar lote</span>
            </button>
          </div>

          {/* Pestañas de pasos (idénticas a las pestañas de LoteDashboard) */}
          <nav
            className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar"
            style={{ background: "var(--surco-bg-alt)" }}
          >
            {STEPS.map((s) => {
              const active = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex-1 shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    background: active ? "white" : "transparent",
                    color: active ? "var(--surco-ink)" : "var(--surco-ink-muted)",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <span>{s.label}</span>
                  {s.count !== undefined && s.count > 0 && (
                    <span
                      className="text-[10.5px] font-bold px-1.5 rounded-full"
                      style={{
                        background: active ? "var(--surco-green-tint)" : "rgba(0,0,0,0.06)",
                        color: active ? "var(--surco-green)" : "var(--surco-ink-muted)",
                      }}
                    >
                      {s.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* CONTENIDO PRINCIPAL SCROLLABLE                                        */}
      {/* ===================================================================== */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-28">
          {/* ================================================================= */}
          {/* PASO 1: UBICACIÓN Y MAPA                                          */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Mapa Satelital (7 columnas) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <section
                  className="rounded-[22px] overflow-hidden border bg-white p-3.5 sm:p-4 flex flex-col gap-3"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div>
                      <h2 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                        Perímetro satelital del lote
                      </h2>
                      <p className="text-[12px]" style={{ color: "var(--surco-ink-muted)" }}>
                        Tocá sobre el mapa para marcar los vértices y calcular las hectáreas
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                    >
                      {hectares || "0"} ha
                    </span>
                  </div>

                  <SatelliteLoteMap
                    center={mapCenter}
                    polygon={polygonCoords}
                    heightClassName="h-72 sm:h-[400px]"
                    onChangeCenter={(newCenter, preset) => {
                      setMapCenter(newCenter);
                      if (preset) {
                        setMunicipality(preset.municipality);
                        setLocality(preset.locality);
                      }
                    }}
                    onChangePolygon={(coords, areaHa) => {
                      setPolygonCoords(coords);
                      if (areaHa > 0) {
                        setHectares(String(areaHa));
                      }
                    }}
                  />
                </section>
              </div>

              {/* Datos de Ubicación, Relieve y Zona Sensible (5 columnas) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Identificación */}
                <section
                  className="rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-3.5"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <h3 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                    Datos principales
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                        Nombre del lote
                      </label>
                      <input
                        placeholder="Ej. Lote La Loma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-medium outline-none"
                        style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                        Superficie (ha)
                      </label>
                      <input
                        type="number"
                        value={hectares}
                        onChange={(e) => setHectares(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                        style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                        Partido / Municipio
                      </label>
                      <input
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none"
                        style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                        Localidad / Paraje
                      </label>
                      <input
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        placeholder="Ej. Gardey, Vela…"
                        className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none"
                        style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {LOCALITY_PRESETS.map((loc) => {
                      const active = locality.toLowerCase() === loc.toLowerCase();
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocality(loc)}
                          className="px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Relieve */}
                <section
                  className="rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-3"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div>
                    <h3 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                      Relieve
                    </h3>
                    <p className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                      Posición en el paisaje y drenaje
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {RELIEF_OPTIONS.map((opt) => {
                      const active = relief === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRelief(opt)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Zona Sensible */}
                <section
                  className="rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-3"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div>
                    <h3 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                      Zona sensible cercana
                    </h3>
                    <p className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                      Para control de distancia de amortiguamiento municipal
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {SENSITIVE_ZONE_OPTIONS.map((opt) => {
                      const active = sensitiveZoneType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSensitiveZoneType(opt.value);
                            setSensitiveZoneDistanceM(opt.defaultDist);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Distancia libre (metros)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={sensitiveZoneDistanceM}
                      onChange={(e) => setSensitiveZoneDistanceM(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-xl border bg-white text-sm font-bold outline-none text-right tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 2: CULTIVO Y SUELO                                           */}
          {/* ================================================================= */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Cultivo y campaña (6 columnas) */}
              <section
                className="lg:col-span-6 rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-4"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div>
                  <h2 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                    Cultivo y planteo técnico
                  </h2>
                  <p className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                    Datos principales de la campaña actual
                  </p>
                </div>

                {/* Cultivo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                    Cultivo
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CROP_OPTIONS.map((item) => {
                      const active = crop === item.label;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setCrop(item.label);
                            if (!isEditing) {
                              setRowSpacingCm(item.defaultSpace);
                              setTargetDensity(item.defaultDensity);
                              setTargetYield(item.defaultYield);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estadio fenológico */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                    Estadio fenológico
                  </label>
                  <input
                    value={phenology}
                    onChange={(e) => setPhenology(e.target.value)}
                    placeholder="Ej. Barbecho, V6, R1…"
                    className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-medium outline-none"
                    style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {currentCropPresets.map((stage) => {
                      const active = phenology === stage;
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setPhenology(stage)}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {stage}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Híbrido y Fecha de siembra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Híbrido / Variedad
                    </label>
                    <input
                      value={hybrid}
                      onChange={(e) => setHybrid(e.target.value)}
                      placeholder="Ej. DK 72-10 VT3P"
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Fecha de siembra
                    </label>
                    <input
                      type="date"
                      value={plantingDate}
                      onChange={(e) => setPlantingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>
                </div>

                {/* Rinde, Densidad, Entresurco, Antecesor */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Rinde objetivo (t/ha)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={targetYield}
                      onChange={(e) => setTargetYield(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Densidad (pl/ha)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={targetDensity}
                      onChange={(e) => setTargetDensity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Surcos (cm)
                    </label>
                    <input
                      type="number"
                      value={rowSpacingCm}
                      onChange={(e) => setRowSpacingCm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Cultivo antecesor
                    </label>
                    <input
                      value={previousCrop}
                      onChange={(e) => setPreviousCrop(e.target.value)}
                      placeholder="Ej. Soja 1ra"
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>
                </div>
              </section>

              {/* Suelo (6 columnas) */}
              <section
                className="lg:col-span-6 rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-4"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div>
                  <h2 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                    Análisis de suelo
                  </h2>
                  <p className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                    Valores de laboratorio y profundidad efectiva
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Nitratos N-NO3 (kg/ha)
                    </label>
                    <input
                      type="number"
                      value={soilN}
                      onChange={(e) => setSoilN(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Fósforo P Bray (ppm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={soilP}
                      onChange={(e) => setSoilP(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Materia orgánica (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={soilMO}
                      onChange={(e) => setSoilMO(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      Profundidad a tosca (cm)
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={toscaDepth}
                      onChange={(e) => setToscaDepth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                      pH actual
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={soilPh}
                      onChange={(e) => setSoilPh(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white text-sm font-bold outline-none tabular-nums"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                    Textura superficial
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["Franco", "Franco-arcilloso", "Franco-arenoso"] as const).map((tex) => {
                      const active = soilTexture === tex;
                      return (
                        <button
                          key={tex}
                          type="button"
                          onClick={() => setSoilTexture(tex)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {tex}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 3: APLICACIONES Y MALEZAS                                    */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Aplicaciones (7 columnas) */}
              <section
                className="lg:col-span-7 rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-4"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div>
                  <h2 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                    Aplicaciones previas
                  </h2>
                  <p className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                    Herbicidas y fertilizantes aplicados en el lote
                  </p>
                </div>

                {/* Atajos rápidos */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                    Agregar rápido:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_APPLICATIONS.map((preset) => (
                      <button
                        key={preset.productName}
                        type="button"
                        onClick={() => addQuickApplication(preset)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-white cursor-pointer transition-colors hover:bg-black/[0.02]"
                        style={{
                          borderColor: "var(--surco-border)",
                          color: "var(--surco-ink-soft)",
                        }}
                      >
                        + {preset.productName.split("(")[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Carga manual */}
                <div
                  className="rounded-2xl p-3.5 border flex flex-col gap-2.5"
                  style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={appDate}
                      onChange={(e) => setAppDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                    <select
                      value={appCategory}
                      onChange={(e) => setAppCategory(e.target.value as LoteApplicationRecord["category"])}
                      className="px-3 py-2 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    >
                      <option value="Herbicida barbecho">Herbicida barbecho</option>
                      <option value="Herbicida preemergente">Herbicida preemergente</option>
                      <option value="Herbicida postemergente">Herbicida postemergente</option>
                      <option value="Fertilizante">Fertilizante</option>
                      <option value="Insecticida">Insecticida</option>
                      <option value="Fungicida">Fungicida</option>
                    </select>
                    <input
                      placeholder="Dosis (ej. 1,5 l/ha)"
                      value={appDose}
                      onChange={(e) => setAppDose(e.target.value)}
                      className="px-3 py-2 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      placeholder="Producto comercial"
                      value={appProduct}
                      onChange={(e) => setAppProduct(e.target.value)}
                      className="sm:col-span-5 px-3 py-2 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                    <input
                      placeholder="Principio activo (opcional)"
                      value={appActive}
                      onChange={(e) => setAppActive(e.target.value)}
                      className="sm:col-span-4 px-3 py-2 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                    <button
                      type="button"
                      onClick={addCustomApplication}
                      disabled={!appProduct.trim()}
                      className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-95 disabled:opacity-40"
                      style={{ background: "var(--surco-green)" }}
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>

                {/* Lista de aplicaciones */}
                <div className="flex flex-col gap-2">
                  {applications.length === 0 ? (
                    <div
                      className="rounded-2xl border p-6 text-center text-sm"
                      style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
                    >
                      No hay aplicaciones registradas.
                    </div>
                  ) : (
                    applications.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border p-3.5 bg-white flex items-center justify-between gap-3"
                        style={{ borderColor: "var(--surco-border-light)" }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                            >
                              {a.category}
                            </span>
                            <span className="text-xs font-mono" style={{ color: "var(--surco-ink-muted)" }}>
                              {a.date}
                            </span>
                          </div>
                          <div className="text-sm font-bold mt-1" style={{ color: "var(--surco-ink)" }}>
                            {a.productName} <span className="font-normal">· {a.dose}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setApplications((prev) => prev.filter((item) => item.id !== a.id))
                          }
                          className="p-2 rounded-xl hover:bg-red-50 text-red-600 cursor-pointer shrink-0"
                          title="Eliminar"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Malezas y Notas (5 columnas) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <section
                  className="rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-3"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div>
                    <h3 className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
                      Malezas y plagas detectadas
                    </h3>
                    <p className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                      Seleccioná las presentes en el lote
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...COMMON_WEEDS_PESTS, ...selectedWeeds])).map((w) => {
                      const active = selectedWeeds.includes(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => toggleWeed(w)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                          style={{
                            background: active ? "var(--surco-green)" : "white",
                            color: active ? "white" : "var(--surco-ink-soft)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                          }}
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={customWeedInput}
                      onChange={(e) => setCustomWeedInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomWeed();
                        }
                      }}
                      placeholder="Otra maleza o plaga…"
                      className="flex-1 px-3 py-1.5 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    />
                    <button
                      type="button"
                      onClick={addCustomWeed}
                      disabled={!customWeedInput.trim()}
                      className="px-3 py-1.5 rounded-xl border bg-white text-xs font-semibold cursor-pointer hover:bg-black/[0.02] disabled:opacity-40"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
                    >
                      + Sumar
                    </button>
                  </div>
                </section>

                <section
                  className="rounded-2xl p-4 sm:p-5 border bg-white flex flex-col gap-2"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <label className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                    Notas del lote
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones adicionales del lote…"
                    className="w-full rounded-xl border p-3 text-sm outline-none bg-white"
                    style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                  />
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================================================================== */}
      {/* BARRA INFERIOR DE NAVEGACIÓN                                          */}
      {/* ===================================================================== */}
      <footer
        className="shrink-0 border-t bg-white/95 backdrop-blur-md z-20"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border bg-white cursor-pointer transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
              >
                <span>← Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border bg-white cursor-pointer transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
              >
                <span>Cancelar</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>
            <IconMapPin className="w-3.5 h-3.5" />
            <span>
              {name || `Lote ${crop}`} · {hectares || 0} ha · {locality || municipality}
            </span>
          </div>

          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer transition-all hover:opacity-95 active:scale-[0.98]"
                style={{ background: "var(--surco-green)" }}
              >
                <span>Siguiente →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer transition-all hover:opacity-95 active:scale-[0.98]"
                style={{ background: "var(--surco-green)" }}
              >
                <IconCheck className="w-4 h-4" />
                <span>Guardar lote</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
