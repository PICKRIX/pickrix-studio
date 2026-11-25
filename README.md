# PICKRIX Studio

Producción automática de videos de PICKRIX (MR. PICKRIX / PICKRIX DAILY) y herramientas de voz.
Repositorio **público**: no contiene claves, pagos ni datos de usuarios. Solo lee datos
**públicos** de https://pickrixapp.com y genera videos para **revisión manual** (nunca publica en redes).

- `src/`, `scripts/`: plantilla del video (Remotion) y pasos (picks, guion, voz, props).
- `tools/voz-saludos/`: genera los audios de saludos y despedidas con voz gratuita (Piper, es_MX).
- `.github/workflows/`: video diario y herramienta de voz.

# MR. PICKRIX Studio

Video diario vertical (1080×1920, 45–60 s) en el que **MR. PICKRIX** presenta 4–5
**HOT PICKS gratuitos** de PICKRIX, con un teaser de PRO/ELITE y PARLAYS PICKRIX.

- **Nunca publica en redes sociales.** Deja el MP4 y el guion para que **tú los revises
  y los publiques a mano**.
- No toca producción. Solo lee los mismos endpoints públicos que usa la app para HOT PICKS.
  No usa nada de PRO/ELITE.
- No forma parte del sitio. Netlify publica solo `public/` y empaqueta solo
  `netlify/functions/`, así que `studio/` no se publica ni afecta el build.

## Cómo funciona (opción B)

| Paso | Script | Con clave | Sin clave |
|---|---|---|---|
| 1. Picks | `scripts/fetch-picks.mjs` | — (endpoints públicos) | Si no hay ≥4 picks reales con momio, usa un set **DEMO** marcado «DATOS FICTICIOS» |
| 2. Guion | `scripts/write-script.mjs` | Claude `claude-sonnet-5-5` (`ANTHROPIC_API_KEY`) | Plantilla responsable |
| 3. Voz | `scripts/voice.mjs` | ElevenLabs (`ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`) | Video solo con subtítulos |
| 4. Labios (intro y cierre, ~15 s) | `scripts/lipsync.mjs` | Kling vía fal.ai (`KLING_API_KEY` + `KLING_BASE_VIDEO_URL`) | Imagen aprobada de MR. PICKRIX animada |
| 5. Props + hoja de revisión | `scripts/build-props.mjs` | — | — |
| 6. Render | Remotion (`src/`) | — | — |

**Selección de picks.** Se aplican las mismas reglas que los HOT PICKS gratis:

- Partidos próximos de ligas aprobadas, con al menos 90 minutos de margen para revisar.
- Probabilidad estimada ≥55 %.
- **Solo con momio real** del proveedor.
- Prioridad de ligas: TOP Europa, luego Liga MX y selecciones, luego el resto.
- Partidos distintos y mercados y rangos de probabilidad variados.

**Guion responsable.** Todo guion, sea de Claude o de la plantilla, pasa por una
validación automática:

- No puede prometer ganancias.
- No puede usar «seguro», «garantizado», «fijo» ni «sin riesgo».
- Los porcentajes y momios deben ser idénticos a los datos.
- Debe decir que son estimaciones.
- Debe cerrar con 18+ y pickrixapp.com.

Si Claude no pasa la validación, se usa la plantilla.

**Personaje.** La referencia oficial es `public/brand/approved_character_reference.png`.
La imagen de gestos (`expression_reference.png`) solo sirve para estudiar expresiones.
Los textos se componen en Remotion, nunca dentro de la imagen generada.

## Uso diario (GitHub Actions)

`.github/workflows/mr-pickrix-studio.yml` corre **todos los días a las 9:00 (CDMX)**.
También puede ejecutarse a mano desde *Actions → MR. PICKRIX Studio → Run workflow*.

Al terminar, en la ejecución verás:

- El **resumen** con la hoja de revisión.
- El **artifact** `mr-pickrix-AAAA-MM-DD`. Si los datos fueron ficticios, se llama
  `DEMO-NO-PUBLICAR-…`. Contiene:
  - `mr-pickrix.mp4`
  - `guion.txt`
  - `REVISION.md`
  - `picks.json` y `script.json`

