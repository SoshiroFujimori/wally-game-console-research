import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadRvsocAdoption(root) {
  const data = JSON.parse(await fs.readFile(path.join(root, 'source/presentation/rvsoc-adoption/records.json'), 'utf8'));
  if (data.institutions.length !== 3 || new Set(data.institutions.map(r => r.id)).size !== 3)
    throw new Error('Expected three distinct documented adoption examples');
  for (const institution of data.institutions) {
    if (!institution.sources.length || institution.sources.some(id => !data.sources.find(s => s.id === id)))
      throw new Error(`Missing adoption source for ${institution.id}`);
  }
  return data;
}

export const RVSOC_ADOPTION_NARRATION = '公開資料で確認できた例は、米国のHarvey Mudd CollegeとOklahoma State University、ドイツのダルムシュタット工科大学の3校です。Harvey Muddの2026年春の授業では教科書に指定され、ダルムシュタット工科大学の授業では主教科書と明記されています。Oklahoma State Universityでは、出版前の原稿を使って授業を行ったことが教育実践論文に報告されています。この表は過去の使用も含む確認例であり、世界の全採用校の一覧ではありません。';

export const RVSOC_ADOPTION_DETAIL = `教科書の指定と授業での使用
RVSOCはHarrisらのRISC-V System-on-Chip Designを指す。確認日は2026年11月8日。表の時期は根拠となる授業の時期であり、全校を同じ年度の採用校として数えたものではない。

Harvey Mudd College
公式のE154授業ページは2026年春の授業として公開され、Textbookのリンクを置いている。そこから参照するシラバスのTextbook欄にも本書を指定している。2025年のASEE論文は、同校で2023〜2025年に原稿版を使用した授業も報告している。

Oklahoma State University
Thompsonら（2025）の第4節は、2023〜2024年の上級SoC設計の授業と、2024年春の計算機アーキテクチャの授業で、出版前の原稿を使ったと報告している。科目コードは同論文に示されていないため、表では授業の分野を記す。

ダルムシュタット工科大学
正式名称はTechnische Universität Darmstadt。2026/27年のComputer Architecture and Implementationの公式ページは、Lecture Study Materials欄で本書を主教科書に指定する。初回講義は2026年10月14日と記される。教科書の指定を確認したもので、受講者の学習成果を調査した結果ではない。

集計の範囲
授業での教科書指定、または教員による実際の授業使用の報告を根拠に数える。図書館の所蔵、書店の取扱い、著者の所属、Wallyを使うという情報だけでは含めない。Umm Al-Qura UniversityのCE6000では本書が参考書欄に載るが、主たる教科書は別の本であり、表の3校には含めない。参考書掲載例や除外理由の根拠はRVSOC教科書採用の出典.mdにまとめる。

質問への答え方
「1校だけですか」には「公開資料では少なくともこの3校の教科書指定・使用実績を確認しています。原稿版での過去の使用も含みます」と答える。この一覧だけから世界の採用率や、本研究の教育効果を示すことはできない。`;

export function drawRvsocAdoption(slide, api, data) {
  const {text, C} = api;
  text(slide, '米国・ドイツの3校で、教科書の指定・使用実績を確認', 64, 123, 1152, 44, 28, true, C.blue);
  text(slide, '対象：RISC-V System-on-Chip Design', 64, 176, 1152, 34, 24);
  const sources = new Map(data.sources.map(r => [r.id, r.number]));
  const values = [
    ['教育機関（国）', '確認できた時期', '授業と使用形態'],
    ...data.institutions.map(r => [
      `${r.name}\n（${r.country}）`,
      r.period,
      `${r.course}\n${r.role} [${sources.get(r.sources[0])}]`,
    ]),
  ];
  const table = slide.tables.add({rows: 4, columns: 3, left: 64, top: 229,
    width: 1152, height: 330, columnWidths: [374, 204, 574], values});
  table.styleOptions = {headerRow: false, bandedRows: false, firstColumn: false, lastColumn: false};
  table.borders.assign({fill: C.ink, width: 1, style: 'solid'});
  table.rows[0].height = 48;
  for (let r = 1; r < 4; r++) table.rows[r].height = 94;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = table.getCell(r, c);
      cell.fill = r === 0 ? C.heading : r % 2 === 0 ? C.pale : C.white;
      cell.text.style = {typeface: 'Yu Gothic', fontSize: r === 0 ? 24 : c === 2 ? 23 : 24,
        bold: r === 0 || c === 0, color: r === 0 ? C.white : C.ink,
        alignment: c === 1 ? 'center' : 'left', verticalAlignment: 'middle', wrap: 'square'};
      cell.text.insets = {left: 14, right: 12, top: 7, bottom: 7};
    }
  }
  text(slide, '出版前の原稿を使った過去の授業も含む', 64, 578, 1152, 37, 25, true);
  text(slide, '公開資料で確認できた例。世界の全採用校を網羅した一覧ではない', 64, 628, 1152, 32, 22);
  text(slide, '表 16', 64, 684, 63, 30, 17, true, C.heading);
  text(slide, '[1] HMC授業資料　[2] ASEE 2025 §4　[3] TU Darmstadt授業資料（確認：2026-11-08）', 131, 684, 1028, 30, 16);
}
