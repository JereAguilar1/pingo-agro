# Prompt para implementar los escenarios C03–C18 de Surco

Copiá todo el bloque de abajo (desde "## Contexto" hasta el final) y pegáselo a
un modelo/agente con acceso al repositorio en
`/home/jere/Universidad/Hackaton Agro/Asistente`.

---

## Contexto

Estás trabajando en **Surco**, un asistente de información técnica para
ingenieros agrónomos (agricultura extensiva de Tandil y zona), hecho para una
hackatón. Es un Next.js 16 (App Router) + TypeScript + Tailwind, sin base de
datos: la "biblioteca documental" vive versionada en `src/lib/library.ts` como
una lista de fragmentos con procedencia verificada (institución, título,
fecha, URL real, límite explícito).

El proyecto ya está publicado en Vercel (`https://surco-agro.vercel.app`,
proyecto `jeremias13/surco-agro`, ya linkeado vía `.vercel/project.json`) y ya
tiene implementados dos escenarios de la guía del desafío (C01 y C02) como
referencia de estilo. **Tu tarea es implementar el resto de los escenarios
(C03 a C18) siguiendo exactamente el mismo patrón.**

No tenés que resolver los temas agronómicos en profundidad: tenés que lograr
que el asistente (a) nunca invente datos, fuentes, precios ni autorizaciones,
(b) pida los datos que falten mediante un formulario interactivo (no una
lista de texto plano) cuando corresponda, y (c) cuando sí haya evidencia en la
biblioteca, dé una respuesta que explique qué respalda cada fuente y cuáles
son sus límites.

## Regla de oro (no negociable)

**Nunca inventes:** fuentes, títulos, páginas, citas, enlaces, fechas,
precios, resultados de ensayos, intervalos de días, dosis o autorizaciones.
Si la biblioteca actual (`src/lib/library.ts`) no tiene un fragmento real que
respalde algo, no lo afirmes: pedí el dato faltante o decí explícitamente que
no hay evidencia suficiente. Podés **agregar nuevos fragmentos reales** a
`library.ts` si hacés una búsqueda real y encontrás una URL pública
verificable de una institución seria (INTA, SENASA, SMN, Aapresid, bolsas de
cereales, normativa oficial, etc.) — nunca inventes una URL o un dato de
fuente.

## Arquitectura y dónde tocar

```
src/lib/types.ts          Tipos compartidos: AssistantResponse, ClarificationForm,
                           ClarificationFormKind (unión de strings), FormSubmission.
src/lib/library.ts        Biblioteca documental (fragmentos con fuente real).
src/lib/retrieval.ts       Recuperación por palabras clave (no tocar salvo necesidad).
src/lib/respond.ts         TODA la lógica de negocio vive acá. Patrón por escenario:
                             1. función isXQuery(q: string): boolean  — detector
                                (q ya viene normalizado: minúsculas, sin tildes)
                             2. función handleXInsufficientInfo() / handleXGroundedAnswer()
                                — arma el AssistantResponse (sin pasar por IA)
                             3. (si pide datos) incluir `clarificationForm` en la
                                respuesta, con `kind` propio y `fields` tipados
                             4. función handleXFormSubmission(data) — qué responder
                                cuando el usuario completa y envía ese formulario
                             5. registrar el nuevo `kind` en el switch de
                                `handleFormSubmission`
                             6. agregar la llamada a isXQuery(q) en la cadena de
                                `respond()`, en un orden que no choque con los
                                detectores existentes (los más específicos van
                                primero; probá con tests que no se solapen)
src/app/api/chat/route.ts  Si agregás un nuevo `ClarificationFormKind`, sumalo
                           también al array `FORM_KINDS` acá (whitelist de
                           validación del body).
src/components/
  ClarificationForm.tsx     Componente de formulario genérico (texto/select/date).
                            Ya soporta cualquier `ClarificationForm` nuevo sin
                            tocarlo, siempre que uses los `type` existentes.
  MessageBubble.tsx          Ya renderiza `clarificationForm` si está presente
                            (prioriza el formulario sobre `followUpQuestions`).
src/lib/__tests__/respond.test.ts   Tests con vitest. Agregá al menos un test
                           por escenario nuevo (ver ejemplos existentes de C01/C02).
```

