from figlib import *
import json


def title(fig, value):
    fig.text(18, 4, fig.w - 36, 56, value, 31, bold=True)


def arrow_row(fig, labels, y, x0=35, width=205, gap=28, height=92, size=24):
    for index, label in enumerate(labels):
        x = x0 + index * (width + gap)
        fig.box(x, y, width, height, label, LIGHT if index % 2 == 0 else MID,
                size=size, bold=True)
        if index + 1 < len(labels):
            fig.line([(x + width, y + height / 2),
                      (x + width + gap, y + height / 2)], BLUE)


# Topical map
f = Fig('deep-topic-map', 1200, 835)
title(f, '分野ごとに読める五部と、中央にある一つの実機system')
f.box(415, 305, 370, 170, 'Wally + RasterIX\nNexys Video上の\n二次元ゲーム機', MID,
      size=26, bold=True)
parts = [
    (55, 95, 300, 135, '第I部  HDL・FPGA\nRTL、資源、timing\nCDC、検証'),
    (450, 75, 300, 135, '第II部  Wally\n命令、cache、bus\n特権、uncore'),
    (845, 95, 300, 135, '第III部  Linux\nboot、DT、MMIO\nprocess、game'),
    (120, 590, 360, 135, '第IV部  RasterIX\ncommand、画素\ntexture、表示'),
    (720, 590, 360, 135, '第V部  統合と再現\nboard、SD、試験\n測定、診断'),
]
for x, y, w, h, label in parts:
    f.box(x, y, w, h, label, LIGHT, size=22, bold=True)
    cx, cy = x + w / 2, y + h / 2
    tx = 415 if cx < 415 else 785 if cx > 785 else cx
    ty = 315 if cy < 315 else 465
    f.line([(cx, cy + (h / 2 if cy < 315 else -h / 2)), (tx, ty)], BLUE)
f.text(80, 752, 1040, 50,
       '最初から順番に読むのではなく、知りたい部から入り、中央の境界へ戻る。',
       27, color=BLUE, bold=True)
f.save()


# Configuration propagation
f = Fig('deep-config-contract', 1200, 835)
title(f, 'Wallyの構成値が回路とsoftwareの約束になるまで')
arrow_row(f, ['derivlist.txt\n継承と差分', 'derivgen.pl\n生成',
              'config.vh\nlocalparam', 'parameter-defs.vh\ncvw_t P',
              'module生成\n幅・generate'], 105, x0=25, width=205, gap=30, height=100, size=23)
f.line([(600, 205), (600, 300)], BLUE)
branches = [
    (60, 330, 315, 128, '回路構造\ncache、port、data幅'),
    (442, 330, 315, 128, 'address map\nBASE、RANGE、decoder'),
    (824, 330, 315, 128, 'FPGA build\nTcl、IP、board top'),
]
for x, y, w, h, label in branches:
    f.box(x, y, w, h, label, LIGHT, size=27, bold=True)
    f.line([(600, 300), (x + w / 2, y)], BLUE)
f.box(290, 565, 620, 105, 'software側の一致\nDTB、ABI、driver/API、buffer address', WHITE,
      size=28, bold=True)
for x, _, w, h, _ in branches:
    f.line([(x + w / 2, 458), (600, 565)], BLUE)
f.text(75, 720, 1050, 60,
       'parameter変更は一行の編集ではなく、同じ契約を持つ層すべての変更である。',
       27, color=BLUE, bold=True)
f.save()


# IFU
f = Fig('deep-ifu-instruction', 1200, 800)
title(f, 'IFUでPCを選び、命令をdecode stageへ渡す')
f.box(35, 100, 220, 115, '次PC候補\n順次・予測\ntrap・return', LIGHT, size=22, bold=True)
f.box(320, 100, 205, 105, 'PC register\nStallFで保持', MID, size=25, bold=True)
f.box(590, 100, 250, 105, 'ITLB・PMP・PMA\n仮想→物理・権限', LIGHT, size=24, bold=True)
f.box(905, 100, 250, 105, 'I-cache / AHB\nhitまたは補充', MID, size=24, bold=True)
for a, b in [((255, 152), (320, 152)), ((525, 152), (590, 152)), ((840, 152), (905, 152))]:
    f.line([a, b], BLUE)
