#!/usr/bin/env bash
# run_all_updates.sh
# ------------------
# Führt beide Update-Skripte nacheinander aus.
# Voraussetzung: Python 3.9+, keine externen Pakete nötig.
#
# Ausführen mit:
#   chmod +x run_all_updates.sh
#   ./run_all_updates.sh
#
# oder direkt:
#   bash run_all_updates.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo "Schritt 1: Artikeltexte aus output.md in rules.json schreiben"
echo "============================================================"
python3 "$SCRIPT_DIR/update_article_texts.py"

echo ""
echo "============================================================"
echo "Schritt 2: Handzeichen-Daten erstellen und in rules.json eintragen"
echo "============================================================"
python3 "$SCRIPT_DIR/create_handzeichen_data.py"

echo ""
echo "============================================================"
echo "Fertig. app/data/rules.json wurde aktualisiert."
echo "============================================================"
