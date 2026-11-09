import fs from 'node:fs/promises';
import path from 'node:path';
import {drawImplementationFlow} from './board-circuit.mjs';
import {drawAbstractSystem, drawAbstractAccess, drawConceptCode} from './abstract-flow.mjs';

// Main talk: the same functional paths lead from the abstract to its C example.
export async function addMainSlides(ctx) {
  const {slide, api, foot, cover, root, DDCA, RVSOC, PRODUCT, BASIC, POSTER, VIDEO} = ctx;
  const {text, wire, C} = api;
  let s = slide('FPGAを用いた2Dゲーム機の製作',5,
    'この題目で発表します。', '',
    '教育用CPUに描画・表示機能を追加したゲーム機の製作について報告する。');
  wire(s,190,371,1090,371,C.heading,false,1.7);
  text(s,cover.student,180,422,920,52,31,false,C.ink,'center');
  text(s,cover.supervisor,180,483,920,52,31,false,C.ink,'center');

  s=slide('FPGAチップで周囲の部品を制御する',25,
    'FPGAボードには、SDカードスロット、DDR3メモリ、HDMI端子が付いています。中央のFPGAチップには、これらを制御する回路を実装できます。回路はコードで記述します。例えば、左のコードは右のAND回路を表します。このように回路を記述して、チップ内に実装します。',
    `${DDCA} Chapters 2 and 4. ${RVSOC} Chapter 23. Nexys Video Reference Manual.`,
    'AND回路はHDL記述と論理回路の対応例である。外側の部品すべてを一つのAND回路で制御する意味ではない。ボード上の部品は物理的に実装済みであり、図はその配置を簡略化している。');
  text(s,'SDカードやメモリを制御する回路を、チップ内に実装できる',64,129,1152,52,29,true,C.blue);
  drawImplementationFlow(s,api);
  text(s,'回路をHDLコードで記述し、FPGAチップ内に実装する',64,645,1152,32,28,true);
  foot(s,'HDLの例とAND回路の対応');

  s=slide('教育用CPUをゲーム機へ拡張する',30,
    '本研究では、教育用CPUのWallyに描画・表示機能を追加しました。CPUやSD制御にはWallyの既存構成を使います。DDR制御の本体はAMD製です。描画と表示には、RasterIXに含まれる回路を流用しました。その間をつなぐ回路を追加し、Nexys Videoに実装しました。目的は、Wallyの学習者にゲーム機への拡張例を示すことです。',
    `${RVSOC} ${PRODUCT} source/abstract/content.json.`,
    'Wallyの既存構成を囲む枠はCPU・周辺制御・メモリ接続の利用範囲を示す。DDRコントローラー本体はAMD MIG IPであり、Wally側の生成・接続の仕組みを利用した。Nexys Video向け設定とRasterIXへの接続を本研究で追加した。描画と表示を一つの箱にまとめ、内部の画素処理や表示タイミングはこの図では示していない。');
  text(s,'既存のCPUと描画・表示回路を、接続回路でつなぐ',64,129,1152,44,29,true,C.blue);
  drawAbstractSystem(s,api,'all');
  text(s,'目的：Wallyの学習者に、ゲーム機への拡張例を示す',64,579,1152,58,31,true);
  foot(s,'枠は回路の提供元、矢印はデータの通り道を示す');

  s=slide('アドレスで相手を選び、値を書く',40,
    'CPUからの読み書きを拡大します。CPUはアドレスAD、書込みデータWD、書込みイネーブルWEを出します。アドレスデコーダは、ADがどの範囲に入るかを調べます。この例ではDDR3の範囲なので、DDR制御を選ぶS1だけが1になります。WEが1なので、選ばれたDDR制御がWDの7を受け取り、ADが示す番地に保存します。アドレスは、相手の回路と、その中の場所を指定しています。',
    `${PRODUCT} console/src/mmu/adrdecs.sv; console/src/uncore/uncore.sv. ${RVSOC} Figure 9.28.`,
    '有効な読書きが行われるときの概念図である。AD/WD/WE/RD、S0〜S2は説明用の信号名であり、単一の実バスの全信号を表さない。実装にある転送の有効性、バス変換、待ち、クロック変換、アクセス幅などを省略する。DDR3のアドレス範囲は0x80000000〜0x9FFFFFFFである。線の太さは1ビットと複数ビットの区別を示す。');
  text(s,'例：DDR3の 0x80000000 番地へ、値7を書く',64,119,1152,38,28,true,C.blue);
  drawAbstractAccess(s,api,false);
  text(s,'DDR3の範囲：0x80000000〜0x9FFFFFFF → S1＝1',64,647,1152,34,27,true);

  s=slide('選んだ相手の値を、CPUへ戻す',35,
    '次に、同じ番地から値を読みます。アドレスでDDR制御が選ばれる点は同じですが、今度はWEを0にします。各回路が返す値は、下の選択回路に集まります。選択回路も同じS0からS2を使います。この例ではS1が1なので、DDR制御の値だけを選びます。先ほど保存した7が、読出しデータRDとしてCPUへ戻ります。',
    `${PRODUCT} console/src/uncore/uncore.sv. ${RVSOC} Figure 9.28.`,
    '有効な転送中のWE=0を読出し、WE=1を書込みとして説明している。WE=0だけで転送が開始するという意味ではない。読み出す相手の選択はアドレスから決まる。戻り値を選ぶS0〜S2は同じ選択信号を表し、図では同名のラベルで接続を示す。実バスでは応答まで選択を保持する必要がある。');
  text(s,'例：同じ番地から値7を読み、CPUへ返す',64,119,1152,38,28,true,C.blue);
  drawAbstractAccess(s,api,true);
  text(s,'同じ選択信号S0〜S2で、戻す値も一つに選ぶ',64,647,1152,34,29,true);

  s=slide('SDカードへ読出しを要求する',45,
    'この読み書きを使って、SDカードからゲームを読み込みます。まずCPUは、SD制御の送信用レジスタへ、読出し要求を表す数値を順番に書きます。下のコードでは、配列の6個の数値を、同じアドレスへ一つずつ書いています。アドレスは0x13048、WEは1です。デコーダがS0を1にし、SD制御が書き込まれた数値をカードへ送ります。カードはこの要求に応じてデータを返します。',
    'source/abstract/content.json; console/fpga/zsbl/spi.h; console/src/uncore/spi_apb.sv.',
    'SD制御の割当範囲は0x13000〜0x13FFF、送信用レジスタは0x13048、受信用は0x1304Cである。request配列は先頭からの複数ブロック読出しに対応するCMD18の要求例。Cは物理アドレスへ直接アクセスできると仮定した概念コードであり、実行可能なSDドライバ全体ではない。実装の初期化、応答確認、受信クロックの発生、転送待ちなどはソースにある。');
  text(s,'送信用レジスタ 0x13048 へ、要求を表す数値を順に書く',64,129,1152,44,28,true,C.blue);
  drawAbstractSystem(s,api,'request');
  drawConceptCode(s,api,[
    ['uint8_t request[] = {0x52, 0, 0, 0, 0, 0xE1};','読出し要求を表す数値'],
    ['for (int i = 0; i < 6; i++)','6個を一つずつ送る'],
    ['  *(uint32_t *)0x13048 = request[i];','書込み先は毎回同じ']
  ],551);
  foot(s,'SDカードへ読出し要求を送る概念コード');

  s=slide('SDカードからDDR3へコピーし、実行する',50,
    '返ってきたデータは、受信用レジスタ0x1304Cから読みます。CPUはそれを、DDR3の0x80000000から順に保存します。次のデータも同じ受信用レジスタから読みますが、保存先は1バイトずつ進めます。こうしてSDカードの内容をDDR3へコピーします。コピーが終わると、startにプログラムの開始アドレスを入れ、startを呼びます。CPUの実行位置がそのアドレスへ移り、DDR3に置いたゲームプログラムを実行します。',
    'source/abstract/content.json; console/fpga/zsbl/spi.h; console/fpga/zsbl/boot.c; console/examples/rasterix/WallyBusConnector.hpp.',
    'sizeはコピーするバイト数、dstは保存先の先頭、iは先頭からのバイト位置を表す。受信用レジスタの下位8ビットを保存する。startは開始アドレスを保持する関数ポインタで、start()はそこへの呼出しとなる。DDR3へコピーして実行位置を移す関係を示す概念例であり、実機のブートローダーやOSを含む起動手順の全体を置き換えるものではない。Linuxで動く実際のゲームがそのまま物理アドレスを参照するわけではなく、入出力には対応付けた領域を使う。');
  text(s,'受信する番地は固定し、DDR3の保存先を1バイトずつ進める',64,127,1152,44,28,true,C.blue);
  drawAbstractSystem(s,api,'copy',{compact:true});
  drawConceptCode(s,api,[
    ['uint8_t *dst = (uint8_t *)0x80000000;','DDR3の保存先'],
    ['for (int i = 0; i < size; i++)','sizeバイトをコピー'],
    ['  dst[i] = *(uint32_t *)0x1304C;','SDから読み、DDR3へ保存'],
    ['void (*start)(void) = (void (*)(void))0x80000000;','実行を始めるアドレス'],
    ['start();','そのアドレスへ分岐する']
  ],485);
  foot(s,'ゲームの読込みと実行開始を表す概念コード');

  s=slide('描画命令を送り、ゲーム画面を出す',45,
    'ゲームは、RasterIX付属のOpenGL互換ライブラリへ、図形の位置や色を渡します。ライブラリもCPU上で動き、描画命令を数値の列にします。CPUが0x10080000へ値を書くと、S2で選ばれた接続回路が受け取り、RasterIXへ渡します。RasterIXは命令に従って画像を作り、DDR制御を通してDDR3へ保存します。さらに画像を読み出し、HDMI端子から映像を出します。描画と表示には、RasterIXに含まれる回路を使っています。',
    `${PRODUCT} console/examples/rasterix/WallyBusConnector.hpp; console/addins/rasterix/lib; ${BASIC}`,
    'OpenGL互換ライブラリ本体はRasterIXのソフトウェアで、CPUが実行する。Wally用の接続部分は数値列を描画用レジスタへ書き込む。0x10080000は通常の命令語を送るポートであり、cmdはその1語。末尾通知や待ち、バッファ切替などの制御は図から省略する。DDR3への画像の保存と読出しはRasterIX側の回路が要求し、DDRコントローラーが処理する。公式RasterIX本体は変更していない。');
  text(s,'CPU上のライブラリが、図形の位置や色を命令の数値列にする',64,129,1152,44,27,true,C.blue);
  drawAbstractSystem(s,api,'draw');
  drawConceptCode(s,api,[['*(uint32_t *)0x10080000 = cmd;','描画命令の値を一つ送る']],560);
  text(s,'接続回路 → RasterIX → DDR3の画像 → HDMI端子',64,620,1152,42,28,true);
  foot(s,'描画命令を送る概念コードと、画像の保存・出力経路');

  s=slide('実機で確認した動作',25,
    '実機では、640かける480画素のゲーム画面を出力しました。左が開始時、右がプレイ中の画面です。ボールが動き、壁やパドルで跳ね返り、当たったブロックが消えることを確認しました。現在はプログラムがパドルを自動で動かしています。次のスライドで実際の映像を示します。',
    BASIC,
    '最新のタイトル配置を持つ実行ファイルと、RasterIX同梱の表示回路を使った30秒の実機記録から抽出した元画像を使用。画像は加工せず、縦横比を維持して配置している。640×480はゲームの画像解像度で、録画ファイルの保存解像度ではない。画像だけで動きを判定せず、実機動画と対応する観察記録を根拠にする。');
  text(s,'HDMI端子から、640×480画素のゲーム画面を出力',64,130,1152,42,29,true,C.blue);
  for (const [p,x,label] of [[POSTER,64,'ゲーム開始時'],['experiments/dvi-recovery-20261109/media/latest-later.png',662,'プレイ中']]) {
    text(s,label,x,195,554,35,26,true,C.heading,'center');
    s.images.add({blob:await fs.readFile(path.join(root,p)),contentType:'image/png',alt:label+'の未加工の実機映像',fit:'contain',position:{left:x,top:242,width:554,height:311.625}});
  }
  text(s,'ボールの移動・反射と、当たったブロックの消去を確認',64,583,1152,45,29,true);
  text(s,'現在は、プログラムがパドルを動かす自動プレイ',64,635,1152,34,26);

  s=slide('ブロック崩しの実機動画',30,
    'こちらが実際の映像です。ボールが壁やパドルで跳ね返り、ブロックが消えていきます。',
    `${BASIC} Video: ${VIDEO}`,
    '2026年11月9日の標準表示構成による30秒の記録。RasterIX_IFと同梱dvi_framebufferを利用している。動画領域をクリックすると再生する。パドルは自動操作であり、コントローラによるプレイではない。録画の保存フレームレートからゲームの描画FPSを求めていない。確認した取得条件と機器の範囲は再現資料を参照。');
  s.images.add({blob:await fs.readFile(path.join(root,POSTER)),contentType:'image/png',alt:'標準表示構成で動くブロック崩しの実機動画',fit:'contain',position:{left:160,top:132,width:960,height:540}});
  text(s,'30秒の実機動画：画面をクリックして再生',64,681,1080,29,21,true,C.blue,'center');

  s=slide('結論と今後の展望',25,
    'Wallyに描画・表示機能を追加し、ブロック崩しの実行と映像出力を実現しました。回路の接続方法とゲームの実行手順を公開し、Wallyの学習者が参考にできる拡張例を示しました。今後は、ゲームコントローラによる操作や、ホーム画面などのGUIの追加を検討します。',
    `${PRODUCT} ${BASIC} source/abstract/content.json.`,
    '既存CPUと描画・表示回路を利用し、回路・ソフトウェアの接続を実装した。教育効果を学習実験で測定したという主張ではない。現在は自動操作であり、ゲームコントローラによる操作とホーム画面などのGUIは今後の候補である。実装と動作確認を終えた範囲を最終発表で報告する。');
  text(s,'製作したもの',64,155,1152,42,31,true,C.heading);
  text(s,'教育用CPUに描画・表示機能を追加したゲーム機',64,213,1152,52,34,true);
  text(s,'ブロック崩しの実行と、HDMI端子からの映像出力を確認',64,279,1152,48,29);
  text(s,'Wallyの学習者が参考にできる拡張例',64,378,1152,42,31,true,C.heading);
  text(s,'回路の接続方法と、ゲームの実行手順を公開',64,435,1152,50,32,true);
  text(s,'今後：ゲームコントローラによる操作機能や、\n　　　ホーム画面などのGUIを追加',64,559,1152,85,29);
  foot(s,'GUI：ホーム画面やメニューなどの操作画面');
}
