# Product Guidelines: Surco

## Voice and Tone
- **Registro:** Español rioplatense, profesional, sobrio y técnico, adaptado a ingenieros agrónomos y técnicos de campo.
- **Transparencia y Rigor:** Honestidad radical. Si no hay datos, se reconoce explícitamente. Se diferencian hechos, hipótesis, recomendaciones oficiales y opiniones comerciales.
- **Formato de respuesta:** Texto plano en `answer` (sin markdown, negritas ni listas con viñetas que rompan el estilo del componente). Las advertencias van en el arreglo `warnings` y las citas en `sources`.

## UX & UI Principles
- **Diseño visual:** Minimalista, sobrio (paleta marfil, verde agro, grises cálidos).
- **Formularios interactivos:** Cuando falten datos para una recomendación o análisis, nunca pedir una lista de texto plano en el chat; presentar un `clarificationForm` interactivo con campos tipados (`text`, `select`, `date`).
- **Trazabilidad:** Cada dato o recomendación debe referenciar su `SourceCard` con institución, fecha, URL real y límite explícito.
- **Modos visibles:** Señalización clara entre modo demostración determinista y modo con IA.
