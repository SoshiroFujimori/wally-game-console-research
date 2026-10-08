from figlib import *


def title(f, value):
    f.text(10, 0, f.w - 20, 54, value, 32, bold=True)


# The three command layers are deliberately separated.  They are often all
# called "commands" in prose, although their encodings and consumers differ.
f = Fig('rix-three-command-layers', 1200, 730)
title(f, '同じ「命令」という語で呼ばれる三つの別物')
rows = [
    (72, '① CPU命令', 'RISC-Vのstore命令', 'Wallyが実行', 'APBレジスタへ32 bitを書く'),
    (264, '② 外側の\n転送命令', 'OP_STREAM\nOP_STORE／OP_LOAD', 'FrameStreamingCore\nが解読', '転送元・転送先・\n長さを決める'),
    (456, '③ 内側の\n描画命令', '設定／三角形／\n画像操作', 'CommandParser\nが解読', '描画回路の\n動作を決める'),
]
for y, n, enc, who, result in rows:
    f.box(22, y, 200, 118, n, MID, size=25, bold=True)
    f.box(270, y, 250, 118, enc, WHITE, size=22, bold=True)
    f.box(568, y, 270, 118, who, LIGHT, size=21)
    f.box(886, y, 290, 118, result, WHITE, size=22)
    f.line([(222, y + 59), (270, y + 59)])
    f.line([(520, y + 59), (568, y + 59)])
    f.line([(838, y + 59), (886, y + 59)])
f.text(22, 620, 1154, 80,
       '②のペイロードの中に③が入り、その全体を①のstore命令で一語ずつ送る。\n'
       '同じ32 bit幅でも、読む回路とbit配置が違う。', 27, color=BLUE, bold=True)
f.save()


# Exact numerical path added for the source-pinned mathematical audit.
f = Fig('rix-coordinate-pipeline-exact', 1200, 760)
title(f, '同じ頂点でも、段階ごとに値・単位・表現が変わる')
stages = [
    ('object', 'ゲーム座標\nfloat', '行列'),
    ('clip', 'x,y,z,w\nfloat', 'clip'),
    ('NDC', 'x/w,y/w,z/w\nfloat', 'viewport'),
    ('window', '画素座標\nfloat', '×32 + 0.5'),
    ('Q5', '座標整数\nint32', '辺関数'),
    ('edge', 'w0,w1,w2\nint32', ''),
]
xs = [20, 215, 410, 605, 800, 995]
for i, (name, value, op) in enumerate(stages):
    fill = MID if i in (0, 5) else LIGHT if i in (2, 4) else WHITE
    f.box(xs[i], 135, 170, 120, name, fill, size=27, bold=True)
    f.box(xs[i], 300, 170, 100, value, WHITE, size=23)
    if i < len(stages) - 1:
        f.line([(xs[i] + 170, 195), (xs[i + 1], 195)], BLUE)
        f.text(xs[i] + 148, 72, 90, 45, op, 18, color=BLUE)
f.box(65, 500, 1070, 125,
      '「x=1」という値だけでは比較できない\n'
      'objectの1、windowの1画素、Q5の32は同じ位置を別の単位で表す',
      WHITE, size=27, bold=True)
f.text(65, 668, 1070, 40, '式を読むときは、変数名の横へ単位とbit幅を書き足す。', 26, color=BLUE)
f.save()


f = Fig('rix-fixed-rounding-asymmetry', 1200, 700)
title(f, 'Q5変換は正数と負数で対称な四捨五入ではない')
f.box(245, 78, 710, 85, 'Q5(x) = truncTowardZero(32x + 0.5)', MID, size=30, bold=True)
examples = [
    ('x = −1.0', '32x+0.5 = −31.5', '保存 −31', '−0.96875'),
    ('x = −0.5', '32x+0.5 = −15.5', '保存 −15', '−0.46875'),
    ('x = 0.5', '32x+0.5 = 16.5', '保存 16', '0.5'),
    ('x = 1.0', '32x+0.5 = 32.5', '保存 32', '1.0'),
]
ys = [220, 315, 410, 505]
for i, (inp, shifted, integer, decoded) in enumerate(examples):
    f.box(30, ys[i], 220, 65, inp, LIGHT if i < 2 else WHITE, size=23, bold=True)
    f.box(285, ys[i], 315, 65, shifted, WHITE, size=22)
    f.box(635, ys[i], 220, 65, integer, MID if i in (1, 2) else LIGHT, size=22, bold=True)
    f.box(890, ys[i], 280, 65, '解釈 ' + decoded, WHITE, size=22)
    f.line([(250, ys[i] + 32), (285, ys[i] + 32)], BLUE)
    f.line([(600, ys[i] + 32), (635, ys[i] + 32)], BLUE)
    f.line([(855, ys[i] + 32), (890, ys[i] + 32)], BLUE)
