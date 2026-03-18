#!/usr/bin/env python3
"""
create_handzeichen_data.py
--------------------------
Erstellt strukturierte Handzeichen-Daten aus den Bildern page071-page090
und hängt sie als "handzeichen"-Array an app/data/rules.json.

Bilderzuordnung (aus Analyse der Seitenstruktur):
  page071: 6  Bilder → Handzeichen  1–6   (Spieluhr + Korberfolg)
  page072: 10 Bilder → Handzeichen  7–16  (Spielerwechsel/Auszeit + Information)
  page073: 10 Bilder → Handzeichen 17–26  (Regelübertretungen)
  page074: 6  Bilder → Handzeichen 27–32  (Spielernummern: 00+0, 1–5, 6–10, 11–15, 16, 24)
  page075: 8  Bilder → Handzeichen 33–40  (Spielernummern 40/62/78/99 + Fouls 37–40)
  page076: 11 Bilder → Handzeichen 41–51  (Fouls Kontakt 41–51)
  page077: 8  Bilder → Handzeichen 52–59  (Besondere Fouls + Instant Replay)
  page078: 11 Bilder → Handzeichen 60–70  (img04 fehlt → 11 vorhandene Bilder für 11 HZ)

NICHT AUSFÜHREN — nur Skript, kein automatischer Run.
"""

import json
import os
from pathlib import Path

# ── Pfade ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
IMAGES_DIR = ROOT / "app" / "data" / "images"
RULES_JSON = ROOT / "app" / "data" / "rules.json"


