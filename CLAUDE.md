# Projektregeln für Claude Code

## Git & Branching

- **Direktes Pushen auf `main` ist erlaubt** (temporär, solange das Test-Timeout-Problem ungeklärt ist).
- PRs sind aktuell nicht erforderlich.
- **Neue Releases** werden ausschließlich über annotated Tags ausgelöst (`git tag -a vX.Y.Z`).
  - Nur ein neues Tag triggert den Deploy auf GitHub Pages.
  - Tagformat: `vMAJOR.MINOR.PATCH` (Semantic Versioning)

> **TODO:** Sobald die Test-Timeouts behoben sind, wieder auf Feature-Branches + PR-Pflicht umstellen.

## Versionierung

Die Version wird **ausschließlich in `package.json`** gepflegt. Ein Script überträgt sie automatisch in alle App-Dateien.

### Workflow für einen Release

```bash
# 1. Version bumpen (schreibt in package.json, sw.js, app.js, index.html)
node scripts/bump-version.js 1.4.0

# RC / Pre-Release:
node scripts/bump-version.js 1.4.0-RC1

# 2. Committen & pushen
git add package.json app/sw.js app/js/app.js app/index.html
git commit -m "chore: bump to v1.4.0"
git push

# 3. Tag setzen → löst GitHub Pages Deploy aus
git tag -a v1.4.0 -m "v1.4.0"
git push --tags
```

**Niemals** die Version manuell in `sw.js`, `app.js` oder `index.html` ändern — immer `bump-version.js` nutzen.

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
