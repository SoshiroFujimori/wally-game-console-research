import fs from 'node:fs/promises';
import path from 'node:path';

const PRODUCT='https://github.com/SoshiroFujimori/wally-game-console/blob/ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17/';
const RIX='https://github.com/ToNi3141/RasterIX/blob/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0/';
const REFERENCES={
  renderer:PRODUCT+'examples/rasterix/BreakoutRenderer.hpp',
  game:PRODUCT+'examples/rasterix/Breakout.hpp',
  present:PRODUCT+'examples/rasterix/breakout.cpp',
  bus:PRODUCT+'examples/rasterix/WallyBusConnector.hpp',
  cmake:PRODUCT+'examples/rasterix/CMakeLists.txt',
  vertices:RIX+'lib/gl/vertexpipeline/VertexQueue.hpp',
  assembler:RIX+'lib/gl/transform/PrimitiveAssembler.cpp',
  texture:RIX+'lib/gl/opengl/glTexImage.cpp',
  env:RIX+'lib/gl/renderer/registers/TexEnvReg.hpp',
  submit:RIX+'lib/gl/renderer/Renderer.cpp',
  vbo:RIX+'lib/gl/vertexpipeline/VertexBuffer.hpp',
  readme:RIX+'README.md',
  begin:'https://learn.microsoft.com/en-us/windows/win32/opengl/glbegin',
  input:'https://learn.microsoft.com/en-us/windows/win32/opengl/input-data',
  image:'https://learn.microsoft.com/en-us/windows/win32/opengl/glteximage2d',
  blend:'https://learn.microsoft.com/en-us/windows/win32/opengl/glblendfunc',
};

export const OPENGL_TOPICS=[
  {number:17,label:'画面の要素と描き方'},
  {number:18,label:'ゲーム画面の座標'},
  {number:19,label:'四角形の色と四隅'},
  {number:20,label:'文字画像の用意と登録'},
  {number:21,label:'画像内のAを選ぶ座標'},
  {number:22,label:'画像と画面の座標の対応'},
  {number:23,label:'文字の色と透明な部分'},
  {number:24,label:'CPUと描画回路の分担'},
  {number:25,label:'描画命令の提出と表示切替'},
];

// Derive editable font pixels from the pinned implementation.
async function readFont(root) {
  const renderer=await fs.readFile(path.join(root,'console/examples/rasterix/BreakoutRenderer.hpp'),'utf8');
  const game=await fs.readFile(path.join(root,'console/examples/rasterix/Breakout.hpp'),'utf8');
  const characters=renderer.match(/constexpr char characters\[\] = "([^"]+)";/)?.[1];
  const glyphs=new Map([...game.matchAll(/case '([^'])':\s*return \{([^}]+)\};/g)].map(m=>[m[1],m[2].split(',').map(Number)]));
  if(characters?.indexOf('A')!==11||JSON.stringify(glyphs.get('A'))!=='[14,17,17,31,17,17,17]')throw new Error('Pinned font example changed');
  return {characters,glyphs};
}

function helpers(s,api) {
  const {text,box,wire,C}=api;
  const label=(v,x,y,w=1152,size=25,color=C.ink,bold=false,h=36)=>text(s,v,x,y,w,h,size,bold,color);
  const lead=v=>label(v,64,119,1152,27,C.blue,true,38);
  const mono=(v,x,y,w=1100,size=23,color=C.ink,h=32)=>{
    const sh=text(s,v,x,y,w,h,size,false,color);
    sh.text.style={typeface:'Consolas',fontSize:size,bold:false,color,alignment:'left',verticalAlignment:'middle',wrap:'square'};
    return sh;
  };
  const code=(lines,x,y,w,dy=35,size=23)=>{
    const h=lines.length*dy+20;
    box(s,'',x,y,w,h,C.pale,20,C.pale,0);
    wire(s,x,y,x+w,y,C.ink,false,1.3);wire(s,x,y+h,x+w,y+h,C.ink,false,1.3);
    lines.forEach((row,i)=>mono(typeof row==='string'?row:row[0],x+16,y+10+i*dy,w-32,size,typeof row==='string'?C.ink:row[1],dy));
    return y+h;
  };
  return {label,lead,mono,code};
}

function glyph(s,api,rows,x,y,scale,color='#FFFFFF') {
  for(let r=0;r<7;r++)for(let c=0;c<5;) {
    if(!(rows[r]&(1<<(4-c)))){c++;continue;}
    let end=c+1;while(end<5&&(rows[r]&(1<<(4-end))))end++;
    api.box(s,'',x+c*scale,y+r*scale,(end-c)*scale,scale,color,18,color,0);c=end;
  }
}

