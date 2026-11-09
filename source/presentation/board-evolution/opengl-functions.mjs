import fs from 'node:fs/promises';
import path from 'node:path';

// Basic drawing calls for the complete game screen.
export const OPENGL_SOURCE = [
  'Product revision ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17: console/examples/rasterix/BreakoutRenderer.hpp, Renderer(), drawScene(), color(), quad(), drawGlyph(), createFont(); console/examples/rasterix/Breakout.hpp, scene(), brick(), rowColor(), addText(); console/examples/rasterix/breakout.cpp, present().',
  'https://github.com/SoshiroFujimori/wally-game-console/blob/ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17/examples/rasterix/BreakoutRenderer.hpp',
  'https://github.com/SoshiroFujimori/wally-game-console/blob/ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17/examples/rasterix/Breakout.hpp',
  'Official RasterIX revision 9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0: lib/gl/gl.cpp; lib/gl/opengl/glBegin.cpp, glColor.cpp, glVertex.cpp, glEnd.cpp; lib/gl/renderer/registers/TexEnvReg.hpp (default MODULATE); lib/gl/pixelpipeline/Texture.cpp.',
  'https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0/lib/gl/opengl',
  'Game capture: experiments/dvi-recovery-20261109/media/latest-start.png; acquisition conditions: experiments/dvi-recovery-20261109/README.md.',
  'Khronos OpenGL 2.1 Reference Pages: https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glBegin.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glColor.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glVertex.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glTexCoord.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glTexImage2D.xml ; https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/glBlendFunc.xml'
].join('\n');

export const OPENGL_NARRATION = 'ブロック、壁、パドル、ボールは、すべて四角形で描いています。まずglColor4ubで塗る色を指定します。glBegin(GL_QUADS)からglEnd()の間で、四隅の座標を順に渡すと、その内側を塗ります。左上が(x,y)、幅がw、高さがhなら、右下は(x+w,y+h)です。左上のブロックでは、xが44、yが76、幅が62、高さが18になります。ボールも小さな白い四角形です。背景の初期化では、glClearColorで黒を選び、glClearで描画先を黒にします。文字も四角形を使い、そこに文字の画像を貼ります。その対応を次の回答用スライドで示します。';

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
  text(s,'四隅の座標と色で、四角形を塗る',64,173,560,36,25,true);
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
  text(s,'(x, y)：左上の位置、w：幅、h：高さ',64,492,560,31,22,false);
  text(s,'左上のブロック：(44, 76)、幅62、高さ18',64,528,560,31,21,false);
  text(s,'r・g・b：赤・緑・青の強さ（0〜255）',64,564,560,31,22,false);
  text(s,'赤なら (255, 0, 0)、白なら (255, 255, 255)',64,600,560,31,21,false);
  text(s,'画面の左上は (0, 0)。右へx、下へyが増える',64,647,570,31,21,false);

  s.images.add({blob:await fs.readFile(path.join(root,'experiments/dvi-recovery-20261109/media/latest-start.png')),contentType:'image/png',alt:'タイトル、得点、残機、壁、ブロック、ボール、パドルが表示された実機のゲーム画面',fit:'contain',position:{left:704,top:166,width:480,height:270}});
  text(s,'ブロック・壁・パドル・ボールが四角形',672,445,544,31,23,true);
  text(s,'ボールも白い10×10の四角形',672,478,544,31,22,false);
  text(s,'背景：黒を選び、描画先を黒にする',672,520,544,31,23,true);
  code('glClearColor(0, 0, 0, 1);',672,553,544,22,C.blue);
  code('glClear(GL_COLOR_BUFFER_BIT);',672,583,544,22);
  text(s,'文字：四角形に文字の画像を貼る（次ページ）',672,624,544,31,22,true);
  text(s,'タイトル・得点・残機・READY・CLEARなど',672,657,544,29,21,false);
}

export const TEXTURE_NARRATION = 'テクスチャは、図形に貼るための画像です。このゲームでは、白い文字を並べた64×32画素の画像を用意し、glTexImage2Dで登録しています。左の青枠はAの文字を含む部分です。画像全体の幅と高さをそれぞれ0から1で表し、使う部分の左上を(u0,v0)、右下を(u1,v1)とします。下のコードではglTexCoord2fで画像内の位置を指定し、直後のglVertex2fで、その位置を画面のどこに置くかを指定します。これを四隅について繰り返すと、Aの画像が画面上の四角形に貼られます。文字の白い部分にはglColor4ubで選んだ色が付き、透明な部分には下地が残ります。タイトルも得点の数字も、この処理を文字ごとに行って描いています。';