f.text(45, 620, 1110, 45, 'C++の整数変換が0方向へ切り捨てるため、負数は原点側へ偏る。', 27, color=BLUE, bold=True)
f.save()


f = Fig('rix-bbox-sample-lattice', 1200, 780)
title(f, 'bounding boxは「塗る範囲」ではなく「調べる候補範囲」')
gx, gy, cell = 70, 120, 88
for r in range(6):
    for c in range(6):
        fill = MID if c < 4 and r < 4 else WHITE
        f.box(gx + c * cell, gy + r * cell, cell, cell, f'({c},{r})', fill, size=17)
for c in range(6):
    for r in range(6):
        f.dot(gx + c * cell + cell / 2, gy + r * cell + cell / 2, 5)
f.poly([(gx + .5*cell, gy + .5*cell), (gx + 4.5*cell, gy + .5*cell),
        (gx + 4.5*cell, gy + 4.5*cell), (gx + .5*cell, gy + 4.5*cell)],
       fill='none', stroke=BLUE)
f.box(680, 130, 470, 92, 'bbox [0,5) × [0,5)\n候補は25位置', LIGHT, size=27, bold=True)
f.box(680, 280, 470, 92, '辺関数を三辺で評価\n内側だけfragmentにする', WHITE, size=26)
f.box(680, 430, 470, 92, 'この4×4例の和集合\n16画素', MID, size=28, bold=True)
f.line([(915, 222), (915, 280)], BLUE)
f.line([(915, 372), (915, 430)], BLUE)
f.text(60, 690, 1080, 48, 'x=4、y=4の候補がbboxに入っても、辺関数で外側なら書かれない。', 25, color=BLUE)
f.save()


f = Fig('rix-edge-increment-proof', 1200, 720)
title(f, '一画素移動した差を取ると、乗算が消えて一定値になる')
f.box(35, 95, 1130, 78, 'E(A,B,P) = (Px−Ax)(By−Ay) − (Py−Ay)(Bx−Ax)', LIGHT, size=28, bold=True)
f.box(35, 240, 515, 230,
      '右へ一画素  Px ← Px+32\n\n'
      'ΔxE = 32(By−Ay)\n\n'
      'Pの現在値に依存しない', WHITE, size=28, bold=True)
f.box(650, 240, 515, 230,
      '次の行へ  Py ← Py+32\n\n'
      'ΔyE = 32(Ax−Bx)\n\n'
      'Pの現在値に依存しない', WHITE, size=28, bold=True)
f.line([(292, 173), (292, 240)], BLUE)
f.line([(908, 173), (908, 240)], BLUE)
f.box(160, 555, 880, 83, 'CPUが増分を一度計算し、RTLは32 bit加算で歩く', MID, size=30, bold=True)
f.save()


f = Fig('rix-shared-edge-double-hit', 1200, 760)
title(f, '二三角形は4×4を覆うが、共有対角線を二度生成する')
gx, gy, cell = 75, 125, 120
for y in range(4):
    for x in range(4):
        duplicate = x == y
        f.box(gx + x*cell, gy + y*cell, cell, cell,
              'T0+T1' if duplicate else ('T0' if x > y else 'T1'),
              MID if duplicate else LIGHT if x > y else WHITE,
              size=21, bold=duplicate)
        f.text(gx + x*cell, gy + y*cell + 78, cell, 28, f'({x},{y})', 16)
f.box(660, 140, 470, 88, '異なる画素 16', LIGHT, size=29, bold=True)
f.box(660, 285, 470, 88, 'fragment合計 20', WHITE, size=29, bold=True)
f.box(660, 430, 470, 105, '共有辺の重複 4\n(0,0) (1,1) (2,2) (3,3)', MID, size=25, bold=True)
f.text(65, 650, 1080, 55, '不透明上書きでは見えなくても、blendやstencilは二度作用し得る。', 27, color=BLUE, bold=True)
f.save()


f = Fig('rix-scissor-two-layers', 1200, 690)
title(f, 'scissorはCPUの早期除外とRTLの書込みmaskに分かれる')
f.box(35, 120, 360, 160, 'CPU Rasterizer.cpp\n\n全く重ならない三角形を捨てる', LIGHT, size=25, bold=True)
f.box(420, 120, 360, 160, 'RTL Rasterizer\n\n元のbounding boxを走査', WHITE, size=25, bold=True)
f.box(805, 120, 360, 160, 'FramebufferScissor.v\n\nstart ≤ p < endだけ書く', MID, size=24, bold=True)
f.line([(395, 200), (420, 200)], BLUE)
f.line([(780, 200), (805, 200)], BLUE)
f.box(130, 400, 940, 90, 'CPU側は重なる図形のdescriptor bboxを書き換えない', WHITE, size=29, bold=True)
f.box(130, 540, 940, 90, '従ってscissorは最終画像を制限するが、走査量を同じ面積まで減らさない', LIGHT, size=26)
f.save()


