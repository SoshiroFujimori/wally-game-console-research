"""Draw the pinned Breakout OpenGL program as numerical worked examples."""
from figlib import Fig, FIGS, OUT, INK, BLUE, LIGHT, MID, WHITE
import json


def new(name, title, h=560):
    f = Fig('opengl-code-' + name, 1200, h)
    f.text(20, 12, 1160, 48, title, 29, bold=True)
    return f


def txt(f, x, y, w, h, text, size=25, bold=False, color=INK):
    f.text(x, y, w, h, text, size, color, bold)


def box(f, x, y, w, h, text, fill=WHITE, size=25):
    f.box(x, y, w, h, text, fill, size=size)


def arrow(f, x1, y1, x2, y2, color=INK):
    f.line([(x1, y1), (x2, y2)], color=color)


def glyph(f, x, y, cell, fill=INK, bg=LIGHT, grid=True):
    rows = [14, 17, 17, 31, 17, 17, 17]
    for r in range(8):
        for c in range(8):
            on = r < 7 and c < 5 and bool(rows[r] & (1 << (4-c)))
            col = fill if on else bg
            f.box(x+c*cell, y+r*cell, cell, cell, '', col,
                  WHITE if grid else col)


f = new('route', '四角形と文字の一覧を描画関数へ渡す', 730)
box(f, 30, 85, 445, 95, 'scene(game)\n四角形と文字の一覧を作る', LIGHT)
box(f, 665, 85, 505, 95, 'drawScene\n一覧から物体を取り出して描く')
arrow(f, 475, 132, 665, 132)
box(f, 30, 275, 470, 95, '四角形のデータ\n位置・大きさ・色', LIGHT)
box(f, 700, 275, 470, 95, '文字のデータ\n文字・位置・拡大率・色', LIGHT)
f.line([(915,180),(915,220),(265,220),(265,275)])
arrow(f, 935,180,935,275)
box(f, 30, 420, 470, 95, 'color → quad\n色と四隅を指定')
box(f, 700, 420, 470, 95, 'drawGlyph → quad\n文字画像の範囲と四隅を指定')
arrow(f,265,370,265,420)
arrow(f,935,370,935,420)
box(f, 300, 565, 600, 95, 'RasterIXライブラリのOpenGL関数\n描画命令を用意', LIGHT)
f.line([(265,515),(265,610),(300,610)])
f.line([(935,515),(935,610),(900,610)])
txt(f, 30, 680, 1140, 40, 'ここに示す関数はWallyのCPU上で実行する', 27, True, BLUE)
f.save()

f = new('modes', '最初の設定と描く物に応じた設定', 520)
box(f, 35, 100, 345, 275, '起動時に一度\n座標の対応を設定\n深度テストを無効\nカリングを無効\n照明を無効', LIGHT, 27)
box(f, 455, 100, 315, 275, '単色の四角形\n\nテクスチャ OFF\nブレンド OFF\n位置と色で描く', WHITE, 26)
box(f, 845, 100, 315, 275, '文字の四角形\n\nテクスチャ ON\nブレンド ON\n模様を貼って描く', LIGHT, 26)
arrow(f, 380, 235, 455, 235)
arrow(f, 770, 235, 845, 235)
txt(f, 35, 415, 1125, 65, 'glEnableで有効にし、glDisableで無効にする\n設定は、その後の描画で使われる', 27)
f.save()

f = new('coordinates', '左上から数えるゲームの座標', 595)
x,y,w,h = 100,135,560,350
f.box(x,y,w,h,'',WHITE)
arrow(f, x, 105, x+w, 105, BLUE)
arrow(f, 65, y, 65, y+h, BLUE)
txt(f, 35, 75, 130, 26, '(0, 0)', 22)
txt(f, 550, 65, 170, 30, '(640, 0)', 23)
txt(f, 20, 497, 180, 35, '(0, 480)', 23)
txt(f, 525, 497, 210, 35, '(640, 480)', 23)
txt(f, 315, 62, 200, 34, '右へ x が増える', 22, True, BLUE)
txt(f, 4, 275, 50, 70, '下\nへ', 23, True, BLUE)
f.dot(x+w/2,y+h/2,5)
txt(f, 240, 330, 300, 45, '(320, 240) は中央', 25)
f.box(x+44/640*w,y+76/480*h,62/640*w,18/480*h,'','#ff0000','#ff0000')
box(f, 760, 145, 400, 135, 'glOrtho\n左0・右640\n下480・上0', LIGHT, 27)
box(f, 760, 345, 400, 130, 'glViewport\n描画領域を\n640 × 480にする', WHITE, 27)
txt(f, 50, 545, 1100, 35, '図は座標範囲の対応。半画素の調整は本文で説明する。', 23)
f.save()

