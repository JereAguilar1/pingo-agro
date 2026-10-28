# Specification: Implementación de Escenarios C03–C18 en Surco

## 1. Overview
Completar la cobertura de los 16 escenarios técnicos pendientes (C03 a C18) en el asistente agronómico Surco, siguiendo la arquitectura determinista basada en fuentes verificadas, sin inventar datos, dosis ni precios, solicitando información faltante mediante formularios interactivos tipados (`clarificationForm`) y fundamentando las respuestas en la biblioteca documental (`src/lib/library.ts`).

## 2. Functional Requirements
1. **Ampliación de Biblioteca Documental (`src/lib/library.ts`)**:
   - Incorporar fragmentos reales verificados para `R12` (Ley Prov. 10.699), `R13` (Decreto 499/1991), `R19` (INTA Monitoreo Remoto de Pulverizaciones), `R24` (CASAFE) y `R25` (CREA), con metadatos completos y límites explícitos.
2. **Definición de Tipos y Whitelist (`src/lib/types.ts` y `src/app/api/chat/route.ts`)**:
   - Agregar identificadores únicos en `ClarificationFormKind` para cada escenario interactivo (`weed_management`, `pest_disease_management`, `cultivar_selection`, `harvest_losses`, `fertilization_strategy`, `nutrient_balance`, `rental_rates`, `machinery_costs`, `freight_costs`, `frost_risk`, `application_conditions`, `municipality_regulations`).
   - Sincronizar el array `FORM_KINDS` en la ruta API para validar las respuestas del formulario.
3. **Lógica de Detección y Respuestas (`src/lib/respond.ts`)**:
   - **C13 (Alquileres)**: Indicar que Surco no tiene promedio zonal confiable ni inventa $/ha; pedir datos (campaña, aptitud, zona, condiciones) y orientar a R25 (CREA).
   - **C14 (Costos de labores)**: Diferenciar referencia de presupuesto real; pedir labor, escala, combustible; citar R22 (FACMA).
   - **C15 (Flete)**: Diferenciar tarifa orientativa de cotización; pedir origen, destino, km, carga; citar R23 (FATRAC).
   - **C03 (Malezas)**: Explorar especie, estado fenológico, cultivo y antecedentes de control; citar R08/R09 (REM) y ensayos regionales.
   - **C04 (Plagas y enfermedades)**: Diferenciar síntomas, hipótesis y diagnóstico confirmado; pedir cultivo, estado y observaciones; citar R08 e INTA.
   - **C05 (Cultivares/Híbridos)**: Conservar el contexto de los ensayos; pedir cultivo, zona, objetivo; citar R06 (maíz), R07 (soja), R27 (girasol).
   - **C06 (Pérdidas de cosecha)**: Diferenciar pérdidas de precosecha vs máquina; pedir cultivo, método y superficie evaluada; citar R10.
   - **C07 (Muestreo de suelo)**: Revisar y alinear el detector y formulario existente con el enunciado C07 (R04/R05).
   - **C08 (Fertilización)**: Pedir cultivo, rinde objetivo y análisis de suelo; citar R03/R05 y ensayos de respuesta.
   - **C09 (Balance de nutrientes)**: Diferenciar balance, demanda y fertilización; aclarar que un cálculo de balance integral no está implementado en este MVP (solo conversiones de urea en R03).
   - **C16 (Heladas)**: Distinguir pronóstico meteorológico (R17/R26) de monitoreo satelital de eventos ya ocurridos (R18); pedir lote, cultivo y fecha.
   - **C17 (Condiciones de aplicación)**: Nunca dar autorización automática basada solo en 3 variables de tiempo; exigir comprobación de marbete (R01/R02), normativa local (R11-R16), monitoreo INTA (R19) y medición efectiva en lote.
   - **C10 (Normativa otros municipios)**: Si consultan por municipios distintos a Tandil, declarar explícitamente que la biblioteca solo cubre Tandil y solicitar el municipio.
   - **C11 (Novedades en insumos)**: Declarar que no hay feed en tiempo real de novedades; explicar cómo validar anuncios comerciales contra ensayos independientes y registros SENASA (R01, R06-R08).
   - **C18 (Biblioteca propia)**: Informar honestamente que la carga de PDFs propios está fuera de alcance del MVP y sugerir pegar fragmentos de texto en el chat.
4. **Manejadores de Form Submission**:
   - Cada formulario enviado debe procesarse en `handleFormSubmission`, devolviendo una respuesta con orientación de pasos concretos a verificar y citas a las fuentes pertinentes.

## 3. Non-Functional & Quality Requirements
- **Cero alucinaciones:** Ningún número, dosis, fecha o autorización inventada.
- **Tono y formato:** Español rioplatense agronómico, texto plano en `answer` sin markdown.
- **Testing:** Cobertura de tests unitarios en Vitest para cada escenario y envíos de formularios.
- **Build y Lint:** `npm run lint` y `npm run build` limpios en Next.js 16.

## 4. Acceptance Criteria
- Todos los tests unitarios (`npm test`) pasan satisfactoriamente.
- `npm run lint` y `npm run build` sin advertencias ni errores.
- Verificación funcional local vía `curl` para consultas y envíos de formularios.
- Despliegue exitoso a producción en Vercel (`https://surco-agro.vercel.app`).
- Verificación en vivo en producción vía `curl`.
- Documentación de `README.md` actualizada con el detalle de escenarios.
