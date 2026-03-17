# Projektregeln für Claude Code

## Git & Branching

- **Niemals direkt auf `main` pushen.** Änderungen kommen über Feature-Branches und Pull Requests.
- **Alle Tests müssen grün sein**, bevor ein Branch auf `main` gemerged wird.
  - Tests lokal ausführen: `npm test`
  - Der CI-Workflow `test.yml` muss in GitHub Actions erfolgreich durchlaufen.
- **Neue Releases** werden ausschließlich über annotated Tags ausgelöst (`git tag -a vX.Y.Z`).
  - Nur ein neues Tag triggert den Deploy auf GitHub Pages.
  - Tagformat: `vMAJOR.MINOR.PATCH` (Semantic Versioning)

## Tests

- Playwright-Tests liegen in `tests/`.
- Nach jeder Änderung an `app/` die betroffenen Spec-Dateien anpassen oder erweitern.
- Neue Features brauchen neue Tests — keine ungetesteten Features auf `main`.

## Projektstruktur

- App-Code liegt ausschließlich in `app/` (wird auf GitHub Pages deployed).
- Fragen-Daten: `app/data/questions.json`
- Styles: `app/css/style.css`
- Logik: `app/js/` (ES-Module)
