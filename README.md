# Surco — Asistente agronómico

Prototipo de asistente de información técnica para ingenieros agrónomos,
desarrollado para el Desafío 04 de la Hackaton Agro 2026 ("Asistente confiable
de información técnica para ingenieros agrónomos"). Alcance inicial: agricultura
extensiva de **Tandil y zona**.

Surco prioriza la confiabilidad y la trazabilidad sobre la apariencia de
certeza: cada respuesta separa hechos respaldados por fuentes, cálculos
deterministas e interpretaciones, muestra de dónde sale cada dato, y reconoce
explícitamente cuándo la evidencia disponible no alcanza para concluir.

## Qué quedó implementado

- **Chat de punta a punta**: landing con consultas sugeridas → `/chat`
  → ruta de servidor `POST /api/chat` → respuesta renderizada con fuentes y formularios interactivos.
- **Cálculos agronómicos deterministas** (no dependen del modelo de IA):
  - Contenido de nitrógeno de un fertilizante (`src/lib/calculations.ts`:`nitrogenContent`).
  - Conversión de dosis de N/ha a cantidad de producto para una superficie (`doseToProduct`).
- **Biblioteca documental verificada** (`src/lib/library.ts`): 27 fragmentos
  curados a partir de fuentes públicas reales y verificadas (INTA, SENASA,
  Aapresid/REM, normativa provincial Ley 10.699 y Decreto 499/1991, normativa de Tandil
  Ordenanza 17.404/2021 y decretos reglamentarios/suspensiones judiciales, SMN, FACMA,
  FATRAC, CREA, CASAFE, bolsas de cereales), cada uno con institución, título, fecha,
  URL verificada, sección y su **límite** explícito (qué no permite concluir esa fuente por sí sola).
- **Cobertura integral de los 18 escenarios del desafío (C01 a C18)**:
  - **C01 · Rotación de cultivos tras herbicida**: detecta herbicidas residuales aplicados, exige marbete y formulación antes de definir intervalos de siembra (`crop_rotation` form; R01, R02).
  - **C02 · Productos y familias para un cultivo**: diferencia familia química de modo de acción y exige el registro oficial (`product_family` form; R08, R09, R01, R02).
  - **C03 · Una maleza problema**: programa integrado con biotipos resistentes y rotación estricta de modos de acción (`weed_management` form; R08, R09, R02).
  - **C04 · Plagas y enfermedades del cultivo**: distingue hipótesis de campo de diagnóstico fitopatológico confirmado con umbrales de daño económico (`pest_disease_management` form; R08, R02).
  - **C05 · Comparar híbridos y cultivares**: preserva el contexto de ensayo (sitio, campaña, tosca) diferenciando un ranking puntual de la estabilidad multiamiental (`cultivar_selection` form; R06 maíz, R07 soja, R27 girasol).
  - **C06 · Controlar pérdidas de cosecha**: desagrega pérdidas previas de precosecha vs pérdidas de máquina (cabezal y cola) y calibración (`harvest_losses` form; R10 INTA).
  - **C07 · Planificar un muestreo de suelo**: requiere objetivo del análisis y lote antes de definir protocolo y laboratorio (`soil_sampling` form; R04, R05).
  - **C08 · Comparar estrategias y dosis de fertilización**: diagnóstico por umbrales y modelos regionales sin inventar dosis comerciales fijas (`fertilization_strategy` form; R03, R04, R05).
  - **C09 · Hacer un balance de nutrientes**: delimita con rigor lo no implementado en el MVP (balances de masa integrales) de las conversiones exactas de urea (R03) y extracción neta (`nutrient_balance` form).
  - **C10 · Encontrar e interpretar normativa aplicable**: lectura conjunta de Tandil (R11 a R16) y declaración explícita de falta de cobertura para otros municipios bonaerenses (R12, R13; `municipality_regulations` form).
  - **C11 · Conocer novedades en insumos**: declara ausencia de feed en tiempo real y enseña a contrastar marketing comercial con ensayos independientes y SENASA (R01, R06-R08, R24).
  - **C12 · Precios de venta de cereales**: declara falta de cotización en tiempo real y orienta a pizarras de BCR (R20) y Bahía Blanca (R21).
  - **C13 · Alquileres rurales de la zona**: declara que no existen promedios zonales representativos ni inventa $/ha, orientando a grupos CREA (`rental_rates` form; R25).
  - **C14 · Costos de labores**: diferencia tarifas orientativas de contratistas de presupuestos efectivos (`machinery_costs` form; R22 FACMA).
  - **C15 · Costos de flete**: orienta tarifas por distancia y tonelada sin confirmar cotizaciones individuales del viaje (`freight_costs` form; R23 FATRAC).
  - **C16 · Riesgo de heladas**: distingue pronósticos meteorológicos preventivos (SMN R26, Agromet R17) de mapas satelitales post-evento (R18; `frost_risk` form).
  - **C17 · Condiciones para una aplicación**: prohíbe autorizaciones automáticas por variables climáticas simples; exige marbete (R01/R02), normativa de Tandil (R14-R16), medición in situ con termoanemómetro y telemetría de deriva (`application_conditions` form; R19 INTA).
  - **C18 · Consultar una biblioteca propia**: respuesta general y transparente explicando que la carga de PDFs locales está fuera de alcance del MVP y sugiriendo pegar fragmentos directamente.
- **Formularios interactivos tipados** (`ClarificationForm.tsx`): 12 formularios interactivos según el escenario, validados en el servidor con whitelist de tipos.
- **Recuperación documental** por coincidencia de palabras clave (`src/lib/retrieval.ts`).
- **Modo de demostración vs. modo con IA**, claramente diferenciados en la UI.
- **Persistencia de la conversación** en `localStorage` del navegador durante la sesión.
- **UI responsive** (escritorio y móvil) con identidad visual propia: fondo marfil, verde oscuro, tarjetas de fuente plegables, advertencias discretas.

### Fuera de alcance en este MVP

- Carga de PDF propios por el usuario (sección 9 de la guía) — documentada
  como segunda fase; no implementada para no arriesgar la publicación de
  mañana.
- Recuperación semántica/vectorial (queda la interfaz lista para incorporarla).
- Autenticación, base de datos, sincronización entre dispositivos.

## Arquitectura

**Next.js 16 (App Router) + TypeScript + Tailwind CSS**, pensado para Vercel:

```
src/
  app/
    page.tsx              landing (consultas sugeridas, campo central)
    chat/page.tsx          conversación (cliente, localStorage)
    api/chat/route.ts      POST — orquesta la respuesta
    api/health/route.ts    GET  — estado del servicio
  components/
    MessageBubble.tsx       burbuja de chat (usuario / asistente)
    SourceCard.tsx          tarjeta de fuente plegable
  lib/
    library.ts              biblioteca documental (fragmentos + metadatos)
    retrieval.ts             recuperación por palabras clave
    calculations.ts          cálculos deterministas
    ai-provider.ts           capa de proveedor de IA (Anthropic), server-only
    respond.ts                orquestación: calc → info insuficiente → RAG
    types.ts                  tipos compartidos
```

Se eligió **no migrar la lógica a una base de datos ni a infraestructura
adicional** (Postgres, pgvector, Redis, auth) porque no son imprescindibles
para una demo de un día y agregarían riesgo de despliegue. La biblioteca
documental vive versionada en el repositorio (`src/lib/library.ts`) y la capa
de recuperación (`retrieval.ts`) está desacoplada para poder reemplazarse por
un índice vectorial más adelante sin tocar `respond.ts` ni la UI.

La clave de IA (si existe) se usa **solo en rutas de servidor**
(`src/lib/ai-provider.ts`, invocado desde `api/chat/route.ts`); nunca se
expone al navegador.

## Cómo ejecutar el proyecto localmente

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Sin ninguna variable de entorno configurada, la
aplicación funciona completa en modo de demostración.

### Pruebas

```bash
npm test     # vitest — cálculos y lógica de respuesta
npm run build  # build de producción
npm run lint
```

## Variables de entorno

Ver [`.env.example`](.env.example). Ninguna es obligatoria:

| Variable | Obligatoria | Efecto |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Si está presente, las respuestas con evidencia se redactan con Claude (RAG) en vez de la plantilla determinista. |
| `ANTHROPIC_MODEL` | No | Modelo a usar (default `claude-sonnet-5`). |

**Importante**: esta sesión de Claude Code no tiene una `ANTHROPIC_API_KEY` de
uso general disponible en el entorno (las variables presentes son internas de
la app de escritorio, no una clave de API utilizable). La demo de mañana corre
en **modo de demostración** salvo que se configure una clave propia en
Vercel antes de la presentación.

## Estado de la publicación en Vercel

**Publicada y verificada:** https://surco-agro.vercel.app

Se desplegó con la CLI de Vercel usando la cuenta ya autenticada en este
entorno (proyecto `jeremias13/surco-agro`). Verificado tras el deploy:

- `GET /` y `GET /chat` responden 200.
- `GET /api/health` responde `{"status":"ok", ...}`.
- `POST /api/chat` calcula correctamente el caso de urea en producción.

Nota técnica: el primer intento de deploy devolvía 404 en todas las rutas
porque el proyecto se había creado sin el framework "Next.js" asociado
explícitamente, lo que hacía que Vercel lo tratara como sitio estático
(`@vercel/static-build`) en lugar de generar las funciones serverless. Se
corrigió fijando `framework: "nextjs"` en la configuración del proyecto y
quitando las flags experimentales `cacheComponents` / `partialPrefetching`
de `next.config.ts` (no soportadas de forma estable en este momento), lo que
restauró la generación correcta de funciones y rutas.

Si se quiere redesplegar desde otra cuenta o repositorio:

```bash
npm install -g vercel   # o usar npx vercel
vercel login            # requiere navegador/cuenta del usuario
vercel link             # o importar el repo en vercel.com/new
vercel --prod           # deploy de producción
```

No se requiere configurar ninguna variable de entorno para que funcione en
modo demostración. Si se quiere habilitar IA real, cargar `ANTHROPIC_API_KEY`
en Project Settings → Environment Variables antes del deploy.

## Limitaciones conocidas

- La biblioteca documental es pequeña y curada a mano para esta demo (22
  fragmentos de ~10 instituciones/fuentes reales); no cubre todos los temas
  de la guía del desafío.
- La recuperación es por palabras clave, no semántica: preguntas formuladas
  de forma muy distinta a los términos de la biblioteca pueden no encontrar
  fragmentos relevantes y devolver "sin evidencia suficiente" aun cuando el
  tema esté parcialmente cubierto.
- La conversación se guarda solo en `localStorage` del navegador: se pierde
  al cambiar de dispositivo o borrar datos del sitio.
- No hay carga de documentos propios (PDF) en esta versión.
- El modo con IA (si se configura una clave) depende de la disponibilidad del
  proveedor externo; ante un error, la aplicación degrada automáticamente al
  modo de demostración en esa respuesta puntual en vez de romper la
  conversación.

## Guion de presentación (3–5 minutos)

1. **Problema (30s)**: la información agronómica está dispersa y un chatbot
   genérico puede sonar seguro sin estar respaldado. Mostrar la landing:
   "Surco" + propuesta de valor + alcance (Tandil).
2. **Cálculo verificable (45s)**: hacer clic en "¿Cuánto nitrógeno contienen
   100 kg de urea al 46%?" → mostrar el resultado con los pasos del cálculo y
   la aclaración de que no es una recomendación agronómica. Repetir con la
   consulta de dosis a 12 ha.
3. **Información insuficiente (60s)**: preguntar "¿Está autorizado este
   herbicida para mi cultivo?" sin nombrarlo → Surco pide los datos exactos en
   vez de inventar una autorización. Mostrar lo mismo con una pregunta de
   precio actual de un cereal.
4. **Respuesta con fuentes trazables (60s)**: preguntar por la normativa de
   agroquímicos de Tandil → abrir una tarjeta de fuente y mostrar institución,
   fecha de verificación, sección y el enlace real al documento oficial.
5. **Transparencia del modo (30s)**: señalar la etiqueta "Modo demostración"
   vs. "Generado con IA", y explicar que con una API key configurada la misma
   arquitectura usa un modelo de lenguaje para redactar sobre la misma
   evidencia, sin inventar fuentes.
6. **Cierre (30s)**: arquitectura pensada para crecer (más documentos, más
   fuentes, recuperación semántica) sin rehacer el producto.
