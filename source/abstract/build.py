#!/usr/bin/env python3
"""Update abstract text in a retained template, then produce a public copy."""
import argparse
from copy import deepcopy
import io
import json
from pathlib import Path
import sys
import zipfile
from docx import Document
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/publication'))
from sanitize import load_config, sanitize_docx

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--template', type=Path, required=True)
p.add_argument('--config', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
config = load_config(a.config)
content = json.loads(Path(__file__).with_name('content.json').read_text(encoding='utf-8'))
doc = Document(io.BytesIO(sanitize_docx(a.template.read_bytes(), config)))

def replace(paragraph, value):
    properties = next((deepcopy(r._r.rPr) for r in paragraph.runs if r._r.rPr is not None), None)
    paragraph.clear()
    run = paragraph.add_run(value)
    if properties is not None:
        run._r.insert(0, properties)

blocks = {}
current = None
for paragraph in doc.paragraphs:
    if paragraph.style.name == 'Title':
        replace(paragraph, content['title'])
    elif paragraph.style.name == 'Subtitle':
        # Public documents intentionally omit the private identity block.
        paragraph.clear()
    elif paragraph.style.name == 'Heading 1':
        current = paragraph.text
        blocks[current] = []
    elif current and paragraph.text and not paragraph.text.startswith(('図1', '図2')):
        blocks[current].append(paragraph)

for heading, paragraphs in content['sections'].items():
    assert len(blocks[heading]) == len(paragraphs), heading
    for old, new in zip(blocks[heading], paragraphs):
        replace(old, new)
assert len(blocks['参考文献']) == len(content['references'])
for old, new in zip(blocks['参考文献'], content['references']):
    replace(old, new)
stream = io.BytesIO()
doc.save(stream)
public = sanitize_docx(stream.getvalue(), config)
a.output.mkdir(parents=True, exist_ok=True)
(a.output / 'アブスト_主要事項.docx').write_bytes(public)

figure_links = []
with zipfile.ZipFile(io.BytesIO(public)) as package:
    for index, name in enumerate(n for n in package.namelist() if n.startswith('word/media/')):
        assert name.endswith('.png')
        image = a.output / 'figs' / f'figure-{index + 1}.png'
        image.parent.mkdir(exist_ok=True)
        image.write_bytes(package.read(name))
        figure_links.append(f'![図{index + 1}](figs/{image.name})')
md = ['# ' + content['title']]
for heading, paragraphs in content['sections'].items():
    md.append('## ' + heading)
    md.extend(paragraphs)
    if heading.startswith('2 '):
        md.extend(figure_links)
md.append('## 参考文献')
md.extend(content['references'])
md.append('測定条件と詳しい結果は[論文本文](../thesis/本文.md#1310-命令接続方式の比較方法)に示す．')
(a.output / 'アブスト_主要事項.md').write_text('\n\n'.join(md) + '\n', encoding='utf-8')
print(json.dumps({'sections': len(content['sections']), 'figures': len(figure_links)}))
