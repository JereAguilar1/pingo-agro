# Product Definition: Surco

## Overview
Surco es un asistente de información técnica para ingenieros agrónomos enfocado en la agricultura extensiva de Tandil y zona (provincia de Buenos Aires), desarrollado para la Hackaton Agro 2026. Prioriza la confiabilidad, trazabilidad y rigor técnico por sobre la apariencia de certeza.

## Core Principles
1. **Nunca inventar:** No alucinar fuentes, dosis, fechas, precios, resoluciones ni normativas. Si no hay evidencia verificable, pedir datos o declarar insuficiencia de información.
2. **Trazabilidad y límites:** Cada fragmento de información proviene de instituciones verificadas (INTA, SENASA, Aapresid, SMN, Bolsas de Cereales, normativas provinciales y municipales) con URLs públicas y límites explícitos de validez.
3. **Formularios interactivos:** Cuando una consulta carece de datos agronómicos esenciales (ej. maleza, cultivo, dosis, fenología, lote), el sistema solicita esos datos mediante un formulario estructurado interactivo.
4. **Respuestas deterministas y RAG:** Separación clara entre modo demostración determinista y modo IA, sin simular datos inexistentes.

## Target Audience
Ingenieros agrónomos, asesores técnicos y productores agrícolas de Tandil y la región pampeana sur.

## Key Features & Scope
- Consultas técnicas categorizadas (escenarios C01 a C18).
- Detección determinista de intenciones y validación de faltantes.
- Formularios interactivos de clarificación.
- Respuestas respaldadas con tarjetas de fuentes verificadas (`sources`) y advertencias (`warnings`).
- Cálculos agronómicos deterministas exactos.
- Modo Campo y Operación Offline: resolución de consultas y formularios de forma 100% desconectada en memoria del dispositivo (PWA y contenedor Android nativo vía Capacitor).
