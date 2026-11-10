import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const drawingRows=[
  ['図形の描画','三角形を塗るラスタライザ','三角形に含まれる画素を求める\n四角形はCPU側で三角形に分ける'],
  ['画素ごとの補間','固定小数点方式・25bit乗算器\nテクスチャ座標の透視補正','頂点の値から、図形内の各画素の\n色・深度・テクスチャ座標を求める'],
  ['テクスチャ','Texture Mapping Unit（TMU）：1基\n最大256 × 256画素','画像を図形に貼り付ける\nブロック崩しでは文字画像に使用'],
  ['画像の拡大縮小','最近傍・バイリニア補間\nミップマップに対応','周囲の画素や縮小画像から色を選ぶ\n文字には最近傍を使用'],
  ['画素の判定','深度16bit・ステンシル4bit\nアルファテスト','前後関係や値の比較によって、\nその画素を書き込むか決める'],
  ['色の合成','アルファブレンド・テクスチャ合成\n色のビット論理演算（LogicOp）','背景と描く色を混ぜる、\n頂点色と画像の色を組み合わせる'],
  ['フォグ','距離に応じた色の混合','遠い部分を霧の色へ近づける\n奥行きのある場面などに使用'],
  ['描画範囲と更新','シザーテスト・書込みマスク','指定した長方形の中だけ描く\n色・深度などの更新を制御する'],
];
const systemRows=[
  ['OpenGLの入口','OpenGL ES 1.1を中心に\n一部のOpenGL 1.3機能を実装','APIをC++ライブラリで提供\nゲームからの関数呼出しを処理'],
  ['CPU側の処理','座標変換・照明・クリッピング\n図形の組立てと命令生成','頂点を加工し、描画回路へ渡す\n命令をWally上で準備する'],
  ['回路の方式','固定機能パイプライン\nRasterIX_IF・100 MHz','画素を作り、色を計算する処理を\nFPGAの回路として実装'],
  ['内部の描画領域','65,536画素・色はRGB555\n深度16bit・ステンシル4bit','画面を帯に分け、チップ内で描く\n描いた画像をDDRメモリへ転送'],
  ['画像の記憶','テクスチャを内部TextureBufferに保持\n表示画像はDDRの2領域を交互に使用','貼り付ける画像を回路内で参照\n描画する画像と表示する画像を分ける'],
  ['命令の受渡し','32bit AXI4-Stream\nWallyからはMMIOで送信','CPUで作った命令列を回路へ渡す\n回路が命令を順番に解釈する'],
  ['外部メモリ接続','64bit AXI4\nCPUとDDR3メモリを共有','画像の読出し・書込みを、\nメモリコントローラへ要求する'],
  ['映像表示','640 × 480・RGB565・60 Hz設定\nRasterIXに同梱の表示回路を使用','DDRメモリの画像を順に読み出し、\nHDMI端子から映像を出力する'],
];

function drawTable(slide,api,rows){
  const {text,C}=api;
  text(slide,'今回の構成：RasterIX_IF ／ 描画回路100 MHz',64,121,1152,38,25,true,C.blue);
  const values=[['機能','今回の設定・方式','働き'],...rows];
  const table=slide.tables.add({rows:9,columns:3,left:64,top:174,width:1152,height:504,columnWidths:[206,450,496],values});
  table.styleOptions={headerRow:false,bandedRows:false,firstColumn:false,lastColumn:false};
  table.borders.assign({fill:C.ink,width:1,style:'solid'});
  table.rows[0].height=40;
  for(let r=1;r<9;r++)table.rows[r].height=58;
  for(let r=0;r<9;r++)for(let c=0;c<3;c++){
    const cell=table.getCell(r,c);
    cell.fill=r===0?C.heading:r%2===0?C.pale:C.white;
    cell.text.style={typeface:'Yu Gothic',fontSize:r===0?23:c===0?22:21,bold:r===0||c===0,color:r===0?C.white:C.ink,alignment:'left',verticalAlignment:'middle',wrap:'square'};
  }
  table.cells.block({row:0,column:0,rowCount:values.length,columnCount:3}).assign({margins:{left:9.6,right:9.6,top:3,bottom:3}});
}

