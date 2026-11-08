#!/usr/bin/env python3
"""Build the public abstract while retaining the template's page and text styles."""
import argparse
from copy import deepcopy
import io
import json
from pathlib import Path
import re
import sys

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/publication"))
from sanitize import load_config, sanitize_docx

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--template", type=Path, required=True)
p.add_argument("--config", type=Path, required=True)
p.add_argument("--output", type=Path, required=True)
p.add_argument("--content", type=Path, default=Path(__file__).with_name("content.json"))
a = p.parse_args()
config = load_config(a.config)
content = json.loads(a.content.read_text(encoding="utf-8"))
doc = Document(io.BytesIO(sanitize_docx(a.template.read_bytes(), config)))
doc.core_properties.title = content["title"]


def replace(paragraph, value):
    properties = next((deepcopy(r._r.rPr) for r in paragraph.runs if r._r.rPr is not None), None)
    paragraph.clear()
    run = paragraph.add_run(value)
    if properties is not None:
        run._r.insert(0, properties)


def align_within_column(paragraph, alignment):
    """Set alignment without retaining character-based template indents."""
    paragraph.alignment = alignment
    indent = paragraph._p.get_or_add_pPr().find(qn("w:ind"))
    if indent is not None:
        indent.getparent().remove(indent)
    paragraph.paragraph_format.first_line_indent = Mm(0)
    paragraph.paragraph_format.left_indent = Mm(0)
    paragraph.paragraph_format.right_indent = Mm(0)
    indent = paragraph._p.get_or_add_pPr().find(qn("w:ind"))
    for name in ("firstLineChars", "leftChars", "rightChars"):
        indent.set(qn("w:" + name), "0")


def add_code_text(paragraph, source):
    """Add editable C tokens with restrained, print-readable syntax colors."""
    tokens = re.compile(
        r'(?P<comment>//[^\n]*|/\*[\s\S]*?\*/)'
        r'|(?P<string>"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')'
        r'|(?P<number>\b(?:0[xX][0-9a-fA-F]+|[0-9]+)\b)'
        r'|(?P<word>\b[A-Za-z_][A-Za-z_0-9]*\b)'
    )
    keywords = {'for', 'while', 'if', 'else', 'return', 'int', 'void',
                'char', 'const', 'unsigned', 'uint8_t', 'uint32_t'}
    colors = {'comment': '4D5F66', 'string': '6F3B63',
              'number': '6F3B63', 'keyword': '005A88', 'text': '000000'}
    spans = []

    def append(value, kind):
        if not value:
            return
        color = colors[kind]
        if spans and spans[-1][1] == color:
            spans[-1] = (spans[-1][0] + value, color)
        else:
            spans.append((value, color))

    end = 0
    for match in tokens.finditer(source):
        append(source[end:match.start()], 'text')
        kind = match.lastgroup
        if kind == 'word':
            kind = 'keyword' if match.group() in keywords else 'text'
        append(match.group(), kind)
        end = match.end()
    append(source[end:], 'text')
    for value, color in spans:
        run = paragraph.add_run(value)
        run.font.name = 'Consolas'
        run._r.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), 'MS Gothic')
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor.from_string(color)


# Retain the title, page geometry, columns, figure style, and section styles.
figure_template = deepcopy(next(p._p for p in doc.paragraphs if p._p.findall(".//" + qn("w:drawing"))))
caption_template = deepcopy(next(p._p for p in doc.paragraphs if p.text.startswith("図1")))
original_images = {b.get(qn("r:embed")) for b in doc.element.findall(".//" + qn("a:blip"))}
for paragraph in list(doc.paragraphs):
    if paragraph.style.name == "Title":
        replace(paragraph, content["title"])
        paragraph.paragraph_format.line_spacing = Pt(22)
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(6)
    elif paragraph.style.name == "Subtitle":
        paragraph._p.getparent().remove(paragraph._p)

sections = {**content["sections"], "参考文献": content["references"]}
headings = {p.text: p for p in doc.paragraphs if p.style.name == "Heading 1"}
assert set(sections) == set(headings), "Template section headings must match content.json"
# Let revised paragraphs flow across columns instead of retaining a manual
# column break placed for the previous text.
for heading in headings.values():
    for br in heading._p.findall(".//" + qn("w:br")):
        if br.get(qn("w:type")) == "column":
            br.getparent().remove(br)