### Forma de un `AssistantResponse` (ver `src/lib/types.ts`)

```ts
{
  kind: "calculation" | "insufficient_info" | "grounded_answer" | "no_evidence" | "general",
  answer: string,                 // texto plano, SIN markdown (no "**negrita**", no "- " bullets)
  sources: SourceCardData[],      // solo sourceCode reales de library.ts / las constantes de respond.ts
  warnings: string[],             // límites, aclaraciones, qué no se afirma
  followUpQuestions?: string[],   // fallback de texto si no hay form (mantenerlo igual que el form)
  clarificationForm?: {
    kind: ClarificationFormKind,  // string único por escenario, ej. "weed_management"
    submitLabel?: string,
    fields: Array<{
      id: string, label: string, type: "text" | "select" | "date",
      placeholder?: string, options?: string[], required?: boolean,
    }>,
  },
  mode: "demo" | "ai",            // siempre "demo" para estas respuestas deterministas
}
```

Mirá `handlePhytoInsufficientInfo`, `handleCropRotationInsufficientInfo` y
`handleProductFamilyInsufficientInfo` en `src/lib/respond.ts` como plantilla
exacta de estilo y tono (español rioplatense, profesional, sin tecnicismos
innecesarios). Mirá también `handlePhytoFormSubmission` y
`handleProductFamilyFormSubmission` para el patrón de "qué responder una vez
que el usuario completó el formulario" (nunca resolver del todo — siempre
señalar el próximo paso de verificación real, con la fuente concreta).

## Fuentes disponibles en `src/lib/library.ts` (NO inventar otras sin verificarlas)

Códigos ya cargados con institución, URL real y límite: `R01` (SENASA
registro), `R02` (SENASA vademécum), `R03` (INTA urea/N), `R04` (INTA
metodología de muestreo de suelo), `R05` (INTA Balcarce laboratorio), `R06`
(ensayos de maíz sur de BA), `R07` (RECSO soja), `R08` (Aapresid REM), `R09`
(REM modos de acción, 2013), `R10` (INTA pérdidas de cosecha), `R11`
(normativa nacional), `R14`/`R15`/`R16` (Tandil: ordenanza/decreto
reglamentario/decreto 2026), `R17` (INTA agromet semanal), `R18` (INTA
heladas), `R20` (BCR precios de pizarra), `R21` (Bolsa Bahía Blanca), `R22`
(FACMA precios de labores), `R23` (FATRAC tarifas de flete), `R26` (SMN),
`R27` (INTA Balcarce girasol).

**Códigos mencionados por la guía del desafío que TODAVÍA NO están en
`library.ts`** y vas a necesitar para algunos escenarios de abajo: `R12`/`R13`
(normativa provincial — Ley 10.699 y Decreto 499/1991, ya tenés las URLs en el
historial de `respond.ts`/README si existieran, si no buscalas vos),
`R19` (INTA monitoreo remoto de pulverizaciones), `R24` (CASAFE), `R25`
(CREA). Si vas a citarlos, agregalos primero como fragmentos reales a
`library.ts` con su URL pública verificada (buscala vos, no la inventes) y la
redacción de qué aporta y qué límite tiene, siguiendo el mismo formato que los
fragmentos existentes.

## Fuentes reales conocidas para completar `library.ts` (verificadas al 2026-10-23)

Si necesitás agregarlas, estas URLs ya están verificadas (podés confiar en
ellas sin tener que volver a buscarlas):

- CASAFE (R24): `https://www.casafe.org/`
- CREA (R25): `https://www.crea.org.ar/`
- INTA monitoreo remoto de pulverizaciones (R19):
  `https://www.argentina.gob.ar/inta/tecnologias/sistema-de-monitoreo-remoto-de-pulverizaciones-y-su-deriva`
- Ley provincial 10.699 (R12): `https://normas.gba.gob.ar/ar-b/ley/1988/10699/6118`
- Decreto reglamentario 499/1991 (R13): `https://normas.gba.gob.ar/ar-b/decreto/1991/499/99285`
- Normativa nacional / Infoleg (ya es R11): `https://www.argentina.gob.ar/normativa`

## Escenarios a implementar (texto literal de la guía del desafío)

> Ya implementados como referencia de estilo: **C01** (cambiar cultivo después
> de un herbicida) y **C02** (productos y familias para un cultivo). No los
> toques salvo que encuentres un bug.

