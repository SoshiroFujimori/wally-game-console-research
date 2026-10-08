from figlib import *
import shutil

def cells(f,x,y,start,width=53,height=43,white=True,labels=True):
    for i in range(12):
        number=100+i
        if labels:f.text(x+i*width,y-29,width,26,str(number),size=21)
        fill=WHITE if start<=number<start+8 else INK
        f.box(x+i*width,y,width,height,fill=fill,stroke='#888888')

f=Fig('ball-three',1200,730)
f.text(10,0,1180,50,'同じボールの位置を右へ3画素進める',32,bold=True)
f.text(15,56,330,55,'CPUが使う位置の変数',26,bold=True)
f.text(398,56,770,55,'画像メモリの色  y = 200の一行',26,bold=True)
for y,label,value,start in [(142,'① 変更前',100,100),(337,'② 位置だけ変更',103,100),(532,'③ 描き直した後',103,103)]:
    f.text(15,y-34,340,42,label,27,bold=True,align='left')
    f.box(15,y+16,295,79,f'ballX = {value}',LIGHT,size=34,bold=True)
    cells(f,415,y+20,start,width=62,height=70)
    f.text(402,y+99,776,45,'白い範囲は100〜107のまま' if label.startswith('②') else ('100〜107が白' if start==100 else '103〜110が白'),26,color=BLUE if label.startswith('②') else INK)
f.line([(165,260),(165,306)],BLUE)
f.line([(165,455),(165,501)],BLUE)
f.text(10,680,1180,42,'②では位置の値だけが変わり  画像の色はまだ変わらない',28,color=BLUE,bold=True)
f.save()

f=Fig('one-ball-journey',1200,960)
f.text(10,0,1180,55,'Aを表示しながら 次の画像をBへ作る',32,bold=True)
xs=[20,260,425,690,955]; ws=[225,150,250,250,230]
for x,w,s in zip(xs,ws,['進めた処理','位置の変数','画像Aの内容','画像Bの内容','画面に見える位置']):
    f.box(x,74,w,63,s,LIGHT,size=24,bold=True)
for ri,(label,bx,bs,screen) in enumerate([('① 最初の状態',100,None,100),('② CPUが位置を\n100から103へ変更',103,None,100),('③ RasterIXが\nBを描き終えた',103,103,100),('④ 表示回路の\n読出し先をBへ変更',103,103,103)]):
    y=161+ri*171
    f.text(20,y,225,110,label,26,align='left')
    f.box(274,y+29,125,65,str(bx),MID if bx==103 else WHITE,size=36,bold=True)
    cells(f,440,y+24,100,width=18,height=33,labels=False)
    f.text(430,y+62,240,50,'横位置100',26)
    if bs is None:
        f.box(705,y+24,216,33,fill=LIGHT,stroke=BLUE)
        f.text(695,y+62,240,50,'次に描く場所',25)
    else:
        cells(f,705,y+24,bs,width=18,height=33,labels=False)
        f.text(695,y+62,240,50,'横位置103',26)
    f.box(980,y+21,180,95,str(screen),MID if screen==103 else WHITE,size=41,bold=True)
    f.text(966,y+117,213,35,'Bを読んでいる' if screen==103 else 'Aを読んでいる',23,color=BLUE)
    if ri<3:f.line([(25,y+146),(1175,y+146)],arrow=False,color=GREY)
f.text(15,869,1170,62,'③までは画面が100のまま  ④で初めて103が見える',30,color=BLUE,bold=True)
f.save()


f = Fig('fifo', 1200, 835)
f.text(10, 0, 1180, 55, '説明用のFIFO  三語まで保存できる場合', 32, bold=True)
f.text(20, 64, 300, 45, '入口へ渡したい値', 27, bold=True)
f.text(375, 61, 430, 42, 'FIFOの中身', 27, bold=True)
f.text(390, 100, 116, 30, '入口側', 21)
f.line([(519, 115), (636, 115)])
f.text(648, 100, 116, 30, '出口側', 21)
f.text(854, 64, 321, 45, '出口へ渡した値', 27, bold=True)
rows = [
    ('①', '7 → 8', [None, 8, 7], None, '最初に7  次に8を受け取る'),
    ('②', 9, [9, 8, 7], None, '9を受け取り三語が埋まる'),
    ('③', 10, [9, 8, 7], None, '満杯なので10は待つ'),
    ('④', 10, [None, 9, 8], 7, '右端の7を取り出すと空きができる'),
    ('⑤', 10, [10, 9, 8], None, '空きが伝わり10を受け取る'),
]
for idx, (step, value, queue, taken, note) in enumerate(rows):
    y = 133 + idx * 125
    f.text(16, y, 50, 68, step, 27, bold=True)
    f.box(86, y + 4, 147, 61, str(value), LIGHT, size=34, bold=True)
    if idx == 2:
        f.text(238, y - 4, 151, 77, '受取不可\n0を返す', 24, color=BLUE)
    elif idx == 3:
        f.text(238, y - 4, 151, 77, '空きの通知\nを待つ', 24, color=BLUE)
    else:
        f.line([(245, y + 35), (377, y + 35)], BLUE)
    for col, word in enumerate(queue):
        f.box(390 + col * 129, y + 4, 116, 61,
              str(word) if word is not None else '',
              WHITE if word is not None else LIGHT, size=34, bold=True)
    if taken is not None:
        f.line([(777, y + 35), (931, y + 35)])
        f.box(942, y + 4, 140, 61, str(taken), MID, size=34, bold=True)
    f.text(365, y + 72, 800, 43, note, 25,
           color=BLUE if idx == 2 else INK, align='left')
