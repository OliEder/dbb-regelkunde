#!/usr/bin/env python3
"""
Extract articles, images, and create a glossary from the DBB Basketball Rules PDF.
Output: app/data/rules.json and app/data/images/ directory
"""

import fitz  # PyMuPDF
import json
import re
import os

PDF_PATH = "Offizielle-Basketball-Regeln_2024_v1.0_inkl_Anhang_technische_Ausruestung.pdf"
OUTPUT_JSON = "app/data/rules.json"
OUTPUT_IMAGES_DIR = "app/data/images"

# Article number to Regel (chapter)
def get_artikel_regel(num):
    if num == 1:
        return "REGEL I – DAS SPIEL"
    elif num <= 3:
        return "REGEL II – SPIELFELD UND AUSRÜSTUNG"
    elif num <= 7:
        return "REGEL III – MANNSCHAFTEN"
    elif num <= 21:
        return "REGEL IV – SPIELVORSCHRIFTEN"
    elif num <= 31:
        return "REGEL V – REGELÜBERTRETUNGEN"
    elif num <= 43:
        return "REGEL VI – FOULS"
    elif num <= 50:
        return "REGEL VII – ALLGEMEINE VORSCHRIFTEN"
    else:
        return "ANHANG"


def extract_articles(doc):
    """Extract text organized by article using page-by-page parsing."""
    # Main rules pages are approximately 8-70
    MAIN_RULES_START = 7   # 0-indexed = page 8
    MAIN_RULES_END = 71    # 0-indexed = page 72

    # Collect all pages text
    page_texts = []
    for i in range(doc.page_count):
        page_texts.append(doc[i].get_text("text"))

    # Find article starts: "Artikel N Title" where Title is on the same line
    # Pattern: 'Artikel 10 Zustand des Balls\n' or 'Artikel 1 \nDefinitionen'
    # Also handle: "Artikel 8 \nSpielzeit..."
    article_positions = []  # (art_num, page_idx, title, offset_in_page)

    for page_idx in range(MAIN_RULES_START, MAIN_RULES_END + 1):
        text = page_texts[page_idx]
        # Match "Artikel N" at the START of a line (after optional page-number line)
        # Real article headers look like: "Artikel 10 Zustand des Balls\n"
        # They always appear at the beginning of a line
        for match in re.finditer(r'(?m)^Artikel\s+(\d+)\s+([A-ZÄÖÜ][^\n]*)', text):
            art_num = int(match.group(1))
            title_on_line = match.group(2).strip()

            # Skip decimal references like "Artikel 12.2.1"
            end_pos = match.end()
            if end_pos < len(text) and text[end_pos] == '.':
                continue

            # The title must start with an uppercase letter (real titles do)
            # and should not be a sentence fragment starting with lowercase
            if not title_on_line or title_on_line[0].islower():
                continue

            # Skip references embedded in text (they have lowercase after them)
            # Real headers: "Artikel 33 Kontakt (Grundsätze)"
            # References:   "Artikel 39 ausgeführt."  <- lowercase
            # Extra check: title should be a proper noun phrase (not a sentence fragment)
            if re.match(r'^(zur|ist|die|den|der|des|dem|ein|eine|als|und|oder|nach|vor|mit)', title_on_line, re.I):
                continue

            article_positions.append({
                'num': art_num,
                'page_idx': page_idx,
                'offset': match.start(),
                'inline_title': title_on_line
            })

    # Deduplicate: keep only the FIRST occurrence of each article number
    seen = set()
    unique_articles = []
    for pos in article_positions:
        num = pos['num']
        if num not in seen:
            seen.add(num)
            unique_articles.append(pos)

    # Sort by page, then offset
    unique_articles.sort(key=lambda x: (x['page_idx'], x['offset']))

    # For each article, extract its text from its start to the next article start
    articles = []
    for idx, art_pos in enumerate(unique_articles):
        art_num = art_pos['num']
        start_page = art_pos['page_idx']

        # Get the next article's start
        if idx + 1 < len(unique_articles):
            next_pos = unique_articles[idx + 1]
            end_page = next_pos['page_idx']
            end_offset = next_pos['offset']
        else:
            end_page = min(start_page + 8, MAIN_RULES_END)
            end_offset = None

        # Build combined text from start_page to end_page
        text_parts = []
        for p in range(start_page, end_page + 1):
            if p == start_page:
                # Start from article header
                page_text = page_texts[p]
                start_match = re.search(r'Artikel\s+' + str(art_num) + r'[\s\n]', page_text)
                if start_match:
                    text_parts.append(page_text[start_match.start():])
                else:
                    text_parts.append(page_text)
            elif p == end_page and end_offset is not None:
                # End before next article
                text_parts.append(page_texts[p][:end_offset])
            else:
                text_parts.append(page_texts[p])

        combined = "\n".join(text_parts)

        # Extract the title from the combined text
        title_match = re.match(
            r'Artikel\s+' + str(art_num) + r'\s+([^\n\d][^\n]*)\n',
            combined
        )
        if title_match:
            title = title_match.group(1).strip()
            # Remove the header line from content
            content = combined[title_match.end():].strip()
        else:
            # Try: "Artikel N\nTitle\n"
            title_match2 = re.match(
                r'Artikel\s+' + str(art_num) + r'\s*\n([^\n]+)\n',
                combined
            )
            if title_match2:
                title = title_match2.group(1).strip()
                content = combined[title_match2.end():].strip()
            else:
                title = art_pos['inline_title'] or f"Artikel {art_num}"
                # Skip just the "Artikel N" line
                skip_match = re.match(r'Artikel\s+' + str(art_num) + r'[^\n]*\n', combined)
                content = combined[skip_match.end():].strip() if skip_match else combined.strip()

        # Clean up page numbers at start of lines and excessive whitespace
        content = re.sub(r'(?m)^\d+\s*$', '', content)
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = content.strip()

        regel = get_artikel_regel(art_num)
        pages = list(range(start_page + 1, end_page + 2))

        articles.append({
            "number": art_num,
            "title": title,
            "regel": regel,
            "pages": pages,
            "text": content,
            "images": []
        })
        print(f"  Art. {art_num:2d}: {title[:50]} (p.{start_page+1}, {len(content)} chars)")

    return articles


