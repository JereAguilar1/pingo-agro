"use client";

import { useState, useRef, useEffect } from "react";
import { ProducerLote, LoteApplicationRecord } from "@/lib/types";
import {
  IconCheck,
  IconClose,
  IconMapPin,
  IconPlus,
  IconSatellite,
  IconFlask,
  IconSparkles,
  IconArrowLeft,
  IconMic,
  IconStop,
  IconCamera,
  IconTrash,
} from "./Icons";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { parseLoteFromTextLocal } from "@/lib/lote-extraction";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

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
  { label: "Maíz", icon: "🌽", defaultSpace: "52", defaultDensity: "72000", defaultYield: "10" },
  { label: "Soja", icon: "🌱", defaultSpace: "42", defaultDensity: "320000", defaultYield: "4.2" },
  { label: "Trigo", icon: "🌾", defaultSpace: "19", defaultDensity: "2800000", defaultYield: "5.5" },
  { label: "Girasol", icon: "🌻", defaultSpace: "52", defaultDensity: "55000", defaultYield: "3.2" },
  { label: "Cebada", icon: "🌾", defaultSpace: "19", defaultDensity: "2600000", defaultYield: "5.8" },
];

const PHENOLOGY_PRESETS: Record<string, string[]> = {
  Maíz: ["Barbecho", "VE (Emergencia)", "V2", "V4", "V6", "V8", "VT (Panojado)", "R1 (Floración)", "R4 (Grano pastoso)"],
  Soja: ["Barbecho", "VE", "V2", "V4", "R1 (Inicio floración)", "R3 (Inicio vainas)", "R5 (Inicio grano)"],
  Trigo: ["Barbecho", "Emergencia", "Z2.1 (Inicio macollaje)", "Z3.1 (Un nudo)", "Z3.9 (Hoja bandera)", "Espigazón"],
  Girasol: ["Barbecho", "VE", "V4", "V8", "R1 (Estrella)", "R5 (Floración)", "R9 (Madurez)"],
  Cebada: ["Barbecho", "Emergencia", "Z2.2 (Macollaje)", "Z3.1 (Encañazón)", "Hoja bandera", "Espigazón"],
};

const LOCALITY_PRESETS = ["Gardey", "María Ignacia (Vela)", "Iraola", "De la Canal", "Azucena", "Fulton"];

const RELIEF_OPTIONS: { value: NonNullable<ProducerLote["relief"]>; label: string; desc: string }[] = [
  { value: "Plano", label: "Plano", desc: "Sin pendiente limitante" },
  { value: "Loma", label: "Loma", desc: "Bien drenado, riesgo tosca" },
  { value: "Media loma", label: "Media loma", desc: "Alto potencial productivo" },
  { value: "Bajo dulce", label: "Bajo dulce", desc: "Mayor humedad y riesgo helada" },
  { value: "Bajo alcalino", label: "Bajo alcalino", desc: "Limitante sódica / drenaje" },
];

const SENSITIVE_ZONE_OPTIONS: { value: NonNullable<ProducerLote["sensitiveZoneType"]>; label: string; defaultDist: string }[] = [
  { value: "Ninguna cercana", label: "Sin restricción cercana", defaultDist: "1500" },
  { value: "Escuela rural", label: "Escuela rural", defaultDist: "300" },
  { value: "Curso de agua / Arroyo", label: "Arroyo / Curso de agua", defaultDist: "150" },
  { value: "Zona periurbana", label: "Zona periurbana / Viviendas", defaultDist: "250" },
];

