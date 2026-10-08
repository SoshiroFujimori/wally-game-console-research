from figlib import Fig, INK, BLUE, LIGHT, MID, BLOCK, WHITE, GREY, FIGS
from pathlib import Path
import json


def queue_boxes(f, x, y, words, w=128, h=68):
    for i, word in enumerate(words):
        f.box(x + i * w, y, w, h, word if word else "空",
              MID if word else WHITE, size=30, bold=bool(word))


# A single map that separates the three reasons for the FIFO.
f = Fig("fifo-three-roles", 1200, 1000)
f.text(10, 0, 1180, 56, "この接続でFIFOが担当する三つの仕事", 34, bold=True)

panels = [
    (74, "① 順序を保って一時保存する", "CPUがA、B、Cの順に入れれば、RasterIXもA、B、Cの順に受け取る"),
    (330, "② 満杯なら送り手を待たせる", "空きがない間はDを受理せず、PREADY=0としてCPU側に保持させる"),
    (586, "③ 二つのクロック領域を安全にまたぐ", "入口の書込みはCPUCLK、出口の読出しはDDRCLKで別々に数える"),
]
for y, title, body in panels:
    panel_h = 275 if y == 586 else 222
    f.box(25, y, 1150, panel_h, fill=LIGHT if y != 330 else WHITE, stroke=GREY)
    f.text(48, y + 12, 1100, 48, title, 28, bold=True, align="left")
    body_y = y + 218 if y == 586 else y + 166
    f.text(48, body_y, 1100, 42, body, 24, align="left")

# Panel 1: order.
f.box(68, 150, 180, 72, "CPU\nA → B → C", WHITE, size=25, bold=True)
f.line([(248, 186), (390, 186)], BLUE)
queue_boxes(f, 390, 152, ["C", "B", "A"], 116, 68)
f.line([(738, 186), (882, 186)])
f.box(882, 150, 245, 72, "RasterIX\nA → B → C", WHITE, size=25, bold=True)

# Panel 2: full and backpressure.
f.box(68, 408, 180, 72, "CPUが保持\nD", MID, size=26, bold=True)
f.line([(248, 444), (366, 444)], BLUE)
f.text(250, 382, 116, 45, "PREADY=0", 23, color=BLUE, bold=True)
queue_boxes(f, 390, 410, ["C", "B", "A"], 116, 68)
f.text(757, 412, 360, 64, "FIFOは満杯\nDはまだ入っていない", 24, bold=True)

# Panel 3: independent clocks.
f.box(66, 652, 240, 82, "入口側\nCPUCLK 20 MHz", MID, size=25, bold=True)
f.line([(306, 693), (466, 693)], BLUE)
f.box(466, 635, 270, 116, "非同期FIFO\n語を保存", WHITE, size=27, bold=True)
f.line([(736, 693), (894, 693)])
f.box(894, 652, 240, 82, "出口側\nDDRCLK 100 MHz", MID, size=25, bold=True)
f.text(315, 752, 405, 36, "入口の立ち上がりで書く", 21, color=BLUE)
f.text(738, 752, 405, 36, "出口の立ち上がりで読む", 21, color=BLUE)

f.text(20, 905, 1160, 68,
       "平均速度の差だけが理由ではない。順序、待ち、クロック境界は別々の設計条件である。",
       27, bold=True)
f.save()


# Replace the compressed queue figure with one operation per row.
f = Fig("fifo", 1200, 1040)
f.text(10, 0, 1180, 56, "説明用のFIFO　三語まで保存できる場合", 34, bold=True)
f.text(20, 65, 245, 45, "今回の操作", 27, bold=True)
f.text(350, 65, 470, 45, "FIFOの待ち順", 27, bold=True)
f.text(865, 65, 300, 45, "操作後の結果", 27, bold=True)
f.text(352, 105, 110, 34, "入口", 22)
f.line([(475, 122), (677, 122)])
f.text(690, 105, 110, 34, "出口", 22)

rows = [
    ("① 初めは空", [None, None, None], "次に出す語はない", False),
    ("② 7を書く", [None, None, "7"], "7を保存", False),
    ("③ 8を書く", [None, "8", "7"], "順序は7、8", False),
    ("④ 9を書く", ["9", "8", "7"], "満杯になる", False),
    ("⑤ 10を書く", ["9", "8", "7"], "10は受理せず待つ", True),
    ("⑥ 7を読む", [None, "9", "8"], "最初の7だけを出す", False),
    ("⑦ 10を書く", ["10", "9", "8"], "空きへ10を保存", False),
]
for i, (op, words, result, blocked) in enumerate(rows):
    y = 146 + i * 114
    f.text(22, y, 285, 68, op, 26, bold=True, align="left")
    if blocked:
        f.text(240, y - 2, 108, 72, "受取不可\nPREADY\n= 0", 17, color=BLUE, bold=True)
    else:
        f.line([(276, y + 35), (350, y + 35)], BLUE)
    queue_boxes(f, 350, y, words, 150, 68)
    f.text(824, y, 345, 68, result, 25,
           color=BLUE if blocked else INK, bold=blocked, align="left")
    if i < len(rows) - 1:
        f.line([(20, y + 90), (1170, y + 90)], color=GREY, arrow=False)
