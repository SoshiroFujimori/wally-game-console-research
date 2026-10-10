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
const sources='根拠：docs/thesis/本文.md 第6〜10章、第13章。実験記録 E6。製品 https://github.com/SoshiroFujimori/wally-game-console/tree/261832d48832dd6e26c4971ab8893ce61200688b 。';
let s=slide('FPGAを用いた二次元ゲーム機の設計と実装',25,'公開CPUであるWallyに、画面を描く回路を接続し、ブロック崩しを動かすゲーム機を作りました。目的は、Wallyに周辺機能を追加する学習者が、接続方法と確認方法を参照できる例を示すことです。今日は、基板の中に何を作り、どう画面を出し、何を確かめたかを説明します。\n'+sources);
text(s,'公開CPUに描画機能を追加し、\nブロック崩しを動かす',86,205,1060,155,49,true);
text(s,'Wallyの学習者が参照できる接続設計と動作例',86,442,1080,90,31);
text(s,'Wally：CPUの公開設計　　RasterIX：描画回路の公開設計',86,586,1080,48,25);
s=slide('FPGAボードに回路を実装する',40,'FPGAボードには、FPGAチップのほかにメモリやSDカードスロット、HDMI端子があります。FPGAには、論理ゲートや記憶素子の接続を設定して、目的に合った回路を実装できます。図のゲートはそのイメージです。周辺の部品そのものをFPGAの中に作るのではなく、その部品を操作する回路を中に作ります。\n'+sources);
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
text(s,'表示先の指定',985,393,172,32,20,false,C.blue);
text(s,'CPUと描画側がDDR3を共有する',430,663,650,30,23,false,C.ink,'center');
function sixty(){return 60;}
s=slide('ゲームの状態を画像に変える',40,'CPUはSDカードから読み込んだゲームプログラムを実行します。ゲームの一回の処理では、ボールなどの位置を更新し、その位置と色を描画命令にします。CPUは命令列をメモリに用意してから接続回路へ送ります。RasterIXは命令に従って画素の色を計算し、画像をメモリへ保存します。表示回路がその画像を読むと、画面にボールが見えます。この処理を繰り返すことで、動いて見えます。\n'+sources);
const xs=[64,369,674,979],ws=[246,246,246,237];
for(let i=0;i<4;i++)box(s,['CPUで位置を更新','描画命令を用意','RasterIXで描画','画面へ表示'][i],xs[i],194,ws[i], seventy(),C.light,26);
for(let i=0;i<3;i++)line(s,xs[i]+ws[i]+6,229,xs[i+1]-8,229,C.ink,true);
text(s,'ボールの位置\n(x, y)',74,330,226,90,29,false,C.ink,'center');
text(s,'位置・大きさ・色を\n数値列にして\nメモリに保存',379,322,226,120,25,false,C.ink,'center');
text(s,'画素の色を\nメモリへ保存',684,330,226,90,28,false,C.ink,'center');
box(s,'',1003,326,179,130,C.white);box(s,'',1061,374,35,35,C.blue);line(s,1093,456,1093,479);line(s,1068,479,1118,479);
text(s,'一画面分の処理を繰り返す',315,554,690,65,35,true,C.ink,'center');
function seventy(){return 70;}
s=slide('命令を預けて、CPUの待ちを減らす', fifty(), 'CPUとRasterIXは異なるクロックで動きます。そのため、命令の値と順番を保って渡す接続が必要です。一つの方法は、一語を保持し、相手の受取確認が戻るたびに次を送る方法です。採用したFIFOは、命令を順番に預かる待ち行列です。空きがあれば、CPUは次の命令へ進めます。同じゲームで比べたところ、この図の三方式では512語FIFOの送信待ちが最も短くなりました。この数字はゲーム全体ではなく、書き込みを待たされた時間です。\n根拠：E6、第13.10〜13.13節。1語方式は4相ハンドシェイク。初期状態、全体描画、180フレームを3回、各試行平均の中央値。CPU 20 MHz、RasterIX 100 MHz。');
box(s,'Wally\n20 MHz',86,178,250,110,C.white,29);box(s,'FIFO\n命令を順番に保存',451,178,370,110,C.light,28);box(s,'RasterIX\n100 MHz',936,178,250,110,C.white,29);line(s,336,232,451,232,C.ink,true);line(s,821,232,936,232,C.ink,true);
text(s,'空きがあれば、CPUは次の命令へ進める',242,309,828, fifty(),30,false,C.ink,'center');
text(s,'1画面分の命令を送る間の待ち時間',90,405,1100,48,30,true);
const vals=[4.393,2.254,.465],labels=['1語ずつ渡す','16語FIFO','512語FIFO'];
for(let i=0;i<3;i++){let y=474+i*54;text(s,labels[i],104,y,242, forty(),26);box(s,'',354,y+4,vals[i]*133,29,C.block);text(s,vals[i].toFixed(3)+' ms',971,y,210, forty(),26);}
text(s,'全体描画・同じ初期状態／各方式180フレーム × 3回',104,648,1020,34,20);
function fifty(){return 50;}function forty(){return 40;}
s=slide('表示中の画像を途中で書き換えない',45,'もう一つの接続設計が、表示する画像の切り替えです。表示回路は画像を読み続けます。その同じ画像を途中で描き換えると、新旧の画面が混ざるおそれがあります。そこで画像を二枚分用意し、一方を表示している間に、もう一方に描きます。完成後、表示の区切りで役割を交代します。また、古い画像の読み出しが残っている間は、そこへの描き直しを始めないよう、切り替え完了を確認します。\n'+sources);
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
s=slide('実機でブロック崩しの動作を確認した',55,'実機では640×480画素のブロック崩しを動かしました。ここに示したのは、実機映像の一場面です。通常版で5分間の自動プレイが継続し、別途保存した30秒の映像でもボールの移動を確認しました。接続を比較した三方式では、選んだ27画面の全画素が正解画像と一致しました。ただし、すべての途中画像を比べたわけではありません。また、大きいテクスチャと映像機器での認識には未解決の条件があります。専用のゲームコントローラーは、まだ検証していません。\n根拠：E6、第13.11節と13.15〜13.16節。画像：docs/thesis/figs/fifo-study-game.png。');
const game=await fs.readFile(path.join(root,'docs/thesis/figs/fifo-study-game.png'));
s.images.add({blob:game,contentType:'image/png',alt:'実機から記録したブロック崩しの画面',fit:'contain',position:{left:64,top:176,width:650,height:400}});
text(s,'640 × 480 画素\n5分間の自動プレイ',764,214,445,117,33,true);
text(s,'接続比較では27画面で\n全画素が正解画像と一致',764,365,445,108,29);
text(s,'専用コントローラーは未検証',764,524,445, seventy(),25);
text(s,'大きいテクスチャと、映像認識には未解決の条件がある',72,626,1140, forty(),25);
s=slide('Wallyを拡張するための設計例',25,'WallyをFPGAボードに実装し、描画回路、メモリ、表示をつなぐことで、二次元ゲームを動かしました。動いたという報告に加え、命令の渡し方を比較し、採用した接続の根拠を示しました。設計とソース、試験条件を公開し、Wallyへ周辺機能を追加したい学習者が、同じ構成を検討するときの参照例とします。今後は残る不具合の検証と、専用コントローラーの接続を進めます。\n'+sources);
text(s,'CPUに描画・表示機能を追加し、\n二次元ゲームを実行できた',90,191,1080,127,43,true);
text(s,'接続の選び方を、実機での比較から説明した',90,376,1080, seventy(),32);
text(s,'公開するもの\n接続設計・ソースコード・試験条件',90,496,1080,116,30);
await fs.writeFile(path.join(workspace,'outline.json'),JSON.stringify(outline,null,2));
for(const [i,s] of P.slides.items.entries()){
 const b=await P.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(workspace,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));
}
const raw=path.join(workspace,'raw-candidate.pptx');
const candidate=path.join(workspace,'candidate.pptx');await(await PresentationFile.exportPptx(P)).save(raw);
const scrub=spawnSync(process.env.RUNTIME_PYTHON,[path.join(root,'tools/publication/sanitize.py'),raw,candidate,'--config',path.join(root,'.private/redactions.json')],{encoding:'utf8'});
if(scrub.status!==0)throw Error(scrub.stderr||scrub.stdout||'Privacy sanitization failed');
await finalizePresentation({workspaceDir:workspace,candidatePath:candidate,finalPath:path.join(workspace,'final','中間発表_主要事項.pptx'),pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(process.env.PRESENTATION_SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:8,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(workspace,'validation.json')});
