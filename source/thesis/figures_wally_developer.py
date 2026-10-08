from figlib import *
import json


def title(f, text):
    f.text(10, 0, f.w - 20, 58, text, 32, bold=True)


# 1. Abstraction stack
f = Fig('wdev-abstraction-stack', 1200, 890)
title(f, 'Wally開発者が行き来する抽象化階層')
layers = [
    ('要求・仕様', '実行すべき命令、例外、周辺回路の約束', LIGHT),
    ('マイクロアーキテクチャ', '5段pipeline、cache、bus、stall・flush', MID),
    ('RTL / SystemVerilog', 'register間の転送と各cycleの論理', LIGHT),
    ('合成後netlist', 'LUT・FF・BRAM・DSP・clock資源への写像', MID),
    ('配置配線後design', '実際の場所、配線遅延、clock skew', LIGHT),
    ('bitstreamと実機', 'FPGAへ設定し、softwareとI/Oを含めて観察', MID),
]
for i, (name, desc, fill) in enumerate(layers):
    y = 80 + i * 119
    f.box(70, y, 300, 78, name, fill, size=28, bold=True)
    f.box(430, y, 700, 78, desc, WHITE, size=25)
    if i < len(layers) - 1:
        f.line([(220, y + 79), (220, y + 112)], BLUE)
        f.line([(980, y + 112), (980, y + 79)], BLUE)
f.text(55, 808, 1090, 54,
       '上から下へ作り、下で得た結果を上の設計判断へ戻す。どの層の主張かを混ぜない。',
       27, color=BLUE, bold=True)
f.save()


# 2. RTL description forms
f = Fig('wdev-rtl-three-forms', 1200, 790)
title(f, '動作記述・RTL・構造記述は対立する分類ではない')
cols = [40, 410, 780]
heads = ['組み合わせの動作', 'cycleを持つRTL', '階層を作る構造']
codes = [
    'assign y = s ? d1 : d0;\n\n現在の入力から\n現在の出力を決める',
    'always_ff @(posedge clk)\n  if (en) q <= d;\n\nclock edgeで\n値を保存する',
    'ieu #(P) ieu(...);\nlsu #(P) lsu(...);\n\nmoduleを実体化し\nsignalを接続する',
]
circs = [
    ('MUX', '記憶しない'),
    ('FF + enable', '状態を持つ'),
    ('IEU  LSU  IFU', '同時に存在する'),
]
for x, h, code, circ in zip(cols, heads, codes, circs):
    f.box(x, 82, 340, 60, h, LIGHT, size=26, bold=True)
    f.box(x, 166, 340, 235, code, WHITE, size=24)
    f.line([(x + 170, 402), (x + 170, 468)], BLUE)
    f.box(x + 45, 472, 250, 105, circ[0] + '\n' + circ[1], MID, size=28, bold=True)
f.text(55, 630, 1090, 57,
       '同じmoduleの中で三つを組み合わせる。大切なのは、各記述から生成したい回路を説明できること。',
       27, color=BLUE, bold=True)
f.text(55, 704, 1090, 48,
       '行を上から実行するsoftwareとして読むと、並列に存在する回路を見失う。', 26)
f.save()


# 3. Inference and resources
f = Fig('wdev-synthesis-resources', 1200, 900)
title(f, 'RTLの形からFPGA資源が推論される')
rows = [
    ('条件演算・case', '選択回路', 'LUT / MUX'),
    ('always_ff', '値を保存するregister', 'FF'),
    ('配列 + 同期read', 'block memory候補', 'BRAM'),
    ('加算・比較・shift', '算術data path', 'carry chain / LUT'),
    ('乗算', '乗算器', 'DSPまたはLUT'),
    ('長い変数shift', 'barrel shifter', '多数のMUX / LUT'),
    ('同じ式を並列に複製', '複数の演算器', '資源増、throughput増'),
]
xs = [45, 360, 745, 985]
ws = [300, 370, 225, 170]
for x, w, h in zip(xs, ws, ['RTLの形', '推論される構造', '主な資源', '要確認']):
    f.box(x, 78, w, 58, h, BLUE, size=24, bold=True)
