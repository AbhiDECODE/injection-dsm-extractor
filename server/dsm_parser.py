#!/usr/bin/env python3
"""
dsm_parser.py  –  called by Node.js via python-shell
Reads a PDF path from argv[1], extracts all Intra Solar entities,
prints JSON to stdout.
"""
import sys, json, re, gc
import pdfplumber


def get_pdf_text(path):
    out = ""
    with pdfplumber.open(path) as pdf:
        total_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            sys.stderr.write(f"PROGRESS:{i+1}/{total_pages}\n")
            sys.stderr.flush()
            h = float(page.height)
            words = page.extract_words()
            items = [(w["x0"], h - w["top"], w["text"]) for w in words]
            buckets = []
            for x, y, text in items:
                placed = False
                for b in buckets:
                    if abs(b["y"] - y) <= 4:
                        b["items"].append((x, text))
                        placed = True
                        break
                if not placed:
                    buckets.append({"y": y, "items": [(x, text)]})
            buckets.sort(key=lambda b: -b["y"])
            for b in buckets:
                b["items"].sort(key=lambda i: i[0])
                line = " ".join(t for _, t in b["items"]).strip()
                if line:
                    out += line + "\n"
            out += "\f"
            
            # Explicitly release page resources to keep memory flat
            page.flush_cache()
            if i % 5 == 0:
                gc.collect()
    gc.collect()
    return out


def is_table_header(line):
    t = line.strip()
    if re.match(r"^DATE$", t, re.I):
        return True
    return bool(re.search(r"\bDATE\b", t, re.I) and re.search(r"\bDEVIATION\b", t, re.I))


def find_total(lines, start, n):
    for k in range(start, min(start + 25, n)):
        t = lines[k].strip()
        if re.search(r"\bTotal\b", t, re.I):
            nums = re.findall(r"[\d]+\.[\d]+|[\d]+", t)
            if len(nums) >= 7:
                return float(nums[2]), int(nums[6])
    return 0, 0


def split_plant_qca(entity):
    m = re.search(r"\(([^()]+)\)\s*$", entity)
    if m:
        return entity[: entity.rfind("(")].strip(), m.group(1).strip()
    return entity, "N/A"


def parse(text):
    results = []
    wm = re.search(
        r"STATE DEVIATION SETTLEMENT ACCOUNT FOR THE WEEK-(\d+)\s+(.+)", text, re.I
    )
    week_no = (
        "WEEK-{} ({})".format(wm.group(1), wm.group(2).strip()) if wm else "UNKNOWN"
    )
    lines = text.split("\n")
    n = len(lines)
    capture = False
    i = 0

    while i < n:
        line = lines[i].strip()
        if "DEVIATION CHARGES FOR INTRA SOLAR GENERATING STATIONS" in line.upper():
            capture = True
        if "DEVIATION CHARGES FOR HYBRID GENERATING STATIONS" in line.upper():
            capture = False

        if capture:
            # FORMAT B – standalone S-code
            if re.match(r"^S\d+$", line) and i > 0:
                scode = line
                name_line = lines[i - 1].strip()
                cont = []
                j = i + 1
                while j < n and not is_table_header(lines[j].strip()):
                    chunk = lines[j].strip()
                    if re.match(
                        r"^(AVC|SCHEDULE|INJECTION|DRAWAL|DEVIATION|BUT)\b",
                        chunk, re.I,
                    ):
                        j += 1
                        continue
                    if chunk:
                        cont.append(chunk)
                    j += 1
                j += 1  # skip header
                full = (name_line + " " + " ".join(cont)).strip()
                plant, qca = split_plant_qca(full)
                inj, dsm = find_total(lines, j, n)
                if plant:
                    results.append(
                        {
                            "weekNo": week_no,
                            "scode": scode,
                            "plant": plant,
                            "qca": qca,
                            "inj": inj,
                            "dsm": dsm,
                        }
                    )
                i = j
                continue

            # FORMAT A – inline S-code
            m = re.match(r"^(S\d+)\s+(.+)", line)
            if m:
                scode, rest = m.group(1), m.group(2).strip()
                cont = []
                j = i + 1
                while j < n and not is_table_header(lines[j].strip()):
                    chunk = lines[j].strip()
                    if re.match(r"^S\d+\s", chunk):
                        break
                    if re.match(
                        r"^(AVC|SCHEDULE|INJECTION|DRAWAL|DEVIATION|BUT|\d{1,2}-[A-Za-z]+-\d{2})\b",
                        chunk, re.I,
                    ):
                        break
                    if re.search(r"\bTotal\b", chunk, re.I) and re.search(r"\d", chunk):
                        break
                    if chunk:
                        cont.append(chunk)
                    j += 1
                j += 1  # skip header
                full = (rest + " " + " ".join(cont)).strip()
                plant, qca = split_plant_qca(full)
                inj, dsm = find_total(lines, j, n)
                if plant:
                    results.append(
                        {
                            "weekNo": week_no,
                            "scode": scode,
                            "plant": plant,
                            "qca": qca,
                            "inj": inj,
                            "dsm": dsm,
                        }
                    )
                i = j
                continue
        i += 1
    return results


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    try:
        text = get_pdf_text(pdf_path)
        data = parse(text)
        print(json.dumps({"ok": True, "data": data}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