f = Fig('rix-fixed-formats', 1200, 790)
title(f, '同じ32 bitを属性ごとに異なる二進小数点で読む')
rows = [
    ('S3.28 texture', 3, 28, '−8 〜 8−2⁻²⁸'),
    ('S1.30 depth', 1, 30, '−2 〜 2−2⁻³⁰'),
    ('S7.24 color', 7, 24, '−128 〜 128−2⁻²⁴'),
    ('S16.15 texel', 16, 15, '−65536 〜 65536−2⁻¹⁵'),
]
for i, (name, ints, fracs, rng) in enumerate(rows):
    y = 105 + i * 145
    f.text(20, y + 20, 230, 48, name, 24, bold=True, align='left')
    f.box(250, y, 70, 82, '符号\n1', MID, size=20, bold=True)
    intw = 30 + ints * 17
    fracw = 760 - intw
    f.box(320, y, intw, 82, f'整数 {ints}', LIGHT, size=22)
    f.box(320 + intw, y, fracw, 82, f'小数 {fracs}', WHITE, size=22)
    f.text(250, y + 92, 830, 33, rng, 20, color=BLUE)
f.text(30, 715, 1140, 43, '小数bitが多いほど細かい値を表せるが、整数範囲は狭くなる。', 26, color=BLUE, bold=True)
f.save()


f = Fig('rix-float-to-fixed-boundaries', 1200, 820)
title(f, 'floatから固定小数点へ変換するときの二つの境界')
f.box(35, 78, 1130, 78, 'p = 不偏指数 e + 小数bit数 F　　真の右shift量 = 23 − p', LIGHT, size=27, bold=True)

f.box(35, 215, 330, 155,
      '通常の有限範囲\n−8 ≤ p ≤ 22\n24 ≤ p ≤ 30\nshift量をそのまま表せる', WHITE, size=23, bold=True)
f.box(435, 215, 330, 155,
      '境界①  p = 23\nshift量 = 0\n\n捨てるbitは存在しない', MID, size=25, bold=True)
f.box(835, 215, 330, 155,
      '境界②  p < −8\nshift量 > 31\n\n5 bitへ入れると32周期で戻る', LIGHT, size=24, bold=True)
f.line([(600, 156), (600, 185), (200, 185), (200, 215)], BLUE)
f.line([(600, 156), (600, 215)], BLUE)
f.line([(600, 156), (600, 185), (1000, 185), (1000, 215)], BLUE)

f.box(435, 445, 330, 120,
      'RTL: number[−1] → X\n合成後: round=0相当\n代表値は正しい', WHITE, size=23)
f.box(835, 445, 330, 120,
      '仮数bitを再選択し得る\n本来0が +1 / −1\n合成後にも再現', MID, size=23, bold=True)
f.line([(600, 370), (600, 445)], BLUE)
f.line([(1000, 370), (1000, 445)], BLUE)

f.box(95, 650, 1010, 92,
      'Breakout代表descriptor\n単色の増分は0、文字textureの最小非0値0.00451055 > 2⁻³⁶',
      WHITE, size=25, bold=True)
f.text(80, 765, 1040, 35, '「範囲内」だけでなく、極小非0値を送らないという入力条件も必要。', 25, color=BLUE)
f.save()


f = Fig('rix-perspective-exact', 1200, 720)
title(f, 'texture座標は分子と分母を別々に補間してから割る')
f.box(25, 100, 280, 130, '各頂点 i\n(sᵢ,tᵢ,qᵢ)\nrᵢ=1/wclip,ᵢ', LIGHT, size=24, bold=True)
f.box(370, 100, 350, 130, 'CPUで作る三値\nsᵢrᵢ, tᵢrᵢ, qᵢrᵢ', WHITE, size=27, bold=True)
f.box(785, 100, 390, 130, '画面上でaffine補間\nS=Σλsᵢrᵢ\nT=Σλtᵢrᵢ  Q=Σλqᵢrᵢ', MID, size=23, bold=True)
f.line([(305, 165), (370, 165)], BLUE)
f.line([(720, 165), (785, 165)], BLUE)
f.box(175, 355, 370, 115, 'XRecip\n1/Qを約24 bitで近似', LIGHT, size=26)
f.box(655, 355, 370, 115, '乗算\ns=S/Q  t=T/Q', WHITE, size=29, bold=True)
f.line([(980, 230), (980, 300), (360, 300), (360, 355)], BLUE)
f.line([(545, 412), (655, 412)], BLUE)
f.box(175, 555, 850, 82, '正投影でrとqが各頂点同じなら、共通倍率は分子と分母で消える', MID, size=26, bold=True)
f.save()


