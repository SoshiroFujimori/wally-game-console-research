import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const FPGA_UTILIZATION_SOURCE = 'experiments/fpga-resource-comparison-20261108/comparison.json';
export const STANDARD_UTILIZATION_SOURCE = 'experiments/standard-display-resources-20261110/implementation.json';

const categories = [
  ['Slice LUTs', 'Look-Up Table\n（LUT）', '論理演算・条件判定'],
  ['Slice Registers', 'Slice Registers', '状態や途中の値を保持'],
  ['Block RAM Tile', 'Block RAM Tile', 'まとまったデータを保存'],
  ['DSPs', 'DSP48E1', '乗算・加算などを実行'],
];

function percentage(resource,key){
  const {used,available,percent}=resource;
  if(![used,available,percent].every(Number.isFinite)||available<=0||used<0||used>available)
    throw new Error(`Invalid utilization data for ${key}`);
  const calculated=used/available*100;
  if(Math.abs(calculated-percent)>0.0051)throw new Error(`Utilization percentage disagrees with counts for ${key}`);
  return calculated.toFixed(2);
}

export async function loadFpgaUtilization(root) {
  const evidence = JSON.parse(await fs.readFile(path.join(root, FPGA_UTILIZATION_SOURCE), 'utf8'));
  const base=path.join(root,path.dirname(FPGA_UTILIZATION_SOURCE));
  const beforeReport=await fs.readFile(path.join(base,evidence.before.report));
  if(createHash('sha256').update(beforeReport).digest('hex')!==evidence.before.published_report_sha256)
    throw new Error('Historical utilization report hash disagrees with provenance');
  const standardDirectory=process.env.PRESENTATION_RESOURCE_DIRECTORY||path.join(root,path.dirname(STANDARD_UTILIZATION_SOURCE));
  const after=JSON.parse(await fs.readFile(path.join(standardDirectory,'implementation.json'),'utf8'));
  const standardReport=await fs.readFile(path.join(standardDirectory,after.report));
  if(createHash('sha256').update(standardReport).digest('hex')!==after.published_report_sha256)
    throw new Error('Standard-display report hash disagrees with provenance');
  if(after.kind!=='qualified_standard_display'||after.part!==evidence.part)
    throw new Error('Unexpected standard-display configuration');
  for(const [key] of categories){
    const row=standardReport.toString('utf8').split('\n').find(line=>line.split('|')[1]?.trim()===key);
    const cells=row?.split('|').map(cell=>cell.trim());
    const resource=after.resources[key];
    if(!cells||Number(cells[2])!==resource.used||Number(cells[5])!==resource.available||Number(cells[6])!==resource.percent)
      throw new Error(`Standard-display report and extracted record disagree for ${key}`);
  }
  if(evidence.kind!=='historical_before_after'||evidence.part!=='xc7a200tsbg484-1')
    throw new Error('Unexpected comparison scope or FPGA part');
  const rows=categories.map(([key,label,role])=>{
    const before=evidence.before.resources[key],current=after.resources[key];
    if(before.available!==current.available)throw new Error(`Resource capacity differs for ${key}`);
    return {key,label,role,before:percentage(before,key),after:percentage(current,key)};
  });
  if(!after.implementation_qualified||after.bitstream_sha256!=='16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf')
    throw new Error('Expected the qualified gameplay implementation');
  return {rows,bitstreamSha256:after.bitstream_sha256,beforeDate:evidence.before.report_date,afterDate:after.report_date};
}

export const FPGA_UTILIZATION_NARRATION = '開発時に保存したCPU構成と、今回のゲーム機構成の使用率を比較します。BeforeはCPUと周辺回路、Afterは今回の動画で使った描画・表示機能付きの構成です。LUTは36.22%から49.90%、Block RAMは23.01%から58.90%になっています。どちらも同じFPGAで、CPUやメモリ制御などを含む回路全体の値です。開発中にはほかの回路も変わっているため、差のすべてが描画回路だけの使用量とはいえません。';

