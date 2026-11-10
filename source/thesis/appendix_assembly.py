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
           'ゲームが指定した四角形から、描画命令、画素の計算、画像の保存、映像出力までを追う。CPU上のライブラリとFPGA内の回路が分担する仕事を、数値例とソースで確かめる。\n\nグラフィックの用語を確認する入口は37.16〜37.18節である。次の表から、知りたい処理へ直接進める。\n\n| 知りたいこと | 読む範囲 | 具体的に追う内容 |\n|---|---|---|\n| 画面は何から作るか | [37.16〜37.19節](appendix/04-rasterix/walkthrough.md#s_graphics_37_16) | 画素・図形・文字と、CPUと回路の分担 |\n| OpenGL関数の中で何が起きるか | [38.14〜38.18節](appendix/04-rasterix/commands.md#s_graphics_38_14) | コンパイル、頂点に設定を保存する処理、VBOとシェーダー |\n| なぜ頂点だけで面を塗れるか | [第39章](appendix/04-rasterix/rasterization.md#ch_g_rasterization) | 座標、三角形の内外判定、補間、画素の境界 |\n| 文字をどう画像として貼るか | [52.16〜52.21節](appendix/04-rasterix/textures-pixel-pipeline.md#s_app_52_16) | フォント画像、uとv、拡大縮小、画像の保存形式 |\n| 透明な文字の背景が残る理由 | [53.15〜53.19節](appendix/04-rasterix/fragment-tests-blending.md#s_graphics_53_15) | alphaの計算、重なり順、深度、マスク、色の数値 |\n| 描いた画像はいつ画面に出るか | [40.23〜40.26節](appendix/04-rasterix/framebuffer-display.md#s_graphics_40_23) | 命令送信・描画・表示の完了、メモリ容量、FPSとHz |\n\n一般的な描画の原理と、本構成で有効にした機能を対応させて説明する。使用版は37章の冒頭に示し、実際のソースへリンクする。小さな数値例は手計算の確認に使い、実機の測定結果は実験記録から読む。\n'),
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
    result = dict(json.loads((ROOT / 'appendix/chapters.json').read_text(encoding='utf-8')).get('headings', {}))
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