f = Fig('rix-bilinear-integer', 1200, 760)
title(f, 'bilinear filterは8 bit整数混合を三回行う')
positions = [(80, 120, 'C00'), (420, 120, 'C01'), (80, 430, 'C10'), (420, 430, 'C11')]
for x, y, label in positions:
    f.box(x, y, 170, 100, label, LIGHT, size=30, bold=True)
f.box(260, 245, 240, 95, 'h0 = mix\n(C00,C01,u8)', WHITE, size=24, bold=True)
f.box(260, 555, 240, 95, 'h1 = mix\n(C10,C11,u8)', WHITE, size=24, bold=True)
for a, b in [((165,220),(310,245)),((505,220),(450,245)),((165,530),(310,555)),((505,530),(450,555))]:
    f.line([a,b], BLUE)
f.box(680, 365, 300, 110, 'out = mix\n(h0,h1,v8)', MID, size=27, bold=True)
f.line([(500,292),(680,400)], BLUE)
f.line([(500,602),(680,440)], BLUE)
f.box(650, 105, 500, 140,
      'mix(A,B,u) =\nmin(255,⌊(A(255−u)+Bu+255)/256⌋)',
      WHITE, size=25, bold=True)
f.text(620, 590, 550, 85, '各mix後に8 bitへ戻るため、\n実数式を一度だけ計算した値とは限らない。', 24, color=BLUE, bold=True)
f.save()


f = Fig('rix-verification-layers', 1200, 820)
title(f, '一つの試験だけで全体の正しさは証明できない')
layers = [
    (55, 90, 1090, '代数・SMT　恒等式を全整数で確認', MID),
    (100, 185, 1000, 'source照合　式・bit幅・丸め・境界条件', LIGHT),
    (145, 280, 910, '独立数理監査　任意精度・既知値・乱数', WHITE),
    (190, 375, 820, '独立RTL監査　三角形13,536件＋float境界11件', LIGHT),
    (235, 470, 730, '公式単体試験　software 9件・RTL 31件', WHITE),
    (280, 565, 640, '統合・実機　bitstream・画像・性能', MID),
]
for x, y, w, label, fill in layers:
    f.box(x, y, w, 66, label, fill, size=24, bold=True)
f.text(120, 680, 960, 70, '下の層ほど実物に近い。上の層ほど式の原因を狭く説明できる。\n両方を結び付けて初めて、主張の範囲が分かる。', 24, color=BLUE, bold=True)
f.save()


f = Fig('rix-source-roadmap', 1200, 900)
title(f, '四角形を追うときに開くソースの順序')
steps = [
    ('ゲーム', 'glBegin／glVertex／glEnd', 'lib/gl/opengl'),
    ('入力の保存', 'VertexQueue・RenderObj', 'lib/gl/vertexpipeline'),
    ('頂点の処理', 'VertexPipeline・PrimitiveAssembler', 'lib/gl/transform'),
    ('三角形の記述', 'Rasterizer・TriangleStreamCmd', 'lib/gl/renderer'),
    ('命令列の転送', 'DisplayList・DeviceDataUploader', 'lib/gl/renderer'),
    ('転送の解読', 'FrameStreamingCore', 'rtl/RasterIX'),
    ('描画の解読', 'CommandParser・RasterIXRenderCore', 'rtl/RasterIX'),
    ('画素の生成', 'Rasterizer・AttributeInterpolatorX', 'rtl/RasterIX'),
    ('色の決定', 'PixelPipeline・PerFragmentPipeline', 'rtl/RasterIX'),
    ('画像の保存', 'InternalFramebuffer・RasterIXCoreIF', 'rtl/RasterIX'),
]
for i, (role, names, path) in enumerate(steps):
    y = 69 + i * 78
    f.box(20, y, 165, 58, role, MID if i in (0, 9) else LIGHT, size=23, bold=True)
    f.box(230, y, 530, 58, names, WHITE, size=23)
    f.box(805, y, 370, 58, path, WHITE, size=21)
    if i < len(steps) - 1:
        f.line([(102, y + 58), (102, y + 78)], BLUE)
f.text(18, 855, 1160, 35, '上から順に、データの姿が変わる境界で停止して入出力を確認する。', 25, color=BLUE)
f.save()