f = new('clear', '色を覚える呼出しと初期化を依頼する呼出し', 510)
for x,label in [(35,'元の描画先'),(440,'色を黒に設定した段階'),(845,'初期化が実行された後')]:
    txt(f,x,100,320,45,label,25,True)
    f.box(x,165,320,180,'', '#000000')
for x in [35,440]:
    f.box(x+70,215,180,30,'','#ff0000','#ff0000')
arrow(f,355,255,440,255)
arrow(f,760,255,845,255)
txt(f,330,355,445,62,'glClearColor(0, 0, 0, 1)\n初期化に使う色を記憶',24)
txt(f,815,355,365,62,'glClear(...)\n色の領域の初期化を依頼',24)
txt(f,35,450,1130,35,'描画先へ反映する処理は、用意した命令が実行されて進む',25,False,BLUE)
f.save()

f = new('rectangle', '左上の位置と幅と高さから四隅を求める', 550)
box(f,30,130,360,245,'左上  (44, 76)\n幅 62\n高さ 18\n色 赤',LIGHT,30)
arrow(f,390,250,515,250)
f.box(595,185,430,150,'','#ff0000',INK)
for x,y,label in [(490,120,'P0 (44, 76)'),(920,120,'P1 (106, 76)'),(920,355,'P2 (106, 94)'),(490,355,'P3 (44, 94)')]:
    txt(f,x,y,245,40,label,25,True)
txt(f,550,430,555,70,'右端 = 44 + 62 = 106\n下端 = 76 + 18 = 94',28)
txt(f,25,440,390,65,'P0 → P1 → P2 → P3\n周囲をたどる順で渡す',26,True,BLUE)
f.save()

f = new('vertex-state', '呼出しごとに増える頂点の記録', 595)
txt(f,30,78,400,40,'CPUが実行する関数',27,True)
txt(f,575,78,585,40,'ライブラリが保持する値',27,True)
rows=[('glColor4ub(255,0,0,255)','現在の色 = 赤'),('glVertex2f(44,76)','P0 = (44,76) / 赤'),('glVertex2f(106,76)','P0に加えて P1 = (106,76) / 赤'),('glVertex2f(106,94)','さらに P2 = (106,94) / 赤'),('glVertex2f(44,94)','さらに P3 = (44,94) / 赤')]
for i,(a,b) in enumerate(rows):
    y=135+i*77
    box(f,30,y,420,60,a,WHITE,25)
    box(f,575,y,585,60,b,LIGHT,24)
    arrow(f,450,y+30,575,y+30)
txt(f,30,535,1130,40,'色と位置がそろった四個の頂点を、一つの四角形として扱う',26,True,BLUE)
f.save()

f = new('rasterize', '四隅で指定した面の内側に画素を作る', 480)
for x,label in [(35,'四頂点で面を指定'),(435,'三角形へ組み立てる'),(835,'内側の画素に色を保存')]:
    txt(f,x,90,330,50,label,25,True)
    f.box(x+20,175,290,140,'','#ff0000')
for x in [55,345]:
    for y in [175,315]:f.dot(x,y,6)
f.line([(455,175),(745,315)],arrow=False)
for c in range(1,10):f.line([(855+c*29,175),(855+c*29,315)],color='#772222',arrow=False)
for r in range(1,5):f.line([(855,175+r*28),(1145,175+r*28)],color='#772222',arrow=False)
arrow(f,365,245,435,245)
arrow(f,765,245,835,245)
txt(f,35,365,1130,75,'対角線や格子は説明用。画面に線を描く指示ではない。\n頂点の位置・色から、図形内の画素位置と色を求める。',26)
f.save()

