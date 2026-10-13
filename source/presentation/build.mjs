import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const [root,workspace] = process.argv.slice(2);
if(!root || !workspace) throw Error('Use: build.mjs RESEARCH_ROOT PRIVATE_BUILD_DIRECTORY');
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(process.env.RUNTIME_NODE_MODULES,'@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(process.env.PRESENTATION_SKILL,'container_tools/artifact_tool_utils.mjs')).href);
await fs.mkdir(workspace,{recursive:true});
await fs.mkdir(path.join(workspace,'final'),{recursive:true});
const P=Presentation.create({slideSize:{width:1280,height:720}});
const C={ink:'#231F20',blue:'#1673C3',light:'#E5EBF8',mid:'#CCD9F1',block:'#77A3DC',white:'#FFFFFF',gray:'#D8D8D8'};
const font='Meiryo';
let serial=0;
function text(s,v,x,y,w,h,size=28,bold=false,color=C.ink,align='left'){
 const o=s.shapes.add({geometry:'textbox',name:'text-'+(++serial),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 o.text=v;o.text.style={typeface:font,fontSize:size,bold,color,alignment:align,verticalAlignment:'middle',wrap:'square'};o.text.insets=0;return o;
}
function box(s,v,x,y,w,h,fill=C.light,size=28){
 const o=s.shapes.add({geometry:'rect',name:'circuit-'+(++serial),position:{left:x,top:y,width:w,height:h},fill,line:{fill:C.ink,width:2}});
 if(v)text(s,v,x+12,y+6,w-24,h-12,size,false,C.ink,'center');return o;
}
function line(s,x1,y1,x2,y2,color=C.ink,arrow=false){
 const left=Math.min(x1,x2),top=Math.min(y1,y2),w=Math.max(1,Math.abs(x2-x1)),h=Math.max(1,Math.abs(y2-y1));
 s.shapes.add({geometry:'custom',name:'wire-'+(++serial),position:{left,top,width:w,height:h},fill:'none',line:{fill:color,width:2.2},customPaths:[{width:w,height:h,commands:[{moveTo:{x:x1-left,y:y1-top}},{lineTo:{x:x2-left,y:y2-top}}]}]});
 if(arrow){const dx=(x2-x1)/Math.hypot(x2-x1,y2-y1),dy=(y2-y1)/Math.hypot(x2-x1,y2-y1);const pts=[[x2,y2],[x2-12*dx+5*dy,y2-12*dy-5*dx],[x2-12*dx-5*dy,y2-12*dy+5*dx]];poly(s,pts,color,color);}
}
function poly(s,pts,fill=C.white,stroke=C.ink){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const l=Math.min(...xs),t=Math.min(...ys),w=Math.max(...xs)-l,h=Math.max(...ys)-t;return s.shapes.add({geometry:'custom',name:'logic-'+(++serial),position:{left:l,top:t,width:w,height:h},fill,line:{fill:stroke,width:2},customPaths:[{width:w,height:h,commands:[{moveTo:{x:pts[0][0]-l,y:pts[0][1]-t}},...pts.slice(1).map(p=>({lineTo:{x:p[0]-l,y:p[1]-t}})),{close:{}}]}]});}
function and(s,x,y){s.shapes.add({geometry:'custom',name:'and-gate-'+(++serial),position:{left:x,top:y,width:66,height:64},fill:C.white,line:{fill:C.ink,width:2},customPaths:[{width:66,height:64,commands:[{moveTo:{x:0,y:0}},{lineTo:{x:32,y:0}},{cubicBezTo:{x1:76,y1:0,x2:76,y2:64,x:32,y:64}},{lineTo:{x:0,y:64}},{close:{}}]}]});line(s,x-30,y+15,x,y+15);line(s,x-30,y+49,x,y+49);line(s,x+66,y+32,x+100,y+32);}
const outline=[];
function slide(title,seconds,notes){const s=P.slides.add();s.background.fill=C.white;text(s,title,64,40,1140,68,40,true);text(s,String(P.slides.items.length),1192,668,28,28,18,false,C.ink,'right');s.speakerNotes.text=`想定時間：${seconds}秒\n\n${notes}`;outline.push({title,seconds,notes});return s;}
const sources='根拠：docs/thesis/本文.md 第5〜10章、第12章、第15章。実験記録 E1、E6。製品 https://github.com/SoshiroFujimori/wally-game-console/tree/261832d48832dd6e26c4971ab8893ce61200688b 。';
let s=slide('FPGAを用いた二次元ゲーム機の設計と実装',25,'公開CPUであるWallyに、画面を描く回路を接続し、ブロック崩しを動かすゲーム機を作りました。目的は、Wallyに周辺機能を追加する学習者が、接続方法と確認方法を参照できる例を示すことです。今日は、基板の中に何を作り、どう画面を出し、何を確かめたかを説明します。\n'+sources);
text(s,'公開CPUに描画機能を追加し、\nブロック崩しを動かす',86,205,1060,155,49,true);
text(s,'Wallyの学習者が参照できる接続設計と動作例',86,442,1080,90,31);
text(s,'Wally：CPUの公開設計　　RasterIX：描画回路の公開設計',86,586,1080,48,25);
s=slide('FPGAボードに回路を実装する',35,'FPGAボードには、FPGAチップのほかにメモリやSDカードスロット、HDMI端子があります。FPGAには、論理ゲートや記憶素子の接続を設定して、目的に合った回路を実装できます。図のゲートはそのイメージです。周辺の部品そのものをFPGAの中に作るのではなく、その部品を操作する回路を中に作ります。\n'+sources);
box(s,'',92,185,1096,410,C.white);text(s,'Nexys Video ボード',112,552,390,36,24);
for(const [v,x] of [['SDカード',138],['DDR3メモリ',497],['HDMI端子',856]]){box(s,v,x,206,282,62,C.white,28);line(s,x+141,268,x+141,330);}
box(s,'',182,330,916,200,C.light);text(s,'FPGAチップ',210,350,260,40,28,true);
and(s,350,422);and(s,520,422);poly(s,[[752,422],[752,486],[810,454]]);line(s,620,454,752,454);line(s,810,454,914,454);text(s,'設定に応じて論理ゲートなどを接続',325,606,720,48,29,false,C.ink,'center');
s=slide('CPUと描画回路を一つのチップに接続する',50,'このFPGAの中に、WallyとRasterIXを配置しました。前の図と、部品とチップの位置は同じです。CPUのバスにはSDカード制御回路と、描画命令を渡す接続回路をつなぎます。CPUも描画側も外のDDR3メモリを使うため、メモリへのアクセスをまとめます。RasterIXが作った画像は、表示回路が読み、HDMI端子から出します。既存のCPUと描画回路を利用し、この接続と制御を設計した部分が本研究です。\n'+sources);
box(s,'',82,154,1116,492,C.white);
for(const [v,x] of [['SDカード',114],['DDR3メモリ',499],['HDMI端子',884]])box(s,v,x,171,282,62,C.white,28);
box(s,'',106,271,1068,352,C.light);text(s,'FPGAチップ',126,280,245,33,23,true);
box(s,'SD制御',137,330,178, sixty(),C.white,27);line(s,255,233,255,330);
box(s,'メモリ制御',521,330,238,60,C.white,27);line(s,640,233,640,330);
box(s,'表示回路',962,330,182,60,C.white,27);line(s,1053,330,1053,233,C.ink,true);
box(s,'CPUのバス',148,439,599,46,C.mid,25);line(s,226,390,226,439);line(s,640,390,640,439);
box(s,'Wally\nCPU',267,519,310,76,C.white,30);line(s,422,519,422,485);
box(s,'命令の接続',793,439,190,46,C.white,24);line(s,747,462,793,462,C.ink,true);
box(s,'RasterIX\n描画回路',793,519,351,76,C.white,28);line(s,889,485,889,519,C.ink,true);
line(s,759,357,785,357);line(s,785,357,785,550);line(s,785,550,793,550);
line(s,759,348,962,348,C.ink,true);
text(s,'画像の読出し',779,312,176,31,20);
line(s,1091,519,1091,390,C.blue,true);
text(s,'表示先の\n指定',988,398,98, sixty(),20,false,C.blue,'center');
text(s,'CPUと描画側がDDR3を共有する',430,663,650,30,23,false,C.ink,'center');
function sixty(){return 60;}
s=slide('ゲームの状態を画像に変える',50,'CPUはSDカードから読み込んだゲームを実行します。一回の処理でボールの位置を更新します。位置や色をRasterIX付属のOpenGL互換ライブラリへ渡すと、ライブラリが描画命令をメモリへ用意します。接続回路から命令を受けたRasterIXが画像を作り、表示回路が読み出します。これを繰り返すと動いて見えます。位置の数値、描画命令、画素の色は別々のデータです。命令を送る接続と、できた画像を表示する接続を、それぞれ用意しました。\n'+sources);
const xs=[64,369,674,979],ws=[246,246,246,237];
for(let i=0;i<4;i++)box(s,['CPUで位置を更新','描画命令を用意','RasterIXで描画','画面へ表示'][i],xs[i],194,ws[i], seventy(),C.light,26);
for(let i=0;i<3;i++)line(s,xs[i]+ws[i]+6,229,xs[i+1]-8,229,C.ink,true);
text(s,'ボールの位置\n(x, y)',74,330,226,90,29,false,C.ink,'center');
text(s,'OpenGL互換\nライブラリが命令を\nメモリに用意',379,322,226,120,25,false,C.ink,'center');
text(s,'画素の色を\nメモリへ保存',684,330,226,90,28,false,C.ink,'center');
box(s,'',1003,326,179,130,C.white);box(s,'',1061,374,35,35,C.blue);line(s,1093,456,1093,479);line(s,1068,479,1118,479);
text(s,'一画面分の処理を繰り返す',315,510,690, fifty(),32,true,C.ink,'center');
text(s,'CPUは位置を計算し、描画回路は画素の色を作る',80,590,1120,55,30,false,C.ink,'center');
function seventy(){return 70;}
s=slide('CPUから描画回路へ命令を渡す',45,'CPUは番地を指定して数値を書きます。RasterIXは順番に並ぶ命令を受け取ります。この二つの渡し方をつなぐ回路を設計しました。途中のFIFOは、先に入れた値から渡す保存場所です。また、CPU側は20 MHz、描画側は100 MHzなので、それぞれの時計で受け渡しを管理する既存の非同期FIFOを使いました。空きがなければCPUの書き込みを待たせます。本研究で作ったのは、既存FIFOの内部ではなく、その前後の接続です。\n'+sources);
box(s,'Wally\n20 MHz',86,176,250,110,C.white,29);box(s,'接続回路とFIFO\n命令を順番に保存',451,176,370,110,C.light,28);box(s,'RasterIX\n100 MHz',936,176,250,110,C.white,29);line(s,336,230,451,230,C.ink,true);line(s,821,230,936,230,C.ink,true);
text(s,'CPUは番地を指定して書く',87,319,490,50,28);
text(s,'RasterIXは命令を順に受け取る',688,319,500,50,28);
text(s,'接続回路が、両側の受け渡しをつなぐ',87,432,1100,58,34,true,C.ink,'center');
text(s,'別々のクロックでも、値と順番を保つ',120,526,1060,50,30,false,C.ink,'center');
text(s,'保存できない間は、CPUの書き込みを待たせる',120,600,1060,50,29,false,C.ink,'center');
function fifty(){return 50;}function forty(){return 40;}
s=slide('表示中の画像を途中で書き換えない',40,'もう一つの接続設計が、表示する画像の切り替えです。表示回路は画像を読み続けます。その同じ画像を途中で描き換えると、新旧の画面が混ざるおそれがあります。そこで画像を二枚分用意し、一方を表示している間に、もう一方に描きます。完成後、表示の区切りで役割を交代します。また、古い画像の読み出しが残っている間は、そこへの描き直しを始めないよう、切り替え完了を確認します。\n'+sources);
text(s,'切り替え前',123,162,370, fifty(),32,true,C.ink,'center');
text(s,'切り替え後',800,162,370, fifty(),32,true,C.ink,'center');
box(s,'画像A：表示中',123,247,370, ninety(),C.light,31);
box(s,'画像B：描画中',123,409,370, ninety(),C.white,31);
box(s,'画像A：次の描画先',800,247,370, ninety(),C.white,30);
box(s,'画像B：表示中',800,409,370, ninety(),C.light,31);
line(s,524,374,770,374,C.blue,true);
text(s,'画像Bの完成後\n表示の区切りで',515,251,266,96,26,false,C.ink,'center');
text(s,'読む先と描く先を\n入れ替える',515,410,266, ninety(),26,false,C.ink,'center');
text(s,'切り替え完了後に、古い表示画像Aを描き直せる',72,589,1140, fifty(),30,true,C.ink,'center');
function ninety(){return 90;}
s=slide('実機でブロック崩しの動作を確認した',40,'640×480画素のブロック崩しで、画像確認用プログラムの三条件と再起動後の一条件の画像が、すべての画素で期待画像と一致しました。また、5分間の自動プレイの実行記録と、別の実行で記録した30秒間の映像を確認しました。動作確認には、描画処理を軽くする実装を含む完成版を使っています。映像を受信できない場合もあり、その条件の解明は課題です。\n根拠：E6、論文12.4〜12.6節。通常構成の画像4条件と継続実行、映像は別の試験。画像確認の開始状態・描画方法はqualification.jsonのwhole_frame_checksに記録。動画の記録枚数はゲームのFPSを示さない。画像：docs/thesis/figs/fifo-study-game.png。');
const game=await fs.readFile(path.join(root,'docs/thesis/figs/fifo-study-game.png'));
s.images.add({blob:game,contentType:'image/png',alt:'実機から記録したブロック崩しの画面',fit:'contain',position:{left:64,top:169,width:650,height:396}});
text(s,'640 × 480 画素\n4条件で全画素が\n期待画像と一致',751,184,465,138,30,true);
text(s,'5分間の自動プレイ\n別に30秒間の映像を確認',751,350,465,112,30);
text(s,'動作確認には描画処理を\n軽くした完成版を使用',751,511,465,80,25);
text(s,'課題：映像を受信できない場合の条件を調べる',72,631,1140,40,25);
s=slide('Wallyを拡張するための設計例',45,'Wallyに描画と表示の機能を追加し、ブロック崩しを動かす構成を実機で確認しました。既存のCPUと描画回路を利用し、命令の接続、画像を置くメモリの設定、表示画像の切り替えを実装しました。接続設計と試験条件を公開することで、Wallyに周辺機能を追加する人が参照できる例とします。学習効果を測った結果ではありません。最終発表では専用コントローラーを接続し、ボタンによる操作を検証します。\n'+sources);
text(s,'Wallyに描画・表示機能を加え、\nブロック崩しの動作を実機で確認した',90,160,1090,127,41,true);
text(s,'命令の接続・画像用メモリ・表示の切り替えを実装',90,337,1100,60,29);
text(s,'接続設計と試験条件を公開し、\nWallyを拡張する人が参照できる形にまとめた',90,428,1090,100,30);
text(s,'最終発表：専用コントローラーによる操作を検証',90,583,1100,60,30,true);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2));
const totalSeconds=outline.reduce((sum,item)=>sum+item.seconds,0);
if(totalSeconds!==330) throw Error('The eight-slide talk must leave 30 seconds within six minutes.');
const markdown=['# 中間発表のスライドと発表原稿',
 '発表時間は6分を想定し、8枚の説明を5分30秒で行う。残り30秒は図を指す時間と間に充てる。ゲーム機の全体構成、命令と画像の接続、実機で確認した動作を説明する。専用コントローラーの接続と入力の検証は最終発表で扱う。',
 '[PowerPoint版](中間発表_主要事項.pptx) / [アブスト](../abstract/アブスト_主要事項.md) / [論文本文](../thesis/本文.md)',
 '## 目次',outline.map((item,i)=>`- [${i+1}. ${item.title}](#slide-${i+1})`).join('\n')];
for(const [i,item] of outline.entries()) markdown.push(
 `<a id="slide-${i+1}"></a>\n## ${i+1}. ${item.title}`,
 `説明時間の目安：${item.seconds}秒`,
 `![${item.title}](slides/slide-${String(i+1).padStart(2,'0')}.png)`,
 '### 発表原稿',item.notes);
markdown.push('## 動作確認の条件と詳しい実装',
 '動作確認の構成・画像・実行記録・映像は[論文第12章](../thesis/本文.md#ch_12)に示す。完成版に含まれる描画処理の工夫、接続方式の比較、ファイルごとの実装手順は[技術付録](../thesis/技術付録.md)から参照できる。これらの性能比較を今回の発表の結論とはしない。');
await fs.writeFile(path.join(workspace,'中間発表_主要事項.md'),markdown.join('\n\n').trimEnd()+'\n');

for(const [i,s] of P.slides.items.entries()){
 const b=await P.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(workspace,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));
}
const raw=path.join(workspace,'raw-candidate.pptx');
const candidate=path.join(workspace,'candidate.pptx');await(await PresentationFile.exportPptx(P)).save(raw);
const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,candidate,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
if(scrub.status!==0)throw Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
await finalizePresentation({workspaceDir:workspace,candidatePath:candidate,finalPath:path.join(workspace,'final','中間発表_主要事項.pptx'),pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:8,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(workspace,'validation.json')});