**C03 · Una maleza problema**
«Tengo una maleza que me está complicando el lote. ¿Qué estrategias de manejo
puedo comparar para esta campaña y la siguiente?»
Para explorar: especie, estado, cultivo, antecedentes y resultados de
controles anteriores. Comparar estrategias y evidencia, incluyendo
alternativas de manejo; no reducir la pregunta a elegir un producto.
Dónde empezar: R08–R09, ensayos pertinentes y registros propios.

**C04 · Plagas y enfermedades del cultivo**
«¿Qué plagas o enfermedades debería monitorear en este cultivo y etapa? ¿Qué
información me ayuda a interpretar lo que observo?»
Para explorar: ubicación, cultivo, etapa y observaciones disponibles;
diferenciar información general, hipótesis y diagnóstico. No dar por
confirmada una plaga a partir de datos insuficientes.
Dónde empezar: R08; ampliar con publicaciones de INTA y universidades para el
cultivo elegido.

**C05 · Comparar híbridos y cultivares**
«Estoy por sembrar y quiero seleccionar candidatos para mi zona. ¿Qué
muestran los ensayos y bajo qué condiciones se obtuvieron esos resultados?»
Para explorar: localidad, ambiente, campaña, manejo y objetivo. Comparar
resultados conservando el contexto del ensayo; distinguir un ranking de un
sitio de una selección para el lote.
Dónde empezar: R06 para maíz, R07 para soja y R27 como referencia
bibliográfica para girasol.

**C06 · Controlar pérdidas de cosecha**
«Estoy midiendo pérdidas por plataforma y por cola. ¿Cómo las comparo con
guías y estudios para saber si son elevadas?»
Para explorar: cultivo, método, área muestreada y unidades; diferenciar
pérdidas previas de las asociadas a la máquina. La nota de referencia es una
entrada al tema; falta seleccionar un protocolo de medición y comparación
para cada cultivo.
Dónde empezar: R10 y registros de campo.

**C07 · Planificar un muestreo de suelo** — *ya hay un handler genérico*
(`isSoilSamplingPlanningQuery` / `handleSoilSamplingInsufficientInfo`, con
formulario `soil_sampling`). Revisalo y mejoralo si falta algo del enunciado
original, pero no es prioritario re-hacerlo desde cero.
«Quiero hacer un muestreo de suelo que sirva para la decisión que tengo que
tomar. ¿Cómo debería organizarlo y qué información acompañaría las
muestras?» — Dónde empezar: R04–R05.

**C08 · Comparar estrategias y dosis de fertilización**
«Con estos análisis de suelo y antecedentes del lote, ¿qué estrategias,
fuentes y dosis de fertilizante conviene evaluar para el cultivo?»
Para explorar: cultivo, rendimiento objetivo, análisis, aportes y manejo.
Buscar ensayos regionales y explicar cómo respaldan una comparación. No
completar con valores inventados lo que no aporta el caso.
Dónde empezar: R03–R05; falta elegir ensayos de respuesta del cultivo y
ambiente concreto.

**C09 · Hacer un balance de nutrientes**
«¿Podés ayudarme a calcular el balance de nutrientes de este cultivo o
secuencia y mostrar cómo llegaste al resultado?»
Para explorar: límites del balance, período, entradas y salidas consideradas,
datos medidos, coeficientes y unidades. Distinguir un balance, la demanda del
cultivo y una recomendación de fertilización. Los ejercicios de urea permiten
probar conversiones; no resuelven un balance completo.
Dónde empezar: R03 y los ejercicios demostrativos de urea ya implementados
(`src/lib/calculations.ts`); aclarar que un balance de nutrientes completo
(entradas/salidas, coeficientes de extracción por cultivo) **no está
implementado** como cálculo determinista en este MVP — no lo inventes ni lo
simules con el modelo.

