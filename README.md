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
  → ruta de servidor `POST /api/chat` → respuesta renderizada con fuentes.
- **Dos cálculos agronómicos deterministas** (no dependen del modelo de IA):
  - Contenido de nitrógeno de un fertilizante (`src/lib/calculations.ts`:`nitrogenContent`).
  - Conversión de dosis de N/ha a cantidad de producto para una superficie
    (`doseToProduct`).
- **Biblioteca documental inicial** (`src/lib/library.ts`): ~22 fragmentos
  curados a partir de fuentes públicas reales y verificadas (INTA, SENASA,
  Aapresid/REM, normativa provincial y de Tandil, SMN, bolsas de cereales),
  cada uno con institución, título, fecha, URL verificada, sección y su
  **límite** explícito (qué no permite concluir esa fuente por sí sola).
- **Recuperación documental** por coincidencia de palabras clave
  (`src/lib/retrieval.ts`), con una interfaz pensada para poder migrar después
  a un índice semántico/vectorial sin tocar el resto del sistema.
- **Reconocimiento de información insuficiente** para tres casos obligatorios:
  - Fitosanitario sin producto identificado → pide nombre comercial/registro,
    formulación, cultivo y uso previsto.
  - Muestreo de suelo sin objetivo/contexto → pide objetivo, cultivo y
    antecedentes del lote.
  - Precios actuales de cereales/insumos → nunca inventa una cifra; indica que
    no hay conexión en tiempo real y dónde consultarla.
  - Preguntas sin evidencia en la biblioteca → lo declara explícitamente y pide
    más contexto o el documento pertinente, sin inventar fuentes.
- **Modo de demostración vs. modo con IA**, claramente diferenciados en la UI
  (etiqueta "Modo demostración" / "Generado con IA"). Si `ANTHROPIC_API_KEY`
  está configurada, las respuestas basadas en evidencia se redactan con Claude
  a partir de los fragmentos recuperados (RAG); si no, se arma una respuesta
  determinista con esos mismos fragmentos. Nunca se presenta una respuesta de
  demostración como si viniera de un modelo conectado.
- **Persistencia de la conversación** en `localStorage` del navegador durante
  la sesión (no hay backend de persistencia: ver limitaciones).
- **UI responsive** (escritorio y móvil) con identidad visual propia: fondo
  marfil, verde oscuro, tarjetas de fuente plegables, advertencias discretas.

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

El build de producción (`npm run build`) pasa sin errores y el proyecto no
depende de sistema de archivos persistente ni de infraestructura externa
obligatoria, por lo que es desplegable en Vercel tal cual.

**La publicación real en Vercel no se completó desde este entorno** porque
requiere autenticación interactiva (`vercel login`) o integración con una
cuenta de GitHub/Vercel del usuario, credenciales que no están disponibles en
esta sesión. Pasos mínimos para completarla:

```bash
npm install -g vercel   # o usar npx vercel
vercel login            # requiere navegador/cuenta del usuario
vercel                  # deploy de preview
vercel --prod           # deploy de producción
```

O, más simple para la demo: importar el repositorio en
https://vercel.com/new conectando la cuenta de GitHub del usuario. Framework
Next.js se detecta automáticamente; no se requiere configurar ninguna
variable de entorno para que funcione en modo demostración. Si se quiere
habilitar IA real, cargar `ANTHROPIC_API_KEY` en Project Settings → Environment
Variables antes del deploy.

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