### Revisión obligatoria antes de publicar

1. Abre `REVISION.md` y marca cada punto:
   - Partidos no iniciados.
   - Cifras iguales.
   - Rostro y ropa del personaje correctos.
   - Sin promesas.
   - Aviso 18+ visible.
2. Comprueba en la app que los picks siguen igual.
3. Publica **a mano** en TikTok, Reels o Shorts. Revisa antes que la plataforma y tu
   país permitan contenido de pronósticos deportivos.
4. Si algo no cuadra, **no lo publiques**.

## Cuentas y claves (secretos de GitHub)

Ruta: *Settings → Secrets and variables → Actions*.

| Nombre | Tipo | De dónde sale | Costo aprox. |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | console.anthropic.com → API Keys | ~$1–3 USD/mes (un guion corto al día) |
| `ELEVENLABS_API_KEY` | Secret | elevenlabs.io → plan **Creator** → Profile → API Keys | ~$22 USD/mes |
| `ELEVENLABS_VOICE_ID` | Secret | ID de la voz elegida o clonada (masculina, español latino neutro con matiz mexicano) | incluido |
| `KLING_API_KEY` | Secret | fal.ai → Keys (Kling se cobra por segundo) | ~$0.014/s × ~15 s/día ≈ $6–7 USD/mes |
| `KLING_BASE_VIDEO_URL` | **Variable** (no secreta) | URL https de un clip base de MR. PICKRIX (5–10 s, plano medio, boca cerrada) hecho **una vez** con Kling a partir de la imagen aprobada | una sola vez, centavos |
| `KLING_LIPSYNC_MODEL` | Variable (opcional) | Por defecto `fal-ai/kling-video/lipsync/audio-to-video` | — |

GitHub Actions (repositorio) y Remotion cuestan $0. **Total ≈ $30 USD/mes.**

Remotion es gratis para personas y empresas de hasta 3 empleados. Si PICKRIX crece por
encima de eso, revisa la licencia de empresa en remotion.dev/license.

Todo es opcional y gradual:

- Sin ninguna clave, el video sale igual, con guion por plantilla y subtítulos.
- Con Claude, el guion es más natural.
- Con ElevenLabs, el video tiene voz.
- Con Kling, MR. PICKRIX mueve los labios en el saludo y el cierre.

> El conector de Kling (fal.ai) es la parte más nueva. Verifica el resultado en la
> primera ejecución con clave. Si falla, esa escena usa la imagen animada y el video
> se genera igual.

## Probar en tu computadora

```bash
cd studio
npm ci
npm run prepare-video        # picks → guion → voz → labios → props (usa las claves que tengas en el entorno)
npm run render               # out/mr-pickrix.mp4
npm run studio               # vista previa interactiva
```

## Pruebas

Las pruebas cubren solo la lógica y no necesitan instalar Remotion, tener red ni claves:

```bash
node --test studio/tests/*.test.mjs
```

Están en `studio/tests/` a propósito. La suite del sitio (`node --test tests/*.test.mjs`)
no las incluye ni depende de `studio/`.

## Plantilla v2 (24/11/2026) y ruta CapCut

- **Diseño:** MR. PICKRIX grande y fijo arriba (zona para CapCut), karaoke en lima al centro y, abajo, agenda → tarjeta de cada pick (escudos, hora, mercado, % y momio) → invitación PRO/ELITE y PARLAYS PICKRIX → tablero final con pickrixapp.com y 18+. Fondo de estadio animado.
- **Ediciones:** en Actions → *MR. PICKRIX Studio* → *Run workflow* puedes elegir liga (`2` = Champions, `3` = Europa League, `262` = Liga MX) y día (`0` hoy, `1` mañana). El programa diario sigue igual (todas las ligas).
- **CapCut:** cada corrida incluye `CAPCUT.md` con el guion completo para *Lip Sync*, los tiempos de cada parte y la posición exacta (x 170, y 165, 740×780) donde va MR. PICKRIX hablando.
