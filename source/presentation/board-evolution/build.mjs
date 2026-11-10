import { addMainSlides } from './main-slides.mjs';
import { createCircuitWiring } from './circuit-wiring.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const [root, workspace] = process.argv.slice(2);
if (!root || !workspace) throw new Error('Usage: build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(process.env.RUNTIME_NODE_MODULES, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(process.env.PRESENTATION_SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
await fs.mkdir(path.join(workspace, 'final'), { recursive: true });
await fs.mkdir(path.join(workspace, 'slides'), { recursive: true });
const P = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { ink:'#231F20', blue:'#1572C3', pale:'#E5EBF8', chip:'#CCD9F1', ip:'#77A3DC', old:'#777777', heading:'#0078BA', white:'#FFFFFF' };
const font='Yu Gothic', latinFont='Arial', codeFont='Consolas'; let serial=0; const outline=[];
function text(s,value,x,y,w,h,size=28,bold=false,color=C.ink,align='left') {
  const sh=s.shapes.add({geometry:'textbox',name:'text-'+(++serial),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  sh.text=value; sh.text.style={typeface:/^[\x00-\x7f\s]+$/.test(value)?latinFont:font,fontSize:size,bold,color,alignment:align,verticalAlignment:'middle',wrap:'square'}; sh.text.insets=0; return sh;
}
function box(s,label,x,y,w,h,fill=C.white,size=27,stroke=C.ink,thick=2.2) {
  const sh=s.shapes.add({geometry:'rect',name:'block-'+(++serial),position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:thick}});
  if(label) text(s,label,x+8,y+6,w-16,h-12,size,true,stroke,'center'); return sh;
}
function polygon(s,pts,fill=C.white,stroke=C.ink,width=2.2) {
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),l=Math.min(...xs),t=Math.min(...ys),w=Math.max(1,Math.max(...xs)-l),h=Math.max(1,Math.max(...ys)-t);
  return s.shapes.add({geometry:'custom',name:'circuit-'+(++serial),position:{left:l,top:t,width:w,height:h},fill,line:{fill:stroke,width},customPaths:[{width:w,height:h,commands:[{moveTo:{x:pts[0][0]-l,y:pts[0][1]-t}},...pts.slice(1).map(p=>({lineTo:{x:p[0]-l,y:p[1]-t}})),{close:{}}]}]});
}
const wiring=createCircuitWiring();
const {wire,route,junction}=wiring;
function slide(title,seconds,narration,source,detail,diagramOnly=false) {
  const s=P.slides.add();s.background.fill=C.white;
  const n=P.slides.items.length;
  if(n===1){
    text(s,title,105,185,1070,150,48,true,C.ink,'center');
  }else if(!diagramOnly){
    text(s,String(n),64,33,59,82,38,true,C.ink);
    text(s,title,132,33,1084,82,38,true,C.heading);
  }
  if(!diagramOnly){
    // Keep a fixed footer box and right edge for one- and two-digit numbers.
    const page=text(s,String(n),1200,686,56,22,16,false,C.old,'right');
    page.name=`slide-number-${n}`;
  }
  s.speakerNotes.text=`説明時間の目安：${seconds}秒\n\n${narration}\n\n出典：${source}\n\n補足説明：${detail}`;
  outline.push({title,seconds,narration,source,detail});return s;
}
const api={text,box,polygon,route,wire,junction,C};
const audience=process.env.PRESENTATION_AUDIENCE||'public';
if(!['public','private'].includes(audience))throw new Error('Invalid audience');
const cover=audience==='private'?JSON.parse(await fs.readFile(process.env.PRESENTATION_PRIVATE_COVER_JSON,'utf8')):{student:'発表者：非公開',supervisor:'指導教員：非公開'};

const DDCA='Harris, S. L. and Harris, D., Digital Design and Computer Architecture: RISC-V Edition (2021), Chapter 7. Official figure source: https://pages.hmc.edu/harris/ddca/ddcarv.html (DDCArv_Figures.zip).';
const RVSOC='Harris et al., RISC-V System-on-Chip Design, Chapters 7–13, 20, 22–23. Official figure source: https://pages.hmc.edu/harris/ddca/rvsocd.html (RVSoCD_figs.zip).';
const PRODUCT='Product revision 261832d48832dd6e26c4971ab8893ce61200688b. console/fpga/src/fpgaTopNexysVideo.sv; console/fpga/src/rasterix.sv; console/fpga/src/rasterix_apb.sv; console/fpga/generator/axiscdc.tcl.';
const RECORDING='experiments/dvi-recovery-20261109/media/latest-standard-dvi-30s.mp4';
const VIDEO='source/presentation/assets/breakout-standard-dvi-compatible.mp4';
const POSTER='experiments/dvi-recovery-20261109/media/latest-start.png';
const BASIC='experiments/dvi-recovery-20261109/README.md; results.json; media-review.json. Captured 2026-11-09. Standard bitstream SHA-256: 16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf. Latest game executable SHA-256: 5c360babde59c6d9fc72fe58edc5729da2b2b8480c2f3a5208980d2f7d2c558b. Video: '+RECORDING;
const PROVENANCE_DETAIL='CPU・バス・SDカード制御はWallyリポジトリ（CVW）の既存RTLを利用する。DDRメモリ制御はWallyリポジトリの生成・接続の仕組みを利用し、回路本体はAMD製MIG IPである。Nexys Video用の設定は本研究で追加した。標準構成の描画本体RasterIX_IFと表示本体dvi_framebufferは、同じ公式RasterIXリポジトリから取得する。表示本体はrtl/3rdParty/core_dvi_framebufferに同梱されたultraembedded由来の回路で、RasterIXの作者がすべて新規に設計したという意味ではない。バスから描画回路への変換、画面切替などの接続処理は本研究で追加した。本資料の実機動画は、RasterIX同梱の表示本体を利用する標準構成で取得した。表示本体そのものを本研究で新規設計したという主張ではない。';
const PROVENANCE_SOURCE='Wally upstream: https://github.com/openhwgroup/cvw . Official RasterIX: https://github.com/ToNi3141/RasterIX/tree/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0 . RTL: console/src/wally/wallypipelinedcore.sv; console/src/uncore/uncore.sv; console/src/uncore/spi_apb.sv; console/fpga/generator/ddr3-nexysvideo.tcl; console/fpga/generator/wally.tcl; console/fpga/src/rasterixdisplay.sv. RasterIX: rtl/RasterIX/RasterIX_IF.v; rtl/3rdParty/core_dvi_framebuffer/README.md; rtl/3rdParty/core_dvi_framebuffer/src_v/dvi_framebuffer.v. Standard-output evidence: experiments/dvi-recovery-20261109/results.json.';


await addMainSlides({slide,api,cover,root,DDCA,RVSOC,PRODUCT,BASIC,POSTER,VIDEO,outline});


await fs.writeFile(path.join(workspace,'wire-audit.json'),JSON.stringify(wiring.finalize(),null,2)+'\n');
const total=outline.reduce((n,s)=>n+s.seconds,0);
if(outline.length!==10||total!==330)throw new Error(`Unexpected allocation ${outline.length} slides, ${total} seconds`);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2)+'\n');
const md=[
  '# 中間発表：FPGAを用いた2Dゲーム機の製作',
  '表紙1枚と発表用9枚の計10枚です。背景、本研究の概要、ソフトウェア、ハードウェア、実行結果、まとめの順に説明します。実行結果は使用量、動画の順です。',
  '[PowerPoint版](中間発表_主要事項.pptx) / [発表の要点](発表の要点.md) / [論文](../thesis/本文.md) / [技術付録](../thesis/技術付録.md)',
  '## 目次',
  ...outline.map((o,i)=>`${i+1}. [${o.title}](#slide-${i+1})`)
];
outline.forEach((o,i)=>md.push(
  `<a id="slide-${i+1}"></a>`, `## ${i+1}. ${o.title}`,
  `![${o.title}](slides/slide-${String(i+1).padStart(2,'0')}.png)`,
  ...(i===8?['[実機動画を再生する](../../source/presentation/assets/breakout-standard-dvi-compatible.mp4)']:[]),
  '### 説明原稿',o.narration,
  '<details>\n<summary>補足説明と出典</summary>\n',o.detail,o.source?'出典：'+o.source:'','\n</details>'
));
md.push('## 詳しい説明と以前の資料',
  '計画上の時間配分は動画30秒を含め330秒です。実測した発表時間ではありません。',
  '[回答用スライドを含む以前の資料](https://github.com/SoshiroFujimori/wally-game-console-research/tree/55c3d006e68652b288fdc91a579cf6d6a1f3794d/docs/presentation)と、[OpenGLの説明と想定質問](OpenGLの説明と想定質問.md)も参照できます。',
  '回路の役割と提供元、記録した構成の版、比較範囲は各スライドの補足に示します。[再生成方法](../../source/presentation/board-evolution/README.md)から公開ソースを確認できます。');
