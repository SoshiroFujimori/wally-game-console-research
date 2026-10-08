#!/usr/bin/env python3
"""Generate editable SVG figures for the technical companion (stdlib only)."""

from html import escape
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'technical' / 'figs'
INK = '#231F20'
BLUE = '#1673C3'
LIGHT = '#E5EBF8'
MID = '#CCD9F1'
CHECK = False


class Figure:
    def __init__(self, title, description, height=650):
        self.height = height
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" '
            f'viewBox="0 0 1200 {height}" role="img" aria-labelledby="title desc">',
            f'<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>',
            '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" '
            'markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
            f'<path d="M 0 0 L 10 5 L 0 10 z" fill="{BLUE}"/></marker></defs>',
            '<rect width="1200" height="100%" fill="white"/>',
            '<g font-family="Noto Sans CJK JP,Noto Sans JP,Meiryo,Yu Gothic,sans-serif" '
            f'fill="{INK}">',
        ]
        self.text(40, 48, title, 29, weight='bold')

    def text(self, x, y, value, size=24, anchor='start', weight='normal'):
        lines = value if isinstance(value, list) else [value]
        for i, line in enumerate(lines):
            self.parts.append(f'<text x="{x}" y="{y + i * (size + 9)}" font-size="{size}" '
                              f'text-anchor="{anchor}" font-weight="{weight}">{escape(str(line))}</text>')

    def rect(self, x, y, w, h, fill=LIGHT, stroke=INK, dash=''):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" '
                          f'stroke="{stroke}" stroke-width="2" stroke-dasharray="{dash}"/>')

    def box(self, x, y, w, h, label, fill=LIGHT, size=24):
        self.rect(x, y, w, h, fill)
        lines = label if isinstance(label, list) else [label]
        first = y + h / 2 - (len(lines) - 1) * (size + 9) / 2 + size * .35
        self.text(x + w / 2, first, lines, size, anchor='middle')

    def line(self, points, arrow=False, dash='', color=BLUE, width=3):
        vertices = ' '.join(f'{x},{y}' for x, y in points)
        marker = ' marker-end="url(#arrow)"' if arrow else ''
        self.parts.append(f'<polyline points="{vertices}" fill="none" stroke="{color}" '
                          f'stroke-width="{width}" stroke-dasharray="{dash}"{marker}/>')

    def dot(self, x, y, radius=4, color=BLUE):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{color}"/>')

    def save(self, name, footnote):
        self.text(40, self.height - 24, footnote, 19)
        self.parts.extend(['</g>', '</svg>'])
        target = OUT / name
        rendered = '\n'.join(self.parts) + '\n'
        if CHECK:
            if not target.exists() or target.read_text(encoding='utf-8') != rendered:
                raise SystemExit(f'Stale figure: {name}; run tools/docs/figures.py')
        else:
            target.write_text(rendered, encoding='utf-8')


