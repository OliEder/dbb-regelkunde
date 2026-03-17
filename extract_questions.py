#!/usr/bin/env python3
"""Extrahiert Fragen aus der DBB Schiedsrichter-Fragenkataloge XLSX-Datei."""

import zipfile
import xml.etree.ElementTree as ET
import json
import sys
import os

NS = {'ss': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def get_shared_strings(zf):
    with zf.open('xl/sharedStrings.xml') as f:
        tree = ET.parse(f)
    root = tree.getroot()
    strings = []
    for si in root.findall('ss:si', NS):
        parts = []
        for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
            if t.text:
                parts.append(t.text)
        strings.append(''.join(parts))
    return strings


def cell_value(cell, shared_strings):
    t = cell.get('t', '')
    v_el = cell.find('ss:v', NS)
    if v_el is None or v_el.text is None:
        return ''
    val = v_el.text
    if t == 's':
        idx = int(val)
        return shared_strings[idx] if idx < len(shared_strings) else ''
    return val


def parse_sheet(zf, sheet_path, shared_strings, skip_rows, category, id_prefix):
    with zf.open(sheet_path) as f:
        tree = ET.parse(f)
    root = tree.getroot()

    # Alle Zeilen sammeln
    rows = root.findall('.//ss:sheetData/ss:row', NS)

    questions = []
    for row in rows:
        row_num = int(row.get('r', 0))
        if row_num <= skip_rows:
            continue

        # Spalten A-F auslesen (Index 0-5)
        cells = {}
        for cell in row.findall('ss:c', NS):
            ref = cell.get('r', '')
            col = ''.join(c for c in ref if c.isalpha())
            cells[col] = cell_value(cell, shared_strings)

        nr = cells.get('A', '').strip()
        frage = cells.get('B', '').strip()
        j_val = cells.get('C', '').strip()
        n_val = cells.get('D', '').strip()
        antwort = cells.get('E', '').strip()
        artikel = cells.get('F', '').strip()

        if not nr or not frage:
            continue

        # Antwort bestimmen
        j_marked = j_val.lower() in ('x', '\xa0x', 'x\xa0') or j_val.strip('\\xa0 ').lower() == 'x'
        n_marked = n_val.lower() in ('x', '\xa0x', 'x\xa0') or n_val.strip('\\xa0 ').lower() == 'x'

        # Auch einzelne nicht-leere Werte als Marker werten
        if not j_marked and j_val:
            j_marked = True
        if not n_marked and n_val:
            n_marked = True

        if j_marked:
            answer = 'Ja'
        elif n_marked:
            answer = 'Nein'
        else:
            answer = 'Unbekannt'

        q_id = f"{id_prefix}-{nr}" if not nr.startswith(id_prefix) else nr

        questions.append({
            'id': q_id,
            'category': category,
            'question': frage,
            'answer': answer,
            'explanation': antwort,
            'article': artikel
        })

    return questions


def main():
    xlsx_path = os.path.join(os.path.dirname(__file__), 'DBB_Schiedsrichter-Fragenkataloge-2025_2.0.xlsx')

    if not os.path.exists(xlsx_path):
        print(f"Fehler: Datei nicht gefunden: {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    with zipfile.ZipFile(xlsx_path, 'r') as zf:
        shared_strings = get_shared_strings(zf)

        # Sheet-Namen ermitteln
        with zf.open('xl/workbook.xml') as f:
            wb_tree = ET.parse(f)
        wb_root = wb_tree.getroot()

        sheets = []
        for sheet in wb_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
            name = sheet.get('name', '')
            sheet_id = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id', '')
            sheets.append((name, sheet_id))

        # Relationships laden um Sheet-Pfade zu finden
        with zf.open('xl/_rels/workbook.xml.rels') as f:
            rels_tree = ET.parse(f)
        rels_root = rels_tree.getroot()

        rel_map = {}
        for rel in rels_root.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rel_id = rel.get('Id', '')
            target = rel.get('Target', '')
            rel_map[rel_id] = target

        all_questions = []

        for i, (sheet_name, sheet_rel_id) in enumerate(sheets):
            sheet_target = rel_map.get(sheet_rel_id, '')
            if not sheet_target:
                continue

            sheet_path = f'xl/{sheet_target}' if not sheet_target.startswith('xl/') else sheet_target
            sheet_path = sheet_path.replace('xl/xl/', 'xl/')

            if 'Regelfragen' in sheet_name or i == 0:
                # Sheet 1: Daten ab Zeile 9 (Header Zeile 8)
                skip = 8
                category = 'Regelfragen'
                prefix = 'R'
            else:
                # Sheet 2: Daten ab Zeile 8 (Header Zeile 7)
                skip = 7
                category = 'KR-Fragen'
                prefix = 'K'

            try:
                questions = parse_sheet(zf, sheet_path, shared_strings, skip, category, prefix)
                all_questions.extend(questions)
                print(f"Sheet '{sheet_name}': {len(questions)} Fragen extrahiert", file=sys.stderr)
            except Exception as e:
                print(f"Fehler beim Lesen von Sheet '{sheet_name}': {e}", file=sys.stderr)

    print(json.dumps(all_questions, ensure_ascii=False, indent=2))
    print(f"\nGesamt: {len(all_questions)} Fragen", file=sys.stderr)


if __name__ == '__main__':
    main()