f = Fig('rix-quad-end-to-end', 1200, 760)
title(f, '一つの四角形が画像になるまで')
f.box(20, 82, 245, 100, '四頂点\nP0 P1 P2 P3', LIGHT, size=27, bold=True)
f.box(346, 82, 245, 100, '二つの三角形\nP0 P1 P2\nP0 P2 P3', MID, size=25, bold=True)
f.box(672, 82, 245, 100, '三角形記述子\n境界・辺・色の増分', LIGHT, size=24)
f.box(982, 82, 198, 100, '描画命令列', WHITE, size=25, bold=True)
for x0, x1 in [(265, 346), (591, 672), (917, 982)]:
    f.line([(x0, 132), (x1, 132)])
f.box(20, 284, 245, 100, 'FrameStreamingCore\n外側を解読', WHITE, size=24)
f.box(346, 284, 245, 100, 'CommandParser\n内側を解読', LIGHT, size=24)
f.box(672, 284, 245, 100, 'Rasterizer\n内側の画素を列挙', MID, size=24)
f.box(982, 284, 198, 100, '属性補間\n色・深度・座標', WHITE, size=23)
for x0, x1 in [(265, 346), (591, 672), (917, 982)]:
    f.line([(x0, 334), (x1, 334)])
f.line([(1081, 182), (1081, 238), (102, 238), (102, 284)], BLUE)
f.box(20, 487, 245, 100, 'TMUとFog\n元の色を加工', WHITE, size=25)
f.box(346, 487, 245, 100, '画素単位の試験\n混色・深度・Stencil', LIGHT, size=23)
f.box(672, 487, 245, 100, '内部Framebuffer\n色・深度・Stencil', MID, size=23)
f.box(982, 487, 198, 100, 'DDR3へcommit\n表示先をswap', WHITE, size=22)
for x0, x1 in [(265, 346), (591, 672), (917, 982)]:
    f.line([(x0, 537), (x1, 537)])
f.line([(1081, 384), (1081, 440), (102, 440), (102, 487)], BLUE)
f.text(20, 635, 1160, 78,
       'CPUが画素を一つずつ書くのではない。\n'
       'CPUは三角形を記述し、RTLが対象画素を列挙して色を決める。',
       25, color=BLUE, bold=True)
f.save()


f = Fig('rix-outer-stream-header', 1200, 655)
title(f, 'FrameStreamingCoreへ渡す外側の転送ヘッダ')
f.text(30, 70, 1140, 44, '第1語  32 bit', 27, bold=True)
widths = [150, 150, 840]
labels = ['送信先\n2 bit', '送信元\n2 bit', 'バイト数\n28 bit']
x = 30
for w, label, fill in zip(widths, labels, [MID, LIGHT, WHITE]):
    f.box(x, 120, w, 100, label, fill, size=26, bold=True)
    x += w
f.text(30, 235, 1140, 35, '上位bit　　　　　　　　　　　　　　　　　　　　　　　　　下位bit', 22)
f.text(30, 294, 1140, 44, '第2語  メモリが関係するときの先頭アドレス', 27, bold=True)
f.box(30, 344, 1140, 88, '32 bit address', LIGHT, size=29, bold=True)
f.text(30, 478, 1140, 44, '第3語以降  指定した長さのペイロード', 27, bold=True)
for i, label in enumerate(['data 0', 'data 1', '…', 'data n−1']):
    f.box(30 + i * 285, 527, 250, 68, label, WHITE, size=26)
f.text(30, 610, 1140, 30, 'ST0・ST1・MEMなどの番号は、接続先の種類を表す。', 23, color=BLUE)
f.save()


f = Fig('rix-command-parser-fsm', 1200, 630)
title(f, 'CommandParserの三状態と、次の命令を受ける条件')
f.box(35, 140, 275, 120, 'WAIT_FOR_IDLE\n前の仕事の終了待ち', LIGHT, size=26, bold=True)
f.box(457, 140, 275, 120, 'COMMAND_IN\n先頭語を解読', MID, size=26, bold=True)
f.box(879, 140, 275, 120, 'EXEC_STREAM\n後続データを転送', LIGHT, size=26, bold=True)
f.line([(310, 200), (457, 200)], BLUE)
f.line([(732, 200), (879, 200)], BLUE)
f.line([(1017, 260), (1017, 335), (594, 335), (594, 260)], BLUE)
f.text(48, 295, 250, 65, '描画器・TMU・画像操作が\n安全に開始できるまで待つ', 23)
f.text(461, 365, 267, 65, '設定命令など、後続語が\n一語ならここで処理', 23)
f.text(875, 365, 282, 65, '三角形・テクスチャなどの\n複数語を各入力へ振り分ける', 23)
f.box(194, 487, 812, 80,
      'valid=1 かつ ready=1 の周期だけ一語が進む\n受け側が止まれば skid buffer または上流で保持する',
      WHITE, size=25, bold=True)
