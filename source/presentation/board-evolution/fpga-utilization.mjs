import fs from 'node:fs/promises';
import path from 'node:path';

export const FPGA_UTILIZATION_SOURCE = 'docs/thesis/再現資料/実験記録/E6/fresh-product/qualification/qualification.json';

const categories = [
  ['Slice LUTs', 'ルックアップテーブル\nLook-up table（LUT）', '論理演算・条件判定'],
  ['Slice Registers', 'レジスタ\nSlice Registers', '状態や途中の値を保持'],
  ['Block RAM Tile', 'ブロックメモリ\nBlock RAM Tile', 'まとまったデータを保存'],
  ['DSPs', '乗算・加算の専用回路\nDSP48E1', '乗算・加算などを実行'],
];

export async function loadFpgaUtilization(root) {
  const evidence = JSON.parse(await fs.readFile(path.join(root, FPGA_UTILIZATION_SOURCE), 'utf8'));
  const rows = categories.map(([key, label, role]) => {
    const {used, available, percent} = evidence.resources[key];
    if (![used, available, percent].every(Number.isFinite) || available <= 0 || used < 0 || used > available)
      throw new Error(`Invalid utilization data for ${key}`);
    const calculated = used / available * 100;
    if (Math.abs(calculated - percent) > 0.0051)
      throw new Error(`Utilization percentage disagrees with counts for ${key}`);
    return {key, label, role, used, available, percent: calculated.toFixed(2)};
  });
  if (!evidence.board_test?.passed || !evidence.bitstream?.headers?.b?.includes('7a200t'))
    throw new Error('Expected the qualified Artix-7 product result');
  return {rows, qualifiedUtc: evidence.qualified_utc, bitstreamSha256: evidence.sha256};
}

export const FPGA_UTILIZATION_NARRATION = '前のスライドで説明したFPGA内部の部品を、実際に何個使ったかを示します。対象は、ブロック崩しの動画を取得した通常版の回路です。CPUだけでなく、描画、表示、メモリ制御などを合わせた全体の値です。搭載数はチップに用意されている数、使用数は今回の回路を実装するために使った数です。ルックアップテーブルは約50%、レジスタは約19%、ブロックメモリは約59%、演算専用回路は約8%を使用しました。これは配置配線後に設計ツールから得た値で、ゲーム実行中にCPUがどれだけ忙しいかを表す値ではありません。';

export const FPGA_UTILIZATION_DETAIL = `対象と根拠
実験E6で通常版を生成し直した際の配置配線後の記録を使う。確認日は2026年10月8日、設計ツールはVivado 2025.2、FPGAはNexys VideoのArtix-7 XC7A200T（xc7a200tsbg484-1）である。公開製品リビジョンは261832d48832dd6e26c4971ab8893ce61200688b、構成はfpganexysvideo_rasterixである。実験時のソースとこの公開コミットの対応はpublication/console-source.jsonに記録されている。スライド10の実機動画と同じ通常版を対象とし、計測カウンタを加えたFIFO比較用回路や内部作業領域を拡大した実験用回路の数値は混ぜない。

集計範囲
CPU、描画回路、表示回路、メモリ制御、バス接続など、FPGA内部に実装した回路全体の使用量である。描画機能の追加分だけを測った表ではなく、CPUと描画回路の個別の内訳もこの表からは分からない。主な役割の列は各資源の一般的な用途であり、今回の全使用箇所を列挙したものではない。主要な四種類を示しており、入出力、クロック、配線などすべての資源の使用量を載せた表ではない。

表の読み方
使用率は使用数を搭載数で割り100を掛け、小数第2位まで表示する。種類ごとに分母が異なるので、四つの使用率を足してFPGA全体の使用率にすることはできない。Slice LUTsには論理として使うものだけでなく、メモリやシフトレジスタとして使うものも含む。Slice RegistersはVivadoの集計名をそのまま使っており、D型フリップフロップのみの個数と断定しない。ルックアップテーブルとレジスタは汎用ロジックの資源、ブロックメモリとDSP48E1は専用回路の資源である。前の概念図の階層を変更する表ではない。

ブロックメモリの数え方
Block RAM Tileは36 Kibit相当を1個として換算した値である。18 Kibitのブロックは0.5個相当として数える。1 Kibitは1,024ビットであり、215という値は215バイトでも215画面でもない。幅や深さ、パリティ領域などの設定により、アプリケーションから使えるデータ容量と単純な公称容量は一致しない場合がある。FPGAチップの外のDDR3は、このブロックメモリと別の部品であり、その容量や使用量は表に含めない。

空き資源と動作速度
この使用率は回路の実装で使用する資源の割合であり、CPUの稼働率やゲームのフレーム時間の割合ではない。ゲームがボールを動かすたびに、LUTやブロックメモリの実装個数が増減するという意味でもない。未使用の個数が残っていても、新しい回路が必ず配置できることや、周波数を上げられることは保証しない。配置、配線、信号の遅延、他の資源の制約は別に確認する。ソフトウェアで機能を使わなくするだけでは、実装済みの回路資源が自動的に解放されるわけではない。

質問への答え方
「どのくらい余っていますか」には、今回示した四種類ではブロックメモリが最も高い使用率で約59%、LUTが約50%と答え、回路全体の利用率を一つの数値にまとめない。「描画回路だけで何%ですか」には、この表は全体の集計なので個別の内訳を示すものではないと答える。`;

export function drawFpgaUtilization(slide, api, data) {
  const {text, C} = api;
  text(slide, 'Nexys Video：Artix-7 XC7A200T', 64, 125, 1152, 44, 28, true, C.blue);
  text(slide, 'CPU・描画・表示・メモリ制御などを含む、回路全体の使用量', 64, 176, 1152, 35, 25);
  const values = [
    ['FPGA内部の資源', '主な役割', '使用数', '搭載数', '使用率'],
    ...data.rows.map(r => [r.label, r.role, r.used.toLocaleString('en-US'), r.available.toLocaleString('en-US'), r.percent + '%']),
  ];
  const table = slide.tables.add({rows: 5, columns: 5, left: 64, top: 229, width: 1152, height: 320,
    columnWidths: [320, 312, 160, 160, 200], values});
  table.styleOptions = {headerRow: false, bandedRows: false, firstColumn: false, lastColumn: false};
  table.borders.assign({fill: C.ink, width: 1, style: 'solid'});
  table.rows[0].height = 48;
  for (let r = 1; r < 5; r++) table.rows[r].height = 68;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = table.getCell(r, c);
      cell.fill = r === 0 ? C.heading : (r % 2 === 0 ? C.pale : C.white);
      cell.text.style = {typeface: c >= 2 && r > 0 ? 'Arial' : 'Yu Gothic',
        fontSize: r === 0 ? 24 : c >= 2 ? 29 : 23,
        color: r === 0 ? C.white : C.ink, bold: r === 0 || c >= 2,
        alignment: c >= 2 ? 'center' : 'left', verticalAlignment: 'middle', wrap: 'square'};
      cell.text.insets = {left: 14, right: 10, top: 5, bottom: 5};
    }
  }
  text(slide, '使用率は「使った個数の割合」。ゲーム実行中の忙しさとは別', 64, 570, 1152, 38, 25, true);
  text(slide, 'ブロックメモリは36 Kibit相当を1個として換算。外付けDDR3は集計外', 64, 623, 1152, 32, 22);
  text(slide, '表 15', 64, 684, 63, 30, 17, true, C.heading);
  text(slide, '実験E6：配置配線後の記録（2026-10-08、Vivado 2025.2）', 131, 684, 1028, 30, 16);
}
