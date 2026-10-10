from pathlib import Path
import re


def _blocks(text, pattern):
    matches = list(re.finditer(pattern, text, re.M))
    result = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        result[match.group(1)] = text[match.start():end].strip()
    return result


def _demote(block):
    """Place a chapter below a part without changing its stable label."""
    return re.sub(r'^(#{2,4})(?= )', lambda match: '#' + match.group(1), block, flags=re.M)


PARTS = {
    'I': (
        'HDLとFPGAによるデジタル回路設計',
        'SystemVerilogの記述を回路として読み、LUT、FF、BRAM、DSPへの合成、timing、clock、reset、CDC、検証までを一つの設計活動として扱う。WallyやRasterIXに依存しない原理と、固定版ソースで確認できる具体例を対応付ける。',
    ),
    'II': (
        'Wally CPUとSoCアーキテクチャ',
        'RISC-Vのsoftware-visibleな仕様から、Wallyの構成parameter、五段pipeline、hazard、cache、MMU、privileged unit、uncore、bus、検証へ降りる。Wallyへ機能を追加するときに、変更場所と影響範囲を判断できることを目標とする。',
    ),
    'III': (
        'Linuxとシステムソフトウェア',
        '開発用PCでのcross buildから、ZSBL、OpenSBI、Linux kernel、BusyBox、device tree、仮想memory、MMIO、C++ゲームプログラムまでを追う。hardwareの存在をsoftwareへ伝え、user processから安全に操作し、問題を層ごとに診断する。',
    ),
    'IV': (
        'RasterIXと描画システム',
        'OpenGL風APIから命令列、転送protocol、RTL pipeline、rasterization、texture、depth、blend、framebuffer、映像出力までを追う。Wallyとの接続に必要な境界と、公式RasterIX内部の動作を区別して扱う。',
    ),
    'V': (
        'Nexys Videoへの統合、実験、再現',
        'Nexys Video対応、WallyとRasterIXの結合、Linux image、SDカード、実機試験、測定記録を、固定commitとfileへ対応付ける。前四部の知識を本研究の具体的な変更へ戻し、同じ構成を作り直せる形にする。',
    ),
}


def _part(number):
    title, intro = PARTS[number]
    return f'## 第{number}部 {title}\n\n{intro}'


def assemble_technical_appendix(root):
    root = Path(root)
    base = (root / '技術付録.md').read_text(encoding='utf-8')
    first_appendix = re.search(r'^## 付録A ', base, re.M)
    references = re.search(r'^## 参考文献と実験記録', base, re.M)
    if not first_appendix or not references:
        raise ValueError('technical appendix markers are missing')

    preface = base[:first_appendix.start()].rstrip()
    base_chapters = _blocks(base[first_appendix.start():references.start()], r'^## 付録([A-M]) .*$')
    reference_block = base[references.start():].strip()

    developer = (root / 'wally-developer-guide.md').read_text(encoding='utf-8')
    developer_chapters = _blocks(developer, r'^## 第(\d+)章 .*$')

    wally_path = root / 'wally-internals.md'
    wally_chapters = _blocks(wally_path.read_text(encoding='utf-8'), r'^## 第(\d+)章 .*$') if wally_path.exists() else {}

    linux_path = root / 'linux-software-guide.md'
    linux_chapters = _blocks(linux_path.read_text(encoding='utf-8'), r'^## 第(\d+)章 .*$') if linux_path.exists() else {}

    rasterix = (root / 'rasterix-internals.md').read_text(encoding='utf-8')
    rasterix += '\n\n' + (root / 'rasterix-mathematics.md').read_text(encoding='utf-8')
    rasterix_chapters = _blocks(rasterix, r'^## 付録([N-Z]) .*$')

    expected_base = set('ABCDEFGHIJKLM')
    expected_rix = set('NOPQRSTUVWXYZ')
    if set(base_chapters) != expected_base:
        raise ValueError(f'base appendix mismatch: {sorted(set(base_chapters) ^ expected_base)}')
    if set(rasterix_chapters) != expected_rix:
        raise ValueError(f'RasterIX appendix mismatch: {sorted(set(rasterix_chapters) ^ expected_rix)}')
    if set(developer_chapters) != {str(i) for i in range(1, 13)}:
        raise ValueError('developer chapters 1 through 12 are required')

    pieces = [preface]
    pieces.append(_part('I'))
    pieces.extend(_demote(developer_chapters[str(i)]) for i in range(1, 9))
    pieces.append(_demote(base_chapters['K']))

    pieces.append(_part('II'))
    pieces.extend(_demote(developer_chapters[str(i)]) for i in range(9, 13))
    pieces.extend(_demote(wally_chapters[str(i)]) for i in sorted(map(int, wally_chapters)))

    pieces.append(_part('III'))
    pieces.extend(_demote(linux_chapters[str(i)]) for i in sorted(map(int, linux_chapters)))

    pieces.append(_part('IV'))
    for label in ['B', 'G', 'H', 'I', 'J']:
        pieces.append(_demote(base_chapters[label]))
    pieces.extend(_demote(rasterix_chapters[label]) for label in 'NOPQRSTUVWXYZ')

    pieces.append(_part('V'))
    for label in ['A', 'C', 'D', 'E', 'F', 'L', 'M']:
        pieces.append(_demote(base_chapters[label]))

    pieces.append(_demote((root / 'fifo-experiment-guide.md').read_text(encoding='utf-8')))
    pieces.append(_demote((root / 'transport-experiment-guide.md').read_text(encoding='utf-8')))

    pieces.append(reference_block)
    return '\n\n'.join(pieces) + '\n'
