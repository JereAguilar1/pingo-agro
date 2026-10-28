# Specification: Motor LLM On-Device Local y RAG Anti-Alucinaciones (Fase 2)

## Overview
Esta especificación define la integración del motor de lenguaje on-device (local en el dispositivo del usuario) utilizando `@mlc-ai/web-llm` con el modelo **Llama 3.2 1B-Instruct (q4f16_1)**. Permite que Surco responda consultas abiertas y elabore explicaciones técnicas completamente offline, utilizando los fragmentos verificados de `library.ts` como único contexto permitido, garantizando cero costo de API y cero alucinación.

## Functional Requirements
1. **Motor de Inferencia WebLLM:**
   - Integrar `@mlc-ai/web-llm` en `src/lib/local-llm.ts`.
   - Inicializar y gestionar el ciclo de vida del modelo `Llama-3.2-1B-Instruct-q4f16_1-MLC`.
   - Soporte para detección de capacidades de aceleración de hardware (WebGPU) en el navegador o WebView de Android.
2. **Gestor de Modelo y Descarga en UI (`ModelManager.tsx`):**
   - Panel accesible desde el header o menú de configuración.
   - Estados: `No descargado`, `Descargando... (con % y progreso en MB)`, `Listo en memoria`, `Error / No soportado`.
   - Los pesos se almacenan en la memoria caché persistente del dispositivo (OPFS / Cache API) para no volver a descargarlos.
   - Botón para liberar almacenamiento (eliminar modelo de la memoria del teléfono).
3. **Pipeline RAG Local sin Alucinación:**
   - Cuando una consulta abierta no coincide con los detectores deterministas C01–C18:
     1. `retrieval.ts` extrae los fragmentos más pertinentes de `library.ts` (`R01`–`R27`).
     2. Se inyecta un System Prompt agronómico estricto: *"Actuás como Surco, asistente técnico agronómico para Tandil. Solo podés responder utilizando la información explícita de los siguientes fragmentos. Si la información no figura en los fragmentos, declará explícitamente que no tenés constancia. Nunca inventes dosis, precios ni autorizaciones."*
     3. Si el modelo local está listo, se ejecuta la inferencia localmente; si no está descargado o no hay WebGPU, el sistema degrada de forma segura al mensaje estructurado de fragmentos encontrados sin IA.
4. **Respuesta en Streaming:**
   - Las respuestas generadas por el modelo local se transmiten en streaming progresivo a la interfaz de chat para ofrecer feedback visual inmediato al agrónomo.

## Acceptance Criteria
- [ ] Detección limpia de soporte WebGPU en el dispositivo con fallback controlado si no está soportado.
- [ ] El componente de descarga muestra el porcentaje de avance y persiste los pesos en el dispositivo.
- [ ] Al realizar una consulta técnica con el modelo cargado (incluso sin conexión a internet), la inferencia se ejecuta en el dispositivo y referencia las fuentes de `library.ts`.
- [ ] El prompt anti-alucinaciones prohíbe inventar dosis o productos no presentes en el contexto.
- [ ] El conjunto de tests unitarios continúa pasando al 100%.
