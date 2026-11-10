// SPDX-License-Identifier: GPL-3.0-or-later
// Native slide adaptation of ToNi3141/RasterIX, pictures/fpgaFlow.drawio.png.
// Upstream revision: 3e2ee5aa5214b829c2a824250c445ce799ac8dc0.
// Source attribution, license and diagram scope: ../rasterix-pipeline/README.md.

export const RASTERIX_PIPELINE_SOURCE = 'ToNi3141/RasterIX, README "FPGA pipeline" and pictures/fpgaFlow.drawio.png, main revision 3e2ee5aa5214b829c2a824250c445ce799ac8dc0 (checked 2026-11-08). https://github.com/ToNi3141/RasterIX/blob/3e2ee5aa5214b829c2a824250c445ce799ac8dc0/pictures/fpgaFlow.drawio.png . GPL-3.0-or-later. Current console: console/fpga/src/rasterix.sv; RasterIX revision 9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0, rtl/RasterIX/RasterIX_IF.v and RasterIXRenderCore.v.';
export const RASTERIX_PIPELINE_NARRATION = '左から、命令の解釈と画素の準備、画素の色の計算、書き込むかどうかの判定、画像の書込みの順に追います。青線は、描画先にすでに保存されている色・深度・ステンシル値を、色の計算と並行して読む経路です。Concatで計算結果と読み出した値を対応づけ、判定や色の合成に使います。これは最新の公式資料を横長に描き直した概念図です。今回の実機はTMUが1基で、テクスチャの保存方式も図のTexture Cacheとは異なります。';
export const RASTERIX_PIPELINE_DETAIL = `この図は、公式RasterIXリポジトリのREADMEにある「FPGA pipeline」の処理と接続関係を、回答用に横長へ配置し直したものである。2026年11月8日に確認したmainの先頭は3e2ee5aa5214b829c2a824250c445ce799ac8dc0である。回路の概念的な処理経路を示しており、一つの箱が必ず1クロックで完了するという意味ではない。配線はデータの処理・参照関係を示し、全ポート、制御信号、待ち合わせ回路を網羅しない。

① Frame Streaming Coreは、ドライバから届く転送データを扱う入口である。ここでいうFrameは通信上のまとまりであり、HDMIへ映像を送り出す表示回路を指さない。Command Parserが描画命令を解釈し、Rasterizerが三角形について処理する画素の位置を求める。Broadcastから、属性の計算と描画先の読出しの両方へ情報を送る。Attribute Interpolationは、頂点で指定した色やテクスチャ座標などから、画素ごとの値を求める。

② TMUはTexture Mapping Unitであり、テクスチャから色を得て画素の色の計算に使う。TMU 1とそれに対応するTexture Cache / MMUは2基構成の場合の経路であり、破線で示す。元図と同じくTMUからキャッシュへ向かう線は参照関係を表し、読み出し結果を戻す全配線を描いたものではない。Fogは距離に応じた色の混合を行う。青線側のFramebuffer Readerは、同じ画素位置に保存済みのColor（色）、Depth（深度）、Stencil（マスク等の判定に使う値）を読む。Concatで色の計算結果とこれらの値をまとめる。「色の計算が終わってからメモリを読み始める」という直列の図ではない。

③ Concatの出力は、Depth Test、Alpha Test、LogicOp、BlendFunc、Stencil Testへ分かれる。Depth Testは既存の深度との比較、Alpha Testは画素のアルファ値の条件判定を行う。LogicOpは色のビット論理演算、BlendFuncは描く色と保存済みの色を混合する処理であり、Muxが使用する色を選ぶ。Stencil TestとStencilOpは、ステンシル値による条件判定とその更新を扱う。Write Backは判定結果と書き込む値をまとめる。五つの処理を順番に通過する直列回路としては描かない。

④ Scissorは指定した長方形の描画範囲を確認し、BroadcastからDepth、Color、Stencilの各Framebuffer Writerへ分配する。これは描画先へ書くまでの説明であり、保存した色を読み出してHDMI端子へ送る表示回路はこの図の外にある。

実機との対応：本研究の製品側が参照するRasterIXは9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0であり、この図の取得に合わせて回路を更新したわけではない。rasterix.svはRasterIX_IFをTMU_COUNT=1で使用するため、TMU 1は実装しない。ENABLE_EXTERNAL_TEXTURE_MEMORYは既定値0のままなので、テクスチャにはTextureBufferの経路を使う。最新公式図のTexture Cache / MMUを今回の実機の構成と同一視しない。IF方式では描画途中の画像を内部フレームバッファに置くため、図のFramebuffer Reader / Writerをそれぞれ直接のDDRアクセスと解釈しない。Depth、Stencil、Fogなどの箱が図にあることは、ブロック崩しの各描画でそれらを有効に使っているという主張ではない。`;