def extract_images(doc, output_dir):
    """Extract all meaningful images from the PDF."""
    os.makedirs(output_dir, exist_ok=True)

    images_data = []
    seen_xrefs = set()

    for page_idx in range(doc.page_count):
        page = doc[page_idx]
        image_list = page.get_images(full=True)
        page_text = page.get_text("text")

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]

            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)

            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                width = base_image["width"]
                height = base_image["height"]

                # Skip very small images (decorative)
                if width < 100 or height < 50:
                    continue

                # Skip advertising page (page 2, index 1)
                if page_idx == 1:
                    continue

                filename = f"page{page_idx+1:03d}_img{img_idx+1:02d}.{image_ext}"
                filepath = os.path.join(output_dir, filename)

                with open(filepath, "wb") as f:
                    f.write(image_bytes)

                # Try to find caption from page text ("Bild N ...")
                caption = None
                bild_matches = list(re.finditer(r'Bild\s+(\d+)\s+([^\n]+)', page_text))
                if bild_matches:
                    if len(image_list) == 1 or img_idx < len(bild_matches):
                        i_match = min(img_idx, len(bild_matches) - 1)
                        bm = bild_matches[i_match]
                        caption = f"Bild {bm.group(1)}: {bm.group(2).strip()}"

                images_data.append({
                    "filename": filename,
                    "page": page_idx + 1,
                    "width": width,
                    "height": height,
                    "caption": caption,
                    "article": None,
                    "article_title": None,
                })

                cap_str = f" [{caption}]" if caption else ""
                print(f"  {filename} ({width}x{height}) p.{page_idx+1}{cap_str}")

            except Exception as e:
                print(f"  Error xref={xref} p.{page_idx+1}: {e}")

    return images_data