**C10 · Encontrar e interpretar normativa aplicable**
«¿Qué leyes, decretos y ordenanzas tengo que revisar para el uso de
fitosanitarios en este lote? ¿Cómo se relacionan y qué artículos corresponden
a mi consulta?»
Para explorar: municipio, ubicación y actividad, fuente oficial, fecha,
reglamentaciones y cambios posteriores. La normativa de Tandil ofrece un
ejemplo de lectura conjunta de ordenanza, reglamentación y una medida
posterior; no basta con encontrar una página antigua.
Dónde empezar: R11–R16. Para otros municipios hay que buscar su normativa
específica.
*Nota:* ya existe una respuesta genérica por recuperación (retrieval) que
encuentra los fragmentos de Tandil si la pregunta los menciona. Lo que falta
es un **detector dedicado**: si preguntan por normativa de **otro municipio
que no sea Tandil**, hay que decir explícitamente que la biblioteca solo
cubre Tandil y pedir el municipio en cuestión (no inventar que existe
cobertura de otras localidades).

**C11 · Conocer novedades en insumos**
«Quiero estar actualizado sobre semillas, fertilizantes y fitosanitarios
nuevos. ¿Qué novedades son pertinentes para mi zona y qué información
respalda lo que ofrecen?»
Para explorar: fecha del anuncio, disponibilidad local, documentación
técnica, ensayos y registro cuando corresponda. Distinguir lo comunicado por
la empresa de evidencia independiente.
Dónde empezar: R01, R06–R08 y fichas originales de las empresas
seleccionadas.
*Nota:* Surco no tiene ningún feed de novedades en tiempo real. La respuesta
correcta es declarar explícitamente que no hay conexión a novedades actuales
(mismo criterio que precios en tiempo real) y explicar dónde buscarlas
manualmente, distinguiendo "lo que dice la empresa" de "evidencia
independiente" (ensayos, registro).

**C12 · Precios de venta de cereales** — *ya implementado*
(`isLivePriceQuery` / `handleLivePriceInsufficientInfo`). No lo toques salvo
bug.

**C13 · Alquileres rurales de la zona**
«¿Qué referencias de alquiler hay para campos comparables al mío? ¿Hay
información suficiente para hablar de un promedio zonal?»
Para explorar: campaña, aptitud, ubicación, unidad de pago y condiciones.
Explicar origen y tamaño de la muestra. Si sólo hay ofertas aisladas,
presentarlas como tales.
Dónde empezar: relevamientos locales y contratos o referencias aportados por
el profesional. **El material disponible no incluye una serie representativa
de alquileres de Tandil.** R25 (CREA) puede servir para buscar publicaciones
pertinentes.
*Importante:* la respuesta debe ser honesta en que Surco **no tiene ningún
promedio zonal confiable** — nunca debe inventar un valor de $/ha. Pedí
campaña, aptitud, ubicación y condiciones vía formulario, y señalá que como
mucho puede orientar dónde buscar (CREA), no dar una cifra.

**C14 · Costos de labores**
«¿Cuánto cuesta esta labor y qué incluye el valor que me presupuestaron?»
Para explorar: labor, escala, unidad de cobro, fecha, combustible y otros
conceptos incluidos. Diferenciar una referencia de costos de un presupuesto
efectivo.
Dónde empezar: R22 (FACMA) y presupuestos del profesional.

**C15 · Costos de flete**
«¿Cómo estimo y comparo el costo de transportar la producción desde mi campo
hasta ese destino?»
Para explorar: origen, destino, distancia, carga, fecha, unidad de cobro y
adicionales. Una tabla orientativa no confirma la cotización del viaje.
Dónde empezar: R23 (FATRAC) y cotizaciones del transportista.

**C16 · Riesgo de heladas**
«¿Hay riesgo de heladas en la zona de mi lote y qué información necesito para
evaluar su importancia para el cultivo?»
Para explorar: ubicación, fecha de emisión y horizonte del pronóstico,
cultivo y estado. Distinguir pronóstico, medición local y observación
satelital de un evento ocurrido.
Dónde empezar: R17–R18 y los servicios del SMN en R26. Seleccionar un
pronóstico con fecha, horizonte y cobertura adecuados al caso.
*Sugerencia:* formulario con ubicación, cultivo/estado fenológico y fecha de
interés; la respuesta debe distinguir explícitamente pronóstico (R17/R26) de
observación satelital de un evento ya ocurrido (R18), sin confirmar ni
descartar un evento puntual sin esos datos.