f.line([(1030, 205), (1030, 295), (770, 295)], BLUE)
f.box(620, 305, 300, 125, 'spill・decompress\n16/32 bit命令を\n組み立てる', LIGHT, size=23, bold=True)
f.box(250, 305, 300, 115, 'InstrD・PCD・fault\nvalidと一緒にDへ', MID, size=25, bold=True)
f.line([(620, 362), (550, 362)], BLUE)
f.box(70, 545, 305, 105, 'branch予測の学習\n実結果と予測を比較', WHITE, size=25)
f.box(447, 545, 305, 105, 'stall\n同じfetchを保持', WHITE, size=25)
f.box(824, 545, 305, 105, 'flush\n若い命令を無効化', WHITE, size=25)
f.text(75, 705, 1050, 45,
       'PCが見えただけでは実行完了ではない。InstrValidとretirementまで追う。',
       26, color=BLUE, bold=True)
f.save()


# Pipeline and hazard
f = Fig('deep-pipeline-hazard', 1200, 860)
title(f, 'dataとcontrolを同じ命令として五段pipelineへ運ぶ')
arrow_row(f, ['F\nfetch', 'D\ndecode\nreg read', 'E\nALU・branch',
              'M\nmemory・trap', 'W\nregister write'], 105,
          x0=20, width=205, gap=35, height=105, size=25)
f.text(50, 245, 1080, 42, 'data path: PC、operand、result、memory data', 26, bold=True)
f.line([(80, 310), (1120, 310)], BLUE)
f.text(50, 345, 1080, 42, 'control path: valid、write enable、memory op、destination', 26, bold=True)
f.line([(80, 410), (1120, 410)], BLUE)
f.box(70, 505, 305, 115, 'forwarding\n新しいM/W結果をEへ戻す', LIGHT, size=25, bold=True)
f.box(447, 505, 305, 115, 'stall + bubble\n値がまだ無ければ待つ', MID, size=25, bold=True)
f.box(824, 505, 305, 115, 'flush\n誤経路・trap後を捨てる', LIGHT, size=25, bold=True)
f.line([(222, 505), (490, 210)], BLUE, dash=True)
f.line([(600, 505), (375, 210)], BLUE, dash=True)
f.line([(976, 505), (600, 210)], BLUE, dash=True)
f.text(70, 690, 1060, 90,
       '命令bitがstageに残っていても、validとwrite enableが0ならarchitectural stateを変えない。\n正しさはregister更新とmemory side effectまで確認する。',
       25, color=BLUE, bold=True)
f.save()


# LSU hierarchy
f = Fig('deep-lsu-vm-cache', 1200, 850)
title(f, 'LSUで仮想addressを検査し、cacheまたはI/Oへ送る')
arrow_row(f, ['IEU address\nrs1 + immediate', 'DTLB\nVPN→PPN',
              'permission\nPMP・PMA', 'alignment\nsize・byte lane'],
          95, x0=25, width=250, gap=45, height=100, size=23)
f.line([(1060, 195), (1060, 285), (600, 285)], BLUE)
f.box(435, 305, 330, 105, '物理addressと\naccess属性', MID, size=25, bold=True)
f.line([(600, 400), (270, 510)], BLUE)
f.line([(600, 400), (930, 510)], BLUE)
f.box(75, 510, 390, 125, 'cacheable memory\nD-cache hit / miss\nwriteback・refill', LIGHT, size=27, bold=True)
f.box(735, 510, 390, 125, 'uncached MMIO\nEBU → AHB → APB\nreadyまでstall', LIGHT, size=27, bold=True)
f.text(65, 705, 1070, 70,
       'TLB missではHPTWがpage tableをmemoryから読む。\nCPU命令の要求とwalkの要求を同じものとして数えない。',
       26, color=BLUE, bold=True)
