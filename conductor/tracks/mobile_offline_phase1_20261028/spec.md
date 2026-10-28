# Specification: Surco Móvil Offline y Ejecución en Memoria (Fase 1)

## Overview
Esta especificación define la transformación de Surco para operar de forma desacoplada y resiliente a la pérdida de conectividad en el campo. Permite que la aplicación resuelva consultas agronómicas (escenarios C01 a C18, cálculos exactos y biblioteca R01–R27) directamente en la memoria del dispositivo (client-side) ante fallos de red o en modo app standalone, incorporando Capacitor para Android, soporte PWA y un indicador de estado de conectividad en la interfaz.

## Functional Requirements
1. **Resolución Híbrida Offline-First:**
   - La interfaz de chat (`src/app/chat/page.tsx`) intentará consultar el endpoint `/api/chat`.
   - Si no hay conexión de red (`navigator.onLine === false`), si `fetch` lanza un error de conexión, o si la app corre en entorno móvil/standalone, el motor `respond(question, form)` de `src/lib/respond.ts` se ejecutará localmente en el cliente sin bloquear ni mostrar error de red al agrónomo.
   - Las respuestas generadas localmente deben ser idénticas en formato (`AssistantResponse`), soportando los formularios interactivos (`ClarificationForm`) y tarjetas de fuentes (`SourceCard`).
2. **Indicador de Conectividad (Modo Campo):**
   - Incorporar en el encabezado de navegación un badge discreto que refleje el estado de conexión del dispositivo:
     - `En línea` (verde suave) cuando hay conexión a internet.
     - `Modo Campo (Offline)` (ámbar suave con icono descriptivo) cuando el dispositivo esté desconectado o en modo avión.
   - El estado debe actualizarse automáticamente ante eventos `online` y `offline` del navegador/WebView.
3. **Soporte PWA (Progressive Web App):**
   - Configuración de `manifest.json` con metadatos de la app (nombre "Surco", colores de marca verde agro, iconos, `display: standalone`).
   - Registro de Service Worker básico para permitir instalación y carga de recursos estáticos en caché cuando no hay red.
4. **Configuración de Capacitor para Android:**
   - Instalación y configuración de dependencias de Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
   - Creación del archivo de configuración `capacitor.config.ts`.
   - Generación y verificación del directorio nativo `android/`.
   - Script npm para sincronizar y compilar el bundle estático hacia el contenedor Android (`npm run cap:sync` / `npm run cap:build`).

## Non-Functional Requirements
- **Latencia de respuesta en memoria:** La resolución local en cliente debe responder en < 50 ms para cualquier escenario determinista C01–C18.
- **Trazabilidad y Regla de Oro:** Las respuestas locales deben mantener la fidelidad absoluta a las fuentes reales de `library.ts` sin alucinaciones.
- **Compatibilidad:** El código del cliente debe ser compatible con navegadores móviles modernos (Chrome Android, Safari iOS) y el WebView de Capacitor.

## Acceptance Criteria
- [ ] Al desconectar la red (o activar modo offline en DevTools / modo avión en celular), una consulta como *"¿Puedo sembrar maíz después de aplicar fomesafen?"* o *"Tengo Conyza"* responde normalmente con su respuesta fundamentada o formulario interactivo sin mostrar error de conexión.
- [ ] El envío de formularios interactivos (`ClarificationForm`) funciona de forma 100% fluida en modo offline local.
- [ ] El indicador en el header cambia dinámicamente entre "En línea" y "Modo Campo (Offline)".
- [ ] La app cuenta con `manifest.json` y es instalable como PWA.
- [ ] El proyecto cuenta con el scaffold de Capacitor para Android configurado y sincronizable con Turbopack/Next.js.
- [ ] El conjunto de tests unitarios existentes (46 tests) y nuevos tests de resolución cliente pasan al 100%.

## Out of Scope (Para Fases Posteriores)
- Descarga de pesos de modelos LLM locales pesados (WebLLM / llama.cpp) (se implementará en la Fase 3 del plan integral).
- Sincronización en la nube de historiales de chat multi-dispositivo.
