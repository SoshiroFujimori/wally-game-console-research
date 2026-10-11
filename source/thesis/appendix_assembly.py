"""Assemble one topic-organized book for Word and chapter-sized Markdown."""
from functools import lru_cache
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
PARTS = {
    'I': ('HDLとFPGAによるデジタル回路設計',
          '論理ゲートを組み合わせた回路が、SystemVerilogの記述とどう対応するかを扱う。値を保存する場所、クロック、信号の遅れ、合成された回路、検証を相互に結び付ける。'),
    'II': ('Wally CPUとSoCアーキテクチャ',
           'プログラムの一つの命令を出発点に、Wally内部の計算、メモリへのアクセス、周辺回路への通信を追う。設定値や回路を変更したとき、どの処理へ影響するかを調べる。'),
    'III': ('Linuxとシステムソフトウェア',
            '開発用PCで作ったプログラムが、SDカードから起動したLinux上で動き、回路を操作するまでを扱う。コンパイラ、起動処理、番地の変換、MMIO、ゲームの処理をつなぐ。'),
    'IV': ('RasterIXと描画システム',
           'ゲームが指定した四角形から、描画命令、画素の計算、画像の保存、映像出力までを追う。CPU上のライブラリとFPGA内の回路が分担する仕事を、数値例とソースで確かめる。'),
    'V': ('Nexys Videoへの統合と実験と再現',
          '個別の回路とプログラムを一台のゲーム機へ組み立てる方法を扱う。変更したファイル、動作を確認する手順、測定した条件と結果、再現に必要な版を対応付ける。'),
}

@lru_cache(maxsize=1)
def catalog():
    records = json.loads((ROOT / 'appendix/chapters.json').read_text(encoding='utf-8'))['chapters']
    if [r['number'] for r in records] != list(range(1, len(records) + 1)):
        raise ValueError('Chapter numbers must be consecutive')
    if len({r['path'] for r in records}) != len(records):
        raise ValueError('Duplicate chapter source path')
    return records

@lru_cache(maxsize=1)
def heading_anchors():
    result = {}
    for r in catalog():
        result.update(r.get('headings', {}))
        result[f'第{r["number"]}章 {r["title"]}'] = r['anchor']
    return result

def appendix_anchor(number, section=None):
    record = next((r for r in catalog() if r['number'] == int(number)), None)
    if record is None:
        return None
    return record['anchor'] if section is None else record['sections'].get(str(section))

def heading_anchor(title):
    """Keep stable bookmarks while changing visible chapter numbering."""
    if title in heading_anchors():
        return heading_anchors()[title]
    match = re.match(r'^(\d+)\.(\d+) ', title)
    return appendix_anchor(*match.groups()) if match else None

def assemble_technical_appendix(root):
    root = Path(root)
    pieces = [(root / '技術付録.md').read_text(encoding='utf-8').rstrip()]
    for part, (title, introduction) in PARTS.items():
        pieces.append(f'## 第{part}部 {title}\n\n{introduction}')
        for record in (r for r in catalog() if r['part'] == part):
            block = (root / record['path']).read_text(encoding='utf-8').strip()
            expected = f'## 第{record["number"]}章 {record["title"]}'
            if not block.startswith(expected + '\n'):
                raise ValueError(f'Chapter heading does not match catalog: {record["path"]}')
            pieces.append(re.sub(r'^(#{2,4})(?= )', lambda m: '#' + m[1], block, flags=re.M))
    pieces.append((root / 'appendix/references.md').read_text(encoding='utf-8').strip())
    return '\n\n'.join(pieces) + '\n'