for i, (rtl, inferred, resource) in enumerate(rows):
    y = 136 + i * 91
    fill = LIGHT if i % 2 == 0 else WHITE
    f.box(xs[0], y, ws[0], 78, rtl, fill, size=24)
    f.box(xs[1], y, ws[1], 78, inferred, fill, size=24)
    f.box(xs[2], y, ws[2], 78, resource, fill, size=24)
    f.box(xs[3], y, ws[3], 78, 'report', fill, size=23, bold=True)
f.text(55, 803, 1090, 55,
       '短いcodeが小さい回路とは限らない。合成後の階層別utilizationとtimingで答え合わせする。',
       27, color=BLUE, bold=True)
f.save()


# 4. Timing path and pipeline
f = Fig('wdev-timing-path', 1200, 800)
title(f, '一つのregister間pathとpipeline化')
f.text(35, 74, 1130, 40, 'pipeline化前', 27, bold=True, align='left')
f.box(70, 135, 170, 100, '送信FF', LIGHT, size=29, bold=True)
f.box(375, 135, 450, 100, '組み合わせ論理\nALU + MUX + 配線', MID, size=28, bold=True)
f.box(960, 135, 170, 100, '受信FF', LIGHT, size=29, bold=True)
f.line([(240, 185), (375, 185)], BLUE)
f.line([(825, 185), (960, 185)], BLUE)
f.text(90, 260, 1020, 52,
       'Tclk >= Tcq + Tlogic + Troute + Tsetup + skew/uncertainty', 29, color=BLUE, bold=True)
f.line([(45, 346), (1155, 346)], arrow=False, color=GREY)
f.text(35, 365, 1130, 40, '途中へregisterを追加', 27, bold=True, align='left')
f.box(50, 435, 150, 95, 'FF', LIGHT, size=30, bold=True)
f.box(290, 435, 245, 95, '論理A', MID, size=30, bold=True)
f.box(625, 435, 150, 95, '追加FF', LIGHT, size=30, bold=True)
f.box(865, 435, 245, 95, '論理B', MID, size=30, bold=True)
for a, b in [((200,482),(290,482)),((535,482),(625,482)),((775,482),(865,482))]:
    f.line([a,b], BLUE)
f.text(48, 566, 1090, 50,
       '各stageのpathは短くなるが、結果が出るまでのcycle数と制御状態が増える。', 27)
f.text(48, 640, 1090, 76,
       'throughput、latency、機能の正しさ、stall・flush、消費資源を一緒に再検証する。',
       28, color=BLUE, bold=True)
f.save()


# 5. Wally hierarchy
f = Fig('wdev-wally-hierarchy', 1200, 900)
title(f, '固定コミットで読むWallyの設計階層')
f.box(55, 75, 1090, 770, '', LIGHT)
f.text(75, 82, 310, 42, 'wallypipelinedsoc', 27, bold=True, align='left')
f.box(100, 150, 1000, 385, '', WHITE)
f.text(120, 154, 360, 42, 'wallypipelinedcore', 26, bold=True, align='left')
core = [
    (130, 230, 180, 90, 'IFU\n命令取得'),
    (345, 230, 180, 90, 'IEU\n整数実行'),
    (560, 230, 180, 90, 'LSU\nload/store'),
    (775, 230, 180, 90, 'privileged\nCSR・trap'),
]
for x,y,w,h,t in core:
    f.box(x,y,w,h,t,MID,size=26,bold=True)
f.box(240, 385, 250, 90, 'FPU / MDU\n構成時に生成', WHITE, size=25)
f.box(605, 385, 250, 90, 'hazard\nstall・flush', WHITE, size=25)
f.line([(310,320),(365,385)],BLUE)
f.line([(650,320),(730,385)],BLUE)
f.box(100, 585, 290, 125, 'EBU\nIFU/LSUをAHBへ\n仲裁する', MID, size=26,bold=True)
f.box(455, 585, 290, 125, 'uncore\nmemory・APB\ninterrupt', MID, size=26,bold=True)
f.box(810, 585, 290, 125, '外部I/O\nDDR・RasterIX\nboard pins', MID, size=26,bold=True)
f.line([(310,535),(245,585)],BLUE)
f.line([(390,648),(455,648)],BLUE)
f.line([(745,648),(810,648)],BLUE)
f.text(100, 742, 1000, 82,
       'cvw_t Pが幅・機能・address mapを階層へ渡す。\nmodule名と責務を先に固定して読む。',
       25, color=BLUE, bold=True)