def assign_images_to_articles(articles, images_data):
    """Assign images to articles based on page numbers."""
    page_to_article = {}
    for art in articles:
        for page in art["pages"]:
            if page not in page_to_article:
                page_to_article[page] = art

    for img in images_data:
        page = img["page"]
        art = page_to_article.get(page)
        if art:
            img["article"] = art["number"]
            img["article_title"] = art["title"]
            art["images"].append(img["filename"])

    return articles, images_data


def create_glossary():
    """Basketball glossary filling a gap in the official DBB rules."""
    terms = [
        {
            "term": "24-Sekunden-Uhr (Wurfuhr)",
            "definition": "Anzeigevorrichtung, die nach Ballkontrollübernahme von 24 auf 0 herunterzählt. Berührt der Ball den Ring nicht innerhalb dieser Zeit, ist es eine Regelübertretung (Einwurf für Gegner).",
            "articles": [29, 49]
        },
        {
            "term": "24-Sekunden-Regel",
            "definition": "Nach Erlangen der Ballkontrolle muss eine Mannschaft innerhalb von 24 Sekunden einen Korbwurf versuchen, der den Ring oder das Korbgerät berührt. Zurücksetzen der Uhr: auf 24 Sek. bei Kontrollwechsel, auf 14 Sek. bei bestimmten Einwürfen im Frontfeld.",
            "articles": [29]
        },
        {
            "term": "3-Sekunden-Regel",
            "definition": "Ein Spieler der angreifenden Mannschaft darf sich nicht länger als 3 aufeinanderfolgende Sekunden in der gegnerischen Zone aufhalten, solange seine Mannschaft Ballkontrolle hat und der Ball im Frontfeld ist.",
            "articles": [26]
        },
        {
            "term": "5-Sekunden-Regel",
            "definition": "Bei einem Einwurf oder Freiwurf muss der Ball innerhalb von 5 Sekunden abgegeben werden. Auch ein eng markierter Spieler (nah bewachter Spieler) muss den Ball in 5 Sekunden abgeben.",
            "articles": [27, 31]
        },
        {
            "term": "8-Sekunden-Regel",
            "definition": "Nach Ballkontrolle im Rückfeld hat die angreifende Mannschaft 8 Sekunden Zeit, den Ball ins Frontfeld zu bringen. Vergehen: Einwurf für den Gegner an der Seite bei der Mittellinie.",
            "articles": [28]
        },
        {
            "term": "Alternierend-Besitzregel (Wechselnder Ballbesitz)",
            "definition": "Nach dem ersten Viertel wechselt der Ballbesitz bei Sprungballsituationen alternierend. Der Pfeil am Kampfrichtertisch zeigt, welche Mannschaft als nächste das Einwerfen erhält.",
            "articles": [12]
        },
        {
            "term": "Angriff / Offense",
            "definition": "Die Mannschaft, die den Ball kontrolliert und versucht, einen Korb zu erzielen. Angreifer dürfen sich nicht länger als 3 Sekunden in der gegnerischen Zone aufhalten.",
            "articles": [14, 26]
        },
        {
            "term": "Anwurf",
            "definition": "Spielbeginn eines Viertels oder Halbzeit. Beim 1. Viertel: Schiedsrichter wirft Ball senkrecht zwischen zwei Gegenspieler im Mittelkreis; beide springen und schlagen den Ball an. Der Pfeil bestimmt den Ballbesitz in späteren Sprungballsituationen.",
            "articles": [9]
        },
        {
            "term": "Aus",
            "definition": "Ein Ball ist im Aus, wenn er die Begrenzungslinie oder den Boden/Objekte jenseits davon berührt. Ein Spieler ist im Aus, wenn er Begrenzungslinien, Tribüne oder andere Einrichtungen berührt. Maßgeblich ist der letzte Kontakt vor dem Aus.",
            "articles": [23]
        },
        {
            "term": "Ballkontrolle",
            "definition": "Eine Mannschaft hat Ballkontrolle, wenn ein Spieler den lebenden Ball hält oder dribbelt, oder wenn ein Mitspieler einen Pass empfangen soll. Mannschaftliche Ballkontrolle besteht auch beim toten Ball vor Einwürfen.",
            "articles": [14]
        },
        {
            "term": "Blocking",
            "definition": "Illegaler persönlicher Kontakt, der den Fortbewegungsweg eines Gegners mit oder ohne Ball behindert. Ein Verteidiger muss eine legale Position (Füße auf Boden, Gesicht zum Gegner) einnehmen, bevor er eine Defensivposition beansprucht.",
            "articles": [32, 33]
        },
        {
            "term": "Charging / Körperangriff",
            "definition": "Illegales offensives Foul: ein Ballführender oder ballloser Angreifer stößt oder rennt in einen korrekt positionierten Verteidiger. Der Angreifer erhält das Foul.",
            "articles": [32, 33]
        },
        {
            "term": "Disqualifizierendes Foul",
            "definition": "Schwerwiegendstes unsportliches Vergehen eines Spielers, Auswechselspielers, Trainers oder Begleitpersonen. Führt zur sofortigen Spielsperre für den Rest des Spiels. Strafe: 2 Freiwürfe + Einwurf (oder 1 Freiwurf + Einwurf je nach Situation).",
            "articles": [38]
        },
        {
            "term": "Doppelfoul",
            "definition": "Wenn zwei Gegenspieler ungefähr zur gleichen Zeit gegenseitig Fouls begehen. Jeder Spieler erhält ein Foul, keine Freiwürfe. Spielfortsetzung: Wechselnder Ballbesitz oder letzter Ballbesitz.",
            "articles": [35]
        },
        {
            "term": "Doppeldribbling",
            "definition": "Regelverstoß: Ein Spieler beginnt ein zweites Dribbling, nachdem er sein erstes bereits beendet hat (Ball mit beiden Händen berührt oder Ball gehalten). Einwurf für die Gegner.",
            "articles": [24]
        },
        {
            "term": "Dreipunktelinie",
            "definition": "Linie aus einem Halbkreis (Radius 6,75 m vom Korb) und geraden Teilen parallel zur Seitenlinie (mind. 0,90 m). Korbwürfe von jenseits dieser Linie (Spieler-Füße vollständig hinter der Linie) zählen 3 Punkte.",
            "articles": [2, 16]
        },
        {
            "term": "Dribbling",
            "definition": "Kontrolliertes Tippen oder Prellen des Balls mit einer Hand auf den Boden. Beginnt wenn der Spieler den Ball nach Ballkontrolle loslässt; endet wenn er ihn wieder mit einer oder beiden Händen berührt. Nicht erlaubt: beide Hände gleichzeitig oder Ball unter der Hand 'tragen'.",
            "articles": [24]
        },
        {
            "term": "Einwurf",
            "definition": "Methode zur Spielfortsetzung: Spieler steht außerhalb des Spielfeldes und übergibt/wirft den Ball an einen Mitspieler innerhalb von 5 Sekunden. Die Einwurfstelle richtet sich nach der Art der Unterbrechung (Aus, Foul, Regelverstoß etc.).",
            "articles": [17]
        },
        {
            "term": "Fehlverhalten / Verlust der Spielberechtigung",
            "definition": "Unsportliches Verhalten, das mit Disqualifikation bestraft wird: wiederholte unsportliche Handlungen, Simulation, übermäßiger Protest. Führt zum Ausschluss vom Spiel.",
            "articles": [20, 21]
        },
        {
            "term": "Freiwurf",
            "definition": "Ungehinderte Möglichkeit, einen Punkt von der Freiwurflinie zu erzielen. Strafe für Fouls und technische Fouls. Der Werfer hat 5 Sekunden Zeit und darf die Linie nicht übertreten. Zonen-Spieler dürfen erst einrücken, wenn der Ball die Hand verlässt.",
            "articles": [43]
        },
        {
            "term": "Freiwurflinie",
            "definition": "Linie parallel zur Endlinie, 4,60 m von dieser entfernt und 3,60 m lang, von der aus Freiwürfe geworfen werden. Der Mittelpunkt liegt im Zentrum der Endlinie.",
            "articles": [2]
        },
        {
            "term": "Frontfeld / Vorfeld",
            "definition": "Das Frontfeld einer Mannschaft umfasst den gegnerischen Korb, die Rückwand dahinter und den Teil des Spielfeldes auf der gegnerischen Hälfte (einschließlich Mittellinie). Wichtig für Rückfeld-Regel und 3-Sekunden-Regel.",
            "articles": [2]
        },
        {
            "term": "Goaltending",
            "definition": "Regelverstoß: Ein Spieler berührt den Ball während des Korbwurfs auf dem Abwärtsbogen (über Ringkante) oder den Ring, wenn der Ball noch um den Ring springt. Strafe: Korberfolg wird gewährt (oder Ball für Gegner wenn Angreifer).",
            "articles": [31]
        },
        {
            "term": "Gewalttätigkeit",
            "definition": "Physischer Angriff oder Angriffs-Versuch auf eine andere Person durch Spieler, Trainer oder Begleitpersonen, unabhängig vom Ball-Zustand. Führt zur sofortigen Disqualifikation und kann weitere Verbandssanktionen nach sich ziehen.",
            "articles": [39]
        },
        {
            "term": "Halteball (Jump Ball Situation)",
            "definition": "Situation, in der Spieler verschiedener Mannschaften einen lebenden Ball gleichzeitig fest halten und kein Spieler allein Ballkontrolle erlangen kann. Wird durch die Alternierend-Besitzregel (Pfeil) gelöst.",
            "articles": [12]
        },
        {
            "term": "Kampfrichter",
            "definition": "Offizielle am Kampfrichtertisch: Anschreiber, Assistent des Anschreibers, Zeitnehmer und Wurfuhr-Zeitnehmer. Sie unterstützen die Schiedsrichter und führen die offiziellen Aufzeichnungen (Anschreibebogen, Zeitanzeige).",
            "articles": [46, 47, 48, 49]
        },
        {
            "term": "Kapitän",
            "definition": "Spieler, der die Mannschaft auf dem Spielfeld anführt. Einziger Spieler, der höflich mit den Schiedsrichtern sprechen darf. Muss auf dem Spielfeld stehen, außer bei Verletzung oder Disqualifikation; dann übernimmt ein anderer Spieler.",
            "articles": [6]
        },
        {
            "term": "Kommissar",
            "definition": "Von FIBA oder nationalem Verband ernannte Person, die das Spiel beobachtet und bei Regelauslegungsfragen Empfehlungen geben kann. Hat keine Schiedsrichterbefugnisse und unterbricht das Spiel nicht.",
            "articles": [50]
        },
        {
            "term": "Kontakt (Grundsätze)",
            "definition": "Basketball ist ein Kontaktsport. Grundsätze: Zylinderprinzip (jeder Spieler hat Anspruch auf seinen Platz), Legalposition (Verteidiger muss korrekt stehen), und Verteidiger-Grundsatz (Angreifer verantwortlich für Kollision bei zu schnellem Angriff).",
            "articles": [33]
        },
        {
            "term": "Korb / Korbanlage",
            "definition": "Besteht aus Ring (45 cm Innendurchmesser, 3,05 m über dem Boden), weißem Netz (40–45 cm) und Korbgestell. Befestigt an der Rückwand, die 1,20 m hinter der Endlinie steht.",
            "articles": [2, 3]
        },
        {
            "term": "Korberfolg und Wertung",
            "definition": "Der lebende Ball geht von oben durch den Korb. Wert: 1 Punkt (Freiwurf), 2 Punkte (innerhalb Dreipunktelinie), 3 Punkte (jenseits der Dreipunktelinie). Ein Eigenkorb zählt immer 2 Punkte für den Gegner. Letzter Korb entscheidet bei Zeitablauf.",
            "articles": [16]
        },
        {
            "term": "Korrigierbare Fehler",
            "definition": "Bestimmte Kampfrichter-Fehler, die unter strengen Bedingungen korrigierbar sind: falsche Anzahl an Freiwürfen, Freiwürfe für falsche Mannschaft, oder falsche Spielfortsetzung. Müssen in festgelegter Zeitfrist erkannt werden.",
            "articles": [44]
        },
        {
            "term": "Lebender Ball",
            "definition": "Der Ball ist lebendig, sobald der Schiedsrichter ihn dem Einwerfer übergibt oder beim Anwurf in die Luft wirft. Der Ball bleibt lebendig auch wenn er den Ring trifft oder nicht durch den Korb geht.",
            "articles": [10]
        },
        {
            "term": "Mannschaftsfouls",
            "definition": "Zähler für persönliche Fouls einer Mannschaft pro Spielviertel. Ab dem 5. Mannschaftsfoul in einem Viertel gibt es für alle weiteren Fouls ohne Freiwurfsituation 2 Freiwürfe für den Gegner.",
            "articles": [41]
        },
        {
            "term": "Mittellinie",
            "definition": "Linie parallel zu den Endlinien, die das Spielfeld in zwei Hälften teilt. Die Mittellinie gehört zum Rückfeld jeder Mannschaft. Wichtig für die Rückfeld-Regel: Ball muss komplett die Linie überqueren.",
            "articles": [2, 30]
        },
        {
            "term": "Nah bewachter Spieler",
            "definition": "Ein Spieler mit Ball gilt als nah bewacht, wenn ein Gegner innerhalb etwa 1 Meters steht und die Arme ausgestreckt hat. In diesem Fall gilt die 5-Sekunden-Regel zum Abgeben des Balls.",
            "articles": [27]
        },
        {
            "term": "Persönliches Foul",
            "definition": "Illegaler Körperkontakt mit einem Gegner. Umfasst Holding, Pushing, Blocking, Charging und Hacking. Strafe je nach Situation: kein Freiwurf, 2 Freiwürfe oder 1 Freiwurf + Einwurf. Ein Spieler mit 5 persönlichen Fouls ist disqualifiziert.",
            "articles": [34]
        },
        {
            "term": "Pivot / Drehfuß",
            "definition": "Ein Fuß, den ein Spieler der den Ball hält auf dem Boden befestigt hat. Der Spieler darf den anderen Fuß beliebig oft um den Drehfuß drehen. Der Drehfuß darf nicht abgehoben werden, bevor der Ball abgegeben oder getippt wird.",
            "articles": [25]
        },
        {
            "term": "Rückfeld",
            "definition": "Das Rückfeld einer Mannschaft umfasst ihren eigenen Korb, die eigene Rückwand und die eigene Spielfeldhälfte (einschließlich Mittellinie). Hier darf der Ball nach Frontfeld-Ballkontrolle nicht mehr zurückgespielt werden.",
            "articles": [2, 30]
        },
        {
            "term": "Rückfeld-Regel (Spielen des Balls ins Rückfeld)",
            "definition": "Hat eine Mannschaft im Frontfeld Ballkontrolle erlangt, darf kein Spieler den Ball ins Rückfeld bringen (weder durch Pass noch durch Dribbling). Vergehen: Einwurf für Gegner an der Seite bei der Mittellinie.",
            "articles": [30]
        },
        {
            "term": "Schiedsrichter",
            "definition": "Offizielle Spielleitung: 1. Schiedsrichter (Hauptreferee) und 1-2 Schiedsrichter-Assistenten. Führen das Spiel, ahnden Fouls und Verstöße, entscheiden bei Streitigkeiten. Ihre Entscheidungen sind endgültig. Sie können Videobeweise nutzen.",
            "articles": [45, 46]
        },
        {
            "term": "Schrittfehler (Travel)",
            "definition": "Regelverstoß: ein Spieler macht unerlaubte Schritte mit dem Ball ohne zu dribbeln. Regelung: beim Fangen des Balls während der Bewegung darf ein Schritt gemacht werden; dann Pivot oder Abgabe. Beim Stopp: 1-2 Schritte erlaubt je nach Situation.",
            "articles": [25]
        },
        {
            "term": "Spieldisqualifikation",
            "definition": "Ein Spieler verliert die Spielberechtigung und muss das Spiel verlassen, wenn er 5 persönliche Fouls begangen hat. Er darf auf der Bank sitzen bleiben, aber nicht mehr spielen.",
            "articles": [20]
        },
        {
            "term": "Spielfeld",
            "definition": "Rechteckige, harte Oberfläche: 28 m lang × 15 m breit (Innenmaß). Umgeben von mindestens 2 m freier Zone. Markierungen: Endlinien, Seitenlinien, Mittellinie, Dreipunktelinie, Zone, Freiwurflinie, Kreis, Mannschaftsbank-Bereiche.",
            "articles": [2]
        },
        {
            "term": "Spielerverletzung",
            "definition": "Kann ein verletzter Spieler nicht sofort (ca. 15 Sekunden) weiterspielen, muss er ausgewechselt werden oder seine Mannschaft nimmt eine Auszeit. Schiedsrichter dürfen das Spiel für Behandlung unterbrechen.",
            "articles": [5]
        },
        {
            "term": "Spielerwechsel",
            "definition": "Auswechslung darf nur während einer toten Ball-Situation und vor dem Einwurf beantragt werden. Ausnahmen: bei letztem Freiwurf wenn Freiwurf-Werfer ausgewechselt werden soll. Der Wechsel wird beim Kampfrichtertisch angemeldet.",
            "articles": [19]
        },
        {
            "term": "Spielverzögerung",
            "definition": "Unnötiges Verzögern des Spiels durch eine Mannschaft oder Einzelperson, z.B. Ball nach Korberfolg festhalten, Einwurf verhindern, übermäßig langes Aufwärmen. Erste Verwarnung, dann technisches Foul.",
            "articles": [35]
        },
        {
            "term": "Sprungball",
            "definition": "Situation, in der Spieler verschiedener Mannschaften einen lebenden Ball gleichzeitig fest halten. Kein Anwurf mehr – gelöst durch alternierenden Ballbesitz (Pfeil). Beim allerersten Spielbeginn: Anwurf im Mittelkreis.",
            "articles": [9, 12]
        },
        {
            "term": "Standort eines Spielers",
            "definition": "Der Standort eines Spielers ist die Stelle, wo er die Spielfläche berührt (mit Fuß, Knie etc.). In der Luft gilt der letzte Bodenkontakt-Ort. Wichtig für: Ball im Aus, Drei-Punkte-Wurf, Rückfeld-Regel.",
            "articles": [11]
        },
        {
            "term": "Technisches Foul",
            "definition": "Foul ohne illegalen Körperkontakt mit Gegner: Unsportliches Verhalten, Beleidigungen, übermäßiger Protest, Verlassen der Bank ohne Erlaubnis, zu viele Spieler. Strafe: 1 Freiwurf für Gegner + Ballbesitz. Zweites Technisches Foul = Disqualifikation.",
            "articles": [36]
        },
        {
            "term": "Toter Ball",
            "definition": "Der Ball ist tot, wenn: ein Korberfolg erzielt wird, der Schiedsrichter pfeift (Foul, Regelverstoß), eine Zeitauszeit beginnt, der Summer ertönt, oder der Ball beim Freiwurf den Ring nicht berührt und eine weitere Ausführung folgt.",
            "articles": [10]
        },
        {
            "term": "Trainer",
            "definition": "Verantwortliche Person, die die Mannschaft leitet. Hat das Recht, Spielerwechsel und Zeitauszeiten zu beantragen. Darf bei Einsprüchen kurz aufstehen. Der 1. Trainer-Assistent übernimmt nur bei Ausschluss des Trainers.",
            "articles": [7]
        },
        {
            "term": "Unsportliches Foul",
            "definition": "Spielerfoul, bei dem kein legitimer Versuch unternommen wurde, den Ball direkt zu spielen, oder das übermäßig physisch ist (auch außerhalb des normalen Basketballs). Strafe: 2 Freiwürfe + Einwurf. Zweites unsportliches Foul = Disqualifikation.",
            "articles": [37]
        },
        {
            "term": "Verlängerung",
            "definition": "Wenn das Spiel nach der regulären Spielzeit (4 × 10 Minuten) unentschieden steht, werden Verlängerungen von je 5 Minuten gespielt. Spielbeginn der Verlängerung: Einwurf (kein Anwurf). Zeitauszeiten: nicht übertragbar, je 1 neu pro Verlängerung.",
            "articles": [8, 21]
        },
        {
            "term": "Zylinderprinzip",
            "definition": "Grundprinzip des Kontaktrechts: Jeder Spieler hat das Recht auf den Platz (Zylinder), den er auf dem Spielfeld einnimmt. Der Zylinder reicht von Boden bis zur Decke, begrenzt durch ausgestreckte Arme und Beine.",
            "articles": [33]
        },
        {
            "term": "Zeitauszeit",
            "definition": "Spielunterbrechung auf Antrag des Trainers (mit Karte beim Kampfrichtertisch). Erlaubt: 2 im 1./2. Viertel, 3 im 3./4. Viertel je Mannschaft. Dauer: 60 Sekunden. Nur während toten Ball-Situationen gewährbar.",
            "articles": [18]
        },
        {
            "term": "Zone / Freiwurfzone",
            "definition": "Rechteckige Fläche, begrenzt durch Endlinie (6 m breit) und Freiwurflinie. Die Zone ist der Bereich, in dem die 3-Sekunden-Regel für Angreifer gilt und wo Spieler bei Freiwürfen Position nehmen.",
            "articles": [2, 26]
        },
        {
            "term": "Zu früh verlassene Zone (Verstöße beim Freiwurf)",
            "definition": "Spieler dürfen ihre Freiwurfpositionen nicht verlassen, bevor der Ball die Hand des Werfers verlässt. Auch der Werfer darf die Freiwurflinie nicht übertreten. Verschiedene Strafen je nachdem, welche Mannschaft zuerst verstößt.",
            "articles": [43]
        },
    ]
    terms.sort(key=lambda x: x["term"].lower())
    return terms