f.save()


# Privilege/trap
f = Fig('deep-privilege-trap', 1200, 850)
title(f, 'exception・interrupt・system callでprivilege境界を越える')
f.box(55, 110, 285, 135, 'U mode\ngame process\n仮想address', LIGHT, size=27, bold=True)
f.box(457, 110, 285, 135, 'S mode\nLinux kernel\npage table・driver', MID, size=27, bold=True)
f.box(860, 100, 285, 155, 'M mode\nOpenSBI\nPMP\nmachine service', LIGHT, size=24, bold=True)
f.line([(340, 165), (457, 165)], BLUE)
f.text(352, 118, 94, 35, 'ECALL', 19, bold=True)
f.line([(742, 165), (860, 165)], BLUE)
f.text(752, 118, 100, 35, 'SBI call', 19, bold=True)
f.line([(457, 218), (340, 218)], BLUE)
f.text(365, 232, 70, 32, 'SRET', 19, bold=True)
f.line([(860, 218), (742, 218)], BLUE)
f.text(765, 232, 70, 32, 'MRET', 19, bold=True)
f.box(110, 390, 285, 120, '同期exception\npage fault・illegal\nECALL', WHITE, size=25)
f.box(455, 390, 285, 120, 'interrupt\ntimer・PLIC\n命令外から到着', WHITE, size=25)
f.box(800, 390, 285, 120, 'trap state\nepc・cause・tval\nstatusを保存', WHITE, size=25)
for x in [252, 597, 942]:
    f.line([(x, 390), (600, 305)], BLUE)
f.box(325, 600, 550, 105, 'pipeline flushとside effect抑止\n古い命令は完了、若い命令は捨てる', MID, size=27, bold=True)
f.text(70, 758, 1060, 45, 'PC移動だけでなく、誤ったstoreやregister writeが残らないことを確認する。', 25,
       color=BLUE, bold=True)
f.save()


# Bus transaction
f = Fig('deep-bus-transaction', 1200, 860)
title(f, '一回のstoreがAPB peripheralへ届くまで')
arrow_row(f, ['LSU\nstore要求', 'EBU\nIFU/LSU仲裁', 'AHB\naddress phase',
              'AHB→APB\n二phaseへ変換', 'peripheral\nregister / FIFO'],
          90, x0=20, width=205, gap=35, height=100, size=23)
f.text(55, 240, 1090, 42, '要求方向: address、write data、size、strobe、control', 25, bold=True)
f.line([(80, 300), (1120, 300)], BLUE)
f.text(55, 340, 1090, 42, '応答方向: read data、ready、error', 25, bold=True)
f.line([(1120, 400), (80, 400)], BLUE)
f.box(90, 505, 300, 110, 'APB setup\nPSEL=1\nPENABLE=0', LIGHT, size=27, bold=True)
f.box(450, 505, 300, 110, 'APB access\nPSEL=1\nPENABLE=1', MID, size=27, bold=True)
f.box(810, 505, 300, 110, 'transfer成立\nPREADY=1のcycle\nside effectは一回', LIGHT, size=25, bold=True)
f.line([(390, 560), (450, 560)], BLUE)
f.line([(750, 560), (810, 560)], BLUE)
f.text(65, 700, 1070, 80,
       'PREADY=0の間はaddressとcontrolを保持する。\nCPU 20 MHzでも、readyを無視してよい理由にはならない。',
       26, color=BLUE, bold=True)
f.save()


# Software layers
f = Fig('deep-software-layers', 1200, 900)
title(f, '同じprojectでsoftwareが動く五つの場所')
rows = [
    ('host x86-64', 'Git・CMake・cross compiler・Vivado', 'bit / ELF / DTBを作る'),
    ('ZSBL 物理address', 'UART・SPI/SD・GPT・DDR copy', 'OpenSBI・kernel・DTBを配置'),
    ('OpenSBI M mode', 'machine CSR・PMP・SBI', 'S modeへserviceを提供'),
    ('Linux S mode', 'MMU・process・driver・file system', 'U modeの環境を作る'),
    ('game U mode', 'libc・C++・mmap・game loop', 'MMIO commandを送る'),
]
for x, w, head in [(35, 260, '実行場所'), (295, 470, '主なsoftware'), (765, 400, '次へ渡すもの')]:
    f.box(x, 80, w, 60, head, BLUE, size=24, bold=True)