f.save()


# 6. Pipeline control
f = Fig('wdev-pipeline-control', 1200, 790)
title(f, 'WallyのF・D・E・M・Wとstall / flush')
labels = [('F','Fetch'),('D','Decode'),('E','Execute'),('M','Memory'),('W','Writeback')]
for i,(short,longname) in enumerate(labels):
    x=45+i*225
    f.box(x,115,185,105,short+'\n'+longname,LIGHT if i%2==0 else MID,size=29,bold=True)
    if i<4:f.line([(x+185,167),(x+225,167)],BLUE)
f.text(40,260,1110,46,'通常: 各clock edgeで命令が右へ一段進む',27,bold=True)
f.line([(45,330),(1130,330)],arrow=False,color=GREY)
f.text(40,350,230,40,'stall',28,bold=True,color=BLUE)
f.line([(1030,410),(80,410)],BLUE)
f.text(90,430,1030,68,
       '後段が待つと、その待ちは前段へ伝わる。保持するregisterと、空命令を入れるstageを区別する。',
       26)
f.text(40,530,230,40,'flush',28,bold=True,color=BLUE)
f.line([(505,585),(215,585)],BLUE)
f.text(90,610,1030,70,
       '分岐予測誤りやtrapでは、誤った経路の命令を無効化する。stallより優先する条件をhazard.svで決める。',
       26)
f.text(50,712,1100,42,'停止と破棄を同じものとして扱うと、命令を二回実行するか失う。',27,color=BLUE,bold=True)
f.save()


# 7. Memory and bus path
f = Fig('wdev-memory-bus-path', 1200, 880)
title(f, 'load/storeまたは命令取得が周辺回路へ届く経路')
steps=[
 ('IFU / LSU','要求を作る'),('EBU','仲裁してAHBへ'),('address decoder','領域を選ぶ'),
 ('AHB→APB bridge','二つのprotocolを変換'),('APB peripheral','register操作'),
]
for i,(name,desc) in enumerate(steps):
    x=35+i*230
    f.box(x,125,200,105,name+'\n'+desc,LIGHT if i%2==0 else MID,size=23,bold=True)
    if i<4:f.line([(x+200,177),(x+230,177)],BLUE)
f.text(50,285,1100,48,'要求方向: address・write data・size・control',27,bold=True)
f.line([(80,355),(1110,355)],BLUE)
f.text(50,385,1100,48,'応答方向: read data・ready・error',27,bold=True)
f.line([(1110,455),(80,455)],BLUE)
f.box(90,535,300,125,'address phase\nどの相手かを決める',WHITE,size=27)
f.box(450,535,300,125,'data / access phase\n相手の完了を待つ',WHITE,size=27)
f.box(810,535,300,125,'pipelineへの反映\nstall解除・data取得',WHITE,size=27)
f.line([(390,597),(450,597)],BLUE)
f.line([(750,597),(810,597)],BLUE)
f.text(55,725,1090,72,
       'CPU clockが低くても、readyを無視すればprotocol違反になる。速さではなく受渡し条件で設計する。',
       28,color=BLUE,bold=True)
f.save()


# 8. FPGA build flow
f = Fig('wdev-fpga-flow', 1200, 940)
title(f, 'SystemVerilogからNexys Videoの回路になるまで')
nodes=[
 ('sourceとparameter','sv・vh・Tcl・XDC'),('elaboration','階層・幅・generateを確定'),
 ('synthesis','論理最適化とresource推論'),('implementation','opt・place・route'),
 ('bitstream','FPGA構成data'),('実機','software・I/Oと統合確認'),
]
for i,(name,desc) in enumerate(nodes):
    y=72+i*132
    f.box(75,y,300,85,name,LIGHT if i%2==0 else MID,size=28,bold=True)
    f.box(445,y,680,85,desc,WHITE,size=26)
    if i<5:
        f.line([(225,y+85),(225,y+125)],BLUE)