f = new('glyph-bits', '文字Aの一行を五個のビットで表す', 600)
txt(f,35,85,450,45,'glyph関数が返す七つの数値',27,True)
rows=[14,17,17,31,17,17,17]
for r,v in enumerate(rows):
    txt(f,65,155+r*48,90,40,str(v),29)
    txt(f,190,155+r*48,220,40,f'{v:05b}',29,True)
    for c in range(5):
        on=bool(v & (1 << (4-c)))
        f.box(700+c*48,150+r*48,48,48,'',INK if on else WHITE,LIGHT)
arrow(f,435,315,650,315)
txt(f,660,90,340,45,'1の点が文字の線',27,True)
txt(f,35,520,1130,55,'14 = 01110 の行は、中央の三点が文字の線になる',27,True,BLUE)
f.save()

f = new('glyph-rgba', '文字の線と透明部分を四つの成分で保存する', 560)
glyph(f,70,145,40)
txt(f,45,85,370,42,'Aを入れる8 × 8の区画',26,True)
box(f,560,130,590,125,'文字の線がある点\nR=255  G=255  B=255  A=255',WHITE,27)
box(f,560,325,590,125,'文字の線がない点\nR=255  G=255  B=255  A=0',LIGHT,27)
f.line([(190,165),(450,165),(450,192),(560,192)])
f.line([(370,425),(460,425),(460,388),(560,388)])
txt(f,35,490,1130,45,'淡い格子は透明部分を図で示すための表示。画像に入れる色ではない。',24)
f.save()

f = new('atlas', '区画11のAは列3 行1に入る', 600)
for r in range(4):
    for c in range(8):
        i=r*8+c
        f.box(45+c*70,155+r*70,70,70,str(i),LIGHT if i==11 else WHITE,size=23,bold=i==11)
for c in range(8):txt(f,45+c*70,105,70,35,str(c),23)
txt(f,45,70,560,35,'列番号 0 ～ 7',25,True)
txt(f,45,450,560,60,'横64 × 縦32テクセル\n一つの区画は8 × 8',27)
box(f,700,145,455,140,'区画11の位置\n列 = 11 % 8 = 3\n行 = 11 / 8 = 1（整数）',LIGHT,26)
box(f,700,340,455,140,'左上  (24, 8)\n右下の境界  (32, 16)\n文字Aを置く範囲',WHITE,27)
txt(f,35,535,1130,40,'空白が区画0、数字0が区画1、数字9が区画10、Aが区画11',25)
f.save()

f = new('texture-object', '画像を選ぶ番号と画像の内容を対応させる', 590)
rows=[('glGenTextures','番号を一つ取得','font = n'),('glBindTexture','番号nを操作対象に選ぶ','現在の対象 = n'),('glTexImage2D','寸法とRGBA配列を渡す','画像nの内容を登録')]
for i,(a,b,c) in enumerate(rows):
    y=110+i*130
    box(f,30,y,320,88,a,WHITE,28)
    txt(f,380,y,370,88,b,26)
    box(f,805,y,365,88,c,LIGHT,27)
    arrow(f,350,y+44,380,y+44)
    arrow(f,750,y+44,805,y+44)
txt(f,30,510,1140,55,'nは取得した識別番号。画像配列のアドレスではない。',27,True,BLUE)
f.save()

f = new('uv-pairs', '画像の四隅と画面上の四隅を一組ずつ対応させる', 640)
txt(f,35,80,490,45,'画像内のAの区画 8 × 8',27,True)
txt(f,675,80,490,45,'画面に置く四角形 16 × 16',27,True)
glyph(f,160,210,25)
glyph(f,800,210,25)
for x,labels in [(160,['(0.375, 0.25)','(0.5, 0.25)','(0.5, 0.5)','(0.375, 0.5)']),(800,['(100, 200)','(116, 200)','(116, 216)','(100, 216)'])]:
    positions=[(x-115,150),(x+105,150),(x+105,425),(x-115,425)]
    for (xx,yy),v in zip(positions,labels):txt(f,xx,yy,210,45,v,23)
arrow(f,475,300,720,300)
txt(f,485,215,225,70,'各頂点へ\nu と v を付ける',26,True,BLUE)
txt(f,45,510,1110,80,'glTexCoord2f(0.375, 0.25) → glVertex2f(100, 200)\n左上の画像位置と、左上の画面位置を対応させる',27)
f.save()