figures = content["figures"]
code_examples = content.get("code_examples", [])
for figure in figures:
    assert figure["section"] in content["sections"]
    assert 1 <= figure["after_paragraph"] <= len(content["sections"][figure["section"]])

for example in code_examples:
    assert example["section"] in content["sections"]
    assert 1 <= example["after_paragraph"] <= len(content["sections"][example["section"]])

for heading, paragraphs in sections.items():
    first = headings[heading]._p
    nodes = []
    node = first.getnext()
    while node is not None and node.tag != qn("w:sectPr"):
        assert node.tag == qn("w:p"), "Unsupported template block"
        wrapper = Paragraph(node, doc._body)
        if wrapper.style.name == "Heading 1":
            break
        nodes.append(node)
        node = node.getnext()
    seed = deepcopy(next(n for n in nodes if Paragraph(n, doc._body).text
                         and not Paragraph(n, doc._body).text.startswith(("図1", "図2"))))
    for node in nodes:
        node.getparent().remove(node)
    anchor = first
    for index, value in enumerate(paragraphs, 1):
        node = deepcopy(seed)
        anchor.addnext(node)
        paragraph = Paragraph(node, doc._body)
        replace(paragraph, value)
        # Retain the one-page, two-column layout with the expanded explanation.
        for run in paragraph.runs:
            run.font.size = Pt(10.5)
        paragraph.paragraph_format.line_spacing = Pt(content.get("body_line_spacing_pt", 14))
        # Allow body paragraphs to continue in the next column without gaps.
        paragraph.paragraph_format.keep_together = False
        anchor = node
        for number, figure in enumerate(figures, 1):
            if figure["section"] != heading or figure["after_paragraph"] != index:
                continue
            source = (ROOT / figure["source"]).resolve()
            assert source.is_relative_to(ROOT) and source.suffix == ".png"
            picture_node = deepcopy(figure_template)
            anchor.addnext(picture_node)
            picture = Paragraph(picture_node, doc._body)
            picture.clear()
            alignment = (WD_ALIGN_PARAGRAPH.LEFT if figure.get("align") == "left"
                         else WD_ALIGN_PARAGRAPH.CENTER)
            align_within_column(picture, alignment)
            picture.paragraph_format.keep_with_next = True
            shape = picture.add_run().add_picture(str(source), width=Mm(figure.get("width_mm", 83)))
            # Explicitly disable image spacing: some readers otherwise add
            # side margins that make an inline figure exceed the column.
            for edge in ("distT", "distB", "distL", "distR"):
                shape._inline.set(edge, "0")
            shape._inline.docPr.set("descr", figure["alt"])
            caption_node = deepcopy(caption_template)
            picture_node.addnext(caption_node)
            caption = Paragraph(caption_node, doc._body)
            caption.clear()
            align_within_column(caption, WD_ALIGN_PARAGRAPH.CENTER)
            caption.paragraph_format.keep_with_next = False
            label, title = figure["caption"].split("  ", 1)
            run = caption.add_run(label + "  ")
            run.bold = True
            run.font.color.rgb = RGBColor(0, 0, 0)
            run = caption.add_run(title)
            run.bold = True
            run.font.color.rgb = RGBColor(0, 0, 0)
            anchor = caption_node
        for example in code_examples:
            if example["section"] != heading or example["after_paragraph"] != index:
                continue
            code_node = deepcopy(seed)
            anchor.addnext(code_node)
            code = Paragraph(code_node, doc._body)
            code.clear()
            align_within_column(code, WD_ALIGN_PARAGRAPH.LEFT)
            pf = code.paragraph_format
            pf.space_before = Pt(3)
            pf.space_after = Pt(3)
            pf.line_spacing = Pt(12)
            pf.keep_together = True
            pf.keep_with_next = bool(example.get("caption"))
            # RVSOC-style code panel: a pale fill and horizontal rules.
            # Dark syntax colors stay legible on monochrome prints.
            properties = code._p.get_or_add_pPr()
            for tag in ("shd", "pBdr"):
                old = properties.find(qn("w:" + tag))
                if old is not None:
                    properties.remove(old)
            borders = OxmlElement("w:pBdr")
            for edge in ("top", "bottom"):
                border = OxmlElement("w:" + edge)
                for key, value in {"val": "single", "sz": "4", "space": "2", "color": "000000"}.items():
                    border.set(qn("w:" + key), value)
                borders.append(border)
            properties.append(borders)
            shade = OxmlElement("w:shd")
            shade.set(qn("w:val"), "clear")
            shade.set(qn("w:fill"), "EEF0FC")
            properties.append(shade)
            add_code_text(code, "\n".join(example["lines"]))
            anchor = code_node
            if example.get("caption"):
                caption_node = deepcopy(caption_template)
                anchor.addnext(caption_node)
                caption = Paragraph(caption_node, doc._body)
                caption.clear()
                align_within_column(caption, WD_ALIGN_PARAGRAPH.CENTER)
                caption.paragraph_format.keep_with_next = False
                caption.paragraph_format.space_before = Pt(0)
                caption.paragraph_format.space_after = Pt(3)
                run = caption.add_run(example["caption"])
                run.bold = True
                run.font.color.rgb = RGBColor(0, 0, 0)
                anchor = caption_node

