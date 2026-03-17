# DBB Regelkunde Lerntool

Lern-App zur Vorbereitung auf die DBB Schiedsrichter-Prüfung – als Progressive Web App, offline-fähig und optimiert für Smartphones.

**Live:** [olieder.github.io/dbb-regelkunde](https://olieder.github.io/dbb-regelkunde/)

---

## Inhalt

314 offizielle Prüfungsfragen aus dem **DBB Schiedsrichter-Fragenkatalog 2025**:

| Kategorie | Fragen |
|-----------|--------|
| Regelfragen | 175 |
| KR-Fragen (Kooperationsregeln) | 139 |
| Trainer C-Lizenz (Subset) | ~50–70 |

---

## Lernmodi

| Modus | Beschreibung |
|-------|-------------|
| **Lernkarten** | Spaced Repetition nach SM-2 – Karten werden basierend auf deinem Lernstand im optimalen Abstand wiederholt |
| **Quiz** | Zufällig ausgewählte Fragen mit Sofort-Feedback |
| **Lernen** | Vollständige Fragenliste mit Volltextsuche und Artikelfilter |
| **Statistik** | Fortschrittsübersicht nach Regelartikel mit Donut-Charts |
| **Prüfungsdurchlauf** | Simulierter Prüfungsmodus – jede Frage muss 2× hintereinander richtig beantwortet werden |

---

## Features

- **Offline-fähig** – funktioniert ohne Internetverbindung nach dem ersten Besuch
- **Installierbar** – als PWA auf dem Homescreen speicherbar (iOS & Android)
- **Lernfortschritt** – wird lokal gespeichert, kein Account nötig
- **Hell/Dunkel-Modus** – automatisch oder manuell umschaltbar
- **Tastatursteuerung** – Space (umdrehen), J/N (Ja/Nein), Pfeiltasten
- **Touch-Gesten** – Swipe left/right für Antworten
- **WCAG 2.1 AA** – barrierefrei, vollständig mit Screenreader nutzbar

---

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren (nur für Tests)
npm install

# App lokal starten
npm run serve
# → http://localhost:3000

# E2E-Tests ausführen (132 Tests)
npm test
```

Voraussetzung: Node.js 18+

---

## Datenbasis aktualisieren

Wenn der DBB einen neuen Fragenkatalog veröffentlicht:

```bash
# Neue XLSX-Datei ablegen und Extraktor ausführen
python3 extract_questions.py DBB_Schiedsrichter-Fragenkataloge-2025_2.0.xlsx

# Erzeugt: app/data/questions.json
# Danach: committen und pushen → automatisches Deployment
```

---

## Projektstruktur

```
app/                    # Ausgelieferte PWA (GitHub Pages Quelle)
├── index.html          # Single Page App (6 Views)
├── manifest.json       # PWA-Manifest
├── sw.js               # Service Worker (Cache-First)
├── css/style.css       # Styles mit CSS Custom Properties
├── js/
│   ├── app.js          # View-Controller (Lernmodi)
│   ├── state.js        # Persistenz & SM-2-Algorithmus
│   ├── theme.js        # Hell/Dunkel-Modus
│   └── utils.js        # shuffle(), escHtml()
├── data/questions.json # 314 Prüfungsfragen
└── fonts/              # Barlow + Barlow Condensed (WOFF2)

tests/                  # Playwright E2E-Tests (132 Tests)
extract_questions.py    # XLSX → JSON Konverter
docs/arc42.md           # ARC42 Architekturdokumentation
```

---

## Deployment

Jeder Push auf `main` deployt automatisch via GitHub Actions auf GitHub Pages.

Workflow: `.github/workflows/deploy.yml`

---

## Architektur

Vollständige Architekturdokumentation nach ARC42: [docs/arc42.md](docs/arc42.md)

Kurzübersicht:
- **Kein Backend** – rein statische PWA
- **Kein Build-Prozess** – Vanilla JS (ES6-Module), direkt lauffähig
- **Kein Framework** – kein React/Vue/Angular
- **Datenpersistenz** – LocalStorage, gerätelokal, DSGVO-konform

---

## Lizenz

Prüfungsfragen: © Deutscher Basketball Bund (DBB)
App-Code: MIT