# ── Vollständige Handzeichen-Definition ─────────────────────────────────────
# Format: (id, name, category, description)
HANDZEICHEN_META: list[tuple[int, str, str, str]] = [
    # Spieluhr (1–3)
    (1,  "SPIELUHR ANHALTEN",                      "Spieluhr",                "Offene Handfläche"),
    (2,  "SPIELUHR ANHALTEN WEGEN FOULSPIELS",      "Spieluhr",                "Geschlossene Faust"),
    (3,  "SPIELUHR STARTEN",                        "Spieluhr",                "Hackbewegung mit der Hand"),
    # Korberfolg (4–6)
    (4,  "1 PUNKT",                                 "Korberfolg",              "Abklappen des Handgelenks, 1 Finger ausgestreckt"),
    (5,  "2 PUNKTE",                                "Korberfolg",              "Abklappen des Handgelenks, 2 Finger ausgestreckt"),
    (6,  "3 PUNKTE",                                "Korberfolg",              "3 ausgestreckte Finger (Ein Arm: Wurfversuch / Beide Arme: Erfolgreicher Wurf)"),
    # Spielerwechsel und Auszeit (7–10)
    (7,  "SPIELERWECHSEL",                          "Spielerwechsel und Auszeit", "Kreuzen der Unterarme"),
    (8,  "AUFFORDERUNG ZUM EINTRETEN",              "Spielerwechsel und Auszeit", "Offene Handfläche winkt in Richtung Körper"),
    (9,  "AUSZEIT",                                 "Spielerwechsel und Auszeit", "T formen, Zeigefinger sichtbar"),
    (10, "MEDIEN-AUSZEIT",                          "Spielerwechsel und Auszeit", "Ausgestreckte Arme mit geschlossenen Fäusten"),
    # Information (11–16)
    (11, "UNGÜLTIGER KORBERFOLG / UNGÜLTIGE SPIELAKTION", "Information",       "Scherenbewegung der Arme vor der Brust"),
    (12, "SICHTBARES ZÄHLEN",                       "Information",             "Zählen mit Armbewegung"),
    (13, "KOMMUNIKATION",                           "Information",             "Daumen nach oben"),
    (14, "ZURÜCKSETZEN DER WURFUHR",                "Information",             "Kreisbewegung der Hand mit ausgestrecktem Zeigefinger"),
    (15, "SPIELRICHTUNG UND/ODER AUSBALL",          "Information",             "In Spielrichtung zeigen mit Arm parallel zu den Seitenlinien"),
    (16, "SPRUNGBALL-SITUATION",                    "Information",             "Daumen nach oben, danach in Spielrichtung gemäß Einwurfpfeil zeigen"),
    # Regelübertretungen (17–26)
    (17, "SCHRITTFEHLER",                           "Regelübertretungen",      "Fäuste umeinander rollen"),
    (18, "REGELWIDRIGES DRIBBELN: DOPPEL-DRIBBLING","Regelübertretungen",      "Arme mit offenen Handflächen auf und ab bewegen"),
    (19, "REGELWIDRIGES DRIBBELN: FÜHREN DES BALLS","Regelübertretungen",      "Bewegung der Handfläche mit halber Drehung"),
    (20, "DREI SEKUNDEN",                           "Regelübertretungen",      "Winken mit dem Arm, 3 Finger zeigen"),
    (21, "FÜNF SEKUNDEN",                           "Regelübertretungen",      "5 Finger zeigen"),
    (22, "ACHT SEKUNDEN",                           "Regelübertretungen",      "8 Finger zeigen"),
    (23, "WURFUHR",                                 "Regelübertretungen",      "Finger berühren die Schulter"),
    (24, "SPIELEN DES BALLS INS RÜCKFELD",          "Regelübertretungen",      "Arm beschreibt Halbkreis vor dem Körper"),
    (25, "ABSICHTLICHES TRETEN ODER STOPPEN DES BALLS", "Regelübertretungen",  "Zum Fuß zeigen"),
    (26, "GOALTENDING / STÖREN DES BALLS",          "Regelübertretungen",      "Ausgestreckten Zeigefinger kreisförmig über die andere Hand drehen"),
    # Spielernummern (27–36)
    (27, "SPIELERNUMMER 00 UND 0",                  "Spielernummern",          "Beide Hände zeigen die Ziffer 0 / Rechte Hand zeigt die Ziffer 0"),
    (28, "SPIELERNUMMER 1–5",                       "Spielernummern",          "Rechte Hand zeigt die Ziffern 1 bis 5"),
    (29, "SPIELERNUMMER 6–10",                      "Spielernummern",          "Rechte Hand zeigt Ziffer 5, linke Hand zeigt Ziffern 1 bis 5"),
    (30, "SPIELERNUMMER 11–15",                     "Spielernummern",          "Rechte Hand geschlossene Faust, linke Hand zeigt Ziffern 1 bis 5"),
    (31, "SPIELERNUMMER 16",                        "Spielernummern",          "Rückseite der Hand zeigt Ziffer 1 für Zehnerstelle, dann Einerstelle"),
    (32, "SPIELERNUMMER 24",                        "Spielernummern",          "Rückseite der Hand zeigt Ziffer 2 für Zehnerstelle, dann Einerstelle"),
    # Spielernummern Fortsetzung (33–36) + Fouls Kontakt Beginn (37–40)
    (33, "SPIELERNUMMER 40",                        "Spielernummern",          "Rückseite der Hand zeigt Ziffer 4 für Zehnerstelle, dann Einerstelle"),
    (34, "SPIELERNUMMER 62",                        "Spielernummern",          "Rückseite der Hand zeigt Ziffer 6 für Zehnerstelle, dann Einerstelle"),
    (35, "SPIELERNUMMER 78",                        "Spielernummern",          "Rückseite der Hand zeigt Ziffer 7 für Zehnerstelle, dann Einerstelle"),
    (36, "SPIELERNUMMER 99",                        "Spielernummern",          "Rückseite der Hand zeigt Ziffer 9 für Zehnerstelle, dann Einerstelle"),
    (37, "HALTEN",                                  "Fouls – Kontakt",         "Handgelenk umfassen (die gegnerische Hand)"),
    (38, "BLOCKIEREN / REGELWIDRIGER BLOCK",        "Fouls – Kontakt",         "Beide Hände an der Hüfte"),
    (39, "PUSHING ODER CHARGING OHNE BALL",         "Fouls – Kontakt",         "Stoßen imitieren"),
    (40, "HANDCHECKING",                            "Fouls – Kontakt",         "Hand nach vorne bewegen und dabei Handgelenk umfassen"),
    # Fouls Kontakt Fortsetzung (41–51)
    (41, "REGELWIDRIGER GEBRAUCH DER HÄNDE",        "Fouls – Kontakt",         "Schlagen ans Handgelenk"),
    (42, "CHARGING MIT BALL",                       "Fouls – Kontakt",         "Faust schlägt gegen offene Handfläche"),
    (43, "REGELWIDRIGER KONTAKT AN DER HAND",       "Fouls – Kontakt",         "Handfläche schlägt an den Unterarm"),
    (44, "EINHAKEN",                                "Fouls – Kontakt",         "Unterarm nach hinten bewegen"),
    (45, "REGELWIDRIGER ZYLINDER",                  "Fouls – Kontakt",         "Beide Arme mit offenen Handflächen absenken und anheben (oben beginnend)"),
    (46, "ÜBERTRIEBENES SCHWINGEN DES ELLBOGENS",   "Fouls – Kontakt",         "Ellbogen rückwärts schwingen"),
    (47, "SCHLAGEN AN DEN KOPF",                    "Fouls – Kontakt",         "Imitieren des Kontakts am Kopf"),
    (48, "FOUL DURCH MANNSCHAFT IN BALLKONTROLLE",  "Fouls – Kontakt",         "Faust zeigt in neue Spielrichtung"),
    (49, "FOUL AM KORBWERFER",                      "Fouls – Kontakt",         "Ein Arm mit geschlossener Faust, gefolgt von der Anzeige der Anzahl der Freiwürfe"),
    (50, "FOUL NICHT AM KORBWERFER",                "Fouls – Kontakt",         "Ein Arm mit geschlossener Faust, gefolgt von der Anzeige zur Spielfläche mit 2 Fingern"),
    (51, "WEGPASSEN NACH FOUL",                     "Fouls – Kontakt",         "Handflächen beider Arme zur Seite bewegen"),
    # Besondere Fouls (52–57)
    (52, "DOPPELFOUL",                              "Besondere Fouls",          "Beide Fäuste übereinander bewegen"),
    (53, "TECHNISCHES FOUL",                        "Besondere Fouls",          "T formen, Handfläche sichtbar"),
    (54, "UNSPORTLICHES FOUL",                      "Besondere Fouls",          "Handgelenk umfassen (eigene Hand)"),
    (55, "DISQUALIFIZIERENDES FOUL",                "Besondere Fouls",          "Beide Fäuste geschlossen"),
    (56, "FOUL VORTÄUSCHEN",                        "Besondere Fouls",          "Unterarm zweimal absenken und anheben (oben beginnend)"),
    (57, "REGELWIDRIGES ÜBERSCHREITEN DER AUSLINIE BEIM EINWURF", "Besondere Fouls", "Winken mit dem Arm parallel zur Auslinie"),
    # Instant Replay (58–59)
    (58, "IRS-VERWENDUNG",                          "Instant Replay",           "Kreisbewegung der Hand (Zeigefinger waagerecht ausgestreckt) zweimal"),
    (59, "TRAINER-CHALLENGE",                       "Instant Replay",           "Schiedsrichter bestätigt die beantragte Challenge"),
    # Ausführung von Foulstrafen (60–70)
    (60, "NACH FOUL OHNE FREIWÜRFE",                "Ausführung von Foulstrafen", "In Spielrichtung zeigen, Arm parallel zu den Seitenlinien"),
    (61, "NACH FOUL DURCH MANNSCHAFT IN BALLKONTROLLE", "Ausführung von Foulstrafen", "Mit geschlossener Faust in Spielrichtung zeigen, Arm parallel zu den Seitenlinien"),
    (62, "1 FREIWURF (Anschreibertisch)",            "Ausführung von Foulstrafen", "1 Finger hochhalten"),
    (63, "2 FREIWÜRFE (Anschreibertisch)",           "Ausführung von Foulstrafen", "2 Finger hochhalten"),
    (64, "3 FREIWÜRFE (Anschreibertisch)",           "Ausführung von Foulstrafen", "3 Finger hochhalten"),
    (65, "1 FREIWURF (Lead)",                        "Ausführung von Foulstrafen", "1 Finger waagerecht"),
    (66, "2 FREIWÜRFE (Lead)",                       "Ausführung von Foulstrafen", "2 Finger waagerecht"),
    (67, "3 FREIWÜRFE (Lead)",                       "Ausführung von Foulstrafen", "3 Finger waagerecht"),
    (68, "1 FREIWURF (Trail/Centre)",                "Ausführung von Foulstrafen", "Zeigefinger"),
    (69, "2 FREIWÜRFE (Trail/Centre)",               "Ausführung von Foulstrafen", "Offene Handflächen an beiden Händen"),
    (70, "3 FREIWÜRFE (Trail/Centre)",               "Ausführung von Foulstrafen", "3 ausgestreckte Finger"),
]