export const TEXTURE_DETAIL = `テクスチャと画面の二つの座標
テクスチャは図形に貼るための画像である。今回の文字画像には、ゲームで使う数字やアルファベットを並べてある。文字ごとに8×8画素の領域を割り当て、8列×4行の64×32画素の画像に入れている。文字の形は、その中の幅5画素、高さ7画素を使って表す。図の字形と配置は、製品のcreateFont()とglyph()に書かれたデータに基づく。

文字画像の横方向の位置をu、縦方向の位置をvと呼ぶ。画像全体の幅と高さをそれぞれ1とするので、左端がu=0、右端がu=1になる。このゲームは文字データの先頭行をv=0側に置き、その側を画面上の文字の上辺に対応させている。図もこの並びで表した。一般的な画像ファイルの上下方向を自動で決める規則を説明しているわけではない。

Aを選ぶ例
Aは左から4列目、上から2行目の領域にある。画像内での範囲は横24〜32、縦8〜16画素なので、u0=24/64=0.375、u1=32/64=0.5、v0=8/32=0.25、v1=16/32=0.5になる。図の青枠は、この8×8画素の範囲を指す。四角形の境界を表す値であり、文字の不透明な部分だけを囲んだ範囲ではない。

画面上で文字を置く場所は(x,y)、幅はw、高さはhで表す。例えば(x,y)=(100,200)、w=h=16なら、画面上の四隅は(100,200)、(116,200)、(116,216)、(100,216)になる。8×8画素の文字の領域を、この16×16の四角形に対応させる。文字が大きくなるのは、画像内の範囲をそのままにして、画面上の四角形を大きくしたためである。この例の配置は、対応を説明するための数値である。

コードの読み方
glBindTexture(GL_TEXTURE_2D,font)で、登録済みの文字画像を選ぶ。fontは画像を識別する番号であり、文字の画像データそのものが入った配列ではない。glColor4ub(0,255,255,255)で水色と不透明度を設定する。glBegin(GL_QUADS)からglEnd()までは、四つの頂点で一つの四角形を指定する区間である。

glTexCoord2f(u0,v0)は、次に渡す頂点に付ける画像内の位置を設定する。続くglVertex2f(x,y)は、その画像内の位置と組になる画面上の位置を渡す。つまり「画像内の左上を、画面上の左上に対応させる」という一組の指定になる。同じように右上、右下、左下を渡す。図形の内部では、描画処理が四隅の対応から画像のどの位置を参照するかを求め、その場所の色と不透明度を使う。画面の画素ごとにゲーム側からglTexCoord2fを呼び出す必要はない。

画像を用意する処理
createFont()は、pixelsという配列に64×32画素分のRGBA値を用意する。R、G、Bは赤、緑、青、Aは不透明度である。RGBは白とし、文字の形に当たる画素のAを255、周囲のAを0にする。次の呼出しで、その配列をテクスチャ画像としてライブラリへ渡す。

glGenTextures(1, &font);
glBindTexture(GL_TEXTURE_2D, font);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 64, 32, 0,
             GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());

最初のGL_TEXTURE_2Dは二次元画像、続く0は通常の画像の階層、GL_RGBAは色と不透明度を持つ形式を指定する。64、32は画像の幅と高さ、次の0は周囲に追加の境界を持たせない指定である。後半のGL_RGBAとGL_UNSIGNED_BYTEは、渡す配列がRGBAの順で、各成分を1バイトで表すことを示す。pixels.data()は画像データを置いた配列の先頭である。glTexParameteriでは、このゲームが使う最近傍の画像参照と画像端の扱いを設定している。

白い文字が水色になる理由
このゲームで使うテクスチャ設定では、画像の色に頂点の色を掛けて色を決める。白い文字画像のRGBを0〜1で表すと(1,1,1)、水色は(0,1,1)なので、掛けた結果は水色になる。文字を白や黄色にする場合も、同じ文字画像に対してglColor4ubの値を変える。タイトル、SCOREと得点、LIVESと残機、READY、CLEAR、GAME OVERはこの文字の描き方を使う。

透明な部分の扱い
文字を描く前にglEnable(GL_TEXTURE_2D)とglEnable(GL_BLEND)を呼び、画像の参照と色の合成を有効にする。glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA)を指定すると、描いた文字の不透明度をaとして、各RGB成分は概念的に「文字の色×a＋元の画面の色×(1−a)」になる。a=1なら文字の色になり、a=0なら元の画面の色が残る。このため、四角形全体が塗りつぶされず、文字の形が見える。図の青灰色は透明部分を見えるように示したもので、テクスチャのRGBはその部分も白である。画面側の黒は背景を表す。スライドのコードは、画像の準備とこれらの有効化を済ませた状態で、1文字を描く部分を抜き出したものである。`;

// Reconstruct the native, editable font diagram from the pinned product data.
async function readFont(root) {
  const renderer=await fs.readFile(path.join(root,'console/examples/rasterix/BreakoutRenderer.hpp'),'utf8');
  const game=await fs.readFile(path.join(root,'console/examples/rasterix/Breakout.hpp'),'utf8');
  const characters=renderer.match(/constexpr char characters\[\] = "([^"]+)";/)?.[1];
  if(!characters||characters.length>32)throw new Error('Font character layout is missing');
  const glyphs=new Map([...game.matchAll(/case '([^'])':\s*return \{([^}]+)\};/g)].map(m=>[m[1],m[2].split(',').map(Number)]));
  const a=glyphs.get('A');
  if(characters.indexOf('A')!==11||JSON.stringify(a)!=='[14,17,17,31,17,17,17]')throw new Error('Font example no longer matches the pinned source');
  return {characters,glyphs};
}

