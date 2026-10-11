#!/usr/bin/env python3
"""Draw concrete value and storage examples used by the technical appendix."""
import argparse
import figures
from figures import Figure, LIGHT, MID


def generate():
    f=Figure('同じ立ち上がりでは、どちらも保存前の値を使う',
             'xへの次の値はx+3、yへの次の値は現在のx。二つのレジスタは同時に更新する。',640)
    f.box(50,155,250,125,['xのレジスタ','現在値 100'])
    f.box(430,120,260,115,['加算器','100 + 3 = 103'])
    f.box(430,330,260,115,['yのレジスタ','次に100を保存'])
    f.line([(300,205),(360,205),(360,175),(430,175)],True)
    f.line([(360,205),(360,380),(430,380)],True)
    f.line([(690,175),(760,175),(760,80),(175,80),(175,155)],True)
    f.text(820,170,['立ち上がり後','x = 103','y = 100'],26)
    f.text(55,520,['上の代入行が先に実行される、という回路ではない。',
                   '二つの保存場所が、それぞれの入力を同じ時点で保存する。'],25)
    f.save('register-update.svg','説明用の回路。リセット、ビット幅、実際の配線遅延は省略。')

    f=Figure('一語の受渡しと画像の完成は、別の出来事',
             'APB完了後も語がFIFOに残り得る。出口で受理されてから描画を進め、表示の切替えを行う。',590)
    boxes=[['① APB取引完了','FIFOが語を保存'],['② 出口で受理','RasterIXへ渡る'],
           ['③ 描画と保存','画像を仕上げる'],['④ 表示切替え','次の画像を選ぶ']]
    for i,b in enumerate(boxes):
        x=50+i*290;f.box(x,155,230,140,b,size=23)
        if i<3:f.line([(x+230,225),(x+290,225)],True)
    f.text(55,365,['①でCPUは次の書込みへ進める場合がある。',
                  '②は受取りの成立。③は必要な命令全体を処理した結果。',
                  'どの完了を待つかで、ソフトウェアが再利用できる場所も違う。'],25)
    f.save('handoff-milestones.svg','流れの概念図。間隔は実測時間を表さず、複数命令の重なりは省略。')

    f=Figure('同じ番地への書込みでも、行き先で意味が違う',
             'RAMは内容を上書きしCMDレジスタは各書込みで一語を投入する。',620)
    f.text(55,125,'CPUの操作： Aを書込む → Bを書込む → Cを書込む',27)
    f.box(60,180,250,120,['通常のRAM','同じ一つの番地'])
    f.line([(310,240),(455,240)],True)
    f.box(455,180,255,120,['内容を順に上書き','A → B → C'])
    f.box(865,180,275,120,['最後に残るもの','C'],MID)
    f.line([(710,240),(865,240)],True)
    f.box(60,355,250,120,['CMDレジスタ','同じ命令口の番地'])
    f.line([(310,415),(455,415)],True)
    f.box(455,355,255,120,['書込みごとに投入','A、B、Cの三語'])
    f.line([(710,415),(865,415)],True)
    f.box(865,355,275,120,['出口で受け取る列','A → B → C'],MID)
    f.save('ram-mmio-writes.svg','A、B、Cは語の順序を表す説明用の名前。FIFOの物理的な並びは省略。')

    f=Figure('回路の設定ファイルとゲームの実行ファイルを分ける',
             'HDLは合成配置配線してFPGAへ、C++はクロスコンパイルしてSD経由でWallyへ渡す。',640)
    for y,start,tool,out,dest in [(155,'SystemVerilog',['合成・配置配線'],['bitstream','回路の設定データ'],['FPGAへ設定','回路が出来る']),
                                  (370,'C++',['コンパイル・リンク'],['実行ファイル','CPUの命令とデータ'],['SDから読込む','Wallyが実行'])]:
        f.box(35,y,190,120,[start,'ソース'],size=23)
        f.box(295,y,245,120,tool,size=23)
        f.box(610,y,235,120,out,size=23)
        f.box(915,y,250,120,dest,size=23)
        for x,end in [(225,295),(540,610),(845,915)]:f.line([(x,y+60),(end,y+60)],True)
    f.save('build-artifacts.svg','一方を置き換えても、もう一方のファイルや回路は自動では更新されない。')

    f=Figure('配列を読む番地は進み、命令口の番地は同じ',
             'CPUがRAMの要素を順に読み、APBの同じCMD番地へ一語ずつ書く。',600)
    f.text(55,125,'CPU側の命令配列',25)
    for i,v in enumerate(['A','B','C']):
        f.box(55,160+i*100,220,75,[f'要素{i}：{v}'],size=26)
    f.text(55,505,'読み出す順：0 → 1 → 2',23)
    f.box(430,240,240,130,['CPUの転送処理','配列から一語読む'])
    f.box(840,240,285,130,['同じCMD番地へ書く','A → B → C'],MID)
    for i in range(3):f.line([(275,198+i*100),(350,198+i*100),(350,305),(430,305)],True)
    f.line([(670,305),(840,305)],True)
    f.save('command-array.svg','APB方式の説明。実際の命令長や値は命令の種類により異なる。')

    f=Figure('画像Bの帯を読み戻し、変更して、Bへ戻す',
             '表示中のAは維持し、Bの過去画像を内部作業領域へ読み込んで変更した帯をBへ戻す。',690)
    f.box(50,155,245,125,['DDR3の画像A','現在表示している'])
    f.box(50,360,245,155,['DDR3の画像B','次の描画先','Bの過去画像が残る'])
    f.box(470,300,350,205,['FPGA内の作業領域','① Bの同じ帯を読込む','② 古い位置を消す','③ 今回の図形を描く'],size=24)
    f.box(915,155,240,125,['表示回路','Aを読み続ける'])
    f.line([(295,215),(915,215)],True)
    f.line([(295,395),(470,395)],True)
    f.text(380,370,'読戻し',23,'middle')
    f.line([(640,505),(640,565),(175,565),(175,515)],True)
    f.text(435,603,'④ 処理した帯をBへ書戻す',24,'middle')
    f.save('strip-read-modify-write.svg','全帯の処理後に表示先を切り替える。変更領域だけのDDR転送を示す図ではない。')

    f=Figure('同時に働く時間を二回足さない',
             'CPU送信0から5ms、回路処理2から8ms。3msが重なり、開始から完了までは8ms。',580)
    x0=235;scale=105
    for i in range(9):
        x=x0+i*scale;f.line([(x,150),(x,405)],dash='5 5',color='#CCD9F1',width=2)
        f.text(x,130,str(i),22,'middle')
    f.text(1120,130,'ms',22)
    f.text(40,220,'CPU送信',26);f.box(x0,175,5*scale,80,'5 ms',size=27)
    f.text(40,350,'描画回路',26);f.box(x0+2*scale,305,6*scale,80,'6 ms',MID,size=27)
    f.line([(x0,445),(x0+8*scale,445)],True)
    f.text(655,490,'全体は8 ms。2〜5 msの3 msは両方に含まれる。',24,'middle')
    f.save('overlapping-work.svg','時間区間を説明するための仮定の数値。実機の測定結果ではない。')

    f=Figure('実際のクロックと、解析へ与える情報を区別する',
             '発振器からclk端子とクロック生成回路へ進む経路に、XDCがピンと周期の情報を与える。',650)
    f.box(35,160,240,130,['基板の発振器','100 MHzの信号'])
    f.box(360,160,205,130,['FPGA端子','RTLの clk'])
    f.box(650,160,235,130,['クロック生成IP','CPU用などを生成'])
    f.box(970,160,195,130,['内部回路','CPUなど'])
    for x,end in [(275,360),(565,650),(885,970)]:f.line([(x,225),(end,225)],True)
    f.box(280,410,365,120,['XDC（生成分を含む）','端子の位置と入力周期'],MID)
    f.line([(460,410),(460,290)],True,dash='7 5')
    f.box(715,410,400,120,['IP生成Tclで設定','内部クロックの生成条件'],MID)
    f.line([(820,410),(820,290)],True,dash='7 5')
    f.save('clock-files.svg','実線は信号、破線は設計ツールへ与える設定。XDC自体は信号を発生しない。')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    figures.CHECK=parser.parse_args().check
    generate()
    print(('Checked' if figures.CHECK else 'Generated')+' eight appendix SVG figures.')