// All processing nodes from the official conceptual diagram are retained.
// Coordinates are slide pixels. The two Broadcast nodes have distinct IDs.
export const PIPELINE_NODES = [
  ['stream','Frame Streaming\nCore',78,201,206,54],
  ['parser','Command Parser',78,270,206,48],
  ['rasterizer','Rasterizer',78,336,206,48],
  ['broadcast','Broadcast',78,402,206,48],
  ['attributes','Attribute\nInterpolation',78,465,206,54],
  ['tmu0','TMU 0',322,206,150,46],
  ['tmu1','TMU 1',322,288,150,46,'optional'],
  ['fog','Fog',322,370,150,46],
  ['concat','Concat',322,520,150,50],
  ['cache0','Texture Cache\nMMU',522,203,164,52],
  ['cache1','Texture Cache\nMMU',522,285,164,52,'optional'],
  ['read-color','Framebuffer Reader\nColor',522,374,164,46,'memory'],
  ['read-depth','Framebuffer Reader\nDepth',522,426,164,46,'memory'],
  ['read-stencil','Framebuffer Reader\nStencil',522,478,164,46,'memory'],
  ['depth','Depth Test',750,234,122,42],
  ['alpha','Alpha Test',898,234,122,42],
  ['logic','LogicOp',750,338,122,42],
  ['blend','BlendFunc',898,338,122,42],
  ['mux','Mux',836,398,98,42],
  ['stencil','Stencil Test',750,456,122,42],
  ['stencilop','StencilOp',898,456,122,42],
  ['writeback','Write Back',794,550,176,46],
  ['scissor','Scissor',1062,238,154,46],
  ['out-broadcast','Broadcast',1062,350,154,46],
  ['write-depth','Framebuffer Writer\nDepth',1062,458.5,154,46,'memory'],
  ['write-color','Framebuffer Writer\nColor',1062,515.5,154,46,'memory'],
  ['write-stencil','Framebuffer Writer\nStencil',1062,572.5,154,46,'memory']
];