function glyphPixels(s,api,rows,x,y,scale,color) {
  const {box}=api;
  for(let row=0;row<7;row++) {
    for(let col=0;col<5;) {
      if(!(rows[row]&(1<<(4-col)))){col++;continue;}
      let end=col+1;
      while(end<5&&(rows[row]&(1<<(4-end))))end++;
      box(s,'',x+col*scale,y+row*scale,(end-col)*scale,scale,color,18,color,0);
      col=end;
    }
  }
}

export async function drawTextureMapping(s,api,root) {
  const {text,box,wire,C}=api;
  const code=(v,x,y,w=1100,size=21,color=C.ink)=>{
    const sh=text(s,v,x,y,w,28,size,false,color);
    sh.text.style={typeface:'Consolas',fontSize:size,bold:false,color,alignment:'left',verticalAlignment:'middle',wrap:'square'};
    return sh;
  };
  const {characters,glyphs}=await readFont(root);
  text(s,'テクスチャは図形に貼る画像。画像と画面の四隅を対応させる',64,119,1152,38,26,true,C.blue);
  text(s,'文字画像をglTexImage2Dで登録',64,171,390,32,23,true);
  text(s,'font：64×32画素',64,203,280,29,21,false);
  const transparent='#A7B9D1',ax=64,ay=240,scale=4;
  box(s,'',ax,ay,256,128,transparent,18,C.ink,1.2);
  for(const [slot,ch] of [...characters].entries()) {
    const rows=glyphs.get(ch)||[0,0,0,0,0,0,0];
    glyphPixels(s,api,rows,ax+(slot%8)*32,ay+Math.floor(slot/8)*32,scale,C.white);
  }
  for(let row=0;row<4;row++)for(let col=0;col<8;col++)
    box(s,'',ax+col*32,ay+row*32,32,32,'none',18,'#D7E2F0',0.55);
  box(s,'',ax+3*32,ay+32,32,32,'none',18,C.blue,3.2);
  text(s,'青枠：Aを含む8×8画素',64,378,300,29,21,true,C.blue);
  wire(s,334,296,411,296,C.ink,true,2.0);
  text(s,'拡大',339,262,66,28,20,false,C.ink,'center');

  text(s,'画像内の1文字',444,171,220,32,23,true);
  box(s,'',480,240,112,112,transparent,18,C.blue,2.1);
  glyphPixels(s,api,glyphs.get('A'),480,240,14,C.white);
  code('(u0, v0)',409,208,120,20,C.blue);
  code('(u1, v0)',567,208,120,20,C.blue);
  code('(u0, v1)',409,355,120,20,C.blue);
  code('(u1, v1)',567,355,120,20,C.blue);
  text(s,'画像全体の幅・高さを0〜1で表す',413,391,395,27,19,false);

  text(s,'画面に描く文字',930,171,286,32,23,true);
  box(s,'',976,240,112,112,'#000000',18,C.ink,1.4);
  glyphPixels(s,api,glyphs.get('A'),976,240,14,'#00FFFF');
  code('(x, y)',889,208,120,20);
  code('(x+w, y)',1064,208,152,20);
  code('(x, y+h)',868,355,140,20);
  code('(x+w, y+h)',1064,355,152,20);
  text(s,'透明部分には下地が残る',918,391,298,27,20,false);
  wire(s,696,296,942,296,C.ink,true,2.0);
  text(s,'四隅を対応させる',699,260,238,29,22,true,C.blue,'center');
  text(s,'青灰色：透明な部分',690,315,262,29,20,false,C.ink,'center');

  box(s,'',64,429,1152,224,C.pale,18,C.pale,0);
  wire(s,64,429,1216,429,C.ink,false,1.4);
  wire(s,64,653,1216,653,C.ink,false,1.4);
  code('glBindTexture(GL_TEXTURE_2D, font);',84,435,850,21);
  text(s,'// 使う文字画像を選ぶ',969,435,235,28,20,false,C.old);
  code('glColor4ub(0, 255, 255, 255);',84,462,850,21,C.blue);
  text(s,'// 文字の色を水色に',969,462,235,28,20,false,C.old);
  code('glBegin(GL_QUADS);',84,489);
  for(const [i,uv,xy,label] of [
    [0,'u0, v0','x, y','左上'],
    [1,'u1, v0','x + w, y','右上'],
    [2,'u1, v1','x + w, y + h','右下'],
    [3,'u0, v1','x, y + h','左下']
  ]) {
    const y=516+i*27;
    code(`glTexCoord2f(${uv});`,105,y,385,21,C.blue);
    code(`glVertex2f(${xy});`,526,y,440,21);
    text(s,'// '+label,1060,y,140,28,20,false,C.old);
  }
  code('glEnd();',84,624);
  text(s,'描画前にGL_TEXTURE_2DとGL_BLENDを有効にし、透明度に従って下地と合成する',64,665,1152,27,21,false);
}
