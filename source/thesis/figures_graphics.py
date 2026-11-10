"""Generate worked-example graphics figures in the established book style."""
from figlib import Fig, INK, LIGHT, WHITE

def heading(f, title):
    f.text(20, 12, f.w-40, 48, title, 30, bold=True)

f = Fig('graphics-data-journey', 1200, 630)
heading(f, '図形の位置から画素の色へ')
xs = [25, 265, 505, 745, 985]
labels = ['CPU上のゲーム', 'CPU上のライブラリ', 'FPGA内の描画回路', 'DDRメモリ', 'FPGA内の表示回路']
actions = ['物体の位置を決め\n四角形を指定', '頂点を変換する\n描画命令を作る', '三角形の内側を\n調べ、色を計算', '完成画像を保存\n640 × 480 画素', '画像を順に読む\n映像信号を送る']
data = ['ゲームの変数\nx = 100, y = 80', '命令用のメモリ\n回路へ渡す数値列', '内部作業領域\n帯ごとの画素の色', '表示用の画像\n1画素 16 bit', '画素の順序と時刻\n一定の周期で送出']
for i,x in enumerate(xs):
    f.text(x-10, 80, 210, 42, labels[i], 23, bold=True)
    f.box(x, 145, 190, 140, actions[i], LIGHT if i in (1,2) else WHITE, size=21)
    f.line([(x+95,285),(x+95,345)])
    f.box(x, 345, 190, 140, data[i], WHITE, size=21)
    if i < 4:
        f.line([(x+190,215),(xs[i+1],215)])
        f.text(x+188, 121, 54, 22, ['API','MMIO','保存','読出し'][i], 16)
f.text(25, 510, 1150, 84, '文字画像を最初に登録するときには、画像データも送る。\n実行中は、文字画像の参照範囲と画面上の置き場所を指定する。', 27)
f.save()

f = Fig('graphics-state-snapshot', 1200, 610)
heading(f, 'glVertexを呼んだ時点の設定を頂点へ保存する')
f.text(35, 80, 330, 50, '現在の色・模様の座標', 28, bold=True)
f.text(430, 80, 330, 50, '位置を指定する呼出し', 28, bold=True)
f.text(825, 80, 330, 50, '保存する頂点のデータ', 28, bold=True)
for y,uv,pos,name in [(155,'(0.125, 0)','(100, 80)','頂点A'),(370,'(0.250, 0)','(116, 80)','頂点B')]:
    f.box(35,y,330,135,'色 = 赤\n(u, v) = '+uv,LIGHT,size=28)
    f.box(430,y,330,135,'glVertex2f'+pos,WHITE,size=25)
    f.box(825,y,330,135,name+'\n位置 '+pos+' / 赤\n模様 '+uv,LIGHT,size=26)
    f.line([(365,y+67),(430,y+67)])
    f.line([(760,y+67),(825,y+67)])
f.line([(200,290),(200,370)])
f.text(225,295,490,65,'glTexCoord2fで現在の値を変更',25,align='left')
f.text(665,302,490,55,'頂点Aの保存値はそのまま残る',25)
f.save()

f = Fig('graphics-uv-example',1200,690)
heading(f,'同じ一文字を、画像側の座標と画面側の座標で指定する')
f.text(35,72,490,50,'文字画像 64 × 32 テクセル',29,bold=True)
ax,ay,cell=65,165,48
for row in range(4):
    for col in range(8):
        f.box(ax+col*cell,ay+row*cell,cell,cell,'',LIGHT if (col,row)==(1,0) else WHITE)
glyph=[14,17,19,21,25,17,14]
for y,row in enumerate(glyph):
    for x in range(5):
        if row & (1 << (4-x)):
            f.box(ax+cell+x*6,ay+y*6,6,6,'',INK,INK)