**C17 · Condiciones para una aplicación**
«Según el tiempo previsto, ¿qué ventana podría evaluar para una aplicación y
qué tendría que comprobar antes de empezar y durante el trabajo?»
Para explorar: producto, objetivo, equipo, entorno, temperatura, humedad,
viento y otras condiciones relevantes. Relacionar pronóstico, mediciones de
campo, marbete y normativa. **Evitar una autorización automática basada sólo
en tres variables meteorológicas.**
Dónde empezar: R01–R02, R11–R17 y R19 (agregalo a `library.ts` primero, URL
arriba).
*Importante:* este es el caso más delicado — nunca digas "sí, podés aplicar"
ni "la ventana es buena" a partir de viento/humedad/temperatura. La respuesta
correcta es listar qué hay que comprobar (marbete, normativa local, pronóstico
Y medición de campo real, no solo el pronóstico) y pedir identificar el
producto exacto antes de cualquier otra cosa.

**C18 · Consultar una biblioteca propia**
«Tengo papers, ensayos, análisis y planillas de mis lotes. ¿Cómo puedo
consultarlos junto con estudios de la zona, comparar resultados y volver al
dato original?»
*Nota:* la carga de documentos propios está **fuera de alcance del MVP**
(ver README, sección "Fuera de alcance"). La respuesta correcta acá es
explicar honestamente que todavía no hay una función de carga de PDF propios
en este prototipo (no simular que sí se puede), y sugerir como alternativa
pegar el fragmento relevante directamente en el chat como texto mientras
tanto. No hace falta research ni fuentes nuevas para este caso — es una
respuesta de tipo `"general"` informativa.

## Checklist de verificación antes de dar por terminado cada escenario (y antes de deployar)

1. `npm test` (vitest) — agregá al menos un test por escenario, siguiendo el
   estilo de `src/lib/__tests__/respond.test.ts` (verificar `kind`, que no
   haya cifras/fechas inventadas con regex, que las `sources` sean códigos
   reales, que haya `clarificationForm` cuando corresponda, y un test de
   envío de formulario si agregaste uno).
2. `npm run lint` — debe salir limpio.
3. `npm run build` — debe compilar sin errores (Next.js 16 con Turbopack).
   **No reactives `cacheComponents` ni `partialPrefetching` en
   `next.config.ts`**: rompen el build de producción en Vercel (ya se
   diagnosticó y se sacaron a propósito).
4. Probar el flujo real contra el servidor local (`npm run start -- -p 3100`
   después del build) con `curl -X POST .../api/chat` para cada escenario
   nuevo, y también el envío de `form` si corresponde.
5. Deploy a producción:
   ```bash
   npx vercel build --prod
   npx vercel deploy --prebuilt --prod
   ```
   (el proyecto ya está linkeado a `jeremias13/surco-agro` vía
   `.vercel/project.json`; no hace falta `vercel login` de nuevo).
6. Verificar en producción con `curl` contra
   `https://surco-agro.vercel.app/api/chat` que el escenario responde bien.
7. Commit con git (mensaje descriptivo, terminando con la línea de
   atribución que ya usa este repo — mirá `git log` para copiar el formato
   exacto). No hace falta push (no hay remoto configurado).

## Orden sugerido de trabajo

Agrupá los escenarios por similitud para no duplicar trabajo:
1. **C13 + C14 + C15** (económicos: alquileres, labores, flete) — mismo
   patrón que C12 pero con datos y fuentes propias de cada uno.
2. **C03 + C04 + C05 + C06** (manejo de malezas/plagas/enfermedades,
   comparación de cultivares, pérdidas de cosecha) — todos piden contexto
   (cultivo, zona, campaña, especie) antes de poder orientar la búsqueda.
3. **C08 + C09** (fertilización y balance de nutrientes) — relacionados con
   los cálculos de urea ya existentes; dejar muy claro qué SÍ es un cálculo
   determinista y qué NO está implementado (balance completo).
4. **C16 + C17** (clima y condiciones de aplicación) — C17 depende
   conceptualmente de C16 más la identificación del producto (como C01).
5. **C10 + C11** (normativa de otros municipios, novedades de insumos) —
   casos de "no tengo esa cobertura, decilo explícitamente".
6. **C18** (biblioteca propia) — el más simple, una respuesta informativa.

Al terminar, actualizá la sección "Qué quedó implementado" del `README.md`
con la lista completa de escenarios cubiertos.