f.text(15, 773, 1170, 49,
       '先に入った7から右へ取り出す  受け取れない10は送り手が保持する',
       27, bold=True)
f.save()

f = Fig('backpressure-four-stages', 1200, 615)
f.text(320, 0, 115, 34, '入口側', 23)
f.line([(443, 18), (582, 18)])
f.text(585, 0, 115, 34, '出口側', 23)
f.text(800, 0, 340, 34, '入口側の状態', 23)
states = [
    ('1　受け側が停止', ['', '', 'B', 'A'], 'Cはまだ入る'),
    ('2　空きへ保存', ['D', 'C', 'B', 'A'], '4語で満杯'),
    ('3　次の語Eを提示', ['D', 'C', 'B', 'A'], 'CPUも待つ'),
    ('4　Aを取り出す', ['', 'D', 'C', 'B'], '空きの通知後に再開'),
]
for i, (title, words, msg) in enumerate(states):
    y = 40 + i * 125
    f.text(10, y, 295, 85, title, 27, align='left')
    for j, word in enumerate(words):
        f.box(320 + j * 95, y + 10, 95, 70,
              word or '空', LIGHT if word else WHITE)
    f.box(800, y + 10, 340, 70, msg, BLOCK if i == 2 else WHITE, size=27)
f.text(25, 519, 1150, 38,
       '先に入ったAから右へ取り出す。箱は待ち順を表す。', 25)
f.text(25, 555, 1150, 50,
       '4語は説明用。実際の設定は512語。空きの通知にはクロック境界の遅れがある。', 25)
f.save()

f = Fig('response-read-consumes', 1200, 600)
f.text(10, 0, 1180, 65,
       'RESP の読出しは、値を見ると同時に先頭の応答を取り出す', 32, bold=True)
f.text(15, 72, 250, 50, '応答 FIFO の中身', 28)
f.text(235, 117, 100, 34, '入口側', 23)
f.line([(342, 134), (427, 134)])
f.text(435, 117, 100, 34, '出口側', 23)
states = [
    ('読出し前', ['C', 'B', 'A'], '先頭は A。次に受け取れる値は A。'),
    ('1 回読出し後', ['', 'C', 'B'], 'CPU が A を受け取る。先頭は B に変わる。'),
    ('2 回読出し後', ['', '', 'C'], 'CPU が B を受け取る。先頭は C に変わる。'),
]
for i, (title, words, msg) in enumerate(states):
    y = 157 + i * 120
    f.text(0, y, 230, 65, title, 27)
    for j, word in enumerate(words):
        f.box(235 + j * 100, y, 100, 65,
              word or '空', LIGHT if word else WHITE, size=31)
    f.text(550, y, 630, 65, msg, 27, align='left')
f.text(15, 477, 1170, 34, '箱は待ち順を表し、右端が次に取り出す語である。', 25)
f.text(15, 520, 1170, 40,
       'STATUS は応答の有無を調べる入口。読むだけでは応答を取り出さない。',
       28, bold=True)
f.save()


f=Fig('register-cycle-concrete',1200,700)
f.text(10,0,1180,58,'レジスタの値を一回ずつ増やす回路',32,bold=True)
f.box(89,119,300,117,'レジスタ\n現在の値を覚える',LIGHT,size=29,bold=True)
f.box(798,119,300,117,'足し算の回路\n現在の値 + 1',MID,size=29,bold=True)
f.line([(389,172),(798,172)])
f.text(409,111,370,49,'現在の値 3',30)
f.line([(948,236),(948,304),(239,304),(239,236)],BLUE)
f.text(398,260,370,43,'次に保存する値 4',29,color=BLUE)
f.line([(25,207),(89,207)],BLUE)
f.text(0,251,235,45,'クロックで保存',24,color=BLUE)
headers=['観察する時点','レジスタの出力','足し算の出力']
xs=[45,529,844];ws=[474,305,305]
for x,w,label in zip(xs,ws,headers):f.box(x,365,w,58,label,LIGHT,size=26,bold=True)
for i,(label,old,new) in enumerate([('立ち上がりを待っている',3,4),('次の立ち上がりの後',4,5),('さらに次の立ち上がりの後',5,6)]):
    y=433+70*i
    f.text(55,y,454,55,label,26,align='left')
    f.text(529,y,305,55,str(old),34,bold=True)
    f.text(844,y,305,55,str(new),34,bold=True,color=BLUE)
f.text(20,652,1160,37,'足し算の結果が変わっても  保存するのは次の立ち上がり',27,color=BLUE)
f.save()

import figures_rasterix

(ROOT/'figures-new.json').write_text(json.dumps(FIGS,ensure_ascii=False,indent=2),encoding='utf-8')
print('Created',len(FIGS),'concrete teaching figures')