f.text(90,118,250,35,'u = 0.125 ～ 0.250',24)
f.text(45,372,440,72,'数字0：区画番号1\n列8〜15、行0〜7の8 × 8',27)
f.text(45,455,440,84,'v = 0 ～ 0.250\n他の文字の模様は図では省略',25)
f.line([(480,260),(685,260)])
f.text(480,167,205,70,'対応する四隅を\n指定する',25)
f.text(705,72,460,50,'画面では16 × 16の四角形',29,bold=True)
gx,gy,side=780,180,28
for y in range(8):
    for x in range(8):
        on=y<7 and x<5 and bool(glyph[y] & (1 << (4-x)))
        f.box(gx+x*side,gy+y*side,side,side,'',INK if on else LIGHT,stroke=WHITE)
f.text(725,128,210,36,'(100, 80)',25)
f.text(975,128,210,36,'(116, 80)',25)
f.text(725,414,210,36,'(100, 96)',25)
f.text(975,414,210,36,'(116, 96)',25)
f.text(700,475,480,70,'黒：文字の線　淡色：透明な部分\n図は位置対応を示す説明用',25)
f.text(35,570,1130,74,'glTexCoord2f(u, v) → glVertex2f(x, y) を四隅で繰り返す。\n画像内の8 × 8の区画を、画面上の16 × 16の位置へ対応させる。',28)
f.save()

f=Fig('graphics-alpha-example',1200,710)
heading(f,'同じ赤い候補色でも、alphaによって保存する色が変わる')
for x,w,t in [(20,380,'合成する二つの色'),(510,330,'色の計算'),(925,250,'保存するRGB')]:
    f.text(x,80,w,55,t,26,bold=True)
rows=[(155,'1','赤 × 1 + 青 × 0','(1, 0, 0)','文字の線','#ff0000'),(315,'0','赤 × 0 + 青 × 1','(0, 0, 1)','透明な部分','#0000ff'),(475,'0.25','赤 × 0.25\n+ 青 × 0.75','(0.25, 0, 0.75)','半透明の説明例','#4000bf')]
for y,a,formula,result,label,color in rows:
    f.box(20,y,380,55,'候補：赤 (1,0,0)　alpha = '+a,WHITE,size=23)
    f.box(20,y+70,380,55,'背景：青 (0,0,1)',LIGHT,size=25)
    f.box(510,y,330,125,formula,WHITE,size=27)
    f.box(925,y,250,125,result+'\n'+label,WHITE,size=24)
    f.line([(400,y+28),(510,y+28)])
    f.line([(400,y+97),(510,y+97)])
    f.line([(840,y+62),(925,y+62)])
    f.box(1155,y+4,16,117,'',color,color)
f.text(20,640,1155,50,'RGBは0〜1で表した説明用の値。実装では有限のビット数へ丸める。',25)
f.save()

f=Fig('graphics-refresh-example',1200,535)
heading(f,'説明用の30 FPSの描画と60 Hzの表示')
x0,y0,step=205,150,154
f.text(10,90,175,50,'時刻 [ms]',25,bold=True)
for i,v in enumerate(['0','16.67','33.33','50.00','66.67','83.33','100.00']):
    f.text(x0+i*step-50,90,100,50,v,24)
    f.line([(x0+i*step,140),(x0+i*step,402)],color='#A0A0A0',arrow=False,dash=True)
f.text(10,155,175,100,'完成した画像\n30 FPS',25,bold=True)
f.text(10,300,175,100,'表示が送る\n一画面分\n60 Hz',25,bold=True)
for i,l in enumerate('ABC'):
    f.box(x0+i*step*2+5,160,step*2-10,90,'画像 '+l,LIGHT,size=32,bold=True)
for i,l in enumerate('AABBCC'):
    f.box(x0+i*step+5,310,step-10,80,l,WHITE,size=32,bold=True)
f.text(30,438,1140,60,'新しい画像ができるまで、表示回路は同じ完成画像を繰り返し読み出す。',28)
f.save()
print('Generated five graphics figures.')