await fs.writeFile(path.join(workspace,'中間発表_主要事項.md'),md.join('\n\n')+'\n');
const raw=path.join(workspace,'raw-candidate.pptx'),poster=path.join(workspace,'poster-candidate.pptx'),candidate=path.join(workspace,'candidate.pptx');
await(await PresentationFile.exportPptx(P)).save(raw);
if(audience==='public'){
  const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,poster,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
  if(scrub.status!==0)throw new Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
}else await fs.copyFile(raw,poster);
// Validate the still-frame package before adding the reviewed video.
// Content import checks below use batches within the runtime XML limit.
// Artifact Tool's importer counts video bytes against its picture construction
// limit; the unchanged recording exceeds that limit even in the previous deck.
// Final package integrity/layout and video relationships are checked separately.
await fs.mkdir(path.join(workspace,'poster-review'), { recursive: true });
const posterFinal=path.join(workspace,'poster-review','poster-validated.pptx');
const validationOptions={workspaceDir:workspace,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','8'],explicitTotalSlideCount:10,requiredNativeTableOwnerSlides:[8],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font,latinFont,codeFont]}};
await finalizePresentation({...validationOptions,candidatePath:poster,finalPath:posterFinal,verifyArtifactToolImport:false,receiptPath:path.join(workspace,'poster-validation.json')});
// Import authored content in two contiguous batches to bound the runtime's
// XML construction size, then inspect the full
// final package and its native PowerPoint rendering/navigation separately.
const importChecks=[];
for(const [batchNumber,first,count] of [[1,0,5],[2,5,5]]){
  const batch=await Presentation.load(structuredClone(P.toProto()));
  batch.slides.keep(Array.from({length:count},(_,i)=>first+i));
  const batchPath=path.join(workspace,`content-batch-${batchNumber}.pptx`);
  await(await PresentationFile.exportPptx(batch)).save(batchPath);
  const imported=await PresentationFile.importPptx(await FileBlob.load(batchPath));
  if(imported.slides.items.length!==count)throw new Error('Content import lost slides');
  importChecks.push({firstSlide:first+1,lastSlide:first+count,importedSlides:count});
  for(const [i,item] of imported.slides.items.entries()){
    const png=await imported.export({slide:item,format:'png',scale:outline[first+i].backup?2:1});
    await fs.writeFile(path.join(workspace,'slides',`slide-${String(first+i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
  }
}
await fs.writeFile(path.join(workspace,'content-import-checks.json'),JSON.stringify({wholeDeckImport:'validated_in_contiguous_batches',batches:importChecks},null,2)+'\n');
const embedding=spawnSync(process.env.RUNTIME_PYTHON,[path.join(import.meta.dirname,'embed_video.py'),posterFinal,candidate,path.join(root,VIDEO),'--review',path.join(root,'publication/media-review.json'),'--slide','9','--autoplay'],{encoding:'utf8'});
if(embedding.status!==0)throw new Error(embedding.stderr||embedding.stdout||'Video embedding failed');
await fs.writeFile(path.join(workspace,'video-embedding.json'),embedding.stdout);
if(process.env.PRESENTATION_PREVIEW_ONLY==='1'){
  for(const i of P.slides.items.keys()){
    const png=await P.export({slide:P.slides.items[i],format:'png',scale:1});
    await fs.writeFile(path.join(workspace,'slides',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
  }
  console.log('Preview complete');process.exit(0);
}
const final=path.join(workspace,'final','中間発表_主要事項.pptx');
await finalizePresentation({...validationOptions,candidatePath:candidate,finalPath:final,verifyArtifactToolImport:false,receiptPath:path.join(workspace,'validation.json')});
console.log(JSON.stringify({final,audience,slides:outline.length,seconds:total,narrationCharacters:outline.reduce((n,s)=>n+s.narration.length,0)}));
