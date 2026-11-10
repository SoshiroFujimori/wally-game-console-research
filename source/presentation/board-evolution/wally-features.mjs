import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const executionRows=[
  ['命令セット','RV64GCを基本とする構成\nB・Zbc・Zknなども有効','64bit整数、乗除算、アトミック、\n圧縮命令などを実行'],
  ['パイプライン','5段・単一発行・インオーダー','取出し、解読、実行、メモリ、書戻し\n命令を順番に進める'],
  ['レジスタ','整数：32個 × 64bit\n浮動小数点：32個 × 64bit','整数レジスタx0は常に0\n浮動小数点用のレジスタ群も持つ'],
  ['演算器','整数乗除算、16・32・64bitの\n浮動小数点演算に対応','F・D・Zfh・Zfaを有効化\n整数除算はFPUの除算器を共有'],
  ['分岐方向','Gshare：12bitの分岐履歴\n予測表：4,096項目 × 2bit','PC由来の値と履歴のXORで表を選ぶ\n2bit飽和カウンタで成立／不成立を予測'],
  ['分岐先','Branch Target Buffer（BTB）\n1,024項目','以前の分岐先アドレスを記録し、\n次に読み出す命令の位置を予測'],
  ['関数の戻り先','Return Address Stack（RAS）\n16項目','呼出し後に戻るアドレスを積み、\n関数から戻るときに予測へ使う'],
  ['ハザード対策','フォワーディング・ストール・\nフラッシュ','前の演算結果を転送、必要なら待機\n誤予測時は後続命令を取り消す'],
];
const memoryRows=[
  ['キャッシュ','命令・データに各16 KiB\n4-way、1ライン64 byte','命令とデータをそれぞれ保持し、\n外部メモリへのアクセスを減らす'],
  ['キャッシュ制御','書戻し方式・write allocate\n置換は木構造の疑似LRU','書込みミス時にもラインを取り込む\n変更した内容は追出し等で書き戻す'],
  ['仮想記憶','Sv39・Sv48・Sv57に対応\nハードウェアのページ表探索','プログラムが使う仮想アドレスを\nメモリの物理アドレスへ変換'],
  ['TLB','命令用32項目・データ用32項目','アドレス変換の結果を保存し、\n同じ変換でのページ表探索を減らす'],
  ['特権モード','Machine・Supervisor・User\nCSR、例外、割込みに対応','ファームウェア、OS、アプリを分離\n例外や割込みで処理先を切り替える'],
  ['メモリ保護','Physical Memory Protection\n（PMP）：16領域','領域ごとに読出し・書込み・\n命令実行の許可を検査'],
  ['性能カウンタ','Zicntr・Zihpmを有効化','サイクル数、完了命令数、\nキャッシュミスや誤予測などを計数'],
  ['外部との接続','CPUのAHBデータ幅：64bit\n周辺回路はSoC側でAPBへ接続','メモリと周辺回路をアドレスで選ぶ\nIROM・DTIMは今回の設定では無効'],
];

function drawTable(slide,api,rows){
  const {text,C}=api;
  text(slide,'今回のゲーム機構成：64bit ／ CPUクロック20 MHz',64,121,1152,38,25,true,C.blue);
  const values=[['機能','今回の設定・方式','働き'],...rows];
  const table=slide.tables.add({rows:values.length,columns:3,left:64,top:174,width:1152,height:522,columnWidths:[206,450,496],values});
  table.styleOptions={headerRow:false,bandedRows:false,firstColumn:false,lastColumn:false};
  table.borders.assign({fill:C.ink,width:1,style:'solid'});
  table.rows[0].height=42;
  for(let r=1;r<values.length;r++)table.rows[r].height=60;
  for(let r=0;r<values.length;r++)for(let c=0;c<3;c++){
    const cell=table.getCell(r,c);
    cell.fill=r===0?C.heading:r%2===0?C.pale:C.white;
    cell.text.style={typeface:'Yu Gothic',fontSize:r===0?23:c===0?22:21,bold:r===0||c===0,color:r===0?C.white:C.ink,alignment:'left',verticalAlignment:'middle',wrap:'square'};
    cell.text.insets={left:12,right:10,top:3,bottom:3};
  }
}