f.text(70,855,1060,50,
       'simulation成功 ≠ timing成功 ≠ 実機成功。各段階で別の証拠を保存する。',
       28,color=BLUE,bold=True)
f.save()


# 9. CDC patterns
f = Fig('wdev-cdc-patterns', 1200, 920)
title(f, 'clock domain crossingは信号の性質で方式を選ぶ')
rows=[
 ('一定時間保持する1 bit level','2段synchronizer','遅延後の0/1が必要'),
 ('短い1 cycle pulse','toggleまたはhandshake','pulseを見失わない'),
 ('複数bitの設定値','handshake + 保持register','全bitを同じ世代で受ける'),
 ('連続data stream','非同期FIFO','順序・満杯・空を管理'),
 ('reset解除','domainごとの同期解除','metastabilityと部分起動を避ける'),
]
for x,w,h in [(45,330,'渡すもの'),(375,350,'典型方式'),(725,430,'守る条件')]:
    f.box(x,82,w,62,h,BLUE,size=25,bold=True)
for i,row in enumerate(rows):
    y=144+i*119;fill=LIGHT if i%2==0 else WHITE
    for (x,w,_),txt in zip([(45,330,''),(375,350,''),(725,430,'')],row):
        f.box(x,y,w,102,txt,fill,size=24)
f.text(55,750,1090,76,
       '周波数の大小だけでは方式は決まらない。\n更新頻度、同時性、損失許容、backpressureを仕様化する。',
       25,color=BLUE,bold=True)
f.text(55,838,1090,46,'report_cdcとsimulationは互いを置き換えず、両方を使う。',25,bold=True)
f.save()


# 10. Verification layers
f = Fig('wdev-verification-layers', 1200, 900)
title(f, 'Wally開発者が積み重ねる検証層')
layers=[
 ('lint・elaboration','幅、未接続、latch、構文、parameter'),
 ('module simulation','局所的な入力と期待出力'),
 ('assertion・formal','常に守るprotocolと不変条件'),
 ('core / ISA test','命令のarchitectural result'),
 ('SoC integration','bus、memory、interrupt、boot'),
 ('synthesis・timing','実装可能性、resource、slack、CDC'),
 ('FPGA実機','bitstream、board、software、外部I/O'),
]
for i,(name,desc) in enumerate(layers):
    w=1040-i*82;x=(1200-w)//2;y=73+i*98
    f.box(x,y,w,78,name+'\n'+desc,LIGHT if i%2==0 else MID,size=22,bold=True)
f.text(65,800,1070,55,
       '上の試験が通っても下の層は自動では証明されない。失敗した層から原因範囲を絞る。',
       27,color=BLUE,bold=True)
f.save()


# 11. Change impact graph
f = Fig('wdev-change-impact', 1200, 850)
title(f, '一つの構成値を変えたときに追う影響')
f.box(430,90,340,88,'変更する要求\n例: CPU clock・address・cache',MID,size=28,bold=True)
targets=[
 (60,265,280,95,'構成parameter\ncvw_t P'),
 (460,265,280,95,'RTL階層\n幅・generate・FSM'),
 (860,265,280,95,'software契約\nDTB・driver・定数'),
 (60,485,280,95,'合成結果\nLUT・FF・BRAM・DSP'),
 (460,485,280,95,'timing / CDC\nclock・slack・reset'),
 (860,485,280,95,'機能検証\nunit・ISA・実機'),
]
for x,y,w,h,t in targets:
    f.box(x,y,w,h,t,LIGHT,size=26,bold=True)
    f.line([(600,178),(x+w//2,y)],BLUE)
f.text(70,668,1060,60,'値を一か所直して終わりにせず、同じ契約を持つ全層を列挙する。',28,color=BLUE,bold=True)
f.text(70,740,1060,46,'diff、report、test resultを一組で保存すると設計判断を再現できる。',26)
f.save()


(ROOT / 'figures-wally-developer.json').write_text(
    json.dumps(FIGS, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created', len(FIGS), 'Wally developer figures')