for i, row in enumerate(rows):
    y = 140 + i * 132
    fill = LIGHT if i % 2 == 0 else WHITE
    f.box(35, y, 260, 112, row[0], fill, size=24, bold=True)
    f.box(295, y, 470, 112, row[1], fill, size=23)
    f.box(765, y, 400, 112, row[2], fill, size=23)
f.text(55, 815, 1090, 42, 'hostのbinaryとtargetのbinaryを、名前ではなくISAとhashで区別する。', 25,
       color=BLUE, bold=True)
f.save()


# Cross build
f = Fig('deep-cross-compile-elf', 1200, 850)
title(f, 'host上でRISC-V Linux向けELFを作りtargetへ配置する')
arrow_row(f, ['C++ source\nheader・macro', 'cross compiler\nRISC-V命令',
              'object .o\nsection・symbol', 'linker\nlibrary・ABI',
              'RISC-V ELF\nsegment・entry'],
          95, x0=20, width=205, gap=35, height=100, size=23)
f.line([(1055, 195), (1055, 310), (850, 310)], BLUE)
f.box(685, 335, 330, 105, 'SD / rootfsへcopy\nsha256で同一性確認', LIGHT, size=26, bold=True)
f.box(185, 335, 330, 105, 'file・readelf・objdump\nISA、ABI、static依存を確認', LIGHT, size=25, bold=True)
f.line([(685, 387), (515, 387)], BLUE)
f.box(335, 550, 530, 135, 'Linux loaderがsegmentを\n仮想memoryへmappingし\nentryからU mode processを開始', MID,
      size=24, bold=True)
f.line([(350, 440), (500, 560)], BLUE)
f.line([(850, 440), (700, 560)], BLUE)
f.text(70, 750, 1060, 45, 'build成功と、正しいABIのbinaryを実機で実行したことは別の確認である。', 25,
       color=BLUE, bold=True)
f.save()


# Boot chain
f = Fig('deep-boot-chain', 1200, 885)
title(f, 'reset後にSDからLinux shellへ到達する段階')
steps = [
    ('FPGA設定', 'CPU・DDR・SPI・UARTを回路として作る'),
    ('ZSBL', 'SD初期化、GPTを読み、imageをDDRへcopy'),
    ('OpenSBI', 'M mode初期化、SBI、Linuxへjump'),
    ('Linux kernel', 'MMU、interrupt、driver、rootfs'),
    ('BusyBox init', 'consoleとshellをU modeで開始'),
]
for i, (name, desc) in enumerate(steps):
    y = 75 + i * 145
    f.box(65, y, 280, 95, name, LIGHT if i % 2 == 0 else MID, size=28, bold=True)
    f.box(430, y, 705, 95, desc, WHITE, size=25)
    if i < len(steps) - 1:
        f.line([(205, y + 95), (205, y + 137)], BLUE)
f.text(65, 807, 1070, 45, '最後に出たlogを使い、到達済みの段階と次に調べる段階を分ける。', 26,
       color=BLUE, bold=True)
f.save()