# Discard obsolete embedded images from the retained template.
used_images = {b.get(qn("r:embed")) for b in doc.element.findall(".//" + qn("a:blip"))}
for relationship in original_images - used_images:
    doc.part.drop_rel(relationship)
# Use the explicit paragraph line spacing throughout the one-page abstract.
for grid in doc.element.findall(".//" + qn("w:docGrid")):
    grid.getparent().remove(grid)
stream = io.BytesIO()
doc.save(stream)
public = sanitize_docx(stream.getvalue(), config)
a.output.mkdir(parents=True, exist_ok=True)
(a.output / "アブスト_主要事項.docx").write_bytes(public)

md = ["# " + content["title"]]
if content.get("draft_notice"):
    md.append(content["draft_notice"])
for heading, paragraphs in content["sections"].items():
    md.append("## " + heading)
    for index, value in enumerate(paragraphs, 1):
        md.append(value)
        for number, figure in enumerate(figures, 1):
            if figure["section"] == heading and figure["after_paragraph"] == index:
                image = a.output / "figs" / f"figure-{number}.png"
                image.parent.mkdir(exist_ok=True)
                image.write_bytes((ROOT / figure["source"]).read_bytes())
                md.append(f"![{figure['alt']}](figs/{image.name})")
                md.append(figure["caption"])
        for example in code_examples:
            if example["section"] == heading and example["after_paragraph"] == index:
                md.append("```" + example.get("language", "text") + "\n" +
                          "\n".join(example["lines"]) + "\n```")
                if example.get("caption"):
                    md.append(example["caption"])
if "markdown_notes" in content:
    md.extend(content["markdown_notes"])
else:
    md.append("図2の出典は[実機映像の記録](../../experiments/breakout-title-top-20261108/README.md)であり，[30秒の動画](../../experiments/breakout-title-top-20261108/video/breakout-30s.mp4)も公開している．本文に示した3回の起動・動作確認の条件と結果は，[動作確認記録](../../experiments/basic-operation-20261108/README.md)を参照できる．")
    md.append("図1では，公式RasterIXの描画回路と表示回路を分けて示す．実機映像の表示回路は，研究用の画像読出し回路とhdl-util/hdmiを用いた[実験E8の構成](../../experiments/basic-operation-20261108/hdmi/README.md)である．製品既定のDVI構成との対応は[構成比較と実機記録](../../experiments/dvi-standard-check-20261108/README.md)を参照できる．DDRコントローラーはAMD製IPで，生成・接続設定をWally側のリポジトリに収めている．回路の入手元と実装箇所は[構成要素の出典](../../source/presentation/board-evolution/README.md)にまとめた．")
md.append("## 参考文献")
md.extend(content["references"])
md.append(content.get("markdown_footer", "命令の接続設計は[論文第6章](../thesis/本文.md#ch_6)，実機で確認した条件と結果は[第12章](../thesis/本文.md#ch_12)に示す．詳しい実装は[技術付録](../thesis/技術付録.md)から参照できる．"))
(a.output / "アブスト_主要事項.md").write_bytes(("\n\n".join(md) + "\n").encode("utf-8"))
print(json.dumps({"sections": len(content["sections"]), "figures": len(figures)}))