export function drawRasterixPipeline(s, api) {
  const {text,box,route,junction,C}=api;
  const edges=[];
  const line=(pts,color=C.ink,arrow=true)=>route(s,pts,color,arrow,1.9);
  const edge=(from,to,pts,color=C.ink)=>{
    edges.push({source:from,target:to});line(pts,color);
  };
  text(s,'青線：描画先の読出し　　破線：2基目のTMU（任意）',64,116,1152,32,21,false,C.ink);
  for(const [label,x,w] of [
    ['① 命令と画素の準備',64,240],['② 色の計算と画像の読出し',316,404],
    ['③ 判定と色の合成',742,296],['④ 書込み',1062,170]
  ]) text(s,label,x,155,w,32,22,true,C.heading);
  for(const [id,label,x,y,w,h,kind] of PIPELINE_NODES){
    const fill=kind==='memory'?C.pale:C.white;
    const color=kind==='optional'?C.old:C.ink;
    const shape=box(s,'',x,y,w,h,fill,19,color,1.8);
    shape.name='rasterix-'+id;
    if(kind==='optional')shape.line={style:'dashed',fill:color,width:1.8};
    const size=kind==='memory'?17:19;
    text(s,label,x+2,y+2,w-4,h-4,size,false,color,'center');
  }
  edge('stream','parser',[[181,255],[181,270]]);
  edge('parser','rasterizer',[[181,318],[181,336]]);
  edge('rasterizer','broadcast',[[181,384],[181,402]]);
  edge('broadcast','attributes',[[181,450],[181,465]]);
  edge('attributes','tmu0',[[284,492],[307,492],[307,229],[322,229]]);
  edge('tmu0','tmu1',[[397,252],[397,288]]);
  edge('tmu1','fog',[[397,334],[397,370]]);
  edge('fog','concat',[[397,416],[397,520]]);
  edge('tmu0','cache0',[[472,229],[522,229]]);
  edge('tmu1','cache1',[[472,311],[522,311]],C.old);
  // One shared request trunk fans out to three independent readers.
  line([[284,426],[296,426],[296,190],[500,190],[500,501]],C.blue,false);
  for(const [id,y] of [['read-color',397],['read-depth',449],['read-stencil',501]]){
    junction(s,500,y,C.blue,4.8);
    edge('broadcast',id,[[500,y],[522,y]],C.blue);
  }
  edge('read-color','concat',[[686,397],[700,397],[700,532],[472,532]],C.blue);
  edge('read-depth','concat',[[686,449],[708,449],[708,548],[472,548]],C.blue);
  edge('read-stencil','concat',[[686,501],[716,501],[716,564],[472,564]],C.blue);
  // The five fragment operations are parallel branches, not a serial chain.
  line([[397,570],[397,614],[726,614],[726,216]],C.ink,false);
  for(const y of [216,255,314,359,477])junction(s,726,y,C.ink,4.8);
  edge('concat','depth',[[726,255],[750,255]]);
  edge('concat','alpha',[[726,216],[959,216],[959,234]]);
  edge('concat','logic',[[726,359],[750,359]]);
  edge('concat','blend',[[726,314],[959,314],[959,338]]);
  edge('concat','stencil',[[726,477],[750,477]]);
  edge('logic','mux',[[811,380],[811,419],[836,419]]);
  edge('blend','mux',[[959,380],[959,419],[934,419]]);
  edge('stencil','stencilop',[[872,477],[898,477]]);
  edge('depth','writeback',[[811,276],[811,290],[738,290],[738,536],[820,536],[820,550]]);
  edge('alpha','writeback',[[959,276],[959,290],[1032,290],[1032,536],[940,536],[940,550]]);
  edge('mux','writeback',[[885,440],[885,550]]);
  edge('stencilop','writeback',[[959,498],[959,518],[910,518],[910,550]]);
  edge('writeback','scissor',[[970,573],[1044,573],[1044,261],[1062,261]]);
  edge('scissor','out-broadcast',[[1139,284],[1139,350]]);
  // Separate writer fanout, using the right margin to avoid the Scissor input.
  line([[1216,373],[1232,373],[1232,595.5]],C.ink,false);
  for(const [id,y] of [['write-depth',481.5],['write-color',538.5],['write-stencil',595.5]]){
    junction(s,1232,y,C.ink,4.8);
    edge('out-broadcast',id,[[1232,y],[1216,y]]);
  }
  text(s,'概念図：各箱が1クロック分とは限らない。TMU＝テクスチャ処理回路',64,625,1152,28,19,false,C.ink);
  text(s,'実機：IF方式・TMU 0のみ・TextureBufferを使用（図のTexture Cache経路とは異なる）',64,653,1152,28,19,false,C.ink);
  return {nodes:PIPELINE_NODES.map(n=>n[0]),edges};
}