# Virtual MMIO
f = Fig('deep-virtual-mmio', 1200, 830)
title(f, 'U modeのpointerがRasterIXの物理registerへ届く')
f.box(60, 100, 300, 115, 'game process\nvirtual pointer\nregs[3]', LIGHT, size=27, bold=True)
f.box(450, 100, 300, 115, 'page table + TLB\nvirtual pageを\nphysical pageへ', MID, size=26, bold=True)
f.box(840, 100, 300, 115, 'physical MMIO\n0x1008000c\nID register', LIGHT, size=27, bold=True)
f.line([(360, 157), (450, 157)], BLUE)
f.line([(750, 157), (840, 157)], BLUE)
f.box(95, 350, 300, 115, 'open /dev/mem\n権限とfile descriptor', WHITE, size=25)
f.box(450, 350, 300, 115, 'mmap 4096 byte\npage単位で対応付け', WHITE, size=25)
f.box(805, 350, 300, 115, 'volatile load/store\n32 bit aligned access', WHITE, size=25)
f.line([(245, 350), (210, 215)], BLUE)
f.line([(600, 350), (600, 215)], BLUE)
f.line([(955, 350), (990, 215)], BLUE)
f.box(270, 590, 660, 115, 'Linux system callはmapping作成時に使う\nmapping後の各accessは\nCPUのload/storeとして進む', MID,
      size=24, bold=True)
f.text(70, 748, 1060, 45, 'virtual addressとphysical addressとregister offsetを同じ数字だと思わない。', 26,
       color=BLUE, bold=True)
f.save()


# DT contract
f = Fig('deep-device-tree-contract', 1200, 850)
title(f, 'device treeは存在する回路をLinuxへ説明する')
f.box(55, 100, 330, 145, 'RTL・board\ndecoder、clock、wire\n実際に存在するhardware', LIGHT, size=27, bold=True)
f.box(435, 100, 330, 145, 'DTS → DTB\nreg、clock、interrupt\nreserved-memory', MID, size=27, bold=True)
f.box(815, 100, 330, 145, 'Linux・driver\nresourceを取得し\n正しい方法で操作', LIGHT, size=27, bold=True)
f.line([(385, 172), (435, 172)], BLUE)
f.line([(765, 172), (815, 172)], BLUE)
rows = [
    ('memory size', 'MIG・decoder', 'memory reg'),
    ('device address', 'BASE / RANGE', 'reg'),
    ('clock', 'MMCM・TIMECLK', 'clock-frequency'),
    ('interrupt', 'PLIC wiring / ID', 'interrupts'),
    ('shared buffer', 'master address', 'reserved-memory'),
]
for x, w, h in [(80, 310, '契約'), (390, 350, 'hardwareの根拠'), (740, 380, 'DTの表現')]:
    f.box(x, 320, w, 55, h, BLUE, size=23, bold=True)
for i, row in enumerate(rows):
    y = 375 + i * 72
    fill = WHITE if i % 2 else LIGHT
    f.box(80, y, 310, 62, row[0], fill, size=22)
    f.box(390, y, 350, 62, row[1], fill, size=22)
    f.box(740, y, 380, 62, row[2], fill, size=22)
f.text(65, 770, 1070, 44, 'DTBを変えても回路は変わらない。不一致を早く検出するために照合する。', 25,
       color=BLUE, bold=True)
f.save()


# RasterIX software stack
f = Fig('deep-rasterix-software-stack', 1200, 910)
title(f, 'OpenGL風APIから32 bit command wordとRTL処理まで')
layers = [
    ('game', 'scene、四角形、文字、game state'),
    ('RIXGL state', 'color、matrix、texture、test、blend'),
    ('vertex software', 'primitive assembly、transform、clipping'),
    ('display list', 'triangle descriptorとtransfer packet'),
    ('WallyBusConnector', 'bufferからMMIOへ一語ずつstore'),
    ('APB + async FIFO', 'clock境界を越えてvalid/ready streamへ'),
    ('RasterIX RTL', 'rasterize、texture、test、framebuffer'),
]
for i, (name, desc) in enumerate(layers):
    y = 70 + i * 108
    f.box(65, y, 285, 75, name, LIGHT if i % 2 == 0 else MID, size=25, bold=True)
    f.box(430, y, 705, 75, desc, WHITE, size=23)
    if i < len(layers) - 1:
        f.line([(207, y + 75), (207, y + 102)], BLUE)
f.text(65, 842, 1070, 43, '「APIを呼んだ瞬間に画素が出る」と考えず、保存・変換・転送の境界を追う。', 25,
       color=BLUE, bold=True)
f.save()


