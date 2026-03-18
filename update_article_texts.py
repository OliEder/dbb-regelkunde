#!/usr/bin/env python3
"""
update_article_texts.py
-----------------------
Liest output.md, extrahiert den aufbereiteten Text pro Artikel (1-50)
und ersetzt das text-Feld in app/data/rules.json.

Bildverweise (Bild 1, Bild 2 ...) werden beibehalten.
Bullet-Listen (* item) bleiben als Markdown erhalten.
PDF-Bindestriche am Zeilenende werden aufgelöst.
Doppelte Leerzeilen werden bereinigt.

NICHT AUSFÜHREN — nur Skript, kein automatischer Run.
"""

import json
import re
from pathlib import Path

# ── Pfade ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
OUTPUT_MD = ROOT / "output.md"
RULES_JSON = ROOT / "app" / "data" / "rules.json"


# ── Hilfsfunktionen ──────────────────────────────────────────────────────────

def clean_text(raw: str) -> str:
    """Bereinigt einen Rohtext-Block aus output.md."""

    # 1. Trennende PDF-Bindestriche am Zeilenende auflösen:
    #    Wort- wird zu Wort (nur wenn nächste Zeile mit Kleinbuchstaben beginnt)
    text = re.sub(r"-\n([a-zäöüß])", r"\1", raw)

    # 2. Restliche einzelne Zeilenumbrüche innerhalb eines Absatzes
    #    zu Leerzeichen falten – aber NICHT Leerzeilen (Absatzgrenzen)
    #    und NICHT Zeilen, die mit ** oder * oder Bild beginnen (Struktur)
    lines = text.split("\n")
    result_lines = []
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        # Leerzeile oder Strukturzeile → immer als eigene Zeile behandeln
        if stripped == "" or stripped.startswith("**") or stripped.startswith("* ") \
                or stripped.startswith("- ") or re.match(r"^Bild\s+\d+", stripped) \
                or re.match(r"^\*\*Bild", stripped):
            result_lines.append(stripped)
        else:
            # Prüfen ob die vorherige nicht-leere Zeile schon zu einem
            # Absatz gehört (keine Leerzeile davor)
            result_lines.append(stripped)

    text = "\n".join(result_lines)

    # 3. Mehr als 2 aufeinanderfolgende Leerzeilen → maximal eine Leerzeile
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 4. Führende und abschließende Leerzeichen/Zeilen entfernen
    text = text.strip()

    return text


def extract_articles_from_md(md_path: Path) -> dict[int, str]:
    """
    Gibt ein Dict {artikel_nr: text_string} zurück.
    Erkennt Artikel-Überschriften der Form:  ## Artikel N Titel
    Der Text jedes Artikels reicht bis zur nächsten ## -Überschrift.
    """
    content = md_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    # Zeilen-Indizes aller ## Artikel N ... Überschriften finden
    artikel_pattern = re.compile(r"^## Artikel (\d+)\b")
    artikel_starts: list[tuple[int, int]] = []  # (zeilen_idx, artikel_nr)

    for idx, line in enumerate(lines):
        m = artikel_pattern.match(line)
        if m:
            artikel_starts.append((idx, int(m.group(1))))

    articles: dict[int, str] = {}

    for pos, (start_idx, nr) in enumerate(artikel_starts):
        # Text beginnt NACH der Überschriften-Zeile
        text_start = start_idx + 1

        # Text endet vor der nächsten ## -Überschrift (oder Dateiende)
        if pos + 1 < len(artikel_starts):
            next_start_idx = artikel_starts[pos + 1][0]
            # Gehe rückwärts und überspringe leere Zeilen + ## REGEL-Überschriften
            # die zwischen zwei Artikeln stehen können
            text_end = next_start_idx
            # Falls eine ## REGEL ... Zeile direkt vor dem nächsten Artikel steht,
            # schließe sie ebenfalls aus
            while text_end > text_start and lines[text_end - 1].startswith("## REGEL"):
                text_end -= 1
        else:
            text_end = len(lines)

        raw = "\n".join(lines[text_start:text_end])
        articles[nr] = clean_text(raw)

    return articles


def update_rules_json(rules_path: Path, articles: dict[int, str]) -> None:
    """Ersetzt das text-Feld jedes Artikels in rules.json."""
    with rules_path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    updated = 0
    missing = []

    for article in data.get("articles", []):
        nr = article.get("number")
        if nr in articles:
            article["text"] = articles[nr]
            updated += 1
        else:
            missing.append(nr)

    with rules_path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

    print(f"Fertig: {updated} Artikel aktualisiert.")
    if missing:
        print(f"WARNUNG: Folgende Artikel-Nummern nicht in output.md gefunden: {missing}")


# ── Hauptprogramm ────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Lese {OUTPUT_MD} ...")
    articles = extract_articles_from_md(OUTPUT_MD)
    print(f"  {len(articles)} Artikel extrahiert (Nummern: {sorted(articles.keys())})")

    print(f"Aktualisiere {RULES_JSON} ...")
    update_rules_json(RULES_JSON, articles)


if __name__ == "__main__":
    main()