def generate():
    OUT.mkdir(parents=True, exist_ok=True)
    f = Figure('保存された現在値から、次に保存する値を作る', '9ビットの位置レジスタの出力100を加算器へ送り、3を加えた103を次の立ち上がりで保存する。')
    f.box(80, 150, 270, 140, ['位置レジスタ', '現在値 x = 100'])
    f.box(500, 150, 200, 140, ['加算器', 'x + 3'])
    f.box(840, 150, 280, 140, ['次の値 = 103', 'まだ保存前'])
    f.line([(350, 220), (500, 220)], True)
    f.line([(700, 220), (840, 220)], True)
    f.line([(980, 290), (980, 390), (215, 390), (215, 290)], True)
    f.text(600, 370, '次のクロックの立ち上がりで保存', 24, 'middle')
    f.text(70, 465, ['保存前：x は100のまま。加算器の出力は103になる。',
                    '保存後：x が103になり、加算器は次の106を計算する。',
                    '100 → 103 → 106 は、異なる保存時点の値。'])
    f.save('register-loop.svg', '説明用の加算回路。enable・resetと実際の配線遅延は図から省略。')

    f = Figure('次の保存時点までに信号が間に合うか', '出力遅延2ns、論理と配線11ns、セットアップ2nsの合計15nsを説明する。')
    for i, (x, w, label) in enumerate([(130, 90, ['出力', '2 ns']), (220, 495, ['論理と配線', '11 ns']), (715, 90, ['準備', '2 ns'])]):
        f.box(x, 160, w, 130, label, [LIGHT, MID, LIGHT][i], size=21)
    f.line([(130, 330), (1030, 330)], True)
    for value in [0, 2, 10, 13, 15, 20]:
        x = 130 + 45 * value
        f.line([(x, 320), (x, 345)], color=INK, width=2)
        f.text(x, 378, str(value), 21, 'middle')
    f.text(1060, 338, 'ns', 22)
    f.line([(580, 125), (580, 312)], dash='8 6')
    f.text(580, 103, '100 MHzでは次の立ち上がりが10 ns後', 23, 'middle')
    f.text(70, 445, ['合計15 ns：10 ns周期には収まらない。',
                    '20 MHzなら50 ns周期なので、この例の15 nsは収まる。',
                    '実際はクロックの到着差・不確かさ・ホールド条件も調べる。'])
    f.save('timing-budget.svg', '数値は説明用。特定のWally経路を測定した図ではない。')

    f = Figure('回路の準備とソフトウェアの起動は別の段階', 'クロック、DDR、CPU、起動ソフトウェア、Linux、ゲームという依存関係を示す。')
    top = ['基板のクロック', 'クロック生成が安定', 'DDR3の準備が完了']
    bottom = ['CPUが起動処理を開始', 'Linuxが動作', '描画プログラムが動作']
    for labels, y in [(top, 140), (bottom, 365)]:
        for i, label in enumerate(labels):
            x = 40 + i * 400
            f.box(x, y, 320, 110, label, size=23)
            if i < 2:
                f.line([(x + 320, y + 55), (x + 400, y + 55)], True)
    f.line([(1000, 250), (1000, 305), (200, 305), (200, 365)], True)
    f.text(600, 555, '前段の成功だけでは、後段の成功まで確認したことにならない。', 24, 'middle')
    f.save('startup-chain.svg', '依存関係の概略。CPUリセット解除などの正確な条件は各実装を確認する。')

    f = Figure('同じ経路の前半はAPB、後半はAXI4-Stream', 'CPUの番地付き書込みがAPB変換回路とCDCを通り、値と区切りのストリームとしてRasterIXへ届く。')
    blocks = [(40, 200, ['CPU / バス', '番地へ書く']), (330, 235, ['APB変換', '番地から区切りへ']),
              (655, 205, ['クロック境界', 'FIFO等']), (950, 210, ['RasterIX', '命令を受理'])]
    for x, w, label in blocks:
        f.box(x, 200, w, 130, label, size=22)
    for a, b, label in [(240, 330, 'APB'), (565, 655, 'Stream'), (860, 950, 'Stream')]:
        f.line([(a, 248), (b, 248)], True)
        f.text((a + b) / 2, 177, label, 20, 'middle')
        f.line([(b, 300), (a, 300)], True)
    f.text(310, 380, 'CPU側クロック：20 MHz', 23, 'middle')
    f.text(960, 380, '描画側：100 MHz', 23, 'middle')
    f.text(60, 450, ['右向きの矢印：値を渡す方向',
                   '左向きの矢印：受取り可能かを返す方向',
                   'FIFOが満杯なら、入口のreadyを通じてAPBも待つ。'])
    f.save('apb-stream.svg', '概念図。幅・番地・リセットを含む実装はrasterix_apb.svと生成IPを参照。')

    f = Figure('一語を保持して要求と確認を往復させる', '上から下へ時間が進む。データAを固定し、要求1、確認1、要求0、確認0を順に渡す。', 800)
    f.text(250, 100, 'CPU側', 25, 'middle')
    f.text(940, 100, 'RasterIX側', 25, 'middle')
    f.line([(250, 125), (250, 675)], color=INK, width=2)
    f.line([(940, 125), (940, 675)], color=INK, width=2)
    f.line([(70, 150), (70, 675)], True)
    f.text(42, 122, '時間', 21)
    f.box(120, 158, 95, 515, ['Aを', '保持'], size=21)
    steps = [(205, 255, '要求を1：Aを用意した', True), (330, 380, '確認を1：Aが受理された', False),
             (460, 510, '要求を0へ戻す', True), (580, 630, '確認を0へ戻す', False)]
    for a, b, label, forward in steps:
        f.line([(250 if forward else 940, a), (940 if forward else 250, b)], True)
        f.text(585, a - 15, label, 23, 'middle')
    f.text(968, 284, ['受信側へ', '値を写す'], 20)
    f.text(270, 410, 'APB書込みの完了を返す', 22)
    f.text(275, 692, '次の語へ進める', 23)
    f.save('mailbox-sequence.svg', '説明用の時系列。同期の段数や待ち時間は縮尺で表していない。')

    f = Figure('異なる命令の処理を五段で重ねる', '独立な四命令がF、D、E、M、Wの五段を一周期ずつ進む理想例。', 660)
    stages = ['F', 'D', 'E', 'M', 'W']
    for cycle in range(8):
        f.text(215 + cycle * 120, 115, str(cycle + 1), 24, 'middle')
    f.text(40, 115, '周期', 24)
    for instruction in range(4):
        y = 145 + instruction * 80
        f.text(40, y + 44, f'命令{instruction + 1}', 24)
        for cycle in range(8):
            value = stages[cycle - instruction] if 0 <= cycle - instruction < 5 else ''
            f.box(160 + cycle * 120, y, 110, 60, value, LIGHT if value else 'white')
    f.text(50, 520, ['F：命令取得　D：解読　E：実行　M：メモリアクセス　W：結果の保存',
                   '同じ縦列では、別々の命令の別々の段が同時に働いている。'], 23)
    f.save('pipeline.svg', '停止・依存・分岐・キャッシュミスのない説明例。Wallyの実測スケジュールではない。')

    f = Figure('同じ操作を、二種類の番地で見る', '仮想番地はプロセスの見方であり、MMIOの物理番地へ変換する。オフセット12はIDレジスタを選ぶ。')
    f.box(50, 145, 300, 140, ['プログラムの仮想番地', 'mmapで得た先頭 + 12'], size=23)
    f.box(445, 145, 240, 140, ['MMUとページ表', '対応を変換'], size=23)
    f.box(785, 145, 355, 140, ['機器の物理番地', '0x10080000 + 0x0C'], size=23)
    f.line([(350, 215), (445, 215)], True)
    f.line([(685, 215), (785, 215)], True)
    f.line([(960, 285), (960, 355)], True)
    f.box(785, 355, 355, 105, ['IDレジスタ', '値：0x52495831'], size=23)
    f.text(55, 370, ['uint32_t配列の添字3は', '4 byte × 3 = 12 byte先。', '仮想番地の数値そのものは', '実行環境によって変わる。'], 24)
    f.text(55, 550, 'RAMのデータを読む番地と、機器を操作する番地を区別する。', 24)
    f.save('address-views.svg', '実装の固定MMIO番地を示す。仮想番地の具体値は固定していない。')

    f = Figure('図形の指定から画素の色まで', 'CPUの処理で命令を作り、接続回路を介してRasterIXへ送る。RasterIXの内部処理で画素の色を作る。', 760)
    f.rect(30, 105, 1140, 215, 'white', BLUE)
    f.text(50, 138, 'CPU上のソフトウェア', 23, weight='bold')
    for i, lines in enumerate([['ゲームの図形', '位置・色・模様'], ['ライブラリの準備', '図形・設定を処理'], ['メモリの命令列', '回路へ送る数値']]):
        x = 60 + 390 * i
        f.box(x, 165, 300, 115, lines, size=23)
        if i < 2:
            f.line([(x + 300, 222), (x + 390, 222)], True)
    f.line([(990, 280), (990, 365), (210, 365), (210, 445)], True)
    f.text(575, 350, 'CPUによる転送 → APB → クロック間接続', 22, 'middle')
    f.rect(30, 405, 1140, 235, 'none', BLUE)
    for i, lines in enumerate([['命令の解析', '何をするか決める'], ['画素候補を計算', '図形の内側を調べる'], ['色・各種の判定', '作業領域へ書く']]):
        x = 60 + 390 * i
        f.box(x, 445, 300, 115, lines, size=23)
        if i < 2:
            f.line([(x + 300, 502), (x + 390, 502)], True)
    f.text(50, 615, 'RasterIXの回路　　この後、画像を保存し、表示側へ渡す。', 23)
    f.save('render-journey.svg', '処理の役割を分けた概念図。個々の回路の並列動作や所要時間は表していない。')

    f = Figure('画素の番号、サンプル位置、図形の境界は違う', '整数の格子線の間に画素がある。左上1,1、右下5,4の四角形は中心サンプルで4列3行の12画素を含む。', 700)
    x0, y0, step = 95, 140, 75
    for y in range(5):
        for x in range(6):
            selected = 1 <= x < 5 and 1 <= y < 4
            f.rect(x0 + x * step, y0 + y * step, step, step, MID if selected else 'white', '#A0A0A0')
            f.dot(x0 + (x + .5) * step, y0 + (y + .5) * step, 4, INK)
    for x in range(7):
        f.text(x0 + x * step, y0 - 15, str(x), 21, 'middle')
    for y in range(6):
        f.text(x0 - 22, y0 + y * step + 7, str(y), 21, 'end')
    f.rect(x0 + step, y0 + step, step * 4, step * 3, 'none', BLUE)
    f.text(610, 180, ['青枠：図形の境界', '左上 (1,1)　右下 (5,4)', '', '点：各画素で調べる位置', 'ここでは中心 (x+0.5,y+0.5)', '', '塗る画素番号：', 'x = 1,2,3,4', 'y = 1,2,3', '4 × 3 = 12画素'], 23)
    f.text(95, 595, '画面の例に合わせて、yは下へ増える。', 23)
    f.save('pixel-grid.svg', '明示した中心サンプルでの説明例。実装の座標変換と共有辺の規則は別途確認する。')

    f = Figure('三つの保存場所を、保存する内容で区別する', 'CPUのDDR命令配列からRasterIXへ命令が届き、内部作業領域で画素を描き、DDRの表示画像へ結果を保存する。', 700)
    f.box(45, 155, 285, 155, ['CPUの命令配列', '描画の指示の数値列', 'DDR上'], size=23)
    f.box(450, 155, 285, 155, ['RasterIX_IF作業領域', '処理中の画素の色', 'FPGA内'], size=23)
    f.box(860, 155, 290, 155, ['表示用の画像A / B', '画素の色を並べた画像', 'DDR上'], size=23)
    f.line([(330, 230), (450, 230)], True)
    f.text(390, 128, '命令を処理', 20, 'middle')
    f.line([(735, 230), (860, 230)], True)
    f.text(795, 128, '画像を保存', 20, 'middle')
    f.line([(1005, 310), (1005, 395)], True)
    f.box(860, 395, 290, 110, ['表示回路が読出し', '端子へ映像信号'], size=23)
    f.text(60, 390, ['同じDDR上でも、命令配列と画像は別の領域。', '内部作業領域と、前後の表示画像も別の領域。', '', '変更領域だけ描く場合は、保存画像を', '作業領域へ読み戻す経路も関係する。'], 23)
    f.save('buffer-roles.svg', '主要な保存場所の概念図。命令FIFO・テクスチャなどの保存場所は省略。')

    f = Figure('画像AとBには、別々の古い場面が残る', 'Aに位置100、Bに103を描いた後、Aを106へ更新するときはAに残る100を消す必要がある。', 680)
    f.text(65, 125, '更新する順', 24)
    f.text(385, 125, '画像A', 24, 'middle')
    f.text(830, 125, '画像B', 24, 'middle')
    rows = [('1', ['今回：x=100', 'Aを描いて表示へ'], ['以前の内容', 'この回は更新しない']),
            ('2', ['残っている：x=100', 'この回は更新しない'], ['今回：x=103', 'Bを描いて表示へ']),
            ('3', ['100を消し、106を描く', 'Aを再利用'], ['残っている：x=103', 'この回は更新しない'])]
    for i, (number, a, b) in enumerate(rows):
        y = 160 + i * 130
        f.text(125, y + 58, number, 29, 'middle')
        f.box(210, y, 350, 105, a, MID if i != 1 else 'white', 22)
        f.box(650, y, 360, 105, b, MID if i == 1 else 'white', 22)
    f.text(60, 590, '直前の103だけ覚えていても、再利用するAに残る100は分からない。', 24)
    f.save('double-buffer.svg', '部分描画の履歴の説明例。実際の初期表示と切替え順はRendererの実装を参照。')

    f = Figure('APB待ちは、転送関数の時間に含まれる', '転送関数の時間の中に、値の読み出し、APBの待ち、ループ等がある。待ち時間を外側の時間へ加算しない。')
    f.rect(60, 155, 1080, 220, 'white', BLUE)
    f.text(90, 195, '転送関数の開始から終了まで', 26, weight='bold')
    pieces = [(90, 210, '読出し等'), (300, 110, '待ち'), (410, 270, 'ループ・転送等'),
              (680, 110, '待ち'), (790, 320, 'その他の関数内処理')]
    for x, w, label in pieces:
        f.box(x, 240, w, 85, label, MID if label == '待ち' else LIGHT, 21)
    f.text(65, 455, ['E6のある条件の中央値：外側7.481 ms/frame、APB待ち0.465 ms/frame',
                   '7.481 + 0.465 と足すと、待ちを二度数えてしまう。',
                   '差を取っても、純粋なCPU計算だけの測定値になるとは限らない。'], 23)
    f.save('measurement-nesting.svg', '区間の包含関係を示す概念図。箱の幅と個数は実測の波形・割合を表していない。')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    CHECK = parser.parse_args().check
    generate()
    print(('Checked' if CHECK else 'Generated') + ' 12 technical SVG figures.')