# Game loop
f = Fig('deep-game-loop', 1200, 820)
title(f, 'simulation tickとrender frameを別の進行として扱う')
steps = ['時刻取得', '入力poll', '60 Hz\ngame step', 'scene生成', '描画・送信', 'swap完了待ち']
arrow_row(f, steps, 105, x0=15, width=165, gap=35, height=95, size=22)
f.line([(1090, 152), (1155, 152), (1155, 305), (95, 305), (95, 200)], BLUE)
f.box(70, 400, 310, 115, 'game state\nball、paddle、brick\nscore・lives', LIGHT, size=26, bold=True)
f.box(445, 400, 310, 115, 'render state\ndraw list、dirty region\n二bufferの履歴', MID, size=26, bold=True)
f.box(820, 400, 310, 115, 'display state\nframe count\n表示中buffer', LIGHT, size=26, bold=True)
f.line([(380, 457), (445, 457)], BLUE)
f.line([(755, 457), (820, 457)], BLUE)
f.text(75, 630, 1050, 105,
       'renderが遅くても、elapsed timeに応じてgame stepを進める。\nFPS、simulation速度、display refreshを同じ値として報告しない。',
       28, color=BLUE, bold=True)
f.save()


# Diagnosis ladder
f = Fig('deep-diagnosis-ladder', 1200, 920)
title(f, '最初に異なる境界を探し、調査範囲を小さくする')
steps = [
    ('1 生成物', 'commit・submodule・hash・tool版'),
    ('2 boot', 'ZSBL → OpenSBI → Linux → shell'),
    ('3 MMIO', 'ID registerとstatus read'),
    ('4 command', 'APB transferとFIFO count'),
    ('5 描画', 'framebufferの期待pixel'),
    ('6 表示', 'swap、pixel timing、receiver'),
]
for i, (name, desc) in enumerate(steps):
    x = 70 + i * 90
    y = 75 + i * 115
    w = max(360, 1060 - i * 180)
    f.box(x, y, w, 88, name + '\n' + desc, LIGHT if i % 2 == 0 else MID,
          size=22, bold=True)
f.text(65, 800, 1070, 70,
       '一段が通れば、次の段へ進む。最終症状から遠い部分を同時に多数変更しない。',
       27, color=BLUE, bold=True)
f.save()


# End-to-end latency
f = Fig('deep-end-to-end-latency', 1200, 820)
title(f, '一frameの時間をsoftwareとhardwareの区間へ分ける')
segments = [
    ('game update', 150, LIGHT),
    ('scene / draw準備', 235, MID),
    ('MMIO送信', 180, LIGHT),
    ('RasterIX実行', 235, MID),
    ('DDR commit', 170, LIGHT),
    ('swap待ち', 145, MID),
]
x = 35
for name, w, fill in segments:
    f.box(x, 130, w, 105, name, fill, size=23, bold=True)
    x += w
f.line([(35, 285), (1165, 285)], arrow=False, color=INK)
marks = [('t0', 35), ('t1', 185), ('t2', 420), ('t3', 600), ('t4', 835), ('t5', 1005), ('t6', 1150)]
for label, mx in marks:
    f.line([(mx, 270), (mx, 300)], arrow=False, color=INK)
    f.text(mx - 30, 305, 60, 35, label, 21, bold=True)
f.box(80, 420, 305, 115, 'software量\ndraw call、word数\n命令数', WHITE, size=25)
f.box(447, 420, 305, 115, 'hardware量\nFIFO wait、busy\nDDR traffic', WHITE, size=25)
f.box(814, 420, 305, 115, 'end-to-end\nframe interval\nswap count', WHITE, size=25)
f.text(70, 650, 1060, 90,
       '時間だけで原因を決めず、変更で減るはずの中間量も測る。\n重なる区間は、足し算できるかをtimelineで確認する。',
       27, color=BLUE, bold=True)
f.save()


(ROOT / 'figures-system-deep.json').write_text(
    json.dumps(FIGS, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created', len(FIGS), 'deep system figures')