# ── Bilderzuordnung ──────────────────────────────────────────────────────────
# Jede Seite liefert eine geordnete Liste von Bilddateien.
# Die Handzeichen-Nummern werden sequenziell zugewiesen.
PAGE_RANGES = [
    # (seite_präfix, erwartete_handzeichen_nummern)
    ("page071", list(range(1,  7))),   # 6 Bilder → HZ  1–6
    ("page072", list(range(7,  17))),  # 10 Bilder → HZ  7–16
    ("page073", list(range(17, 27))),  # 10 Bilder → HZ 17–26
    ("page074", list(range(27, 33))),  # 6 Bilder  → HZ 27–32
    ("page075", list(range(33, 41))),  # 8 Bilder  → HZ 33–40
    ("page076", list(range(41, 52))),  # 11 Bilder → HZ 41–51
    ("page077", list(range(52, 60))),  # 8 Bilder  → HZ 52–59
    ("page078", list(range(60, 71))),  # 11 Bilder (img04 fehlt) → HZ 60–70
]


def collect_page_images(images_dir: Path, page_prefix: str) -> list[str]:
    """Gibt sortierte Liste der vorhandenen Bilddateien für ein Seitenpräfix zurück."""
    files = sorted(
        f.name
        for f in images_dir.iterdir()
        if f.name.startswith(page_prefix) and f.suffix == ".png"
    )
    return files


