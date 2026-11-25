---
name: pickrix-daily
description: Crea el video diario de estadísticas PICKRIX DAILY («PARTIDAZOS DEL DÍA») con rotación de saludos Cracks/Pickxers/Amantes del deporte. Fase 1 da el guion para HeyGen; fase 2 arma el video con el audio. Usar cuando pida el video diario de estadísticas.
---

# PICKRIX DAILY · PARTIDAZOS DEL DÍA

Igual que `pickrix-estelares` (léelo: mismas reglas y pasos) con estas diferencias:

- Carpeta de voz: `voz_heygen/F/` (sin sufijo). `guion.json` sin `edicion` ni `presentador`.
- Guion: parte de `muestras/F/daily.json` → `segments[].text` (generado por `daily/script.mjs`); puedes pulirlo
  con las mismas reglas, sin cambiar los datos.
- Presentador por rotación (`daily/script.mjs` → `greetingFor`): Lun Cracks · Mar Pickxers · Mié Amantes ·
  Jue Cracks · Vie Pickxers · Sáb Amantes · Dom Pickxers. Videos locales
  `public/presentador/{SALUDO|DESPEDIDA}_{CRACKS|PICKXERS|AMANTES_DEL_DEPORTE}.mp4`; textos y tiempos ya
  alineados en `voz_heygen/presentadores/`.
- Entrega: `bash daily/entrega.sh F` → `out/PICKRIX_DAILY_F/`.