f.save()


f = Fig('rix-edge-walk', 1200, 790)
title(f, '辺関数で三角形の内側を一行ずつ探す')
# grid and triangle
gx, gy, cell = 65, 105, 66
for i in range(10):
    f.line([(gx + i * cell, gy), (gx + i * cell, gy + 8 * cell)], GREY, arrow=False)
for j in range(9):
    f.line([(gx, gy + j * cell), (gx + 9 * cell, gy + j * cell)], GREY, arrow=False)
tri = [(gx + 2 * cell, gy + 7 * cell), (gx + 5 * cell, gy + cell), (gx + 8 * cell, gy + 7 * cell)]
f.poly(tri, fill=LIGHT, stroke=BLUE)
for row in range(2, 7):
    y = gy + row * cell + cell / 2
    left = gx + (2.5 + (row - 2) * -0.03) * cell
    right = gx + (7.5 - (row - 2) * -0.03) * cell
    f.line([(left, y), (right, y)], BLUE)
f.box(735, 118, 420, 84, 'INIT\n境界箱の左上を準備', WHITE, size=25)
f.box(735, 236, 420, 84, 'SEARCH_LEFT\n内側へ入る画素を探す', LIGHT, size=25)
f.box(735, 354, 420, 84, 'WALK／WALK_OUT\n右端まで画素を出す', MID, size=25)
f.box(735, 472, 420, 84, 'Y_INC／SEARCH_RIGHT\n次の行へ移る', LIGHT, size=25)
for y0 in [202, 320, 438]:
    f.line([(945, y0), (945, y0 + 34)], BLUE)
f.text(55, 660, 1100, 90,
       '各画素で三本の辺関数w0・w1・w2を調べ、三つとも負でない位置を内側とする。\n'
       '一画素移動するたびに、乗算し直さず一定の増分を加える。', 27, color=BLUE, bold=True)
f.save()


f = Fig('rix-attribute-increments', 1200, 650)
title(f, '色や深度を「初期値＋一定の増分」で求める')
colors = ['#E5EBF8', '#D9E4F6', '#CCD9F1', '#B8CDEB', '#9DBBE4', '#77A3DC']
for row in range(4):
    for col in range(6):
        f.box(65 + col * 105, 120 + row * 105, 105, 105,
              f'x+{col}\ny+{row}', colors[min(5, col + row)], size=20)
f.text(760, 110, 390, 48, '例  赤成分R', 29, bold=True)
f.box(760, 170, 390, 78, '左上のR = 40', LIGHT, size=27)
f.box(760, 278, 390, 78, '一画素右  R += 12', WHITE, size=27)
f.box(760, 386, 390, 78, '一行下    R += 5', WHITE, size=27)
f.text(760, 497, 390, 85, '位置(x,y)の値\n40 + 12x + 5y', 29, color=BLUE, bold=True)
f.text(30, 587, 1140, 38, '色・深度・テクスチャ座標を同じ考え方で並列に更新する。', 26)
f.save()


f = Fig('rix-perspective-correction', 1200, 590)
title(f, 'テクスチャ座標の補間と遠近補正')
f.box(25, 110, 245, 105, 'CPU側で用意\ns×q, t×q, q', LIGHT, size=25, bold=True)
f.box(354, 110, 245, 105, '補間器\n三つの値を増分更新', WHITE, size=24)
f.box(683, 110, 245, 105, '逆数器\n1÷qを近似', MID, size=25, bold=True)
f.box(982, 110, 193, 105, '乗算\ns, tを復元', WHITE, size=23)
for x0, x1 in [(270, 354), (599, 683), (928, 982)]:
    f.line([(x0, 162), (x1, 162)])
f.box(163, 315, 370, 95, '固定小数点入力\nS3.28 など', WHITE, size=26)
f.box(667, 315, 370, 95, 'テクスチャ座標出力\nS16.15', LIGHT, size=26)
f.line([(533, 362), (667, 362)], BLUE)
f.text(35, 470, 1130, 75,
       'Wally構成は固定小数点経路AttributeInterpolatorXを使う。\n'
       '二次元描画でも同じ回路を通るが、qが一定なら補正結果は単純になる。',
       27, color=BLUE, bold=True)
f.save()


f = Fig('rix-tmu-four-texels', 1200, 660)
title(f, '一つの座標の周囲から四つのtexelを読む')
for r in range(4):
    for c in range(5):
        fill = MID if (r, c) in [(1, 2), (1, 3), (2, 2), (2, 3)] else WHITE
        f.box(60 + c * 110, 105 + r * 110, 110, 110,
              ('00' if (r, c) == (1, 2) else '10' if (r, c) == (1, 3) else
               '01' if (r, c) == (2, 2) else '11' if (r, c) == (2, 3) else ''),
              fill, size=30, bold=True)
