#!/usr/bin/env python3
"""PICKRIX DAILY — tiempos REALES de cada palabra para los subtítulos (§18).

Transcribe cada audio con faster-whisper (word_timestamps) y alinea el resultado con el
texto del guion: los subtítulos muestran el texto correcto del guion (ortografía, nombres,
porcentajes), pero cada palabra aparece cuando realmente se pronuncia.

Uso: align.py SALIDA.json id=AUDIO.mp3::TEXTO [id=AUDIO.mp3::TEXTO ...]
"""
import json, re, sys, unicodedata
from difflib import SequenceMatcher


NUM = {'0':'cero','1':'uno','2':'dos','3':'tres','4':'cuatro','5':'cinco','6':'seis','7':'siete','8':'ocho','9':'nueve'}

def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', w)

def tokens(text):
    return [t for t in re.split(r'\s+', text.strip()) if t]

def align(expected_text, recognized):
    exp = tokens(expected_text)
    en = [norm(t) for t in exp]
    rn = [norm(w['w']) for w in recognized]
    times = [None] * len(exp)
    sm = SequenceMatcher(a=en, b=rn, autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            r = recognized[blk.b + k]
            times[blk.a + k] = [r['s'], r['e']]
    # Palabras sin pareja (números dichos con letra, «%», nombres): se reparten entre vecinos.
    n = len(exp)
    total_end = recognized[-1]['e'] if recognized else 0.0
    i = 0
    while i < n:
        if times[i] is not None:
            i += 1; continue
        j = i
        while j < n and times[j] is None: j += 1
        start = times[i - 1][1] if i > 0 else (recognized[0]['s'] if recognized else 0.0)
        end = times[j][0] if j < n else total_end
        if end < start: end = start
        step = (end - start) / (j - i)
        for k in range(i, j):
            times[k] = [start + step * (k - i), start + step * (k - i + 1)]
        i = j
    return [{'w': exp[k], 's': round(times[k][0], 3), 'e': round(times[k][1], 3)} for k in range(n)]

def decode(path):
    """Audio → muestras float32 a 16 kHz con ffmpeg (evita depender de la versión de PyAV)."""
    import subprocess, numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0

def main():
    out = sys.argv[1]
    from faster_whisper import WhisperModel
    model = WhisperModel('small', device='cpu', compute_type='int8')
    result = {}
    for arg in sys.argv[2:]:
        ident, rest = arg.split('=', 1)
        audio, text = rest.split('::', 1)
        segs, _ = model.transcribe(decode(audio), language='es', word_timestamps=True, initial_prompt=text, vad_filter=False)
        rec = [{'w': w.word.strip(), 's': w.start, 'e': w.end} for s in segs for w in (s.words or []) if w.word.strip()]
        words = align(text, rec)
        matched = sum(1 for _ in rec)
        result[ident] = {'words': words, 'recognized': ' '.join(w['w'] for w in rec)}
        print(f'✓ {ident}: {len(words)} palabras del guion · {matched} reconocidas')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
