from pathlib import Path
import json
from figlib import Fig, BLUE, LIGHT, MID, WHITE, GREY, FIGS

f = Fig('fifo-choice', 1200, 930)
f.text(20, 0, 1160, 55, 'APBで待たせる機能と クロックをまたぐ機能', 33, bold=True)

f.box(20, 72, 1160, 355, fill=LIGHT, stroke=GREY)
f.text(44, 85, 1110, 50, '比較案　APB側とRasterIX側が同じクロック', 29, bold=True, align='left')
f.box(60, 160, 265, 102, 'CPU側のバス回路\nDを保持', WHITE, size=26, bold=True)
f.box(458, 160, 240, 102, 'APBから\nStreamへ変換', WHITE, size=25)
f.box(830, 160, 300, 102, 'RasterIX\n受取可を返す', WHITE, size=26, bold=True)
f.line([(325, 200), (458, 200)])
f.line([(698, 200), (830, 200)])
f.text(330, 140, 122, 40, 'D', 24)
f.text(702, 140, 125, 40, 'D', 24)
f.line([(830, 245), (760, 245), (760, 307), (382, 307), (382, 245), (325, 245)], BLUE)
f.text(445, 275, 274, 34, 'READY → PREADY', 24, color=BLUE, bold=True)
f.text(55, 328, 1090, 79, '受取不可ならAPBを待たせる。共通の立ち上がりで受理と書込み完了。\n一時停止への対応だけなら、FIFOを置く必要はない。', 25, bold=True)

f.box(20, 451, 1160, 365, fill=WHITE, stroke=GREY)
f.text(44, 465, 1110, 50, '本研究　CPU側20 MHzとRasterIX側100 MHzを接続', 29, bold=True, align='left')
f.text(48, 523, 480, 35, 'CPUCLKで受け渡す', 24, color=BLUE)
f.text(848, 523, 298, 35, 'DDRCLKで受け渡す', 24, color=BLUE)
f.box(48, 579, 210, 98, 'CPU側の\nバス回路', LIGHT, size=25, bold=True)
f.box(330, 579, 207, 98, 'APBから\nStreamへ変換', LIGHT, size=23)
f.box(610, 565, 205, 126, '非同期FIFO\nクロック間で\n一語ずつ渡す', MID, size=24, bold=True)
f.box(888, 579, 254, 98, 'RasterIX', LIGHT, size=26, bold=True)
for x1, x2 in [(258, 330), (537, 610), (815, 888)]:
    f.line([(x1, 610), (x2, 610)])
    f.line([(x2, 655), (x1, 655)], BLUE)
f.text(50, 712, 1090, 87, 'FIFO入口が受理すればAPBの書込み完了。満杯ならAPBを待たせる。\nRasterIXが受理するのは、出口側の別の立ち上がり。', 25)
f.text(30, 840, 1140, 74, '黒矢印はデータ、青矢印は受取可。\n非同期FIFOはクロック間の受け渡し方式の一つ。唯一の方式ではない。', 24, bold=True)
f.save()
(Path(__file__).resolve().parent / 'figures-fifo-choice.json').write_text(
    json.dumps(FIGS, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created FIFO choice comparison diagram.')
