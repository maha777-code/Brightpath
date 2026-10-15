import zipfile

rows = [
    ["Student Name", "Email", "Class", "Board", "Language"],
    ["Meera Iyer", "meera.roster@example.test", "Class 9", "CBSE", "Tamil"],
    ["Kabir Shah", "kabir.roster@example.test", "Class 9", "CBSE", "English"],
    ["Bad Row", "not-an-email", "", "", ""],
]


def col(i):
    return chr(ord("A") + i)


sheet_rows = []
for r, row in enumerate(rows, start=1):
    cells = "".join(
        f'<c r="{col(c)}{r}" t="inlineStr"><is><t>{v}</t></is></c>' for c, v in enumerate(row) if v
    )
    sheet_rows.append(f'<row r="{r}">{cells}</row>')

files = {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Roster" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    + "".join(sheet_rows)
    + "</sheetData></worksheet>",
}

with zipfile.ZipFile("/home/mahalakshmi/Brightpath/apps/web/public/tmp-roster.xlsx", "w") as z:
    for name, data in files.items():
        z.writestr(name, data)
print("xlsx written")