f.text(20, 970, 1160, 48,
       "箱は待ち順を表す模式図であり、実際の記憶場所の値が毎回右へ移動する意味ではない。",
       25, bold=True)
f.save()


# Follow one word through both handshakes and both clock domains.
f = Fig("fifo-one-word-journey", 1200, 1030)
f.text(10, 0, 1180, 56, "一語DがCPUからRasterIXへ届くまで", 34, bold=True)
headers = [(25, 250, "CPUとAPB"), (285, 250, "FIFO入口"),
           (545, 230, "保存領域"), (785, 180, "FIFO出口"), (975, 200, "RasterIX")]
for x, w, label in headers:
    f.box(x, 75, w, 60, label, LIGHT, size=25, bold=True)

steps = [
    ("①", "Dを命令口へ書く", "VALID=1\nDを提示", "まだ空", "EMPTY", "待機"),
    ("②", "PREADY=1で\n書込み完了", "CPUCLKの立上りで\nDを一度受理", "Dを保存", "まだEMPTY", "待機"),
    ("③", "次の処理へ進める", "書込み位置を\n出口側へ通知", "Dを保持", "通知を待つ", "待機"),
    ("④", "―", "―", "Dを保持", "Dありと認識\nVALID=1", "READYを返す"),
    ("⑤", "―", "―", "読出し済みにする", "DDRCLKの\n立上りでDを\n一度渡す", "Dを受理"),
    ("⑥", "空き通知後に\n同じ場所を再利用可", "読出し位置を受信", "空き", "読出し位置を\n入口側へ通知", "命令Dを処理"),
]
xs = [25, 285, 545, 785, 975]
ws = [250, 250, 230, 180, 200]
for i, row in enumerate(steps):
    y = 151 + i * 128
    step, *cells = row
    cells[0] = step + "\n" + cells[0]
    for x, w, value in zip(xs, ws, cells):
        fill = MID if (i in (1, 4) and (x in (285, 785, 975))) else WHITE
        size = 18 if (i == 4 and x == 785) else 20
        f.box(x, y, w, 92, value, fill, size=size, bold=fill == MID)
    if i < len(steps) - 1:
        f.line([(25, y + 111), (1175, y + 111)], color=GREY, arrow=False)
f.text(20, 944, 1160, 68,
       "入口で受理した時刻と出口でRasterIXが受理した時刻は別である。間に保存と通知がある。",
       27, color=BLUE, bold=True)
f.save()


# Show that a rational frequency ratio does not imply an aligned phase.
f = Fig("fifo-clock-events", 1200, 820)
f.text(10, 0, 1180, 56, "20 MHzと100 MHzでも立ち上がりの位置関係は固定とは限らない", 31, bold=True)

f.text(20, 85, 210, 52, "CPUCLK 20 MHz", 26, bold=True, align="left")
f.text(20, 360, 210, 52, "DDRCLK 100 MHz", 26, bold=True, align="left")
f.line([(235, 125), (1150, 125)], arrow=False)
f.line([(235, 400), (1150, 400)], arrow=False)

# CPU edges: 50 ns apart.
for i, x in enumerate([285, 650, 1015]):
    f.line([(x, 164), (x, 86)], BLUE)
    f.text(x - 70, 173, 140, 36, f"CPU立上り{i + 1}", 21)
f.text(405, 220, 530, 48, "立上り2でDをFIFOへ書く", 26, color=BLUE, bold=True)
f.line([(650, 214), (650, 164)], BLUE)

# DDR edges: 10 ns apart, intentionally offset.
ddr_edges = [275, 348, 421, 494, 567, 640, 713, 786, 859, 932, 1005, 1078]
for x in ddr_edges:
    f.line([(x, 438), (x, 362)], color=INK)
f.text(250, 449, 880, 38, "DDRCLKの立ち上がりは約10 ns間隔だが、CPUCLKと同じ位置とは限らない", 22)

f.box(430, 525, 340, 82, "書込み位置の通知が\nクロック境界を通る", LIGHT, size=25, bold=True)
f.line([(650, 268), (650, 525)], BLUE, dash=True)
f.line([(770, 566), (915, 566)], BLUE)
f.box(915, 525, 235, 82, "出口側が\nDありと認識", MID, size=24, bold=True)
f.text(35, 665, 1130, 120,
       "非同期FIFOは二つの時計を一致させない。\n入口で書いた事実を出口側へ安全に知らせ、出口側は自分の時計で読む。",
       26, bold=True)
f.save()


(Path(__file__).resolve().parent / "figures-fifo-main.json").write_text(
    json.dumps(FIGS, ensure_ascii=False, indent=2), encoding="utf-8")
print("Created", len(FIGS), "FIFO teaching figures")