def build_image_map(images_dir: Path) -> dict[int, str]:
    """Erstellt Dict {handzeichen_id: bildname} anhand der PAGE_RANGES-Definition."""
    image_map: dict[int, str] = {}

    for page_prefix, hz_numbers in PAGE_RANGES:
        files = collect_page_images(images_dir, page_prefix)

        if len(files) != len(hz_numbers):
            print(
                f"WARNUNG: {page_prefix} – {len(files)} Bilder gefunden, "
                f"aber {len(hz_numbers)} Handzeichen erwartet. "
                f"Zuordnung wird trotzdem nach min(len) durchgeführt."
            )

        for hz_id, img_name in zip(hz_numbers, files):
            image_map[hz_id] = img_name

    return image_map


def build_handzeichen_list(image_map: dict[int, str]) -> list[dict]:
    """Erstellt die vollständige Handzeichen-Liste als List of Dicts."""
    result = []
    for hz_id, name, category, description in HANDZEICHEN_META:
        entry = {
            "id": hz_id,
            "name": name,
            "category": category,
            "description": description,
            "image": image_map.get(hz_id, ""),
        }
        if not entry["image"]:
            print(f"WARNUNG: Kein Bild gefunden für Handzeichen {hz_id} ({name})")
        result.append(entry)
    return result


def update_rules_json(rules_path: Path, handzeichen: list[dict]) -> None:
    """Hängt die handzeichen-Liste an rules.json an (oder ersetzt sie)."""
    with rules_path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    data["handzeichen"] = handzeichen

    with rules_path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

    print(f"Fertig: {len(handzeichen)} Handzeichen in {rules_path} geschrieben.")


# ── Hauptprogramm ────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Lese Bilder aus {IMAGES_DIR} ...")
    image_map = build_image_map(IMAGES_DIR)
    print(f"  {len(image_map)} Bild-Zuordnungen erstellt.")

    handzeichen = build_handzeichen_list(image_map)

    print(f"Schreibe {len(handzeichen)} Handzeichen in {RULES_JSON} ...")
    update_rules_json(RULES_JSON, handzeichen)


if __name__ == "__main__":
    main()
