"""Main-thesis diagrams for retained pixels, timing, and command transport."""

from figlib import Fig, BLUE, LIGHT, MID, INK


def retained_strip():
    f = Fig('retained-strip-roundtrip', h=720)
    f.text(30, 15, 1140, 60, '同じバックバッファAの一帯分を、読み、変え、戻す', 32, bold=True)
    f.text(70, 85, 410, 45, '基板上のDDR3　画像Aの該当する帯', 25, bold=True)
    f.text(730, 85, 400, 45, 'FPGA内のBRAM　作業領域', 25, bold=True)
    f.box(70, 145, 410, 110, '前に描いた色が残る\n白いボールは横位置100', size=28)
    f.box(730, 145, 400, 110, '① 古い画素を読み込む\nAと同じ色の並び', fill=LIGHT, size=28)
    f.line([(495, 200), (715, 200)], color=BLUE)
    f.text(490, 143, 230, 45, '一帯分の画素を読む', 24, BLUE)
    f.line([(930, 260), (930, 315)])
    f.box(730, 330, 400, 120, '② 必要な場所を描き直す\n古いボールを消す\n横位置103へ描く', fill=MID, size=27)
    f.box(70, 330, 410, 120, 'DDR3のAには\nまだ前の画素が残る\n次の段階で書き戻す', size=27)
    f.line([(930, 455), (930, 510)])
    f.box(730, 525, 400, 110, '③ 変更した帯の画素\n触らなかった色も残る', fill=LIGHT, size=28)
    f.box(70, 525, 410, 110, 'Aの該当する帯を更新\n白いボールは横位置103', fill=LIGHT, size=28)
    f.line([(715, 580), (495, 580)], color=BLUE)
    f.text(490, 523, 230, 45, '一帯分を書き戻す', 24, BLUE)
    f.text(35, 657, 1130, 44, 'Aは次の描画先。表示回路は別の画像を読む。青い矢印は画素の転送。', 25)
    f.save()


def overlapping_work():
    f = Fig('cpu-gpu-timing-overlap', h=540)
    f.text(35, 15, 1130, 55, '説明用の時刻で、CPUと描画回路の動きをそろえて読む', 30, bold=True)
    origin, unit = 270, 90
    f.text(40, 155, 205, 75, 'CPUの処理', 29, bold=True)
    f.text(40, 300, 205, 75, '描画回路', 29, bold=True)
    f.line([(origin, 125), (origin+9*unit, 125)])
    for t in [0, 2, 5, 8]:
        x = origin + t*unit
        f.line([(x, 115), (x, 405)], arrow=False, dash=True, color='#929292')
        f.text(x-45, 75, 90, 40, f'{t} ms', 25)
    f.box(origin, 165, 5*unit, 85, '命令を送る　5 ms', fill=LIGHT, size=28)
    f.box(origin+5*unit, 165, 3*unit, 85, '完了を待つ　3 ms', fill=MID, size=26)
    f.box(origin+2*unit, 310, 6*unit, 85, '受け取った命令で描画する　6 ms', fill=LIGHT, size=28)
    f.text(origin+2*unit, 257, 3*unit, 40, 'この間は同時に進む', 25, BLUE, bold=True)
    f.text(30, 433, 1140, 80, 'CPUの待ち3 ms ≠ 描画回路の実行6 ms\n数値は説明用。実機の完了待ちには表示切り替えも含まれる。', 27)
    f.save()


def command_transport():
    f = Fig('apb-dma-command-paths', h=710)
    f.text(30, 15, 1140, 55, '同じ命令列を、誰がどこへ運ぶか', 32, bold=True)
    f.text(30, 90, 1140, 40, 'APB送信：CPUが各語を読み、命令口へ書く', 29, bold=True, align='left')
    xs, w = [35, 335, 635, 935], 230
    top = ['CPU用メモリ\n命令列', 'CPUの\n一語ずつの書込み', 'APB命令口\n命令FIFO', 'RasterIXの\n命令解析回路']
    bottom = ['CPU用メモリ\n命令列', '予約したDDR3\nコピーした命令列', 'RasterIXの\n命令DMA', 'RasterIXの\n命令解析回路']
    for x, label in zip(xs, top):
        f.box(x, 155, w, 105, label, fill=LIGHT if x==335 else '#FFFFFF', size=26)
    for x in xs[:-1]: f.line([(x+w+7, 207), (x+293, 207)])
    f.text(30, 322, 1140, 40, 'DMA送信：CPUがコピーと開始操作をし、回路が読む', 29, bold=True, align='left')
    for x, label in zip(xs, bottom):
        f.box(x, 390, w, 115, label, fill=LIGHT if x in (335,635) else '#FFFFFF', size=26)
    for x in xs[:-1]: f.line([(x+w+7, 448), (x+293, 448)], color=BLUE)
    f.text(195, 520, 260, 40, 'CPUがコピー', 25, BLUE)
    f.text(500, 520, 280, 40, 'DMAがDDR3を読む', 25, BLUE)
    f.text(30, 585, 1140, 90, 'DMAの場所と開始もCPUから指示する。完了前に予約領域を上書きしない。\n比較時間には、コピー・開始操作・完了待ちも含める。', 27)
    f.save()


if __name__ == '__main__':
    retained_strip()
    overlapping_work()
    command_transport()
