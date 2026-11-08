import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const FPGA_UTILIZATION_SOURCE = 'experiments/fpga-resource-comparison-20261108/comparison.json';

const categories = [
  ['Slice LUTs', 'ルックアップテーブル\nLook-up table（LUT）', '論理演算・条件判定'],
  ['Slice Registers', 'レジスタ\nSlice Registers', '状態や途中の値を保持'],
  ['Block RAM Tile', 'ブロックメモリ\nBlock RAM Tile', 'まとまったデータを保存'],
  ['DSPs', '乗算・加算の専用回路\nDSP48E1', '乗算・加算などを実行'],
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
  const after=JSON.parse(await fs.readFile(path.join(base,evidence.after.record),'utf8'));
  if(evidence.kind!=='historical_before_after'||evidence.part!=='xc7a200tsbg484-1')
    throw new Error('Unexpected comparison scope or FPGA part');
  const rows=categories.map(([key,label,role])=>{
    const before=evidence.before.resources[key],current=after.resources[key];
    if(before.available!==current.available)throw new Error(`Resource capacity differs for ${key}`);
    return {key,label,role,before:percentage(before,key),after:percentage(current,key)};
  });
  if(!after.implementation_qualified||after.bit_sha256!==evidence.after.bitstream_sha256)
    throw new Error('Expected the qualified gameplay implementation');
  return {rows,bitstreamSha256:after.bit_sha256,beforeDate:evidence.before.report_date,afterDate:evidence.after.report_date};
}

export const FPGA_UTILIZATION_NARRATION = '描画機能の追加前と、ブロック崩しの動作確認に使った構成の使用率を比較します。BeforeはWally構成、Afterは描画・表示機能を備えた構成です。ルックアップテーブルは36.22%から50.39%、ブロックメモリは23.01%から58.63%になっています。どちらも同じFPGAに実装した回路全体について、配置配線後の記録から示しています。';

export const FPGA_UTILIZATION_DETAIL = `比較する構成
Beforeは2026年9月8日に保存されたNexys Video対応時のWally構成、Afterは2026年11月8日の実験E8でブロック崩しの動作確認に使った描画・表示機能付きの構成である。どちらもNexys VideoのArtix-7 XC7A200T（xc7a200tsbg484-1）、Vivado 2025.2による配置配線後の記録を使う。CPU、バス、メモリ制御なども含む、FPGA内の回路全体を比較する。

Beforeの根拠
experiments/fpga-resource-comparison-20261108/before-utilization.rptに保存したレポートを使う。レポートの日付は2026年9月8日13:16:56、DesignはfpgaTop、Design StateはRoutedである。保存元は製品作業ディレクトリのfpga/generator/reports/nexysvideo_utilization.rptで、Nexys Video対応時の描画機能がない構成の記録である。レポート自体にGitリビジョンやビットストリームのハッシュは記載されていないため、特定のコミットから完全に再生成した結果とは主張しない。公開したコピーではホスト名などを伏せ、元ファイルと公開ファイルのハッシュをcomparison.jsonに区別して記録している。

Afterの根拠
experiments/basic-operation-20261108/results/implementation.jsonと、その配置配線レポートを使う。製品261832d48832dd6e26c4971ab8893ce61200688bへ研究用の表示差分を適用したE8のHDMI表示構成であり、公式RasterIX 9269a01は変更していない。差分とソースのハッシュはexperiments/basic-operation-20261108/hdmi/に記録した。スライド10の文字配置変更後の動画でも同じ回路設定データを使った。製品の標準DVI表示構成の値とは区別する。

比較の範囲
これは開発前後に保存した二つの実装全体の比較である。CPUのRTLなどの版やその他の実装条件を固定し、描画機能の有無だけを変えた比較実験ではない。差をすべてRasterIX単体の使用量として解釈しない。

掲載値
LUT、レジスタ、Block RAM Tile、DSPの四種類を示す。元レポートの使用率と整合する値を小数第2位まで表示する。BeforeとAfterでFPGAの資源容量が同じであることも生成時に確認する。各資源の内訳と検算用の値は、比較データと元レポートを参照できる。`;

export function drawFpgaUtilization(slide, api, data, pageNumber) {
  const {text, C} = api;
  text(slide, 'Nexys Video：Artix-7 XC7A200T', 64, 125, 1152, 44, 28, true, C.blue);
  text(slide, 'Before：Wally構成　／　After：描画・表示機能を追加', 64, 176, 1152, 35, 25);
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
  text(slide, '表 '+pageNumber, 64, 684, 63, 30, 17, true, C.heading);
  text(slide, `配置配線後の記録：Before ${data.beforeDate} ／ After ${data.afterDate}（Vivado 2025.2）`, 131, 684, 1028, 30, 16);
}
