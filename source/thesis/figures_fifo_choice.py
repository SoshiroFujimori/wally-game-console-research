from pathlib import Path
import json
from figlib import Fig, BLUE, LIGHT, MID, WHITE, GREY, FIGS

f = Fig('fifo-choice', 1200, 930)
f.text(20, 0, 1160, 55, 'RasterIXが受け取れない間に CPUは次の語へ進めるか', 31, bold=True)

f.box(20, 72, 1160, 355, fill=LIGHT, stroke=GREY)
f.text(44, 85, 1110, 50, 'FIFOなし　Aを受け取るまで CPU側を待たせる', 29, bold=True, align='left')
f.box(60, 160, 265, 102, 'CPU側のバス回路\nAを保持', WHITE, size=26, bold=True)
f.box(458, 160, 240, 102, '命令の\n接続回路', WHITE, size=25)
f.box(830, 160, 300, 102, 'RasterIX\n今は受け取れない', WHITE, size=26, bold=True)
f.line([(325, 200), (458, 200)])
f.line([(698, 200), (830, 200)])
f.text(330, 140, 122, 40, 'A', 24)
f.text(702, 140, 125, 40, 'A', 24)
f.line([(830, 245), (760, 245), (760, 307), (382, 307), (382, 245), (325, 245)], BLUE)
f.text(425, 275, 340, 34, 'READY=0 → PREADY=0', 23, color=BLUE, bold=True)
f.text(55, 328, 1090, 79, 'AのAPB書き込みは未完了。CPUの送信処理はBへ進めない。\nAを同じ値のまま保持するので、受取待ちでAが失われることはない。', 25)

f.box(20, 451, 1160, 365, fill=WHITE, stroke=GREY)
f.text(44, 465, 1110, 50, 'FIFOあり　空きがあれば CPUから先に預かる', 29, bold=True, align='left')
f.text(50, 523, 480, 35, 'FIFOへの保存で書き込み完了', 24, color=BLUE)
f.text(844, 523, 305, 35, '出口のAは受取待ち', 24, color=BLUE)
f.box(48, 579, 210, 98, 'CPU側の\nバス回路', LIGHT, size=25, bold=True)
f.box(330, 579, 207, 98, '命令の\n接続回路', LIGHT, size=23)
f.box(600, 565, 226, 126, 'FIFO\nA、B、Cを保存\nAから順に渡す', MID, size=24, bold=True)
f.box(888, 579, 254, 98, 'RasterIX\n今は受け取れない', LIGHT, size=24, bold=True)
for x1, x2 in [(258, 330), (537, 600), (826, 888)]:
    f.line([(x1, 610), (x2, 610)])
    f.line([(x2, 655), (x1, 655)], BLUE)
f.text(50, 712, 1090, 87, 'Aを預けたCPUは、B、Cも順に送れる。満杯になったら待つ。\nRasterIXが受け取れるようになった後、A、B、Cを順に渡す。', 25)
f.text(30, 834, 1140, 86, '両案とも同じクロックと仮定。下段は三語分の空きがある場合。\n黒矢印はデータ、青矢印は受取可の返事。\n実機で異なるクロックを使う方法は7.4節で説明する。', 23)
f.save()
(Path(__file__).resolve().parent / 'figures-fifo-choice.json').write_text(
    json.dumps(FIGS, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created FIFO choice comparison diagram.')
