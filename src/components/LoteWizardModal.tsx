"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { LoteApplicationRecord, ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { IconCamera, IconCheck, IconClose, IconFolder, IconMic, IconPlus, IconSend, IconSparkles } from "./Icons";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { ExtractedLoteFields } from "@/lib/lote-extraction";

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
  "Rama negra (Conyza)",
  "Yuyo colorado (Amaranthus)",
  "Raigrás anual (Lolium)",
  "Sorgo de Alepo",
  "Nabón (Raphanus)",
  "Oruga cogollera (Spodoptera)",
  "Diatraea / Barrenador",
];

function AutoBadge() {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ color: "var(--surco-green)", background: "var(--surco-green-tint)" }}
    >
      detectado
    </span>
  );
}

export function LoteWizardModal({ isOpen, initialLote, onClose, onSaveLote }: Props) {
  // Si es un lote nuevo, arrancamos por la captura rápida (audio/foto);
  // si se está editando uno existente, vamos directo al formulario.
  const [step, setStep] = useState<0 | 1 | 2 | 3>(initialLote ? 1 : 0);

  // Captura rápida por voz/foto (Paso 0)
  const [capturedNote, setCapturedNote] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [referencePhotos, setReferencePhotos] = useState<{ name: string; dataUrl: string }[]>(
    initialLote?.referencePhotos || []
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const {
    isRecording,
    isTranscribing,
    recordingTime,
    liveTranscript,
    error: audioError,
    startRecording,
    stopAndSend,
    cancelRecording,
  } = useAudioRecorder();

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
    initialLote?.detectedPestsAndWeeds || ["Rama negra (Conyza)"]
  );

  useEffect(() => {
    if (isOpen) {
      setStep(initialLote ? 1 : 0);
      setCapturedNote("");
      setAutoFilledFields([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      dose: appDose.trim() || "Dosis estándar",
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

  function applyExtractedFields(extracted: ExtractedLoteFields) {
    const applied: string[] = [];
    if (extracted.name) {
      setName(extracted.name);
      applied.push("name");
    }
    if (extracted.hectares !== undefined) {
      setHectares(String(extracted.hectares));
      applied.push("hectares");
    }
    if (extracted.crop) {
      setCrop(extracted.crop);
      applied.push("crop");
    }
    if (extracted.hybrid) {
      setHybrid(extracted.hybrid);
      applied.push("hybrid");
    }
    if (extracted.phenology) {
      setPhenology(extracted.phenology);
      applied.push("phenology");
    }
    if (extracted.targetYieldTonHa !== undefined) {
      setTargetYield(String(extracted.targetYieldTonHa));
      applied.push("targetYieldTonHa");
    }
    if (extracted.previousCrop) {
      setPreviousCrop(extracted.previousCrop);
      applied.push("previousCrop");
    }
    if (extracted.municipality) {
      setMunicipality(extracted.municipality);
      applied.push("municipality");
    }
    if (extracted.locality) {
      setLocality(extracted.locality);
      applied.push("locality");
    }
    if (extracted.relief) {
      setRelief(extracted.relief);
      applied.push("relief");
    }
    if (extracted.soilNitrateKgHa !== undefined) {
      setSoilN(String(extracted.soilNitrateKgHa));
      applied.push("soilNitrateKgHa");
    }
    if (extracted.soilPhosphorusPpm !== undefined) {
      setSoilP(String(extracted.soilPhosphorusPpm));
      applied.push("soilPhosphorusPpm");
    }
    if (extracted.organicMatterPercent !== undefined) {
      setSoilMO(String(extracted.organicMatterPercent));
      applied.push("organicMatterPercent");
    }
    if (extracted.ph !== undefined) {
      setSoilPh(String(extracted.ph));
      applied.push("ph");
    }
    if (extracted.toscaDepthCm !== undefined) {
      setToscaDepth(String(extracted.toscaDepthCm));
      applied.push("toscaDepthCm");
    }
    setAutoFilledFields(applied);
  }

  async function handleVoiceCapture() {
    const transcript = await stopAndSend();
    if (!transcript) return;
    setCapturedNote(transcript);
    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract-lote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
      if (res.ok) {
        const data = await res.json();
        applyExtractedFields(data.extracted || {});
      }
    } catch {
      // Si falla la extracción, el usuario igual puede completar todo a mano.
    } finally {
      setIsExtracting(false);
      setStep(1);
    }
  }

  function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReferencePhotos((prev) => [...prev, { name: file.name, dataUrl: reader.result as string }]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeReferencePhoto(index: number) {
    setReferencePhotos((prev) => prev.filter((_, i) => i !== index));
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
      referencePhotos,
    };
    onSaveLote(saved);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
      <div
        className="w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-xl flex flex-col overflow-hidden bg-white"
        style={{ borderColor: "var(--surco-border)" }}
      >
        {/* Cabecera del modal */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
            >
              <IconFolder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm sm:text-base leading-tight" style={{ color: "var(--surco-ink)" }}>
                {initialLote ? `Editar: ${initialLote.name}` : "Nuevo Proyecto de Lote"}
              </h2>
              <span className="text-xs" style={{ color: "var(--surco-ink-muted)" }}>
                {step === 0
                  ? "Contanos sobre tu lote"
                  : `Paso ${step} de 3 · ${
                      step === 1 ? "Ubicación Satelital" : step === 2 ? "Suelo y Campaña" : "Historial de Aplicaciones"
                    }`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Pasos / Stepper estilizado (oculto en la captura rápida inicial) */}
        {step > 0 && (
        <div
          className="grid grid-cols-3 border-b text-xs font-medium"
          style={{ borderColor: "var(--surco-border-light)", background: "var(--surco-bg)" }}
        >
          {[
            { n: 1 as const, label: "1. Satélite y Polígono" },
            { n: 2 as const, label: "2. Suelo y Campaña" },
            { n: 3 as const, label: "3. Aplicaciones Previas" },
          ].map((item) => {
            const isActive = step === item.n;
            return (
              <button
                key={item.n}
                type="button"
                onClick={() => setStep(item.n)}
                className="py-2.5 px-3 text-center transition-all cursor-pointer border-b-2"
                style={{
                  borderColor: isActive ? "var(--surco-green)" : "transparent",
                  color: isActive ? "var(--surco-green)" : "var(--surco-ink-muted)",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "var(--surco-card)" : "transparent",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        )}

        {/* Contenido según el paso */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-sm">
          {step === 0 && (
            <div className="flex flex-col gap-5 py-2">
              <div className="text-center flex flex-col gap-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-semibold" style={{ color: "var(--surco-ink)" }}>
                  Contanos sobre tu lote
                </h3>
                <p className="text-sm" style={{ color: "var(--surco-ink-muted)" }}>
                  Grabá un audio describiéndolo (cuántas hectáreas, qué cultivo, dónde está,
                  qué dio el análisis de suelo) y completamos el formulario por vos. Después
                  revisás y ajustás lo que haga falta.
                </p>
              </div>

              {audioError && (
                <div className="rounded-xl border px-3.5 py-2 text-sm text-red-800 bg-red-50 border-red-200 text-center max-w-md mx-auto w-full">
                  {audioError}
                </div>
              )}

              {isRecording || isTranscribing || isExtracting ? (
                <div
                  className="max-w-md mx-auto w-full flex flex-col gap-3 rounded-2xl border bg-white px-4 py-5 text-center"
                  style={{ borderColor: "rgba(220, 38, 38, 0.35)" }}
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-red-600">
                      {Math.floor(recordingTime / 60)}:{recordingTime % 60 < 10 ? "0" : ""}
                      {recordingTime % 60}
                    </span>
                  </div>
                  <p className="text-sm italic" style={{ color: "var(--surco-ink-muted)" }}>
                    {isExtracting
                      ? "Completando el formulario con lo que dijiste…"
                      : isTranscribing
                      ? "Transcribiendo audio…"
                      : liveTranscript
                      ? `"${liveTranscript}"`
                      : "Grabando… contame sobre el lote"}
                  </p>
                  {isRecording && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleVoiceCapture()}
                        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer"
                        style={{ background: "var(--surco-green)" }}
                      >
                        <span>Listo, completar</span>
                        <IconSend className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-all cursor-pointer hover:border-solid hover:shadow-sm"
                    style={{ borderColor: "var(--surco-green)", background: "var(--surco-green-tint)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                      style={{ background: "var(--surco-green)" }}
                    >
                      <IconMic className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--surco-green)" }}>
                      Grabar audio
                    </span>
                    <span className="text-xs text-center" style={{ color: "var(--surco-ink-muted)" }}>
                      Hablá y lo completamos solo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-all cursor-pointer hover:border-solid hover:shadow-sm"
                    style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "var(--surco-bg-alt)", color: "var(--surco-ink-soft)" }}
                    >
                      <IconCamera className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--surco-ink)" }}>
                      Foto del análisis
                    </span>
                    <span className="text-xs text-center" style={{ color: "var(--surco-ink-muted)" }}>
                      Guardá el papel o la planilla
                    </span>
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              )}

              {referencePhotos.length > 0 && (
                <div className="max-w-md mx-auto w-full flex flex-wrap gap-2">
                  {referencePhotos.map((photo, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: "var(--surco-border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeReferencePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                      >
                        <IconClose className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium cursor-pointer hover:underline"
                  style={{ color: "var(--surco-ink-muted)" }}
                >
                  Prefiero completar el formulario a mano →
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              {autoFilledFields.length > 0 && (
                <div
                  className="rounded-xl border px-3.5 py-2.5 flex items-start gap-2 text-sm"
                  style={{ background: "var(--surco-green-tint)", borderColor: "var(--surco-green)" }}
                >
                  <IconSparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--surco-green)" }} />
                  <span style={{ color: "var(--surco-green-dark)" }}>
                    Completamos {autoFilledFields.length} dato{autoFilledFields.length !== 1 ? "s" : ""} a partir
                    de tu audio{capturedNote ? ` ("${capturedNote}")` : ""}. Revisá y ajustá lo que haga falta.
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                    Nombre del Lote / Campo
                    {autoFilledFields.includes("name") && <AutoBadge />}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Lote 4 — La Loma (Gardey)"
                    className="px-3 py-2 rounded-xl border bg-white text-sm outline-none transition-all focus:border-emerald-800/50"
                    style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                    Superficie (ha)
                    {autoFilledFields.includes("hectares") && <AutoBadge />}
                  </label>
                  <input
                    type="number"
                    value={hectares}
                    onChange={(e) => setHectares(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-sm font-semibold outline-none"
                    style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
                  />
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--surco-border-light)" }}>
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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Partido
                    {autoFilledFields.includes("municipality") && <AutoBadge />}
                  </label>
                  <input
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Localidad
                    {autoFilledFields.includes("locality") && <AutoBadge />}
                  </label>
                  <input
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Relieve
                    {autoFilledFields.includes("relief") && <AutoBadge />}
                  </label>
                  <select
                    value={relief}
                    onChange={(e) => setRelief(e.target.value as ProducerLote["relief"])}
                    className="px-2.5 py-1.5 rounded-lg border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  >
                    <option value="Loma">Loma</option>
                    <option value="Media loma">Media loma</option>
                    <option value="Plano">Plano</option>
                    <option value="Bajo dulce">Bajo dulce</option>
                    <option value="Bajo alcalino">Bajo alcalino</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                    Zona sensible y distancia (m)
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={sensitiveZoneType}
                      onChange={(e) =>
                        setSensitiveZoneType(e.target.value as ProducerLote["sensitiveZoneType"])
                      }
                      className="flex-1 px-2 py-1.5 rounded-lg border bg-white text-xs outline-none"
                      style={{ borderColor: "var(--surco-border-light)" }}
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
                      className="w-16 px-2 py-1.5 rounded-lg border bg-white text-xs outline-none"
                      style={{ borderColor: "var(--surco-border-light)" }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                Cultivo y Campaña Actual
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Cultivo
                    {autoFilledFields.includes("crop") && <AutoBadge />}
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  >
                    <option value="Maíz">Maíz</option>
                    <option value="Soja">Soja</option>
                    <option value="Trigo">Trigo</option>
                    <option value="Girasol">Girasol</option>
                    <option value="Cebada">Cebada</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>Híbrido / Variedad</label>
                  <input
                    value={hybrid}
                    onChange={(e) => setHybrid(e.target.value)}
                    placeholder="Ej. DK 72-10 Trecepta"
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Estadio Fenológico
                    {autoFilledFields.includes("phenology") && <AutoBadge />}
                  </label>
                  <input
                    value={phenology}
                    onChange={(e) => setPhenology(e.target.value)}
                    placeholder="Ej. V6 (6 hojas)"
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>Fecha de Siembra</label>
                  <input
                    value={plantingDate}
                    onChange={(e) => setPlantingDate(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Rinde Objetivo (t/ha)
                    {autoFilledFields.includes("targetYieldTonHa") && <AutoBadge />}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={targetYield}
                    onChange={(e) => setTargetYield(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Cultivo Antecesor
                    {autoFilledFields.includes("previousCrop") && <AutoBadge />}
                  </label>
                  <input
                    value={previousCrop}
                    onChange={(e) => setPreviousCrop(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900 pt-2">
                Análisis de Suelo (Laboratorio)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>Prof. a Tosca (cm)</label>
                  <input
                    type="number"
                    value={toscaDepth}
                    onChange={(e) => setToscaDepth(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    N-NO3 (0–60cm kg/ha)
                    {autoFilledFields.includes("soilNitrateKgHa") && <AutoBadge />}
                  </label>
                  <input
                    type="number"
                    value={soilN}
                    onChange={(e) => setSoilN(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Fósforo P Bray (ppm)
                    {autoFilledFields.includes("soilPhosphorusPpm") && <AutoBadge />}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={soilP}
                    onChange={(e) => setSoilP(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Materia Orgánica (%)
                    {autoFilledFields.includes("organicMatterPercent") && <AutoBadge />}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={soilMO}
                    onChange={(e) => setSoilMO(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                    pH actual
                    {autoFilledFields.includes("ph") && <AutoBadge />}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={soilPh}
                    onChange={(e) => setSoilPh(e.target.value)}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>Textura</label>
                  <select
                    value={soilTexture}
                    onChange={(e) => setSoilTexture(e.target.value as ProducerLote["soilTexture"])}
                    className="px-3 py-2 rounded-xl border bg-white text-xs outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
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
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900 block mb-1">
                  Historial de lo que se le echó previamente al lote
                </span>
                <p className="text-xs text-gray-500 mb-2.5">
                  Herbicidas residuales, arrancadores y fertilizantes aplicados para que el asistente determine carry-over y rotación de modos de acción.
                </p>

                {/* Accesos rápidos */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className="text-xs text-gray-400">Atajos:</span>
                  {QUICK_APPLICATIONS.map((preset) => (
                    <button
                      key={preset.productName}
                      type="button"
                      onClick={() => addQuickApplication(preset)}
                      className="px-2 py-0.5 rounded-md border text-xs transition-colors cursor-pointer hover:bg-black/5"
                      style={{
                        background: "var(--surco-card)",
                        borderColor: "var(--surco-border-light)",
                        color: "var(--surco-ink-soft)",
                      }}
                    >
                      + {preset.productName.split("(")[0].trim()}
                    </button>
                  ))}
                </div>

                {/* Lista de aplicaciones */}
                <div className="flex flex-col gap-1.5 mb-3 max-h-48 overflow-y-auto pr-1">
                  {applications.length === 0 ? (
                    <div className="text-center p-3 text-xs text-gray-400 border border-dashed rounded-xl">
                      Sin aplicaciones registradas todavía.
                    </div>
                  ) : (
                    applications.map((app) => (
                      <div
                        key={app.id}
                        className="rounded-xl border p-2.5 flex items-center justify-between gap-2 text-xs bg-white"
                        style={{ borderColor: "var(--surco-border-light)" }}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-semibold text-emerald-800 mr-2">
                            {app.date}
                          </span>
                          <span className="font-medium text-gray-900">{app.productName}</span>
                          <span className="text-gray-500 ml-1">({app.dose})</span>
                          {app.modeOfAction && (
                            <span className="text-xs text-emerald-700 ml-1.5">
                              [{app.modeOfAction}]
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setApplications((prev) => prev.filter((item) => item.id !== app.id))}
                          className="p-1 rounded-md hover:bg-red-50 text-red-600 cursor-pointer shrink-0"
                          title="Eliminar"
                        >
                          <IconClose className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Formulario rápido para añadir aplicación manual */}
                <div
                  className="rounded-xl border p-2.5 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs"
                  style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                >
                  <input
                    type="date"
                    value={appDate}
                    onChange={(e) => setAppDate(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border bg-white outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                  <select
                    value={appCategory}
                    onChange={(e) => setAppCategory(e.target.value as LoteApplicationRecord["category"])}
                    className="px-2 py-1.5 rounded-lg border bg-white outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  >
                    <option value="Herbicida barbecho">Barbecho</option>
                    <option value="Herbicida preemergente">Preemergente</option>
                    <option value="Herbicida postemergente">Postemergente</option>
                    <option value="Fertilizante">Fertilizante</option>
                    <option value="Insecticida">Insecticida</option>
                    <option value="Fungicida">Fungicida</option>
                  </select>
                  <input
                    placeholder="Producto comercial"
                    value={appProduct}
                    onChange={(e) => setAppProduct(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border bg-white outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                  <input
                    placeholder="Principio activo"
                    value={appActive}
                    onChange={(e) => setAppActive(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border bg-white outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                  <input
                    placeholder="Dosis (ej. 1,5 l/ha)"
                    value={appDose}
                    onChange={(e) => setAppDose(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border bg-white outline-none"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  />
                  <button
                    type="button"
                    onClick={addCustomApplication}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-medium text-white cursor-pointer shadow-2xs hover:opacity-90"
                    style={{ background: "var(--surco-green)" }}
                  >
                    <IconPlus className="w-3 h-3" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

              {/* Malezas / Plagas detectadas */}
              <div className="pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900 block mb-2">
                  Malezas o Plagas Monitoreadas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_WEEDS_PESTS.map((w) => {
                    const active = selectedWeeds.includes(w);
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => toggleWeed(w)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all cursor-pointer"
                        style={{
                          background: active ? "var(--surco-green-tint)" : "var(--surco-card)",
                          borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                          color: active ? "var(--surco-green)" : "var(--surco-ink-soft)",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {active && <IconCheck className="w-3 h-3 text-emerald-800" />}
                        <span>{w}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer del modal (oculto en la captura rápida inicial) */}
        {step > 0 && (
        <div
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
        >
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-3.5 py-1.5 rounded-xl border text-sm font-medium cursor-pointer transition-colors hover:bg-black/5"
                style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink)" }}
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
                className="px-4 py-1.5 rounded-xl text-sm font-medium text-white cursor-pointer shadow-2xs hover:opacity-95"
                style={{ background: "var(--surco-green)" }}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer shadow-2xs hover:opacity-95"
                style={{ background: "var(--surco-green)" }}
              >
                <IconCheck className="w-4 h-4" />
                <span>Guardar Proyecto de Lote</span>
              </button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