def main():
    print(f"Opening PDF: {PDF_PATH}")
    doc = fitz.open(PDF_PATH)
    print(f"Pages: {doc.page_count}")

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    os.makedirs(OUTPUT_IMAGES_DIR, exist_ok=True)

    print("\nExtracting articles...")
    articles = extract_articles(doc)
    print(f"Found {len(articles)} articles")

    print("\nExtracting images...")
    images_data = extract_images(doc, OUTPUT_IMAGES_DIR)
    print(f"Extracted {len(images_data)} images")

    print("\nAssigning images to articles...")
    articles, images_data = assign_images_to_articles(articles, images_data)

    print("\nCreating glossary...")
    glossary = create_glossary()
    print(f"Created {len(glossary)} glossary entries")

    output = {
        "meta": {
            "source": "Offizielle Basketball-Regeln 2024 v1.0",
            "publisher": "Deutscher Basketball Bund e. V.",
            "valid_from": "2024-10-01",
            "extracted": "2026-03-17",
            "total_articles": len(articles),
            "total_images": len(images_data),
            "total_glossary_terms": len(glossary)
        },
        "articles": articles,
        "images": images_data,
        "glossary": glossary
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Written to {OUTPUT_JSON}")
    print(f"Images in {OUTPUT_IMAGES_DIR}/")
    print(f"\nSummary:")
    for art in articles:
        img_count = len(art["images"])
        print(f"  Art.{art['number']:2d}: {art['title'][:45]:<45} ({len(art['text'])} chars, {img_count} imgs)")


if __name__ == "__main__":
    main()