f = new('uv-interior', '四隅の間のuとvを求める', 530)
f.box(100,145,500,260,'',LIGHT)
for x in [100,350,600]:f.line([(x,145),(x,405)],color=BLUE,arrow=False)
for y in [145,275,405]:f.line([(100,y),(600,y)],color=BLUE,arrow=False)
f.dot(350,275,7)
for x,v in [(40,'u=0.375'),(280,'u=0.4375'),(540,'u=0.5')]:txt(f,x,85,140,40,v,23)
box(f,740,170,415,185,'中央の対応\nu = (0.375 + 0.5) / 2\n    = 0.4375\nv = (0.25 + 0.5) / 2\n    = 0.375',WHITE,26)
arrow(f,610,275,740,275)
txt(f,100,420,500,40,'上端 v=0.25　下端 v=0.5',24)
txt(f,30,475,1140,35,'図は連続した位置の対応。各画素で使う位置に対して座標を求める。',24)
f.save()

f = new('nearest', '近いテクセルの値を使う整数倍の拡大例', 565)
glyph(f,100,165,27)
glyph(f,665,140,44)
for c in range(1,16):
    f.line([(665+c*22,140),(665+c*22,492)],color='#9faac0',arrow=False)
for r in range(1,16):
    f.line([(665,140+r*22),(1017,140+r*22)],color='#9faac0',arrow=False)
txt(f,45,85,340,45,'元の8 × 8の区画',28,True)
txt(f,610,70,460,45,'画面上の16 × 16へ拡大',28,True)
arrow(f,370,275,600,275)
txt(f,365,325,240,70,'GL_NEAREST\n近い一つの値を選ぶ',23,True,BLUE)
txt(f,35,490,1130,60,'点の境界がそろう例では、一つのテクセルが2 × 2の画素に対応する',25)
f.save()

f = new('modulate', '白い文字画像に指定色を掛け合わせる', 490)
for x,label in [(25,'文字の模様'),(455,'頂点に付けた色'),(885,'描く文字の色')]:
    txt(f,x,90,290,45,label,26,True)
box(f,25,180,290,130,'白\n(1, 1, 1)',WHITE,29)
box(f,455,180,290,130,'水色\n(0, 1, 1)', '#baffff',29)
box(f,885,180,290,130,'水色\n(0, 1, 1)', '#baffff',29)
txt(f,330,200,110,85,'×',50)
txt(f,760,200,110,85,'=',50)
txt(f,25,365,1150,65,'R・G・Bそれぞれを掛算する。alphaも同様に掛け合わせる。\n文字の線のalphaは1、透明部分のalphaは0のまま残る。',26)
f.save()

f = new('blend', 'alphaを使って文字色と背景色の割合を決める', 540)
txt(f,25,90,1140,45,'保存するRGB = 文字のRGB × a + 背景のRGB × (1 − a)',28,True)
for y,a,text,result,fill in [(190,1,'文字の線','文字色が残る','#baffff'),(350,0,'透明な点','背景色が残る','#ffdddd')]:
    box(f,30,y,235,115,text+'\na = '+str(a),LIGHT,27)
    box(f,355,y,450,115,f'文字 × {a}\n+ 背景 × {1-a}',WHITE,28)
    box(f,895,y,275,115,result,fill,27)
    arrow(f,265,y+58,355,y+58)
    arrow(f,805,y+58,895,y+58)
f.save()

f = new('present', '図形の指定から回路への送信と表示先切替えへ', 640)
rows=[('renderer.draw(...)','図形と文字を指定\nライブラリが命令を準備'),('bus.frameCount()','現在の表示先切替え回数を読む'),('gl.swapDisplayList()','命令の提出を進める\n保存と表示先切替えを依頼'),('bus.waitForFrame(previous)','回数が変わるまで確認する')]
for i,(a,b) in enumerate(rows):
    y=105+i*112
    box(f,25,y,460,82,a,WHITE,25)
    box(f,590,y,580,82,b,LIGHT,25)
    arrow(f,485,y+41,590,y+41)
    if i<3:arrow(f,255,y+82,255,y+112)
txt(f,25,570,1140,45,'回路側：命令を受信 → 画素を計算・保存 → 表示する画像を切替え',26,True,BLUE)
f.save()

# Keep geometry available for edit-time bounds and label checks.
(OUT/'opengl-code-layout.json').write_text(json.dumps(FIGS,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
