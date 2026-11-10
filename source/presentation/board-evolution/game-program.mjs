// Teaching fragments, not a complete loader or the application's actual C++.
// Keep line numbers and circuit-slide quotations in one source of truth.
export const LOAD_C = [
  'unsigned char *sd =',
  '    (unsigned char *)0x1304C;',
  'unsigned char *ddr =',
  '    (unsigned char *)0x80000000;',
  'for(int i=0; i<size; i++)',
  '    ddr[i] = *sd;',
  '((void (*)(void))ddr)();'
];
export const GAME_C = [
  'void game(void) {',
  '  while (1) {',
  '    update_game();',
  '    make_commands();',
  '    for(int i=0; i<count; i++)',
  '      *(unsigned int *)0x10080000 =',
  '          commands[i];',
  '  }',
  '}'
];
const allLines=[...LOAD_C,...GAME_C];
export const CODE_REFERENCES={copy:{lines:[6]},execute:{lines:[7]},command:{lines:[13,14]}};
export function codeReference(key){
  const lines=CODE_REFERENCES[key].lines;
  return {label:`5枚目・${lines.join('〜')}行目`,code:lines.map(n=>allLines[n-1].trim()).join(' ')};
}
export const C_PROGRAM_DETAIL = `C言語による概念例
左は読込み側の処理、右はSDカードからDDR3へ読み込まれるゲームである。SDカードにはコンパイルされた機械語を保存し、CPUはDDR3へ読み込んだ命令を実行する。C言語の文字列をそのままCPUが実行するという意味ではない。左右は役割の異なる断片であり、そのまま一つの関数に貼り付けるプログラムではない。図の1〜16は説明のための行番号で、アドレスではない。

読込み側の処理（1〜7行目）
1〜2行目のsdは、SDカード制御の受信口0x1304Cを指す。3〜4行目のddrはDDRメモリ内の保存先の例0x80000000を指す。unsigned charは1バイトを扱う型で、*を伴う変数はその型の値がある場所を指すポインタである。sizeはゲームのバイト数を表す。5行目の繰返しでiを0から増やし、6行目の右辺*sdで受信した1バイトを読み、左辺ddr[i]へ保存する。sdが指すアドレスは固定し、ddr[i]の保存先は1バイトずつ進む。これによりSDカードから受け取った内容をDDRメモリへコピーする。
7行目は、ddrの値を引数・戻り値のない関数の開始位置として扱い、末尾の()で呼び出すCの式である。この例ではゲームの入口をコピー先の先頭に置くと仮定し、CPUの実行先をそこへ移す。一般の実行ファイルを先頭からコピーするだけで実行できるという説明ではない。実機の読込みと配置、実行環境の準備には既存のブートローダーやOSを利用し、新しいローダーを作ったという主張はしない。

読み込まれたゲーム（8〜16行目）
8行目のgameは、この例でDDRメモリへ読み込んだゲームの入口を表す。9行目のwhileでゲームの処理を繰り返す。10行目のupdate_game()は、ボールの位置、当たり判定、得点などを更新する処理をまとめた説明用の関数名である。11行目のmake_commands()は、図形の位置や色を既存のRasterIX/OpenGL互換ライブラリへ渡し、描画命令の数値列を用意する処理をまとめた説明用の関数名である。どちらも実際のソースに同名の関数があるという意味ではない。
commandsは用意された描画命令の配列、countはその語数である。対象環境でunsigned intは32ビット。12行目で配列の位置iを増やし、13〜14行目でcommands[i]の1語を0x10080000へ書く。接続回路がこのアドレスへの書込みを受け取ることで、値を描画回路へ送る。CPUが実行する機械語と、描画回路へデータとして送る描画命令は、受け取って実行する回路が異なる。

図と実装との対応
6枚目は6行目、7枚目は7行目、8枚目は13〜14行目を再掲する。青い折れ線は7行目からゲームへ実行が移ること、右向きの矢印は描画命令の転送を示す。
本図はアドレス、読書き、実行先の関係を説明する概念例である。SDの初期化、要求、通信を進める送信、受信待ち、ファイル選択、エラー確認、命令フェッチの同期などは省略した。受信口を読むだけでSD通信が進むわけではない。実装時にはMMIOのvolatileアクセス、OS上のアドレス対応づけ、順序制御も必要である。表示コードではそれらを省略している。実際のWallyBusConnectorはmmapしたアドレスをvolatileポインタで操作し、命令列の最後を別のレジスタへ書き、fenceで順序を制御する。画面切替や待ちもこの断片には含めない。ゲーム本体の実装言語はC++であり、この図はその役割をC言語の表記で示したものである。

コード（行番号は図を参照）
\`\`\`c
${LOAD_C.join('\n')}
\`\`\`
\`\`\`c
${GAME_C.join('\n')}
\`\`\``;