export async function addRasterixFeatureSlides({slide,api,root,outline}){
  const config=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'rasterix-features.json'),'utf8'));
  for(const [name,digest] of Object.entries(config.source_sha256)){
    const data=await fs.readFile(path.join(root,'console',name));
    if(createHash('sha256').update(data).digest('hex')!==digest)throw new Error(`RasterIX feature source changed: ${name}`);
  }
  const evidence=JSON.parse(await fs.readFile(path.join(root,config.evidence),'utf8'));
  if(evidence.standard_bitstream_frozen_source_revision!==config.hardware_source_revision||evidence.standard_bitstream_sha256!==config.bitstream_sha256)throw new Error('RasterIX table no longer matches the recorded hardware');
  const references=Object.keys(config.source_sha256).map(name=>{
    if(name.startsWith('addins/rasterix/'))return `https://github.com/ToNi3141/RasterIX/blob/${config.rasterix_revision}/${name.slice(16)}`;
    const revision=config.hardware_files.includes(name)?config.hardware_source_revision:config.console_revision;
    return `https://github.com/SoshiroFujimori/wally-game-console/blob/${revision}/${name}`;
  }).join('\n');
  const scope=`対象構成\n本表は、本編の実機動画に対応するfpganexysvideo_rasterix構成の機能をまとめたものである。RasterIXは公式リポジトリの${config.rasterix_revision}、接続回路は${config.hardware_source_revision}を根拠とする。ソフトウェアの設定とブロック崩しの使い方は製品版${config.console_revision}を参照する。ソースのハッシュと実効パラメータはsource/presentation/board-evolution/rasterix-features.jsonに記録している。\n\n設定と使用の関係\n表は、回路に備わる機能と、その構成で利用できるソフトウェアを示す。ブロック崩しがすべての機能を使っているという意味ではない。ブロック崩しでは四角形、色、文字用テクスチャ、アルファブレンドを使う。深度テスト、面の除去、照明は初期設定で無効にしている。文字の画像は64×32画素で、最近傍による参照を使う。この資料作成では設定・RTL・ドライバを照合し、各機能の実機試験を新たに実施したとはしていない。\n\n`;
  const drawingDetail=scope+`図形を画素にするまで\nCPU側のPrimitiveAssemblerとVertexTransformerが図形を組み立て、座標変換などを行う。四角形は三角形に分割される。FPGA側のラスタライザは三角形の内側にある画素を選び、補間回路が頂点から各画素の色、深度、テクスチャ座標を求める。今回のRASTERIZER_ENABLE_FLOAT_INTERPOLATIONは0で、固定小数点の補間に使う乗算器の幅は25bitである。これはすべての演算値や色が25bitという意味ではない。テクスチャ座標には透視補正の経路がある。2Dの四角形を描く場合も、三角形を塗る仕組みを使える。\n\nテクスチャと拡大縮小\nTMUはTexture Mapping Unitの略で、画像から色を取り出して図形の色に反映する回路である。公式回路は1基または2基を選べるが、今回はTMU_COUNT=1である。設定上の最大画像サイズは256×256画素で、文字画像はその範囲の64×32画素である。内部のテクセル形式にはRGB565、RGBA4444、RGBA5551があり、CPU側のImageConverterで入力画像を変換する。今回の文字画像はRGBA4444で保存される。\n最近傍は近い1画素を選ぶ。バイリニア補間は近傍4画素の色を位置に応じて混ぜる。ミップマップは小さく表示するときに使う縮小画像を用意する仕組みで、今回の回路では有効な構成である。文字の実装はGL_NEARESTを設定しており、これらすべてを同時に使うわけではない。\n\n判定と色の処理\n深度テストは、すでに保存した深度と比べて、手前に見せる画素などを決める。ステンシルは画素位置ごとに値を持ち、その値を条件にして描画を制限・更新する。今回は深度が16bit、ステンシルが4bitである。アルファテストは描く画素のアルファ値と指定条件を比べる。これに対してアルファブレンドは、描く色と保存済みの色を比率で混ぜる。LogicOpは色をビット列として論理演算する機能である。テクスチャの色と頂点の色を組み合わせる処理も備える。\n内部の色バッファはRGB555で、保存先のアルファ成分は無効である。それでも、テクスチャや頂点から来たアルファ値を色の混合に使える。保存先のアルファ成分がないことと、アルファブレンド機能がないことは同じではない。フォグは距離に応じた係数で元の色と指定色を混ぜる。シザーテストは長方形の範囲を制限し、書込みマスクは更新してよい成分やバッファを指定する。`;
  const systemDetail=scope+`CPUと回路の役割\n公式READMEは、OpenGL ES 1.1を中心として一部のOpenGL 1.3機能を持つ固定機能の実装と説明している。固定小数点引数のAPIなどには対象外の機能もあり、特定バージョンの全機能への完全適合を主張する表ではない。頂点の座標変換、照明、クリッピング、図形の組立てはC++ライブラリの処理で、今回の構成ではWallyが実行する。画素の選択、補間、テクスチャ参照、深度などの判定、色の合成はFPGAの回路が担当する。固定機能とは、描画の主な処理手順を回路に用意し、色や機能の有効・無効などを設定して使う方式である。任意のシェーダプログラムを実行する近年のGPUの構成とは異なる。\n\n内部フレームバッファとDDR\nRasterIX_IFを使用し、FRAMEBUFFER_SIZE_IN_PIXEL_LG=16なので内部領域は65,536画素分である。色の保存は1成分5bitのRGB555、深度16bit、ステンシル4bitである。色の計算精度は1成分8bitで、内部の保存幅とは区別する。640×480=307,200画素は内部領域に一度に入らないため、ドライバは画面を5本の帯に分ける。1本は640×96=61,440画素で、帯ごとに内部領域を使って描き、DDRへ転送する。\nDDRに置く表示画像はRGB565形式で、内部RGB555から出力形式に変換する。DDR側に表示用の2領域を用意し、描画先と表示先を切り替える。内部の作業領域と、DDR上の2枚の画像は役割も場所も異なる。LOC_0はLOC_2と同じ場所に設定しており、三つの異なる表示用画像を確保しているという意味ではない。\n\nテクスチャの保存と命令転送\nENABLE_EXTERNAL_TEXTURE_MEMORY=0なので、今回の回路はTextureBufferを使う経路を持つ。ドライバがDDR側に置いたテクスチャを必要に応じて内部へ読み込み、描画時に参照する。外部テクスチャキャッシュを直接使う構成を、この実機の構成として説明しない。テクスチャ転送のページ設定は2,048 byteである。\nRasterIXの命令入口は32bit AXI4-Streamである。WallyのプログラムはWallyBusConnectorを通じてMMIOへ書き込み、接続回路が描画回路の入口へ渡す。今回の標準構成でCPUが命令列をDMAに任せて送っているという意味ではない。描画回路自身は64bit AXI4のメモリアクセス経路を持ち、画像やテクスチャをメモリコントローラへ要求する。この命令送信と画像転送の役割を区別する。\n\n表示回路\n描いた画像を表示する部分には、RasterIXに同梱されたcore_dvi_framebufferのdvi_framebufferを用い、製品側のrasterixdisplayが切替要求や完了の受渡しを行う。RasterIX_IF単体が映像信号を直接出すわけではない。表示回路がDDRからRGB565の画像を読み、HDMI端子へ映像を出す。設定は640×480・60 Hzで、これは映像信号を送る周期の設定である。ゲームが毎秒60枚の異なる画像を完成させると測定した値ではない。100 MHzも今回の描画回路のクロックであり、画素処理性能やゲームFPSの実測値ではない。`;
  for(const [title,rows,narration,detail] of [
    ['RasterIXの機能：描画と画素処理',drawingRows,'三角形の描画、テクスチャ、画素の判定、色の合成などを備えています。今回のブロック崩しでは、四角形と文字画像の描画に使っています。',drawingDetail],
    ['RasterIXの機能：処理分担とメモリ',systemRows,'OpenGLライブラリの頂点処理はCPUが実行し、画素の処理はFPGAの描画回路が担当します。内部で描いた画像をDDRへ転送し、同梱の表示回路が読み出します。',systemDetail],
  ]){
    const markdown=['| 機能 | 今回の設定・方式 | 働き |','| --- | --- | --- |',...rows.map(row=>'| '+row.map(v=>v.replaceAll('\n','<br>')).join(' | ')+' |')].join('\n');
    const page=slide(title,0,narration,references,markdown+'\n\n'+detail);
    drawTable(page,api,rows);page.hidden=true;outline.at(-1).backup=true;
  }
}