f.dot(60 + 2.62 * 110, 105 + 1.38 * 110, 8)
f.text(640, 105, 520, 55, '座標の整数部', 28, bold=True)
f.box(665, 170, 470, 77, '左上texelの場所を選ぶ', LIGHT, size=26)
f.text(640, 285, 520, 55, '座標の小数部', 28, bold=True)
f.box(665, 350, 470, 96, '横と縦の混ぜる割合を決める\n線形filterのときに使用', WHITE, size=25)
f.box(665, 495, 470, 85, 'TexEnvで頂点色・前段色と合成', MID, size=25)
f.text(35, 605, 1130, 35, '最近傍filterでは選んだ一色、線形filterでは四色を重み付きで混ぜる。', 25, color=BLUE)
f.save()


f = Fig('rix-fragment-decision', 1200, 720)
title(f, '新しい画素を画像へ書くか決める')
f.box(25, 92, 250, 88, '新しいfragment\n色・深度・座標', LIGHT, size=25, bold=True)
f.box(25, 232, 250, 88, '既存Framebuffer\n色・深度・Stencil', WHITE, size=23)
f.box(400, 133, 360, 146,
      'Alpha test\nDepth test\nStencil test', MID, size=25, bold=True)
f.line([(275, 136), (340, 136), (340, 185), (400, 185)], BLUE)
f.line([(275, 276), (340, 276), (340, 227), (400, 227)], BLUE)
f.box(300, 365, 330, 86, '三つとも成功', LIGHT, size=25, bold=True)
f.box(770, 365, 330, 86, 'いずれかが失敗', WHITE, size=25, bold=True)
f.line([(530, 279), (465, 365)], BLUE)
f.line([(630, 279), (935, 365)], INK)
f.box(300, 510, 330, 88, 'BlendまたはLogic Op\n色を決めて書く', MID, size=23)
f.box(770, 510, 330, 88, '色は書かない\nStencil更新は規則に従う', LIGHT, size=22)
f.line([(465, 451), (465, 510)], BLUE)
f.line([(935, 451), (935, 510)], BLUE)
f.text(40, 625, 1120, 50,
       '色・深度・Stencilのwrite maskにより、成功しても一部の保存を禁止できる。',
       26, color=BLUE, bold=True)
f.save()


f = Fig('rix-if-five-strips', 1200, 720)
title(f, '640×480を65,536画素の内部Framebufferで描く')
f.box(35, 95, 500, 500, '', WHITE)
strip_colors = [LIGHT, WHITE, LIGHT, WHITE, LIGHT]
for i in range(5):
    f.box(35, 95 + i * 100, 500, 100, f'帯{i}  y={i*96}〜{i*96+95}\n640×96 = 61,440画素', strip_colors[i], size=23)
f.text(610, 85, 530, 50, '内部BRAM側', 29, bold=True)
f.box(620, 150, 500, 115, '一度に一つの帯を描く\n最大65,536画素', MID, size=27, bold=True)
f.line([(535, 345), (620, 207)], BLUE)
f.box(620, 340, 500, 115, 'commitでDDR3の対応位置へ保存', LIGHT, size=26)
f.line([(870, 265), (870, 340)], BLUE)
f.box(620, 525, 500, 115, '五本がそろうと640×480の外部画像\n表示回路が読み出す', WHITE, size=25)
f.line([(870, 455), (870, 525)], BLUE)
f.text(35, 638, 1100, 43, '五本の帯は同時にBRAMへ置かれず、同じ内部領域を順番に使う。', 26, color=BLUE)
f.save()


f = Fig('rix-valid-ready-pipeline', 1200, 650)
title(f, 'valid／readyで停止がパイプライン全体へ戻る')
labels = ['Rasterizer', '属性補間', 'TMU・Fog', '画素試験', 'Framebuffer']
xs = [20, 255, 490, 725, 960]
for i, (x, label) in enumerate(zip(xs, labels)):
    f.box(x, 150, 200, 95, label, MID if i == 2 else LIGHT, size=24, bold=True)
    if i < len(xs) - 1:
        f.line([(x + 200, 180), (xs[i + 1], 180)], BLUE)
        f.line([(xs[i + 1], 222), (x + 200, 222)], INK)
        f.text(x + 190, 127, 80, 33, 'valid', 20, color=BLUE)
        f.text(x + 190, 238, 80, 33, 'ready', 20)