export function drawGameProgram(s, api) {
  const {text,box,wire,route,C}=api;
  const frame='#718299', faded='#A6B2C3', edge='#BBC6D6';
  const code=(rows,x,first)=>rows.forEach((value,i)=>{
    const n=first+i,active=[6,7,13,14].includes(n),y=316+i*26;
    text(s,String(n),x,y,24,26,16,false,active?C.blue:frame,'right');
    const sh=text(s,value,x+32,y,370,26,19,false,active?C.blue:C.ink);
    sh.name='conceptual-c-line-'+n;
    sh.text.style={typeface:'Consolas',fontSize:19,bold:false,color:active?C.blue:C.ink,
      alignment:'left',verticalAlignment:'middle',wrap:'none'};
  });
  box(s,'',64,175,1152,471,'#F6F8FC',22,frame,1.5);
  text(s,'FPGAボード / Nexys Video',80,178,760,28,23,true,frame);
  box(s,'',84,210,1112,378,'#E8EFF9',22,frame,1.8);
  text(s,'FPGAチップ',100,214,240,25,20,true,frame);
  box(s,'',112,244,880,332,C.white,22,C.ink,2.2);
  text(s,'CPU Wallyで実行するプログラムの概念例（C言語）',128,249,848,31,24,true,C.ink);
  text(s,'SDカードから読み込む処理',128,283,404,28,22,true,C.blue);
  text(s,'DDRメモリへ読み込んだゲーム',580,283,396,28,22,true,C.blue);
  code(LOAD_C,128,1);
  code(GAME_C,580,8);
  route(s,[[532,485],[556,485],[556,329],[578,329]],C.blue,true,2.3);
  text(s,'sd：SDカード制御の受信口',134,503,398,22,17,false,frame);
  text(s,'ddr：DDRメモリの保存先',134,526,398,22,17,false,frame);
  text(s,'size：ゲームのバイト数',134,549,398,22,17,false,frame);
  text(s,'ゲームを計算',862,370,116,22,15,false,frame);
  text(s,'描画命令を用意',862,396,116,22,15,false,frame);
  text(s,'commands：描画命令列　count：語数',586,550,396,23,16,false,frame);

  box(s,'接続回路',1030,401,150,83,C.pale,25,C.blue,2.4);
  box(s,'描画・表示\n回路',1030,510,150,64,'#F5F7FB',22,edge,1.2);
  wire(s,992,461,1030,461,C.blue,true,3);
  wire(s,1105,484,1105,510,C.blue,true,2.5);
  wire(s,1150,574,1150,599,faded,true,2.4);
  text(s,'基板上の部品',100,599,290,28,20,true,frame);
  for(const [label,sub,x] of [['SDカード','ゲームを保存',435],['DDR3メモリ','コピーしたゲーム',645]]){
    box(s,'',x,595,150,43,C.white,20,C.blue,1.6);
    text(s,label,x+4,596,142,22,18,true,C.ink,'center');
    text(s,sub,x+4,617,142,20,16,false,C.blue,'center');
  }
  box(s,'',1030,599,150,35,'#F5F7FB',20,edge,1.2);
  text(s,'HDMI端子',1034,601,142,28,20,true,faded,'center');
}

export function drawCodeQuote(s,api,key){
  const {text,C}=api,ref=codeReference(key);
  text(s,ref.label,64,585,250,38,22,true,C.ink);
  const sh=text(s,ref.code,316,585,900,38,25,false,C.blue);
  sh.name='conceptual-c-quote-'+key;
  sh.text.style={typeface:'Consolas',fontSize:25,color:C.blue,alignment:'left',verticalAlignment:'middle',wrap:'none'};
}