export function LoteWizardModal({ isOpen = true, initialLote, onClose, onSave, onSaveLote }: Props) {
  const isEditing = Boolean(initialLote);
  // Cuando se crea un lote nuevo mostramos el paso 0 (Carga inteligente IA / foto); al editar abrimos en paso 1
  const [step, setStep] = useState<0 | 1 | 2 | 3>(initialLote ? 1 : 0);

  // Estado de captura por voz / IA y foto de referencia
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [extractingAi, setExtractingAi] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [referencePhotos, setReferencePhotos] = useState<{ name: string; dataUrl: string }[]>(
    initialLote?.referencePhotos ?? []
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const audioRecorder = useAudioRecorder();

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

  // Bloquear scroll del body cuando la pantalla completa está activa
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

  // Aplicar campos extraídos al formulario
  function applyExtractedFields(
    fields: Partial<ProducerLote>,
    detectedFields: string[]
  ) {
    if (fields.name) setName(fields.name);
    if (fields.hectares !== undefined) setHectares(String(fields.hectares));
    if (fields.crop) setCrop(fields.crop);
    if (fields.hybrid) setHybrid(fields.hybrid);
    if (fields.phenology) setPhenology(fields.phenology);
    if (fields.targetYieldTonHa !== undefined) setTargetYield(String(fields.targetYieldTonHa));
    if (fields.targetDensityPlantsHa !== undefined) setTargetDensity(String(fields.targetDensityPlantsHa));
    if (fields.rowSpacingCm !== undefined) setRowSpacingCm(String(fields.rowSpacingCm));
    if (fields.previousCrop) setPreviousCrop(fields.previousCrop);
    if (fields.municipality) setMunicipality(fields.municipality);
    if (fields.locality) setLocality(fields.locality);
    if (fields.relief) setRelief(fields.relief);
    if (fields.toscaDepthCm !== undefined) setToscaDepth(String(fields.toscaDepthCm));
    if (fields.soilNitrateKgHa !== undefined) setSoilN(String(fields.soilNitrateKgHa));
    if (fields.soilPhosphorusPpm !== undefined) setSoilP(String(fields.soilPhosphorusPpm));
    if (fields.organicMatterPercent !== undefined) setSoilMO(String(fields.organicMatterPercent));
    if (fields.ph !== undefined) setSoilPh(String(fields.ph));
    if (fields.sensitiveZoneDistanceM !== undefined) {
      setSensitiveZoneDistanceM(String(fields.sensitiveZoneDistanceM));
    }
    if (fields.detectedPestsAndWeeds && fields.detectedPestsAndWeeds.length > 0) {
      setSelectedWeeds((prev) =>
        Array.from(new Set([...prev, ...fields.detectedPestsAndWeeds!]))
      );
    }
    setAutoFilledFields((prev) => Array.from(new Set([...prev, ...detectedFields])));
  }

  // Procesar texto con el extractor IA / determinístico
  async function processTranscriptWithAI(rawText: string) {
    const clean = rawText.trim();
    if (!clean) return;
    setExtractingAi(true);
    setVoiceError(null);

    // 1. Primero aplicamos extracción local determinística inmediata
    const localFields = parseLoteFromTextLocal(clean);
    applyExtractedFields(localFields, Object.keys(localFields));

    // 2. Luego intentamos enriquecer con Gemini en la nube si hay conexión
    try {
      const res = await fetch("/api/extract-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          fields?: Partial<ProducerLote>;
        };
        if (data.fields && Object.keys(data.fields).length > 0) {
          applyExtractedFields(data.fields, Object.keys(data.fields));
        }
      }
    } catch {
      // Silencioso: ya aplicamos extracción local determinística
    } finally {
      setExtractingAi(false);
    }
  }

  // Captura de voz con soporte dual (Web Speech API + MediaRecorder fallback)
  async function handleVoiceToggle() {
    setVoiceError(null);

    // Si está grabando con MediaRecorder fallback
    if (audioRecorder.isRecording) {
      const text = await audioRecorder.stopAndSend();
      setVoiceActive(false);
      if (text?.trim()) {
        const nextText = (voiceTranscript + " " + text.trim()).trim();
        setVoiceTranscript(nextText);
        await processTranscriptWithAI(nextText);
      } else {
        setVoiceError(
          audioRecorder.error ??
            "No se detectó voz clara. Podés intentar de nuevo o escribir el resumen abajo."
        );
      }
      return;
    }

    // Si está activo SpeechRecognition
    if (voiceActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceActive(false);
      if (voiceTranscript.trim()) {
        await processTranscriptWithAI(voiceTranscript);
      }
      return;
    }

    // Intentar usar SpeechRecognition en vivo o MediaRecorder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      const started = await audioRecorder.startRecording();
      if (started) {
        setVoiceActive(true);
      } else {
        setVoiceError(
          audioRecorder.error ??
            "Tu navegador no habilitó el micrófono. Podés pegar o escribir los datos del lote en el cuadro de texto."
        );
      }
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let accumulated = voiceTranscript ? voiceTranscript + " " : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulated += text + " ";
        } else {
          interim += text;
        }
      }
      const fullText = (accumulated + interim).trim();
      setVoiceTranscript(fullText);

      const localFields = parseLoteFromTextLocal(fullText);
      applyExtractedFields(localFields, Object.keys(localFields));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setVoiceActive(false);
      if (event.error !== "aborted") {
        setVoiceError("No se pudo escuchar el micrófono. Podés escribir el resumen directamente en el cuadro.");
      }
    };

    recognition.onend = () => {
      setVoiceActive(false);
      if (accumulated.trim()) {
        void processTranscriptWithAI(accumulated.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceActive(true);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setReferencePhotos((prev) => [
            ...prev,
            { name: file.name, dataUrl: reader.result as string },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
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
      referencePhotos: referencePhotos.length > 0 ? referencePhotos : undefined,
    };

    onSave?.(newLote);
    onSaveLote?.(newLote);
  }

  function AutoBadge() {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
        style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
      >
        <IconSparkles className="w-2.5 h-2.5" />
        IA
      </span>
    );
  }

  const STEPS = [
    { id: 0 as const, label: "Carga rápida IA", shortLabel: "IA / Foto", icon: IconSparkles },
    { id: 1 as const, label: "1. Ubicación y Mapa", shortLabel: "1. Mapa", icon: IconSatellite },
    { id: 2 as const, label: "2. Cultivo y Suelo", shortLabel: "2. Suelo", icon: IconFlask },
    { id: 3 as const, label: "3. Aplicaciones y Sanidad", shortLabel: "3. Manejo", icon: IconCheck },
  ];

  const currentCropPresets = PHENOLOGY_PRESETS[crop] ?? PHENOLOGY_PRESETS.Maíz;

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--surco-bg)", color: "var(--surco-ink)" }}
    >
      {/* ===================================================================== */}
      {/* BARRA SUPERIOR STICKY A PANTALLA COMPLETA                             */}
      {/* ===================================================================== */}
      <header
        className="shrink-0 border-b bg-white/95 backdrop-blur-md z-20"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          {/* Izquierda: Volver y Título */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors hover:bg-black/5 cursor-pointer shrink-0"
              style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink)" }}
              title="Salir sin guardar"
            >
              <IconArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-lg sm:text-xl font-bold truncate" style={{ color: "var(--surco-ink)" }}>
                  {isEditing ? `Editar ${name || initialLote?.name}` : name ? name : "Nuevo Lote"}
                </h1>
                <span
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                >
                  {crop} · {hectares || "—"} ha · {locality || municipality}
                </span>
              </div>
            </div>
          </div>

          {/* Derecha: Resumen rápido y Guardar directo */}
          <div className="flex items-center gap-2 shrink-0">
            {autoFilledFields.length > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
              >
                <IconSparkles className="w-3.5 h-3.5" />
                {autoFilledFields.length} datos autocompletados
              </span>
            )}

            {referencePhotos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors hover:bg-black/5 cursor-pointer"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              >
                <IconCamera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ver foto ({referencePhotos.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95 cursor-pointer"
              style={{ background: "var(--surco-green)" }}
            >
              <IconCheck className="w-4 h-4" />
              <span>Guardar lote</span>
            </button>
          </div>
        </div>

        {/* Barra de navegación por pasos (interactiva en todo momento) */}
        <div
          className="border-t bg-stone-50/80"
          style={{ borderColor: "var(--surco-border-light)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-1.5 sm:gap-3 py-2 overflow-x-auto no-scrollbar">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
                  style={{
                    background: isActive
                      ? "var(--surco-green)"
                      : isCompleted
                      ? "var(--surco-green-tint)"
                      : "transparent",
                    color: isActive
                      ? "#ffffff"
                      : isCompleted
                      ? "var(--surco-green)"
                      : "var(--surco-ink-muted)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* ÁREA DE CONTENIDO PRINCIPAL (SCROLLABLE A PANTALLA COMPLETA)          */}
      {/* ===================================================================== */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28">
          {/* ================================================================= */}
          {/* PASO 0: CARGA INTELIGENTE CON VOZ, TEXTO O FOTO DE LABORATORIO    */}
          {/* ================================================================= */}
          {step === 0 && (
            <div className="max-w-5xl mx-auto flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2"
                    style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                  >
                    <IconSparkles className="w-3.5 h-3.5" />
                    Asistente de carga rápida
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: "var(--surco-ink)" }}>
                    ¿Cómo preferís cargar los datos del lote?
                  </h2>
                  <p className="text-sm sm:text-base mt-1" style={{ color: "var(--surco-ink-muted)" }}>
                    Dictá o escribí un resumen con tus palabras para autocompletar las fichas, adjuntá la foto del laboratorio de suelo o avanzá paso a paso.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white text-sm font-semibold shadow-2xs transition-colors hover:bg-stone-50 cursor-pointer shrink-0"
                  style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                >
                  <span>Ir al formulario manual</span>
                  <span>→</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Tarjeta Principal: Dictado por Voz + Texto Libre con IA */}
                <div
                  className="lg:col-span-7 rounded-3xl border p-6 sm:p-8 flex flex-col justify-between gap-6 bg-white shadow-xs"
                  style={{
                    borderColor: voiceActive ? "var(--surco-green)" : "var(--surco-border-light)",
                  }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                          style={{
                            background: voiceActive ? "#dc2626" : "var(--surco-green)",
                            color: "#ffffff",
                          }}
                        >
                          {voiceActive ? (
                            <IconStop className="w-6 h-6 animate-pulse" />
                          ) : (
                            <IconMic className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: "var(--surco-ink)" }}>
                            Dictado por voz o nota rápida
                          </h3>
                          <p className="text-xs sm:text-sm" style={{ color: "var(--surco-ink-muted)" }}>
                            Hablá normalmente o escribí los datos que tengas a mano
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleVoiceToggle}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-white shadow-sm transition-all cursor-pointer shrink-0"
                        style={{
                          background: voiceActive ? "#dc2626" : "var(--surco-green)",
                        }}
                      >
                        {voiceActive ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>Detener dictado</span>
                          </>
                        ) : (
                          <>
                            <IconMic className="w-4 h-4" />
                            <span>Dictar por voz</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Cuadro editable de transcripción / nota libre */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--surco-ink-muted)" }}>
                        Transcripción o resumen del lote (podés dictar o escribir acá)
                      </label>
                      <textarea
                        rows={4}
                        value={voiceTranscript}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVoiceTranscript(val);
                          const localFields = parseLoteFromTextLocal(val);
                          applyExtractedFields(localFields, Object.keys(localFields));
                        }}
                        placeholder='Ejemplo: "Lote La Loma en Gardey, son 95 hectáreas en media loma. Sembramos maíz DK 72-10, hoy está en V6, venimos de soja, rinde objetivo 11 toneladas, nitrógeno 64 kg y fósforo 14 ppm, vimos rama negra."'
                        className="w-full rounded-2xl border p-4 text-sm sm:text-base leading-relaxed outline-none transition-colors bg-stone-50/70 focus:bg-white"
                        style={{
                          borderColor: "var(--surco-border)",
                          color: "var(--surco-ink)",
                        }}
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: "var(--surco-ink-muted)" }}>
                          {extractingAi
                            ? "Analizando datos agronómicos con IA..."
                            : "Los datos detectados se cargan automáticamente en los pasos 1, 2 y 3."}
                        </span>
                        {voiceTranscript.trim() && (
                          <button
                            type="button"
                            onClick={() => processTranscriptWithAI(voiceTranscript)}
                            disabled={extractingAi}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{
                              background: "var(--surco-green-tint)",
                              color: "var(--surco-green)",
                            }}
                          >
                            <IconSparkles className="w-3.5 h-3.5" />
                            <span>{extractingAi ? "Procesando..." : "Analizar texto con IA"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {voiceError && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900">
                        {voiceError}
                      </div>
                    )}
                  </div>

                  {/* Vista previa en vivo de los campos detectados */}
                  <div
                    className="rounded-2xl border p-4"
                    style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--surco-ink-soft)" }}>
                        Vista previa de datos cargados
                      </span>
                      {autoFilledFields.length > 0 && (
                        <span className="text-xs font-semibold" style={{ color: "var(--surco-green)" }}>
                          ✓ {autoFilledFields.length} campos detectados
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="rounded-xl bg-white p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                        <span className="text-gray-400 block">Lote / Sup.</span>
                        <span className="font-bold text-gray-900 truncate block">
                          {name || "Sin nombre"} ({hectares} ha)
                        </span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                        <span className="text-gray-400 block">Cultivo / Estado</span>
                        <span className="font-bold text-emerald-900 truncate block">
                          {crop} · {phenology}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                        <span className="text-gray-400 block">N-NO3 / P Bray</span>
                        <span className="font-bold text-gray-900 truncate block">
                          {soilN} kg / {soilP} ppm
                        </span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                        <span className="text-gray-400 block">Rinde Objetivo</span>
                        <span className="font-bold text-gray-900 truncate block">
                          {targetYield} t/ha
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tarjeta Derecha: Fotos de Análisis de Suelo o Libreta */}
                <div
                  className="lg:col-span-5 rounded-3xl border p-6 sm:p-8 flex flex-col justify-between gap-6 bg-white shadow-xs"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--surco-bg-alt)", color: "var(--surco-green)" }}
                      >
                        <IconCamera className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: "var(--surco-ink)" }}>
                          Foto de laboratorio o cuaderno
                        </h3>
                        <p className="text-xs sm:text-sm" style={{ color: "var(--surco-ink-muted)" }}>
                          Guardá la planilla del análisis de suelo o marbete como respaldo del lote
                        </p>
                      </div>
                    </div>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 text-center transition-colors hover:bg-stone-50 cursor-pointer"
                      style={{ borderColor: "var(--surco-border)" }}
                    >
                      <IconCamera className="w-8 h-8 text-emerald-800" />
                      <span className="text-sm font-semibold" style={{ color: "var(--surco-ink)" }}>
                        Sacar foto o elegir de la galería
                      </span>
                      <span className="text-xs" style={{ color: "var(--surco-ink-muted)" }}>
                        Podrás consultar la imagen mientras cargás los datos de suelo
                      </span>
                    </button>

                    {referencePhotos.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {referencePhotos.map((photo, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-2xl border overflow-hidden bg-stone-100 h-28"
                            style={{ borderColor: "var(--surco-border-light)" }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.dataUrl}
                              alt={photo.name}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setShowPhotoModal(true)}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setReferencePhotos((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-600 cursor-pointer"
                              title="Quitar foto"
                            >
                              <IconClose className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded-2xl p-4 text-xs leading-relaxed"
                    style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                  >
                    <strong>Consejo práctico:</strong> Si subís una foto del análisis de laboratorio ahora, en el <strong>Paso 2 (Cultivo y Suelo)</strong> vas a tener un botón para verla en grande al lado de las casillas de Nitrógeno, Fósforo y pH.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 1: UBICACIÓN, PERÍMETRO SATELITAL Y ENTORNO                  */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* Columna Izquierda (7 cols): Mapa Satelital Interactivo Grande */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div
                  className="rounded-3xl border bg-white p-4 sm:p-6 shadow-xs flex flex-col gap-4"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span
                        className="text-xs font-bold uppercase tracking-wider block"
                        style={{ color: "var(--surco-green)" }}
                      >
                        Delimitación Satelital
                      </span>
                      <h2 className="font-serif text-xl font-bold" style={{ color: "var(--surco-ink)" }}>
                        Trazá el perímetro de tu lote
                      </h2>
                    </div>

                    <div
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-bold"
                      style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                    >
                      <IconSatellite className="w-4 h-4" />
                      <span>{hectares || "0"} ha calculadas</span>
                    </div>
                  </div>

                  <SatelliteLoteMap
                    center={mapCenter}
                    polygon={polygonCoords}
                    heightClassName="h-80 sm:h-[440px]"
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
                </div>
              </div>

              {/* Columna Derecha (5 cols): Identificación, Relieve y Zona Sensible */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Card 1: Identificación y Ubicación */}
                <div
                  className="rounded-3xl border bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <h3 className="text-base font-bold" style={{ color: "var(--surco-ink)" }}>
                    Identificación y ubicación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                        Nombre del lote
                        {autoFilledFields.includes("name") && <AutoBadge />}
                      </label>
                      <input
                        placeholder="Ej. Lote La Loma / Lote 4 Norte"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm font-medium outline-none transition-colors"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                        Superficie (ha)
                        {autoFilledFields.includes("hectares") && <AutoBadge />}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={hectares}
                          onChange={(e) => setHectares(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-9 rounded-xl border bg-stone-50/60 focus:bg-white text-sm font-bold outline-none transition-colors"
                          style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          ha
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                        Partido / Municipio
                        {autoFilledFields.includes("municipality") && <AutoBadge />}
                      </label>
                      <input
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none transition-colors"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                        Paraje / Localidad
                        {autoFilledFields.includes("locality") && <AutoBadge />}
                      </label>
                      <input
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        placeholder="Ej. Gardey, Vela..."
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none transition-colors"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                    </div>
                  </div>

                  {/* Atajos de parajes frecuentes */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-gray-400">Parajes rápidos:</span>
                    {LOCALITY_PRESETS.map((loc) => {
                      const active = locality.toLowerCase() === loc.toLowerCase();
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocality(loc)}
                          className="px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer"
                          style={{
                            background: active ? "var(--surco-green-tint)" : "var(--surco-bg)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                            color: active ? "var(--surco-green)" : "var(--surco-ink-soft)",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card 2: Relieve y Posición en el Paisaje */}
                <div
                  className="rounded-3xl border bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--surco-ink)" }}>
                      Relieve y ambiente del lote
                      {autoFilledFields.includes("relief") && <AutoBadge />}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--surco-ink-muted)" }}>
                      Define riesgo de helada tardía, escurrimiento y retención hídrica
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RELIEF_OPTIONS.map((opt) => {
                      const active = relief === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRelief(opt.value)}
                          className="rounded-2xl border p-3 text-left transition-all cursor-pointer flex flex-col justify-between"
                          style={{
                            background: active ? "var(--surco-green-tint)" : "var(--surco-bg)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                          }}
                        >
                          <span
                            className="text-xs font-bold block"
                            style={{ color: active ? "var(--surco-green)" : "var(--surco-ink)" }}
                          >
                            {opt.label}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 leading-tight block">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card 3: Restricción Ambiental / Zona Sensible */}
                <div
                  className="rounded-3xl border bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div>
                    <h3 className="text-base font-bold" style={{ color: "var(--surco-ink)" }}>
                      Cercanía a zonas sensibles (Ordenanza Municipal)
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--surco-ink-muted)" }}>
                      Permite validar distancias de amortiguamiento para pulverizaciones terrestres
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
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
                          className="rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all cursor-pointer"
                          style={{
                            background: active ? "var(--surco-green-tint)" : "var(--surco-bg)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                            color: active ? "var(--surco-green)" : "var(--surco-ink)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <label className="text-xs font-semibold" style={{ color: "var(--surco-ink-soft)" }}>
                      Distancia libre hasta el punto sensible (metros):
                    </label>
                    <div className="relative w-32 shrink-0">
                      <input
                        type="number"
                        step="50"
                        value={sensitiveZoneDistanceM}
                        onChange={(e) => setSensitiveZoneDistanceM(e.target.value)}
                        className="w-full px-3 py-2 pr-8 rounded-xl border bg-stone-50/60 focus:bg-white text-sm font-bold outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 2: CULTIVO, MANEJO Y LABORATORIO DE SUELO                    */}
          {/* ================================================================= */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* Columna Izquierda (6 cols): Cultivo y Manejo de Campaña */}
              <div
                className="lg:col-span-6 rounded-3xl border bg-white p-5 sm:p-7 shadow-xs flex flex-col gap-5"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider block"
                    style={{ color: "var(--surco-green)" }}
                  >
                    Campaña Actual
                  </span>
                  <h2 className="font-serif text-xl font-bold" style={{ color: "var(--surco-ink)" }}>
                    Cultivo, fenología y planteo técnico
                  </h2>
                </div>

                {/* Selector visual de cultivo */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                    Cultivo principal
                    {autoFilledFields.includes("crop") && <AutoBadge />}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
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
                          className="rounded-2xl border py-2.5 px-2 flex flex-col items-center gap-1 transition-all cursor-pointer"
                          style={{
                            background: active ? "var(--surco-green)" : "var(--surco-bg)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                            color: active ? "#ffffff" : "var(--surco-ink)",
                          }}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs font-bold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estado Fenológico con chips rápidos */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                    Estado fenológico actual
                    {autoFilledFields.includes("phenology") && <AutoBadge />}
                  </label>
                  <input
                    value={phenology}
                    onChange={(e) => setPhenology(e.target.value)}
                    placeholder="Ej. Barbecho, V6, R1, Z3.1..."
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm font-semibold outline-none"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentCropPresets.map((stage) => {
                      const shortStage = stage.split(" ")[0];
                      const active = phenology === stage || phenology === shortStage;
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setPhenology(shortStage)}
                          className="px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer"
                          style={{
                            background: active ? "var(--surco-green-tint)" : "var(--surco-bg)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                            color: active ? "var(--surco-green)" : "var(--surco-ink-soft)",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {stage}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Híbrido / Variedad + Fecha de Siembra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                      Híbrido / Variedad
                      {autoFilledFields.includes("hybrid") && <AutoBadge />}
                    </label>
                    <input
                      value={hybrid}
                      onChange={(e) => setHybrid(e.target.value)}
                      placeholder="Ej. DK 72-10 VT3P / DM 46i20"
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--surco-ink-soft)" }}>
                      Fecha de siembra (real o estimada)
                    </label>
                    <input
                      type="date"
                      value={plantingDate}
                      onChange={(e) => setPlantingDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                  </div>
                </div>

                {/* Rinde Objetivo, Densidad, Espaciamiento y Cultivo Antecesor */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--surco-ink-soft)" }}>
                      Rinde Obj.
                      {autoFilledFields.includes("targetYieldTonHa") && <AutoBadge />}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={targetYield}
                        onChange={(e) => setTargetYield(e.target.value)}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl border bg-stone-50/60 focus:bg-white text-sm font-bold outline-none"
                        style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                        t/ha
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--surco-ink-soft)" }}>
                      Densidad
                      {autoFilledFields.includes("targetDensityPlantsHa") && <AutoBadge />}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1000"
                        value={targetDensity}
                        onChange={(e) => setTargetDensity(e.target.value)}
                        className="w-full px-3 py-2.5 pr-11 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                        pl/ha
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--surco-ink-soft)" }}>
                      Entresurco
                      {autoFilledFields.includes("rowSpacingCm") && <AutoBadge />}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={rowSpacingCm}
                        onChange={(e) => setRowSpacingCm(e.target.value)}
                        className="w-full px-3 py-2.5 pr-8 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        cm
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--surco-ink-soft)" }}>
                      Antecesor
                      {autoFilledFields.includes("previousCrop") && <AutoBadge />}
                    </label>
                    <input
                      value={previousCrop}
                      onChange={(e) => setPreviousCrop(e.target.value)}
                      placeholder="Ej. Soja 1ra"
                      className="w-full px-3 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Columna Derecha (6 cols): Análisis de Suelo (Laboratorio) */}
              <div
                className="lg:col-span-6 rounded-3xl border bg-white p-5 sm:p-7 shadow-xs flex flex-col gap-5"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className="text-xs font-bold uppercase tracking-wider block"
                      style={{ color: "var(--surco-green)" }}
                    >
                      Diagnóstico Edáfico
                    </span>
                    <h2 className="font-serif text-xl font-bold" style={{ color: "var(--surco-ink)" }}>
                      Análisis de suelo y profundidad efectiva
                    </h2>
                  </div>

                  {referencePhotos.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer hover:bg-stone-50 shrink-0"
                      style={{ borderColor: "var(--surco-green)", color: "var(--surco-green)" }}
                    >
                      <IconCamera className="w-4 h-4" />
                      <span>Ver planilla adjunta</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer hover:bg-stone-50 shrink-0"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
                    >
                      <IconCamera className="w-3.5 h-3.5" />
                      <span>Adjuntar foto lab</span>
                    </button>
                  )}
                </div>

                {/* Parámetros químicos y físicos en tarjetas claras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nitrógeno N-NO3 */}
                  <div
                    className="rounded-2xl border p-4 flex flex-col gap-1.5"
                    style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold" style={{ color: "var(--surco-ink)" }}>
                        Nitrógeno N-NO3 (0–60 cm)
                      </label>
                      {autoFilledFields.includes("soilNitrateKgHa") && <AutoBadge />}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Disponibilidad inicial para balance de N
                    </span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={soilN}
                        onChange={(e) => setSoilN(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-14 rounded-xl border bg-white text-base font-bold outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        kg/ha
                      </span>
                    </div>
                  </div>

                  {/* Fósforo P Bray */}
                  <div
                    className="rounded-2xl border p-4 flex flex-col gap-1.5"
                    style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold" style={{ color: "var(--surco-ink)" }}>
                        Fósforo P Bray (0–20 cm)
                      </label>
                      {autoFilledFields.includes("soilPhosphorusPpm") && <AutoBadge />}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Umbral crítico referencia: ~15–18 ppm
                    </span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.5"
                        value={soilP}
                        onChange={(e) => setSoilP(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-14 rounded-xl border bg-white text-base font-bold outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        ppm
                      </span>
                    </div>
                  </div>

                  {/* Materia Orgánica */}
                  <div
                    className="rounded-2xl border p-4 flex flex-col gap-1.5"
                    style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold" style={{ color: "var(--surco-ink)" }}>
                        Materia Orgánica (MO)
                      </label>
                      {autoFilledFields.includes("organicMatterPercent") && <AutoBadge />}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Mineralización y retención de herbicidas
                    </span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.1"
                        value={soilMO}
                        onChange={(e) => setSoilMO(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-white text-base font-bold outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Profundidad a Tosca */}
                  <div
                    className="rounded-2xl border p-4 flex flex-col gap-1.5"
                    style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold" style={{ color: "var(--surco-ink)" }}>
                        Profundidad efectiva / Tosca
                      </label>
                      {autoFilledFields.includes("toscaDepthCm") && <AutoBadge />}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Define almacenaje de agua útil del perfil
                    </span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="5"
                        value={toscaDepth}
                        onChange={(e) => setToscaDepth(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-12 rounded-xl border bg-white text-base font-bold outline-none"
                        style={{ borderColor: "var(--surco-border)" }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        cm
                      </span>
                    </div>
                  </div>
                </div>

                {/* pH y Textura Superficial */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-4 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--surco-ink-soft)" }}>
                      pH actual (0–20 cm)
                      {autoFilledFields.includes("ph") && <AutoBadge />}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={soilPh}
                      onChange={(e) => setSoilPh(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50/60 focus:bg-white text-sm font-bold outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                  </div>

                  <div className="sm:col-span-8 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--surco-ink-soft)" }}>
                      Textura superficial del lote
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Franco", "Franco-arcilloso", "Franco-arenoso"] as const).map((tex) => {
                        const active = soilTexture === tex;
                        return (
                          <button
                            key={tex}
                            type="button"
                            onClick={() => setSoilTexture(tex)}
                            className="py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate"
                            style={{
                              background: active ? "var(--surco-green-tint)" : "var(--surco-bg)",
                              borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                              color: active ? "var(--surco-green)" : "var(--surco-ink)",
                            }}
                          >
                            {tex}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 3: HISTORIAL DE APLICACIONES Y MALEZAS / PLAGAS              */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* Columna Izquierda (7 cols): Aplicaciones Previas */}
              <div
                className="lg:col-span-7 rounded-3xl border bg-white p-5 sm:p-7 shadow-xs flex flex-col gap-5"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider block"
                    style={{ color: "var(--surco-green)" }}
                  >
                    Trazabilidad de Manejo
                  </span>
                  <h2 className="font-serif text-xl font-bold" style={{ color: "var(--surco-ink)" }}>
                    Historial de aplicaciones del lote
                  </h2>
                  <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--surco-ink-muted)" }}>
                    Cargá barbechos, preemergentes o fertilizantes aplicados para evaluar carry-over y rotación de modos de acción (HRAC).
                  </p>
                </div>

                {/* Atajos de 1 toque */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--surco-ink-soft)" }}>
                    Agregar tratamiento frecuente en 1 toque:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_APPLICATIONS.map((preset) => (
                      <button
                        key={preset.productName}
                        type="button"
                        onClick={() => addQuickApplication(preset)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all hover:bg-emerald-50/60 cursor-pointer text-left"
                        style={{
                          background: "var(--surco-bg)",
                          borderColor: "var(--surco-border-light)",
                          color: "var(--surco-ink)",
                        }}
                      >
                        <IconPlus className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{preset.productName.split("(")[0].trim()}</span>
                        <span className="text-[11px] text-gray-400">({preset.dose})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulario cómodo para cargar aplicación manual */}
                <div
                  className="rounded-2xl border p-4 flex flex-col gap-3"
                  style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--surco-ink-soft)" }}>
                    Cargar otra aplicación manualmente
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="date"
                      value={appDate}
                      onChange={(e) => setAppDate(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                    <select
                      value={appCategory}
                      onChange={(e) => setAppCategory(e.target.value as LoteApplicationRecord["category"])}
                      className="px-3 py-2.5 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    >
                      <option value="Herbicida barbecho">Herbicida barbecho</option>
                      <option value="Herbicida preemergente">Herbicida preemergente</option>
                      <option value="Herbicida postemergente">Herbicida postemergente</option>
                      <option value="Fertilizante">Fertilizante</option>
                      <option value="Insecticida">Insecticida</option>
                      <option value="Fungicida">Fungicida</option>
                    </select>
                    <input
                      placeholder="Dosis (ej. 1,5 l/ha o 120 kg/ha)"
                      value={appDose}
                      onChange={(e) => setAppDose(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      placeholder="Producto comercial (ej. Dual Gold, Atrazina 90, Urea...)"
                      value={appProduct}
                      onChange={(e) => setAppProduct(e.target.value)}
                      className="sm:col-span-5 px-3 py-2.5 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                    <input
                      placeholder="Principio activo / Grupo (opcional)"
                      value={appActive}
                      onChange={(e) => setAppActive(e.target.value)}
                      className="sm:col-span-4 px-3 py-2.5 rounded-xl border bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                    <button
                      type="button"
                      onClick={addCustomApplication}
                      disabled={!appProduct.trim()}
                      className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: "var(--surco-green)" }}
                    >
                      <IconPlus className="w-4 h-4" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>

                {/* Lista cronológica de aplicaciones cargadas */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--surco-ink-soft)" }}>
                      Aplicaciones registradas ({applications.length})
                    </span>
                  </div>

                  {applications.length === 0 ? (
                    <div
                      className="rounded-2xl border border-dashed p-6 text-center text-xs sm:text-sm"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-muted)" }}
                    >
                      Todavía no agregaste aplicaciones previas en este lote. Podés tocar cualquiera de los atajos de arriba.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                      {applications.map((app) => (
                        <div
                          key={app.id}
                          className="rounded-2xl border p-3.5 flex items-center justify-between gap-3 bg-stone-50/60"
                          style={{ borderColor: "var(--surco-border-light)" }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                              >
                                {app.category}
                              </span>
                              <span className="font-mono text-xs text-gray-500">{app.date}</span>
                              {app.modeOfAction && (
                                <span className="text-[11px] font-medium text-emerald-800">
                                  · {app.modeOfAction}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-bold" style={{ color: "var(--surco-ink)" }}>
                                {app.productName}
                              </span>
                              <span className="text-xs font-semibold text-emerald-800">
                                Dosis: {app.dose}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setApplications((prev) => prev.filter((item) => item.id !== app.id))
                            }
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 cursor-pointer shrink-0"
                            title="Eliminar aplicación"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha (5 cols): Malezas, Plagas y Observaciones */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div
                  className="rounded-3xl border bg-white p-5 sm:p-7 shadow-xs flex flex-col gap-4"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div>
                    <span
                      className="text-xs font-bold uppercase tracking-wider block"
                      style={{ color: "var(--surco-green)" }}
                    >
                      Monitoreo de Campo
                    </span>
                    <h3 className="font-serif text-xl font-bold" style={{ color: "var(--surco-ink)" }}>
                      Malezas y plagas detectadas
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--surco-ink-muted)" }}>
                      Seleccioná los escapes o plagas presentes en el lote
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...COMMON_WEEDS_PESTS, ...selectedWeeds])).map((w) => {
                      const active = selectedWeeds.includes(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => toggleWeed(w)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer"
                          style={{
                            background: active ? "var(--surco-green)" : "var(--surco-bg)",
                            borderColor: active ? "var(--surco-green)" : "var(--surco-border-light)",
                            color: active ? "#ffffff" : "var(--surco-ink)",
                          }}
                        >
                          {active && <IconCheck className="w-3.5 h-3.5" />}
                          <span>{w}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Agregar otra maleza o plaga personalizada */}
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
                      placeholder="Otra maleza o plaga (ej. Chinche verde)..."
                      className="flex-1 px-3.5 py-2 rounded-xl border bg-stone-50/60 focus:bg-white text-xs sm:text-sm outline-none"
                      style={{ borderColor: "var(--surco-border)" }}
                    />
                    <button
                      type="button"
                      onClick={addCustomWeed}
                      disabled={!customWeedInput.trim()}
                      className="px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer hover:bg-stone-50 disabled:opacity-40"
                      style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                    >
                      + Sumar
                    </button>
                  </div>
                </div>

                {/* Notas de campo / Observaciones */}
                <div
                  className="rounded-3xl border bg-white p-5 sm:p-7 shadow-xs flex flex-col gap-3"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <label className="text-sm font-bold" style={{ color: "var(--surco-ink)" }}>
                    Observaciones adicionales del lote (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Sector bajo con rastrojo pesado de trigo, presencia de tosca a 55 cm en la cabecera norte..."
                    className="w-full rounded-2xl border p-3.5 text-xs sm:text-sm outline-none bg-stone-50/60 focus:bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================================================================== */}
      {/* BARRA INFERIOR STICKY DE ACCIONES (SIEMPRE ACCESIBLE)                 */}
      {/* ===================================================================== */}
      <footer
        className="shrink-0 border-t bg-white/95 backdrop-blur-md z-20"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          {/* Botón Izquierdo: Anterior o Cancelar */}
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2 | 3)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold transition-colors hover:bg-stone-100 cursor-pointer"
                style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
              >
                <span>← Paso anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition-colors hover:bg-stone-100 cursor-pointer"
                style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
              >
                <span>Cancelar</span>
              </button>
            )}
          </div>

          {/* Indicador central de progreso */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium" style={{ color: "var(--surco-ink-muted)" }}>
            <IconMapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              {name || `Lote ${crop}`} · <strong>{hectares || 0} ha</strong> · {locality || municipality}
            </span>
          </div>

          {/* Botón Derecho: Siguiente paso o Guardar Lote */}
          <div className="flex items-center gap-2.5">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2 | 3)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                <span>
                  {step === 0
                    ? "Continuar a Ubicación y Mapa →"
                    : step === 1
                    ? "Siguiente: Cultivo y Suelo →"
                    : "Siguiente: Aplicaciones y Sanidad →"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                <IconCheck className="w-4 h-4" />
                <span>{isEditing ? "Guardar cambios del lote" : "Crear y guardar lote"}</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* VISOR DE FOTOS ADJUNTAS (PARA CONSULTAR LABORATORIO EN CUALQUIER PASO)*/}
      {/* ===================================================================== */}
      {showPhotoModal && referencePhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b flex items-center justify-between">
              <span className="text-sm font-bold">
                Fotos de referencia adjuntas ({referencePhotos.length})
              </span>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 gap-4">
              {referencePhotos.map((photo, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-500 font-medium">{photo.name}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full rounded-2xl border object-contain max-h-[70vh] bg-stone-950"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