f.box(725, 347, 435, 85, '例  Framebufferが一時停止', WHITE, size=26)
f.line([(1060, 347), (1060, 245)], BLUE)
f.box(255, 495, 670, 85, 'ready=0が左へ伝わり、各段は同じfragmentを保持', LIGHT, size=26, bold=True)
f.line([(725, 390), (590, 495)], BLUE)
f.text(25, 602, 1140, 32, '低位の演算段では、readyから作るclock enableで内部レジスタを止める。', 24)
f.save()


f = Fig('rix-framebuffer-commands', 1200, 720)
title(f, '内部Framebufferに対する四つの操作')
ops = [
    ('MEMSET', '指定色・深度・Stencilで\n内部領域を初期化', 45, 105, LIGHT),
    ('READ', 'DDR3にある帯を\n内部領域へ読み戻す', 635, 105, WHITE),
    ('COMMIT', '内部領域の結果を\nDDR3へ書き出す', 45, 385, MID),
    ('SWAP', '完成した外部画像を\n表示先として依頼', 635, 385, LIGHT),
]
for name, desc, x, y, fill in ops:
    f.box(x, y, 510, 95, name, fill, size=29, bold=True)
    f.box(x, y + 95, 510, 105, desc, WHITE, size=25)
f.line([(555, 205), (635, 205)], BLUE)
f.line([(300, 305), (300, 385)], BLUE)
f.line([(890, 305), (890, 385)], BLUE)
f.text(45, 625, 1110, 55,
       'READは部分更新で前の内容を利用するとき、COMMITは帯の完成結果を外部画像へ反映するときに使う。',
       25, color=BLUE, bold=True)
f.save()


f = Fig('rix-developer-verification-loop', 1200, 760)
title(f, 'RasterIXを変更するときの確認の輪')
steps = [
    (35, 115, '仕様を一文で固定\n入出力と不変条件'),
    (365, 60, 'C++参照実装・単体試験\n期待値を作る'),
    (735, 60, 'RTL単体試験\nVerilatorと波形'),
    (935, 245, '統合simulation\nstream停止も注入'),
    (735, 455, '合成・timing・資源\n回路として成立'),
    (365, 515, '実機の画像・counter\n同じ入力で比較'),
    (35, 455, '差分を原因へ戻す\n一段ずつ切り分け'),
]
for i, (x, y, label) in enumerate(steps):
    f.box(x, y, 230, 105, label, MID if i in (0, 5) else LIGHT, size=23, bold=(i in (0, 5)))
centers = [(150, 167), (480, 112), (850, 112), (1050, 297), (850, 507), (480, 567), (150, 507)]
for i in range(len(centers)):
    f.line([centers[i], centers[(i + 1) % len(centers)]], BLUE)
f.text(295, 300, 610, 105,
       '「映った」だけでは内部の正しさを証明しない\n数値・stream・画像の三段で確認する',
       29, color=BLUE, bold=True)
f.save()


f = Fig('rix-module-boundaries', 1200, 780)
title(f, 'RasterIX_IF内部の主要な境界')
f.box(20, 80, 1160, 630, '', LIGHT)
f.text(35, 88, 280, 42, 'RasterIX_IF', 28, bold=True, align='left')
f.box(55, 155, 230, 105, 'FrameStreaming\nCore\n外側の転送', WHITE, size=21, bold=True)
f.box(350, 155, 260, 105, 'RasterIXCoreIF\n画像領域の管理', WHITE, size=24, bold=True)
f.box(675, 155, 450, 105, 'RasterIXRenderCore\n三角形からfragmentを生成', MID, size=25, bold=True)
f.line([(285, 207), (350, 207)], BLUE)
f.line([(610, 207), (675, 207)], BLUE)
mods = [
    (700, 325, 'CommandParser'), (915, 325, 'Rasterizer'),
    (700, 430, 'Attribute\nInterpolatorX'), (915, 430, 'PixelPipeline'),
    (700, 535, 'PerFragment\nPipeline'), (915, 535, 'ValueTrack\n／FIFO'),
]
for x, y, label in mods:
    f.box(x, y, 185, 72, label, WHITE, size=18)
f.box(80, 405, 215, 100, 'AXI master\ntextureと外部画像', WHITE, size=23)
f.box(350, 405, 260, 100, 'InternalFramebuffer\n色・深度・Stencil', LIGHT, size=23)
f.line([(480, 260), (480, 405)], BLUE)
f.line([(675, 535), (610, 455)], BLUE)
f.line([(185, 405), (185, 300), (480, 300), (480, 260)], BLUE)
f.text(50, 657, 1100, 40, '境界ごとにstream、制御信号、保存内容を分けて観察する。', 25, color=BLUE)
f.save()