export async function addWallyFeatureSlides({slide,api,root,outline}){
  const config=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'wally-features.json'),'utf8'));
  for(const [name,digest] of Object.entries(config.source_sha256)){
    const data=await fs.readFile(path.join(root,'console',name));
    if(createHash('sha256').update(data).digest('hex')!==digest)throw new Error(`Wally feature source changed: ${name}`);
  }
  const evidence=JSON.parse(await fs.readFile(path.join(root,config.evidence),'utf8'));
  if(evidence.standard_bitstream_frozen_source_revision!==config.hardware_source_revision||evidence.standard_bitstream_sha256!==config.bitstream_sha256)throw new Error('Wally table no longer matches the recorded hardware');
  const base=`https://github.com/SoshiroFujimori/wally-game-console/blob/${config.hardware_source_revision}/`;
  const references=Object.keys(config.source_sha256).map(name=>base+name).join('\n');
  const scope=`対象構成\n本表は、本編の実機動画に対応するfpganexysvideo_rasterix構成を示す。回路ソースは${config.hardware_source_revision}、回路設定データのSHA-256は${config.bitstream_sha256}である。設定はrv64gc、buildroot、fpga、fpganexysvideo、fpganexysvideo_rasterixの順に継承される。基本構成だけを読むとBPRED_SIZEは10だが、fpgaで12に上書きされる。表に使った設定・RTLは、現在のconsole参照版でも同一である。ソース照合結果はsource/presentation/board-evolution/wally-features.jsonに記録した。\n\n確認の意味\n設定値と回路記述から搭載機能を確認した一覧である。各拡張命令や各仮想記憶モードを今回のゲームで個別に試験したという意味ではない。20 MHzは今回のFPGA構成の設定で、Wally全般の最大周波数を表さない。KiBは1,024 byteである。\n\n`;
  const executionDetail=scope+`分岐予測\nGshareは、直近の分岐履歴を12bitのGHRに持ち、PCから求める12bitの値とXORしてPHTの参照位置を選ぶ。PHTは2の12乗、すなわち4,096項目で、各項目は2bit飽和カウンタである。実際の成立／不成立に従ってカウンタを増減し、上限・下限では飽和する。最上位bitで方向を予測する。直前の未確定分岐の予測を織り込み、パイプライン中の結果で履歴や予測値を補う処理もある。\nBTB_SIZE=10は1,024項目を意味する。BTBはターゲットアドレスと命令クラスを持つ。RAS_SIZE=16は16項目を直接意味し、2の16乗ではない。関数呼出しの戻りアドレスを保存し、リターン時に参照する。方向・ターゲット・戻り先の予測は役割が異なる。分岐条件や次PCが確定した際に誤りを検出し、後続をフラッシュして正しい命令列へ戻る。教科書のベンチマークの予測精度を、このゲームでの実測値としては記載しない。\n\n命令セットと演算\nRV64GCの基本機能に加え、Zba/Zbb/Zbs（B）、Zbc、Zbkb/Zbkc/Zbkx/Zknd/Zkne/Zknh（Zkn）、Zcb、Zicond、Zicclsm、Zfh、Zfaなどを有効化する。GCだけが実装されているという意味ではない。Qは無効である。整数レジスタx0は0固定なので、自由に書き換えられる整数レジスタは31個である。整数除算はIDIV_ON_FPU=1によりFPU側の除算器を使うため、独立整数除算器用のIDIV_BITSPERCYCLE値をそのまま実機の速度と解釈しない。\n\n用語\n単一発行は1周期に新たに進める命令が最大1命令という意味であり、全命令が1周期で完了するという意味ではない。インオーダーは命令順に実行を進める方式である。フォワーディングは前の命令の結果を後の命令へ直接渡す処理、ストールは待機、フラッシュは後続命令の取消しである。`;
  const memoryDetail=scope+`キャッシュ\n命令用・データ用とも4 ways × 4,096 byte/way = 16,384 byte、すなわち16 KiBである。512bitのラインは64 byteで、セット数は64で、各セットに4本のラインを持つ。置換はcacheLRU.svの木構造による疑似LRUを使う。データキャッシュはwrite-back/write-allocateで、書込みミスでもラインを読み込み、変更したラインを追い出すときなどに書き戻す。MMIOはPMAで非キャッシュ領域として扱う。CPUキャッシュと、描画回路の画像用メモリは同じ機能ではない。\n\n仮想記憶と特権\nSv39、Sv48、Sv57が有効で、ページ表をハードウェアでたどるhptwを持つ。ITLBとDTLBは各32項目である。搭載しているモードの一覧であり、三つを同時に有効にするという意味ではない。Machine/Supervisor/Userの各モード、CSR、例外、割込み、Sstcを備える。PMPは16項目で、最小粒度は設定上64 byteである。アドレスや領域の属性に応じたPMAの検査もある。\n\n計数と周辺接続\nZicntr/Zihpmを有効化し、サイクル、完了命令、分岐・キャッシュなどのイベントを計数できる。COUNTERS=32は実装の番号空間であり、CSRの番号1を独立した通常カウンタと数えて32個の自由な計測器があるとは説明しない。CPUのAHBデータ幅は64bit、SoCの周辺回路はAHBからAPBへ接続する。IROM/DTIMは無効だが、SoCにはBoot ROM（4 KiB）とuncore RAM（8 KiB）があり、外付けDDR3領域は512 MiBである。DDR3コントローラ本体はAMD MIGで、CPUの内部機能ではない。`;
  for(const [title,rows,narration,detail] of [
    ['Wallyの機能：命令実行と分岐予測',executionRows,'今回のWallyは64bit、20 MHzの5段パイプラインです。分岐方向はGshare、分岐先はBTB、関数からの戻り先はRASで予測します。',executionDetail],
    ['Wallyの機能：メモリと特権機能',memoryRows,'命令・データキャッシュはそれぞれ16 KiBです。仮想アドレス変換、特権モード、メモリ保護、性能カウンタも備えています。',memoryDetail],
  ]){
    const tableMarkdown=['| 機能 | 今回の設定・方式 | 働き |','| --- | --- | --- |',...rows.map(row=>'| '+row.map(value=>value.replaceAll('\n','<br>')).join(' | ')+' |')].join('\n');
    const page=slide(title,0,narration,'RVSOC Chapters 7–13, 16–18, 21, 23.\n'+references,tableMarkdown+'\n\n'+detail);
    drawTable(page,api,rows);page.hidden=true;outline.at(-1).backup=true;
  }
}