export const FPGA_UTILIZATION_DETAIL = `比較する構成
Beforeは2026年9月8日に保存したNexys Video対応時のCPUと周辺回路、Afterは2026年10月8日に保存した標準表示のゲーム機構成である。どちらもArtix-7 XC7A200T（xc7a200tsbg484-1）、Vivado 2025.2による配置配線後の記録を使う。Afterはスライド12の実機動画と同じ回路設定データで、スライド11もこの値を示す。

Beforeの根拠
experiments/fpga-resource-comparison-20261108/before-utilization.rptを使う。日付は2026年9月8日13:16:56、DesignはfpgaTop、Design StateはRoutedである。Nexys Video対応時の描画機能がない構成として保存された記録である。レポートにGitリビジョンや回路設定データのハッシュは記載されておらず、特定のコミットから完全に再生成した結果とは主張しない。元ファイルと公開用コピーのハッシュはcomparison.jsonに区別して記録した。

Afterの根拠
experiments/standard-display-resources-20261110/implementation.jsonとutilization.rptを使う。製品RTLは261832d48832dd6e26c4971ab8893ce61200688b、公式RasterIXは9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0。回路設定データのSHA-256は16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acfで、11月9日の映像記録に一致する。レポートは11月10日に保存済みの検証ディレクトリから取り出して確認し、再配置配線や新たな実機試験は行っていない。公開コピーはホスト名や個人用パスを除去した。

比較の範囲
開発前後に保存した実装全体を参考比較する。CPUのRTLなどの版や各種設定を固定して描画機能だけを追加した比較ではない。したがって、差をRasterIX単体の使用量と解釈しない。動作するゲーム機全体が対象FPGAに収まることは、Afterの実装記録と対応する実機動画から確認できる。

掲載値
LUT、Slice Registers、Block RAM Tile、DSPの四種類を示す。それぞれの搭載数に対する使用数の割合で、異なる資源の割合は合算しない。Block RAMはFPGA内のメモリで、ボード上のDDR3は含まれない。未使用資源の数だけから任意の拡張が可能とは判断できず、回路を追加する場合は配置配線とタイミングを再確認する。`;

export function drawCurrentUtilization(slide, api, data) {
  const {text,C}=api;
  text(slide,'Nexys Video：Artix-7 XC7A200T',64,174,1152,36,26,false,C.ink);
  const values=[['FPGA内部の資源','主な役割','Wally\n基本構成','ゲーム機\n構成'],
    ...data.rows.map(r=>[r.label,r.role,r.before+'%',r.after+'%'])];
  const table=slide.tables.add({rows:5,columns:4,left:64,top:227,width:1152,height:362,
    columnWidths:[320,312,260,260],values});
  table.styleOptions={headerRow:false,bandedRows:false,firstColumn:false,lastColumn:false};
  table.borders.assign({fill:C.ink,width:1,style:'solid'});
  table.rows[0].height=70;
  for(let r=1;r<5;r++)table.rows[r].height=73;
  for(let r=0;r<5;r++)for(let c=0;c<4;c++){
    const cell=table.getCell(r,c);
    cell.fill=r===0?C.heading:r%2===0?C.pale:C.white;
    cell.text.style={typeface:c>=2&&r>0?'Arial':'Yu Gothic',
      fontSize:r===0?24:c>=2?30:23,bold:r===0||c>=2,
      color:r===0?C.white:C.ink,alignment:c>=2?'center':'left',verticalAlignment:'middle',wrap:'square'};
    cell.text.insets={left:14,right:10,top:5,bottom:5};
  }
}

export function drawFpgaUtilization(slide, api, data, pageNumber) {
  const {text, C} = api;
  text(slide, 'Nexys Video：Artix-7 XC7A200T', 64, 125, 1152, 44, 28, true, C.blue);
  text(slide, 'Before：CPU・周辺回路　／　After：描画・表示機能を追加', 64, 176, 1152, 35, 25);
  const values = [
    ['FPGA内部の資源', '主な役割', 'Before\n追加前', 'After\n追加後'],
    ...data.rows.map(r => [r.label, r.role, r.before+'%', r.after+'%']),
  ];
  const table = slide.tables.add({rows: 5, columns: 4, left: 64, top: 229, width: 1152, height: 370,
    columnWidths: [320, 312, 260, 260], values});
  table.styleOptions = {headerRow: false, bandedRows: false, firstColumn: false, lastColumn: false};
  table.borders.assign({fill: C.ink, width: 1, style: 'solid'});
  table.rows[0].height = 66;
  for (let r = 1; r < 5; r++) table.rows[r].height = 76;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = table.getCell(r, c);
      cell.fill = r === 0 ? C.heading : (r % 2 === 0 ? C.pale : C.white);
      cell.text.style = {typeface: c >= 2 && r > 0 ? 'Arial' : 'Yu Gothic',
        fontSize: r === 0 ? 24 : c >= 2 ? 29 : 23,
        color: r === 0 ? C.white : C.ink, bold: r === 0 || c >= 2,
        alignment: c >= 2 ? 'center' : 'left', verticalAlignment: 'middle', wrap: 'square'};
      cell.text.insets = {left: 14, right: 10, top: 5, bottom: 5};
    }
  }
  text(slide, 'CPU・メモリ制御などを含む、FPGA内の回路全体を比較', 64, 624, 1152, 32, 23);
  text(slide, `保存した構成：Before ${data.beforeDate} ／ After ${data.afterDate}（Vivado 2025.2）`, 64, 684, 1090, 30, 16);
}
