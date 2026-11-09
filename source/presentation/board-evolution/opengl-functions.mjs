import fs from 'node:fs/promises';
import path from 'node:path';

// Basic drawing calls for the complete game screen.
export const OPENGL_SOURCE = [
  'Product revision ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17: console/examples/rasterix/BreakoutRenderer.hpp, Renderer(), drawScene(), color(), quad(), drawGlyph(), createFont(); console/examples/rasterix/Breakout.hpp, scene(), brick(), rowColor(), addText(); console/examples/rasterix/breakout.cpp, present().',
  'https://github.com/SoshiroFujimori/wally-game-console/blob/ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17/examples/rasterix/BreakoutRenderer.hpp',
  'https://github.com/SoshiroFujimori/wally-game-console/blob/ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17/examples/rasterix/Breakout.hpp',
  'Official RasterIX revision 9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0: lib/gl/gl.cpp; lib/gl/opengl/glBegin.cpp, glColor.cpp, glVertex.cpp, glEnd.cpp.',
  'https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0/lib/gl/opengl',
  'Game capture: experiments/dvi-recovery-20261109/media/latest-start.png; acquisition conditions: experiments/dvi-recovery-20261109/README.md.',
  'Khronos OpenGL 2.1 Reference Pages: https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glBegin.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glColor.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glVertex.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glTexCoord.xml'
].join('\n');

export const OPENGL_NARRATION = 'ゲーム画面は、黒い背景、色の付いた図形、文字からできています。ブロック、壁、パドル、ボールは、すべて四角形で描きます。glColor4ubで色を、glVertex2fで四隅の位置を渡します。背景の初期化では、glClearColorとglClearを使って描画先を黒にします。タイトル、得点、残機、READYやCLEARなどの文字は、文字の画像を四角形に貼ります。そのために、画像を登録するglTexImage2D、使う画像を選ぶglBindTexture、画像のどこを貼るか指定するglTexCoord2fなどを使っています。';

export const OPENGL_DETAIL = `画面の構成
実機画面の上部には、WALLY BREAKOUTというタイトル、SCOREと得点、LIVESと残機がある。青い三辺が壁、五色の横長の図形がブロック、下側の白い横長の図形がパドル、小さい白い四角形がボールである。ゲームの状態に応じて、中央にはREADY、CLEAR、GAME OVERも表示する。右上の画像は記録済みの実機画像をそのまま縮小配置しており、全状態の文字が同時に表示されるわけではない。

図形に共通する描き方
ブロック、壁、パドル、ボールは、色と位置と大きさを持つ四角形として扱う。glBegin(GL_QUADS)で、頂点を四個ずつ一つの四角形として扱うよう指定する。glColor4ub(r,g,b,255)で、その後の頂点に付ける色を決める。r、g、bは赤、緑、青の強さで、0〜255を使う。赤いブロックなら(255,0,0)、白いパドルやボールなら(255,255,255)、青い壁なら(0,0,255)である。最後の255は不透明度の最大値を表す。

glVertex2f(x,y)を四回呼び、左上、右上、右下、左下の順に座標を渡す。左上を(x,y)、幅をw、高さをhとすると、四隅は(x,y)、(x+w,y)、(x+w,y+h)、(x,y+h)になる。glEnd()で頂点を渡す区間を終える。この例はRenderer::color()とquad()の位置と色に関係する呼出しを、変数で表した抜粋である。ゲームに使うボールは10×10、パドルは88×12、ブロックは62×18の四角形である。壁は細長い四角形を三本置いて作る。

背景の初期化
glClearColor(0,0,0,1)で、消去に使う色を黒に設定する。glClear(GL_COLOR_BUFFER_BIT)で、その設定に従って描画先の色を消去する。右側の例は初期化の処理を示す。

文字の描き方
ゲームが使う文字の形を一枚の画像に用意し、glTexImage2Dで登録する。この画像をテクスチャと呼ぶ。glGenTexturesは画像を識別する番号を用意し、glBindTextureは操作・使用する画像を選ぶ。glTexParameteriは画像を拡大縮小するときや、画像の端を扱うときの設定に使う。

文字を描くときも四角形を使う。glTexCoord2f(u,v)で画像の中の位置を指定し、続くglVertex2f(x,y)で画面上の位置を指定する。この組を四隅について渡すことで、画像内の文字を画面上の四角形に貼る。glColor4ubは文字の色にも使う。タイトルは水色、得点と残機は白、READYは黄色、CLEARは緑、GAME OVERは赤である。

文字画像では、文字がある画素は不透明、それ以外の画素は透明として用意する。glEnable(GL_TEXTURE_2D)で画像を使う処理を、glEnable(GL_BLEND)で混合を有効にする。glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA)を設定し、透明な画素では下地が見えるように合成する。glDisableは、これらの処理を無効にするときに使う。

画面の座標
glViewport(0,0,640,480)で描画領域を指定する。glOrtho(0,640,480,0,-1,1)などの設定によって、ゲーム内では左上を基準に、右へx、下へyが増える座標を使う。glMatrixModeで設定対象を選び、glLoadIdentityで変換を初期状態にする。スライドでは、位置と色を指定する関数の意味を中心に示している。

関数を実行する場所
OpenGL関数には、公式RasterIXリポジトリのソフトウェアライブラリを使う。CPUがこのライブラリを実行し、位置、色、画像などの指定から描画回路用の命令を用意する。描画回路はその命令に従って画素を塗る。ゲーム側では、一画面分の描画を指定した後、RasterIX固有のswapDisplayList()を呼んで提出する。glGetError()はOpenGLのエラーを確認するために使う。`;