function atlas(s,api,font,x,y,scale,highlight=true) {
  const {box,C}=api;
  box(s,'',x,y,64*scale,32*scale,'#A7B9D1',18,C.ink,1.2);
  for(const [i,ch] of [...font.characters].entries())
    glyph(s,api,font.glyphs.get(ch)||Array(7).fill(0),x+(i%8)*8*scale,y+Math.floor(i/8)*8*scale,scale);
  for(let r=0;r<4;r++)for(let c=0;c<8;c++)
    box(s,'',x+c*8*scale,y+r*8*scale,8*scale,8*scale,'none',18,'#D7E2F0',0.7);
  if(highlight)box(s,'',x+24*scale,y+8*scale,8*scale,8*scale,'none',18,C.blue,3);
}

export async function addOpenGLSlides({slide,api,root,outline}) {
  const {text,box,wire,C}=api;
  const font=await readFont(root);
  const add=(title,narration,detail,keys)=>{
    const s=slide('回答用：'+title,0,narration,keys.map(k=>REFERENCES[k]).join('\n'),detail);
    s.hidden=true;outline[outline.length-1].backup=true;return s;
  };

  let s=add('画面の要素と描き方',
    'このゲームの描画を三つに分けます。ブロック、壁、パドル、ボールは色を付けた四角形です。タイトルや数字は、文字の画像を四角形に貼ります。背景は黒で初期化します。OpenGLは、こうした位置や色、画像をプログラムから指定するために使っています。',
    `画面にはブロック40個、三辺の壁、パドル、ボール、タイトル、得点、残機がある。ゲームの状態に応じてREADY、CLEAR、GAME OVERも表示する。実機画像を加工せず縮小配置した。全状態の文字を同時に表示した画像ではない。scene()が各図形と文字の情報を作り、Rendererが描画用の関数を呼ぶ。
OpenGLは描画APIであり、関数の実装にはRasterIX付属ライブラリを使用する。本研究でglBeginなどを新規実装したわけではない。ゲームの表示内容とWally用の接続部分を作成した。
背景のglClearColor(0,0,0,1)は消去色の設定、glClear(GL_COLOR_BUFFER_BIT)はその色による消去の指定である。実際のゲームで全画面のglClearを毎回呼ぶとは説明しない。ここでは初期化として示す。
質問例：ボールも四角形なのか。回答：描画は10×10画素の白い四角形です。ゲーム状態のボール位置を使って、その四角形を配置しています。`,
    ['renderer','game']);
  {
    const {lead,label,code}=helpers(s,api);
    lead('四角形、文字画像、背景色でゲーム画面を作る');
    s.images.add({blob:await fs.readFile(path.join(root,'experiments/dvi-recovery-20261109/media/latest-start.png')),contentType:'image/png',alt:'実機のブロック崩し。タイトル、得点、残機、壁、ブロック、ボール、パドル',fit:'contain',position:{left:64,top:192,width:704,height:396}});
    label('色を付けた四角形',804,198,412,27,C.blue,true);
    label('ブロック・壁・パドル・ボール',804,244,412,24);
    wire(s,804,295,1216,295,C.ink,false,1);
    label('文字画像を貼った四角形',804,316,412,27,C.blue,true);
    label('タイトル・得点・残機',804,362,412,24);
    label('READY・CLEAR・GAME OVER',804,400,412,22);
    wire(s,804,447,1216,447,C.ink,false,1);
    label('背景を黒で初期化',804,468,412,27,C.blue,true);
    code(['glClearColor(0,0,0,1);','glClear(GL_COLOR_BUFFER_BIT);'],804,514,412,32,20);
    label('ゲームが図形を指定し、RasterIX付属ライブラリが描画命令を用意する',64,630,1152,27,C.heading,true);
  }

  s=add('ゲーム画面の座標',
    'ゲームでは左上をゼロとし、右へx、下へyが増える座標を使います。幅640、高さ480の範囲です。右側の設定で、ゲームで使う座標を描画領域へ対応させています。例えば左上のブロックはxが44、yが76の位置に置きます。',
    `glViewport(0,0,640,480)は変換後の図形を置くウィンドウ領域を設定する。glOrtho(0,640,480,0,-1,1)は、左端0・右端640・下端480・上端0とした直交投影を設定する。bottomとtopをこの順に渡すため、ゲーム座標は下へyが増える。OpenGLが常に左上原点という意味ではない。
glMatrixMode(GL_PROJECTION)で投影行列を選び、glLoadIdentity()で単位行列にしてからglOrthoを適用する。GL_MODELVIEWも初期化する。実装にはさらにglTranslatef(-0.5f,0.5f,0)というサンプル位置の調整がある。図はゲーム座標の対応を示すもので、この調整や境界画素の規則を表示していない。画面端の640、480は範囲の境界で、最後の画素の番号とは区別する。
glVertex2f(x,y)はx,yを指定し、API上のz=0,w=1を伴う頂点として扱う。深度テスト、裏面除去、照明は無効にしている。2Dの図形でも既存の頂点処理を通す。
質問例：左上原点はOpenGLの仕様なのか。回答：このゲームで投影の上下を設定してそう使っています。`,
    ['renderer','input']);
  {
    const {lead,label,mono,code}=helpers(s,api);
    lead('左上を基準に、右へx、下へyを増やす');
    const x=116,y=244,w=480,h=360;
    box(s,'',x,y,w,h,'#F5F7FA',20,C.ink,1.6);
    for(let i=1;i<4;i++)box(s,'',x+i*120,y,0.7,h,'#C9D5E5',18,'#C9D5E5',0);
    for(let i=1;i<4;i++)box(s,'',x,y+i*90,w,0.7,'#C9D5E5',18,'#C9D5E5',0);
    wire(s,x,219,x+w,219,C.blue,true,2.4);wire(s,88,y,88,y+h,C.blue,true,2.4);
    label('x',609,200,40,24,C.blue,true);label('y',70,611,40,24,C.blue,true);
    mono('(0, 0)',111,183,160,23);mono('(640, 0)',470,183,180,23);
    mono('(0, 480)',111,610,180,23);mono('(640, 480)',443,610,205,23);
    box(s,'',x+44*.75,y+76*.75,62*.75,18*.75,'#FF0000',18,'#FF0000',0);
    label('左上のブロック',260,303,290,23,C.ink,true);
    mono('(44, 76)',260,337,230,24,C.blue);
    label('座標を画面に対応させる設定',664,188,552,25,C.blue,true);
    code(['glViewport(0, 0, 640, 480);','glMatrixMode(GL_PROJECTION);','glLoadIdentity();',['glOrtho(0, 640, 480, 0, -1, 1);',C.blue],'glMatrixMode(GL_MODELVIEW);','glLoadIdentity();'],664,235,552,36,22);
    label('xを増やすと右へ移動',664,503,552,27,C.ink,true);
    label('yを増やすと下へ移動',664,553,552,27,C.ink,true);
    label('この座標で四隅を指定すると、四角形の位置と大きさが決まる',64,661,1152,25,C.heading,true);
  }

  s=add('四角形の色と四隅',
    '赤いブロック一個を例にします。glColor4ubで赤を指定し、glVertex2fで四隅を順に渡します。左上が44、76で、幅62、高さ18なので、右端は106、下端は94です。GL_QUADSは四つの頂点を一つの四角形として扱う指定です。この内側を同じ赤で塗ります。',
    `コードは実装のcolor()とquad()を、左上のブロックの値で展開した概念的な抜粋である。図のP0〜P3は説明用の頂点名。GL_TEXTURE_2DとGL_BLENDを無効にした図形描画の設定を前提とする。glColor4ubのRGBは各0〜255で、四つ目の255は不透明度。glColorは現在の色を設定し、続くglVertexがその色を持つ頂点を追加する。四頂点の色を同じにしているため、塗る色は一定になる。
glBeginからglEndの区間は頂点のまとまりを指定する区間であり、glEndが戻ることは画面への表示完了を意味しない。四頂点を渡しており、一画素ごとにglVertexを呼ぶわけではない。
使用版のPrimitiveAssemblerはGL_QUADSを二つの三角形に組み立てる。図の対角線はこの内部処理を説明する線で、実際のブロックに線を描く指示ではない。三角形を使うことは立体ゲームを意味しない。
質問例：GL_QUADSは現在のOpenGLで使えるのか。回答：このプログラムはRasterIXが実装する固定機能の従来型APIを使います。現代のcore profile向けコードとしては説明していません。
質問例：VBOを使わないのか。回答：現在はglBegin/glVertex方式で実装しています。使用版にはVBO実装もありますが、今回このゲームでの比較実験は行っていません。方式の速度上の優位性は主張しません。`,
    ['renderer','game','begin','vertices','assembler','vbo','readme']);
  {
    const {lead,label,mono,code}=helpers(s,api);
    lead('色を選び、左上・右上・右下・左下の順に頂点を渡す');
    code(['glBegin(GL_QUADS);',['glColor4ub(255, 0, 0, 255);',C.blue],'glVertex2f( 44, 76);  // P0','glVertex2f(106, 76);  // P1','glVertex2f(106, 94);  // P2','glVertex2f( 44, 94);  // P3','glEnd();'],64,214,602,43,25);
    const x=821,y=297,w=310,h=90;
    box(s,'',x,y,w,h,'#FF0000',18,C.ink,1.4);
    wire(s,x,y,x+w,y+h,'#231F20',false,1.1);
    mono('P0 (44, 76)',726,248,230,23,C.blue);mono('P1 (106, 76)',1001,248,215,23,C.blue);
    mono('P3 (44, 94)',726,400,230,23,C.blue);mono('P2 (106, 94)',1001,400,215,23,C.blue);
    label('幅62、高さ18',821,190,310,27,C.ink,true);
    label('内側の画素を塗る',821,455,370,27,C.ink,true);
    label('内部では三角形2枚として処理',726,501,490,23);
    label('赤：R=255、G=0、B=0',64,562,602,25,C.blue,true);
    label('同じ色を四つの頂点に付ける',64,603,602,25);
    label('壁・パドル・ボールも、位置・大きさ・色を変えて同じように描く',64,661,1152,25,C.heading,true);
  }

  s=add('文字画像の用意と登録',
    '文字は小さな画像で用意します。一文字に8掛ける8画素の場所を使い、数字とアルファベットを一枚に並べています。各画素には赤、緑、青、不透明度の四つの値を入れます。文字の形を白く不透明にし、周囲は透明にします。この配列をglTexImage2Dに渡して登録します。fontは、その画像を識別する番号です。',
    `createFont()は文字列「 0123456789ABCDEGIKLMORSTUVWY」の順に、8列×4行の領域へ字形を置く。画像全体は64×32画素、一区画は8×8画素、実際の字形は5×7画素である。図の字形は製品のglyph()から生成しており、画像ファイルから読み込んだフォントではない。
pixelsはRGBA各8ビットの配列で、入力データは64×32×4=8192バイトである。すべてのRGBを白の255にし、字形の画素はA=255、周囲はA=0とする。図の青灰色は透明な場所を見せるための色で、配列のRGBはその場所も白である。
glGenTexturesはテクスチャ名を取得する。glBindTextureは操作・描画に使うテクスチャを選ぶ。fontは識別子であり、DDRのアドレスやpixels配列ではない。glTexImage2Dは画像の大きさ、形式、画素配列をライブラリへ渡す。この呼出しだけで画面上の文字の位置が決まるわけではない。
引数は二次元画像、レベル0、内部形式RGBA、幅64、高さ32、境界0、入力RGBA、各成分がunsigned byte、配列の先頭である。使用版のImageConverterはRGBA入力をRGBA4444の内部形式へ変換するため、転送用の画素表現まで常に4バイト/画素と説明しない。実装ではMIN/MAG_FILTERをGL_NEAREST、WRAP_S/TをGL_CLAMP_TO_EDGEに設定する。
質問例：文字を描く関数がOpenGLにあるのか。回答：このゲームでは、用意した字形の画像を四角形に貼ることで文字を描いています。`,
    ['renderer','game','texture','image']);
  {
    const {lead,label,code}=helpers(s,api);
    lead('文字の形を画素の配列で用意し、テクスチャ画像として登録する');
    label('64×32画素の文字画像',64,185,500,27,C.blue,true);
    atlas(s,api,font,80,237,6,false);
    label('1文字の場所：8×8画素',80,438,470,23);
    label('1画素はR・G・B・Aの4成分',600,185,616,27,C.blue,true);
    box(s,'',608,246,40,40,C.white,18,C.ink,1.2);
    label('文字の形：白、A=255（不透明）',668,244,548,23);
    box(s,'',608,308,40,40,'#A7B9D1',18,C.ink,1.2);
    label('周囲：白、A=0（透明）',668,306,548,23);
    label('青灰色は、透明な場所を見せるための色',600,369,616,22);
    label('font：画像を識別する番号',600,420,616,25,C.blue,true);
    code(['glGenTextures(1, &font);','glBindTexture(GL_TEXTURE_2D, font);',['glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 64, 32, 0,',C.blue],['             GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());',C.blue]],64,485,1152,36,24);
    label('画像の番号を用意',827,495,370,22,C.ink,false,36);
    label('この番号の画像を選ぶ',827,531,370,22,C.ink,false,36);
    label('pixels：RGBAを並べた配列。登録した後、どこへ貼るかを指定する',64,661,1152,25,C.heading,true);
  }

  s=add('画像内のAを選ぶ座標',
    '登録した画像からAの区画を選びます。Aの区画は横が24から32、縦が8から16です。テクスチャ座標では、画像の幅全体と高さ全体をそれぞれ1とします。そのため横は64、縦は32で割ります。例えばAの左上は0.375、0.25になります。',
    `この図のu,vは、APIがs,tと呼ぶ二次元テクスチャ座標と同じ役割である。Aは文字列の11番目（0始まり）、左から4列目、先頭行から2行目にある。区画の境界はx=24〜32、y=8〜16である。正規化した値はu0=0.375、u1=0.5、v0=0.25、v1=0.5。これは文字の不透明な画素だけではなく8×8の区画全体の境界である。
このゲームは配列の先頭行をv=0側に用意し、その側を画面上の文字の上辺へ対応させる。図もその並びで示す。一般的な画像ファイルの上下方向についての規則として受け取らない。
画面上の位置を変えても、Aを使う限りこの画像内の範囲は変えない。例えばSCOREの文字列では、文字ごとに区画を選び直し、画面上のxを進める。
質問例：0から1以外の値は使えないのか。回答：OpenGLの一般的なテクスチャ座標は範囲外も指定できます。このゲームの文字選択では画像内の0〜1を使い、画像端にはCLAMP_TO_EDGEを設定しています。
質問例：隣の文字が混ざらないのか。回答：このゲームはGL_NEARESTで最も近い画素を選びます。文字の一部を選ぶ座標は区画の境界として与え、図形内の画素位置に応じて参照します。`,
    ['renderer','game','input']);
  {
    const {lead,label,mono}=helpers(s,api);
    lead('画像の幅と高さをそれぞれ1として、使う範囲を指定する');
    atlas(s,api,font,64,263,5,true);
    label('画像全体：幅64、高さ32',64,207,390,25,C.ink,true);
    label('Aの区画（拡大図）',431,207,345,24,C.ink,true);
    wire(s,400,337,500,337,C.ink,true,2.2);
    box(s,'',540,263,128,128,'#A7B9D1',18,C.blue,2.4);
    glyph(s,api,font.glyphs.get('A'),540,263,16);
    mono('u0 = 24/64 = 0.375',772,250,444,26,C.blue);
    mono('u1 = 32/64 = 0.5',772,300,444,26,C.blue);
    mono('v0 =  8/32 = 0.25',772,365,444,26,C.blue);
    mono('v1 = 16/32 = 0.5',772,415,444,26,C.blue);
    label('u：画像の横位置',64,457,420,26,C.blue,true);
    label('v：画像の縦位置',64,503,420,26,C.blue,true);
    label('Aの8×8区画',495,438,240,24,C.ink,true);
    label('横24〜32、縦8〜16',451,480,300,23);
    wire(s,64,558,1216,558,C.ink,false,1.1);
    label('Aを別の場所や大きさで描いても、画像内で選ぶ範囲は同じ',64,590,1152,27,C.heading,true);
    label('画面上の位置と大きさは、次の図の頂点座標で決める',64,642,1152,25);
  }

  s=add('画像と画面の座標の対応',
    '画像内の位置と画面上の位置を、一組ずつ渡します。最初のglTexCoord2fでAの左上を選び、すぐ後のglVertex2fで画面上の左上を100、200にします。残りの三隅も同じように指定します。8掛ける8の区画が、画面の16掛ける16の四角形に貼られます。四隅の対応から、内側で画像のどこを使うかが求められます。',
    `左図は画像内の8×8区画、右図は画面上の16×16の四角形を同じ倍率で拡大して示す。右の幅と高さは左の2倍である。例の画面位置100,200は説明用で、ゲームのタイトルそのものの配置ではない。
glTexCoord2fは現在のテクスチャ座標を設定する。続くglVertex2fは、その時点の色とテクスチャ座標を持った頂点を追加する。glTexCoordが単独で画像を切り出して描くわけではない。四頂点を渡すと、図形内部の位置から参照するテクスチャ座標を補間できる。今回の直交投影では奥行きによる遠近の変化はない。
コードはテクスチャとブレンドを有効にし、描画色を白にした後の一文字分の抜粋である。左上(0.375,0.25)を(100,200)、右上(0.5,0.25)を(116,200)、右下(0.5,0.5)を(116,216)、左下(0.375,0.5)を(100,216)へ対応させる。
画像の区画を変えると別の文字になる。画面の四頂点を動かすと位置が変わり、間隔を広げると文字が大きくなる。Renderer::drawGlyph()は1文字の区画を8*scale四方へ貼る。文字列ではaddText()がxを6*scaleずつ進める。字形5画素幅と1画素の間隔を使うため、8画素の区画全体の幅とは一致しない。
質問例：一画素ごとにこの関数を呼ぶのか。回答：一文字の四隅を指定します。内側で画像を参照する処理はライブラリと描画回路が行います。`,
    ['renderer','game','vertices','input']);
  {
    const {lead,label,mono,code}=helpers(s,api);
    lead('glTexCoord2fの画像座標を、次のglVertex2fの頂点に付ける');
    label('画像内の8×8区画',156,173,390,25,C.blue,true);
    label('画面上の16×16の四角形',842,173,374,25,C.ink,true);
    box(s,'',273,267,56,56,'#A7B9D1',18,C.blue,2);
    glyph(s,api,font.glyphs.get('A'),273,267,7);
    box(s,'',949,239,112,112,'#000000',18,C.ink,1.4);
    glyph(s,api,font.glyphs.get('A'),949,239,14);
    mono('(0.375, 0.25)',74,235,240,21,C.blue);mono('(0.5, 0.25)',351,235,240,21,C.blue);
    mono('(0.375, 0.5)',74,326,240,21,C.blue);mono('(0.5, 0.5)',351,326,240,21,C.blue);
    mono('(100, 200)',798,207,200,21);mono('(116, 200)',1038,207,178,21);
    mono('(100, 216)',798,354,200,21);mono('(116, 216)',1038,354,178,21);
    wire(s,555,292,871,292,C.ink,true,2.3);
    label('四隅を一組ずつ対応させる',535,244,358,24,C.blue,true);
    label('内側では画像の位置を補間',535,318,358,22);
    box(s,'',64,407,1152,248,C.pale,18,C.pale,0);
    wire(s,64,407,1216,407,C.ink,false,1.3);wire(s,64,655,1216,655,C.ink,false,1.3);
    mono('glBindTexture(GL_TEXTURE_2D, font);',84,416,1000,23);
    mono('glBegin(GL_QUADS);',84,449,1000,23);
    const pairs=[['0.375, 0.25','100, 200','左上'],['0.5,   0.25','116, 200','右上'],['0.5,   0.5','116, 216','右下'],['0.375, 0.5','100, 216','左下']];
    pairs.forEach(([uv,xy,n],i)=>{
      mono(`glTexCoord2f(${uv});`,105,482+i*33,475,23,C.blue);
      mono(`glVertex2f(${xy});`,620,482+i*33,420,23);
      label(n,1106,482+i*33,95,22,C.ink,false,32);
    });
    mono('glEnd();',84,617,1000,23);
    label('画像座標を変えると文字が変わり、頂点座標を変えると位置や大きさが変わる',64,666,1152,23,C.heading,true);
  }

  s=add('文字の色と透明な部分',
    '文字画像は白なので、設定した色を掛けると、その色の文字になります。水色を指定すれば、同じAの画像を水色で使えます。また、文字の形に当たる画素は不透明、周囲は透明にしてあります。ブレンドを有効にすると、透明な画素では元の画面の色が残ります。',
    `テクスチャの合成は使用版の既定設定MODULATEである。RGB各成分を0〜1で表すと、白(1,1,1)に頂点色の水色(0,1,1)を掛けた結果は水色になる。glColor4ubの255は正規化すると1。テクスチャの透明な場所もRGBは白で、Aだけが0である。
glEnable(GL_TEXTURE_2D)で画像の参照を有効にし、glEnable(GL_BLEND)でフレームバッファの元の色との合成を有効にする。glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA)は、各RGB成分について出力色=文字の色*a+元の色*(1-a)という合成を指定する。ここでaはテクスチャと頂点色から得た描画側の不透明度を0〜1で表したもの。a=1では文字色、a=0では元の色となる。
ゲームの文字画像のAは0か255、頂点のAは255である。図は青灰色の下地に文字を重ねた説明図で、記録済みのゲーム画面を加工した画像ではない。実ゲームは主に黒背景を使う。
タイトルの水色、得点・残機の白、READYの黄色、CLEARの緑、GAME OVERの赤は同じ文字画像と色指定の組合せで描く。GL_NEARESTは最も近い画素を選ぶ設定で、拡大時に文字の画素の形を保つ。照明、深度テスト、裏面除去は無効である。前後関係は描く順序と色の合成で決まる。
質問例：アルファを0にすれば必ず透明になるのか。回答：不透明度だけを用意するのではなく、このゲームではブレンドを有効にして上記の合成式を設定しています。`,
    ['renderer','env','blend']);
  {
    const {lead,label,code}=helpers(s,api);
    lead('白い文字画像に色を付け、透明な画素では下地を残す');
    label('白い文字画像',64,185,260,25,C.ink,true);
    label('指定する色',352,185,220,25,C.ink,true);
    label('合成した文字',643,185,270,25,C.ink,true);
    box(s,'',95,241,112,112,'#A7B9D1',18,C.ink,1.2);glyph(s,api,font.glyphs.get('A'),95,241,14);
    label('×',259,265,64,44,C.ink,true,60);
    box(s,'',379,241,112,112,'#00FFFF',18,C.ink,1.2);
    label('＝',543,265,64,40,C.ink,true,60);
    box(s,'',666,241,112,112,'#A7B9D1',18,C.ink,1.2);glyph(s,api,font.glyphs.get('A'),666,241,14,'#00FFFF');
    label('白 × 水色 = 水色',64,376,760,27,C.blue,true);
    label('A=255：文字色を描く',857,227,359,24,C.ink,true);
    label('A=0：元の色を残す',857,289,359,24,C.ink,true);
    label('Aは不透明度',857,351,359,24);
    code(['glEnable(GL_TEXTURE_2D);','glEnable(GL_BLEND);',['glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);',C.blue],['glColor4ub(0, 255, 255, 255);',C.blue]],64,440,1152,42,25);
    label('RGBが白の画像を使うので、同じ字形を白・水色・黄・緑・赤で描ける',64,651,1152,25,C.heading,true);
  }

  s=add('CPUと描画回路の分担',
    'OpenGLの関数はCPUが実行するライブラリです。ゲームから渡した位置や色をライブラリが処理し、描画回路へ送る命令をメモリに用意します。Wally用の接続部分が命令を送り、描画回路が図形の内側の画素を塗り、文字画像を参照します。ゲームとライブラリをRISC-V用にコンパイル、リンクしてCPUで実行しています。',
    `使用しているのは公式RasterIXのlib/glである。glBeginはVertexQueueの開始、glColorは現在色の設定、glTexCoordは現在テクスチャ座標の設定、glVertexは属性を持つ頂点の追加、glEndはまとまった頂点をVertexPipelineへ渡す処理へ進む。呼び出した関数名をそのままFPGAへ送る仕組みではない。
RasterIXの頂点処理にはソフトウェアのPrimitiveAssemblerや変換処理が含まれる。GL_QUADSを三角形へ組み立て、描画命令を用意する。本構成はThreadedVertexTransformerを使用するが、NoThreadRunnerでCPU上の処理として実行する。描画回路ではラスタライズ、属性の補間、テクスチャ参照、画素の色の処理を行う。一般的なGPUが行うすべての処理をここでハードウェア化したという意味ではない。
WallyBusConnectorはIBusConnectorを実装し、命令列の語をMMIOへ書く。標準ゲームの命令送信はCPUによる書込みであり、コマンドDMAを使った成果として説明しない。描画・表示回路がDDRへアクセスする経路は、この命令送信の話とは区別して説明する。
CMakeはRasterIXをサブディレクトリとして取り込み、ゲームをglなどにリンクする。Wally用のアドレスや転送方法はWallyBusConnector、解像度やメモリ配置などは構成設定へ記述する。汎用コンパイラがボードのアドレスを自動推測するわけではない。
質問例：OpenGLを自分で実装したのか。回答：関数の実装は公式RasterIXのライブラリを利用しました。本研究では、Wallyから描画回路へ命令を送る部分と、ゲームからの呼出しを実装しました。
質問例：VBOならすべてGPUへ任せられるのでは。回答：使用版のVBOはCPU側のバッファとして実装されています。API名だけからハードウェア上の処理範囲や高速化を判断していません。`,
    ['renderer','vertices','assembler','bus','cmake','vbo','readme']);
  {
    const {lead,label}=helpers(s,api);
    lead('CPUがライブラリを実行し、描画回路に命令を渡す');
    box(s,'',64,205,754,290,C.pale,18,C.ink,1.6);
    label('CPU（Wally）が実行する処理',84,219,714,28,C.blue,true);
    box(s,'ゲーム\n座標と色',88,304,174,118,C.white,24,C.ink,1.5);
    box(s,'RasterIXライブラリ\n頂点の処理',307,304,222,118,C.white,22,C.ink,1.5);
    box(s,'メモリ上に\n命令列を用意',574,304,220,118,C.white,23,C.ink,1.5);
    wire(s,262,363,307,363,C.ink,true,2);wire(s,529,363,574,363,C.ink,true,2);
    box(s,'',928,205,288,290,C.pale,18,C.ink,1.6);
    label('描画回路',948,219,248,28,C.blue,true);
    label('図形の内側の画素',948,310,248,23);
    label('文字画像の参照',948,355,248,23);
    label('画素の色の計算',948,400,248,23);
    wire(s,818,363,928,363,C.blue,true,2.6);
    label('命令送信',825,312,102,21,C.blue,true);
    label('Wally用の接続部分が送る',88,449,694,24,C.blue,true);
    wire(s,64,541,1216,541,C.ink,false,1.2);
    label('ゲーム ＋ RasterIXライブラリ ＋ Wally用の接続部分',64,566,1152,28,C.ink,true);
    label('RISC-V用にコンパイル・リンクし、CPUで実行する',64,622,1152,28,C.heading,true);
  }

  s=add('描画命令の提出と表示切替',
    '図形を指定した後、用意した命令を提出し、表示が切り替わるのを待ちます。glEndは図形の頂点を渡す区間の終わりです。その後、RasterIX固有のswapDisplayListを呼んでフレームを提出します。このゲームは、表示切替のカウンタが変わったことを確認してから次へ進みます。',
    `コードはbreakout.cppのpresentラムダから、glGetErrorの確認を除いた主要部分である。glはrr::RIXGL::getInstance()で得たライブラリのインスタンスであり、swapDisplayListは標準OpenGL関数ではない。Renderer::swapDisplayList()は描画のコミットと画面切替のコマンドを加え、テクスチャと命令列を送信し、次のフレームの準備へ進む。
renderer.draw(scene(game))はゲーム状態に応じた図形を指定する。bus.frameCount()は表示切替の完了を数える回路側のカウンタを読む。bus.waitForFrame(previous)は値が変わるまで確認し、タイムアウト時は異常として扱う。CPUがMMIOへ最後の語を書き終えただけで全描画が完了したとは判断していない。
表示用にはDDR3上の二つの領域を使用し、描画する領域と読み出して表示する領域の役割を交替する。構成はENABLE_VSYNC=true。RasterIX_IF内部の描画作業領域と、表示する画像を置くDDR3上の領域は、物理的には別の場所である。
質問例：glEndで画面に出るのか。回答：glEndは頂点の指定を終える呼出しです。ゲームではその後にRasterIX固有の提出処理を呼び、表示切替の完了を待っています。
質問例：glFinishやglFlushを使ったのか。回答：このゲームの主要経路は上記の固有の提出とカウンタ確認です。名前が似た関数の意味へ置き換えず、実装した経路を説明します。
質問例：録画が60fpsならゲームも60fpsか。回答：録画のフレームレートと、ゲームが新しい画像を作る速さは同じ値とは限りません。この動画の60fpsをゲームFPSとして報告していません。`,
    ['present','bus','submit','cmake']);
  {
    const {lead,label,mono}=helpers(s,api);
    lead('図形の指定後にフレームを提出し、表示先の切替完了を待つ');
    box(s,'図形を指定\nglBegin〜glEnd',64,226,330,110,C.white,28,C.ink,1.6);
    box(s,'命令を提出\nswapDisplayList()',475,226,330,110,C.white,27,C.blue,1.6);
    box(s,'表示先を切替\n完了を確認',886,226,330,110,C.white,28,C.ink,1.6);
    wire(s,394,281,475,281,C.blue,true,2.6);wire(s,805,281,886,281,C.blue,true,2.6);
    label('ゲームの画面更新処理',64,379,1152,27,C.blue,true);
    box(s,'',64,427,1152,190,C.pale,18,C.pale,0);
    wire(s,64,427,1216,427,C.ink,false,1.3);wire(s,64,617,1216,617,C.ink,false,1.3);
    const rows=[['renderer.draw(scene(game));','図形を指定する'],['auto previous = bus.frameCount();','切替回数を覚える'],['gl.swapDisplayList();','命令を提出する'],['bus.waitForFrame(previous);','切替回数の変化を待つ']];
    rows.forEach(([v,n],i)=>{
      mono(v,84,442+i*41,700,25,i===2?C.blue:C.ink,36);
      label(n,835,442+i*41,361,24,C.ink,false,36);
    });
    label('swapDisplayList() は、RasterIXライブラリ固有の処理',64,650,1152,26,C.heading,true);
  }
}
