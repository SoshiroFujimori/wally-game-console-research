#!/usr/bin/env python3
"""Generate worked-example figures for the main thesis."""
import argparse
import figures
from figures import Figure, BLUE, INK, LIGHT, MID


def generate():
    f = Figure('三本の辺の内側を、位置の数値から選ぶ',
               'xとyが0以上でx+yが4以下になる三角形。Pは内側、Qは外側。', 650)
    x0, y0, step = 100, 125, 86
    f.parts.append(f'<polygon points="{x0},{y0} {x0 + 4*step},{y0} '
                   f'{x0},{y0 + 4*step}" fill="{LIGHT}"/>')
    for i in range(6):
        x, y = x0 + i*step, y0 + i*step
        f.line([(x, y0), (x, y0 + 5*step)], color=MID, width=2)
        f.line([(x0, y), (x0 + 5*step, y)], color=MID, width=2)
        f.text(x, y0 - 22, str(i), 22, 'middle')
        f.text(x0 - 25, y + 7, str(i), 22, 'middle')
    f.line([(x0, y0), (x0+4*step, y0), (x0, y0+4*step), (x0, y0)], color=BLUE)
    f.text(555, 106, 'x →', 23)
    f.text(32, 125, 'y', 23)
    f.line([(44, 150), (44, 550)], True)
    for px, py, name, color in [(1.5, 1.5, 'P', BLUE), (3.5, 1.5, 'Q', INK)]:
        x, y = x0 + px*step, y0 + py*step
        f.dot(x, y, 7, color)
        f.text(x+14, y-12, name, 26, weight='bold')
    f.text(630, 160, ['P = (1.5, 1.5)', '1.5 + 1.5 = 3', '4より小さい → 内側'], 27)
    f.text(630, 320, ['Q = (3.5, 1.5)', '3.5 + 1.5 = 5', '4より大きい → 外側'], 27)
    f.text(630, 485, ['斜めの辺では x + y = 4。', '辺のどちら側かを判定する。'], 24)
    f.save('thesis-triangle.svg', '三角形の内外を調べる説明例。画素のどこを判定位置に使うかは、次の節で説明する。')

    f = Figure('送信時間の一部が、APBで完了を待つ時間',
               'CPUが送信処理を実行する全区間と、そこに含まれるAPB待ち周期を分ける。', 595)
    f.text(50, 110, 'CPU側で測る、送信の開始から終了まで', 25, weight='bold')
    f.box(60, 145, 1080, 110, '配列から読む → 書く → 待つ → 次の語へ進む、を繰り返す', size=25)
    f.text(50, 320, 'その中で、APBの完了を待った周期だけを回路で数える', 25)
    f.line([(75, 395), (1135, 395)], True, color=INK)
    for x, w in [(170, 95), (365, 140), (625, 90), (880, 160)]:
        f.box(x, 350, w, 90, '待ち', fill=MID, size=26)
    f.line([(60, 338), (60, 455)], dash='5 5', color=INK, width=2)
    f.line([(1140, 338), (1140, 455)], dash='5 5', color=INK, width=2)
    f.text(600, 510, '下段の待ちを上段へ足すと、同じ時間を二度数えてしまう。', 25, 'middle')
    f.save('thesis-transfer-time.svg', '青い箱はAPBの待ち。箱の個数と長さは説明用であり、測定波形ではない。')

    f = Figure('少し早く準備できても、次の切り替え機会が同じ場合',
               '16ms間隔の説明モデル。29msと30msの準備完了は32ms、33msは48msに切り替える。', 620)
    x0, scale = 160, 15
    for t in [0, 16, 32, 48, 64]:
        x = x0+t*scale
        f.line([(x, 130), (x, 465)], dash='6 6', color=MID, width=2)
        f.text(x, 106, str(t), 24, 'middle')
    f.text(1145, 106, 'ms', 22)
    for y, done, display in [(200, 30, 32), (310, 29, 32), (420, 33, 48)]:
        f.text(35, y+9, f'{done} msで', 22)
        f.text(35, y+39, '準備完了', 22)
        f.line([(x0, y), (x0+64*scale, y)], color=INK, width=2)
        f.dot(x0+done*scale, y, 7, INK)
        f.line([(x0+done*scale, y-26), (x0+display*scale, y-26)], True)
        f.rect(x0+display*scale-5, y-12, 10, 24, BLUE, BLUE)
        f.text(x0+display*scale+22, y+43, f'{display} msで切替え', 24)
    f.text(600, 525, '点：準備完了　矢印：切替え機会まで待つ　縦の青線：切替え', 24, 'middle')
    f.save('thesis-display-opportunity.svg', '16 msごとに切り替えられると仮定した説明例。実測値ではない。')

    f = Figure('命令データが画像データの返却をふさぐ場合',
               '上は待ちの依存関係。下はDMA応答をFIFOへ引き取り共有の経路を空ける考え方。', 845)
    f.text(45, 105, '① 停止する条件：矢印の先が進むのを待っている', 24, weight='bold')
    boxes = [(45, ['描画側', '画像データが必要']),
             (445, ['共有の応答経路', '命令データが残る']),
             (845, ['命令DMA', '次の命令を渡せない'])]
    for x, label in boxes:
        f.box(x, 160, 310, 125, label, size=24)
    f.line([(355, 205), (445, 205)], True)
    f.line([(755, 205), (845, 205)], True)
    f.line([(1000, 285), (1000, 345), (200, 345), (200, 285)], True)
    f.text(600, 385, '描画側が進めないため、命令を受け取る側も進めない。', 24, 'middle')
    f.text(45, 465, '② 実験用の変更：命令の返却データを先に引き取る', 24, weight='bold')
    f.box(45, 515, 300, 130, ['共有の応答経路', '命令の返却データ'], size=24)
    f.box(450, 505, 310, 150, ['応答用FIFO', '要求するまとまりを', '全部保存できる空き'], MID, size=23)
    f.box(875, 515, 280, 130, ['命令の受け取り側', 'まだ待っていてもよい'], size=22)
    f.line([(345, 575), (450, 575)], True)
    f.line([(760, 575), (875, 575)], True, dash='6 5')
    f.text(600, 714, '命令の返却データを経路から退かし、画像データを返せるようにする。', 24, 'middle')
    f.text(600, 754, '下段の矢印はデータの移動。破線は受け取り再開後の転送。', 23, 'middle')
    f.save('thesis-dma-wait.svg', '機能シミュレーションで確認した待ちの関係。実機が停止した原因まで特定する図ではない。')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    figures.CHECK = parser.parse_args().check
    generate()
    print(('Checked' if figures.CHECK else 'Generated') + ' four main-thesis SVG figures.')