export async function drawOpenGLFunctions(s,api,root) {
  const {text,box,wire,C}=api;
  const code=(v,x,y,w=540,size=23,color=C.ink)=>{
    const sh=text(s,v,x,y,w,30,size,false,color);
    sh.text.style={typeface:'Consolas',fontSize:size,bold:false,color,alignment:'left',verticalAlignment:'middle',wrap:'square'};
    return sh;
  };
  text(s,'背景、図形、文字をOpenGL関数で指定する',64,119,1152,38,28,true,C.blue);
  text(s,'図形：ブロック・壁・パドル・ボール',64,173,560,36,25,true);
  box(s,'',64,220,560,258,C.pale,24,C.pale,0);
  wire(s,64,220,624,220,C.ink,false,1.4);
  wire(s,64,478,624,478,C.ink,false,1.4);
  const lines=[
    ['glBegin(GL_QUADS);','四角形'],
    ['glColor4ub(r, g, b, 255);','色'],
    ['glVertex2f(x, y);','左上'],
    ['glVertex2f(x + w, y);','右上'],
    ['glVertex2f(x + w, y + h);','右下'],
    ['glVertex2f(x, y + h);','左下'],
    ['glEnd();','指定終了']
  ];
  lines.forEach(([v,label],i)=>{
    const y=233+i*33;
    code(v,84,y,470,23,i===1?C.blue:C.ink);
    text(s,'// '+label,494,y,122,30,20,false,C.old);
  });
  text(s,'r・g・b：赤・緑・青の強さ（0〜255）',64,491,560,31,22,false);
  text(s,'(x, y)：左上の位置、w：幅、h：高さ',64,526,560,31,22,false);
  text(s,'ボールも10×10の四角形として描く',64,561,560,31,22,false);
  text(s,'画面の準備：640×480の座標を設定',64,603,560,31,23,true);
  code('glViewport(0, 0, 640, 480);',64,634,560,21);
  code('glOrtho(0, 640, 480, 0, -1, 1);',64,661,560,21);

  s.images.add({blob:await fs.readFile(path.join(root,'experiments/dvi-recovery-20261109/media/latest-start.png')),contentType:'image/png',alt:'タイトル、得点、残機、壁、ブロック、ボール、パドルが表示された実機のゲーム画面',fit:'contain',position:{left:704,top:166,width:480,height:270}});
  text(s,'背景を黒にする（初期化）',672,446,544,31,24,true);
  code('glClearColor(0, 0, 0, 1);',672,477,544,22);
  code('glClear(GL_COLOR_BUFFER_BIT);',672,505,544,22);
  text(s,'文字：タイトル・得点・残機・状態表示',672,542,544,31,23,true);
  for(const [i,name,meaning] of [
    [0,'glTexImage2D','文字の画像を登録'],
    [1,'glBindTexture','使う画像を選ぶ'],
    [2,'glTexCoord2f','画像内の位置を指定'],
    [3,'glBlendFunc','透明な部分に下地を残す']
  ]){
    code(name,672,578+i*27,220,20,C.blue);
    text(s,meaning,905,578+i*27,311,27,20,false);
  }
}
