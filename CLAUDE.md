# Projektregeln für Claude Code

## Git & Branching

- **Direktes Pushen auf `main` ist erlaubt** (temporär, solange das Test-Timeout-Problem ungeklärt ist).
- PRs sind aktuell nicht erforderlich.
- **Neue Releases** werden ausschließlich über annotated Tags ausgelöst (`git tag -a vX.Y.Z`).
  - Nur ein neues Tag triggert den Deploy auf GitHub Pages.
  - Tagformat: `vMAJOR.MINOR.PATCH` (Semantic Versioning)

> **TODO:** Sobald die Test-Timeouts behoben sind, wieder auf Feature-Branches + PR-Pflicht umstellen.

## Tests

- Playwright-Tests liegen in `tests/`.
- Nach jeder Änderung an `app/` die betroffenen Spec-Dateien anpassen oder erweitern.
- Neue Features brauchen neue Tests — keine ungetesteten Features auf `main`.

## Barrierefreiheit

- Barrierefreiheit wird immer mit **axe-core** automatisiert geprüft (`@axe-core/playwright`).
- Jede neue View und jedes neue modale Overlay bekommt einen axe-core-Scan in `tests/accessibility.spec.js`.
- Axe-core ist noch nicht installiert — vor der ersten Nutzung: `npm install --save-dev @axe-core/playwright`.

## Projektstruktur

- App-Code liegt ausschließlich in `app/` (wird auf GitHub Pages deployed).
- Fragen-Daten: `app/data/questions.json`
- Styles: `app/css/style.css`
- Logik: `app/js/` (ES-Module)
