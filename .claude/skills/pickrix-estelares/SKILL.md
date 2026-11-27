---
name: pickrix-estelares
description: Crea el video «LOS 5 PARTIDOS ESTELARES DEL DÍA» de PICKRIX (prompt V5.0). Fase 1 da el guion para HeyGen; fase 2 arma el video con el audio de HeyGen que envía la usuaria. Usar cuando pida «estelares», «partidos estelares» o este comando.
---

# PICKRIX · LOS 5 PARTIDOS ESTELARES DEL DÍA

Responde en español. No publiques nada en redes. No inventes datos, fuentes ni logos. No simules HeyGen: la voz
la genera la usuaria en HeyGen y envía el audio. Repo: `PICKRIX/pickrix-studio` (público, Actions gratis).

## Fase 1 — Guion (cuando pida el guion o no haya enviado audio)

1. Fecha = día solicitado (por defecto, hoy en America/Mexico_City). Sea F=AAAA-MM-DD.
2. Si no existe `muestras/F/daily.json`, lanza los datos en GitHub (aquí pickrixapp.com está bloqueado):
   `gh api -X POST repos/PICKRIX/pickrix-studio/actions/workflows/pickrix-daily-datos.yml/dispatches --input - <<<'{"ref":"main","inputs":{"date":"F"}}'`
   espera con `gh run watch` y haz `git pull`.
3. Lee los 5 partidos (`oneXtwo`, `markets`, `expectedGoals`, `homeRecent`, `awayRecent`). Solo fútbol: la fuente
   PICKRIX no cubre NBA/NFL/MLB/NHL; dilo si la usuaria los pide.
4. Escribe `voz_heygen/F-estelares/guion.json`:
   `{"edicion":"ESTELARES","presentador":"ESTELARES","partidos":["Local vs Visita",…],"segmentos":[5 textos],"confianza":["MEDIA",…]}`
   Cada segmento (texto de PANTALLA, con cifras: «54 %», «12 goles»), 40–50 palabras ≈ 14–17 s:
   presentación de equipos → 2 datos reales de PICKRIX → explicación → conclusión → incertidumbre.
   Varía el arranque («Ojo con este partidazo», «Aquí los números se ponen interesantes», «Hay un dato que no
   podemos ignorar», «Este duelo está más equilibrado de lo que parece», «Y cerramos con…»).
   Atribuye las cifras como «El pronóstico de PICKRIX…» (no «PICKRIX ve favorito»). Favorito solo si la diferencia ≥ 8 puntos; si no, «no hay favorito claro». Nombres como se dicen en México
   (`shortTeam` de `daily/script.mjs`). Prohibido: apuesta segura, garantizado, momios, casas de apuestas.
   Confianza: «MEDIA» mientras no se contrasten fuentes externas ni lesiones; nunca «ALTA» sin esa verificación.
5. `node daily/heygen_texto.mjs voz_heygen/F-estelares/guion.json` → `GUION_HEYGEN.txt` (cifras en letra).
6. Commit + push y entrega a la usuaria el contenido de `GUION_HEYGEN.txt`, pidiendo un solo audio con los
   5 bloques en orden, con la misma voz del presentador.

## Fase 2 — Video (cuando envíe el audio de HeyGen)

1. Extrae solo el audio (nunca subas el video): recorta el silencio final
   (`ffmpeg … silencedetect`) → `voz_heygen/F-estelares/analisis.mp3`; escribe `analisis.txt` = los 5 segmentos
   unidos con espacio. Borra `palabras.json` si existe. Commit + push: el workflow
   `pickrix-voz-heygen.yml` calcula los tiempos por palabra (faster-whisper). Espera y `git pull`.
2. Revisa `palabras.json`: `match` ≥ 0.9. Si es menor, el audio no dice el guion: avisa y no sigas.
3. Presentador: `public/presentador/SALUDO_ESTELARES.mp4` / `DESPEDIDA_ESTELARES.mp4` (locales, no van al repo).
   Si faltan, pídelos. Si llegan nuevos, cópialos ahí, extrae su audio a
   `voz_heygen/presentadores/{SALUDO|DESPEDIDA}_ESTELARES.mp3`, escribe el texto real en el `.txt`, borra
   `voz_heygen/presentadores/palabras.json` y deja que el workflow lo realinee (match 1.0 esperado).
4. `bash daily/entrega.sh F estelares` → `out/PICKRIX_ESTELARES_F/` (VIDEO_FINAL.mp4, PORTADA.png,
   PARTIDOS_ESTELARES.png, ANALISIS_PARTIDO_01–05.png, VOZ_EN_OFF.mp3, GUION_COMPLETO.txt, SUBTITULOS.srt,
   ESTADISTICAS_Y_PROBABILIDADES.json). Render local ≈ 8 min.
5. Revisa fotogramas (saludo, partidos, 2 análisis, despedida) antes de entregar.
6. Escribe `DESCRIPCION_REDES.txt` (Instagram, TikTok, YouTube Shorts; gancho, partidos, pickrixapp.com,
   hashtags base #PICKRIX #Pickxers #PartidosEstelares #AnalisisDeportivo #EstadisticasDeportivas
   #InteligenciaDeportiva #NoAdivinesAnaliza) y `CONTROL_DE_CALIDAD.txt` con lo verificado y lo pendiente.
7. Envía VIDEO_FINAL.mp4, PORTADA.png y SUBTITULOS.srt con SendUserFile. Informa lo que falte (logos oficiales,
   música, fuentes externas). No generes FUENTES_VERIFICADAS ni REGISTRO_DE_PRECISION sin datos reales.
