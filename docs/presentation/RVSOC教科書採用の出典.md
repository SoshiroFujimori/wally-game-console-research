# RVSOCの教科書採用例と出典

[回答用スライド16](https://github.com/SoshiroFujimori/wally-game-console-research/blob/55c3d006e68652b288fdc91a579cf6d6a1f3794d/docs/presentation/中間発表_主要事項.md#slide-16) / [プレゼンテーション](README.md)

確認日：2026年11月8日。対象書籍は *RISC-V System-on-Chip Design* である。
公式の授業資料に教科書として指定されている場合と、教員が授業で使用したと報告している場合を掲載した。
出版前の原稿版での使用を含む。以下は確認できた例であり、同一年度の全採用校を網羅した一覧ではない。

## 教科書の指定・使用が確認できた3校

| 教育機関 | 国 | 確認できた時期 | 授業と使用形態 | 根拠 |
| --- | --- | --- | --- | --- |
| Harvey Mudd College | 米国 | 2026年春 | E154: System-on-Chip Design。シラバスの教科書欄で指定 | [1] |
| Oklahoma State University | 米国 | 2023〜2024年 | SoC設計と計算機アーキテクチャの授業で原稿版を使用 | [2] |
| Technische Universität Darmstadt（ダルムシュタット工科大学） | ドイツ | 2026/27年冬 | Computer Architecture and Implementation。主教科書として指定 | [3] |

### [1] Harvey Mudd College

[公式授業ページ](https://pages.hmc.edu/harris/class/e154/)は2026年春の授業として公開され、本書への教科書リンクを置いている。
同ページから参照する[シラバス](https://docs.google.com/document/d/1p_QboZHkOTK_kwnrW-KQXBHMjPRjx9MbfUYCH90mu9c/edit)の **Textbook** 欄にも本書が記載されている。
2023〜2025年の原稿版の使用は、次の[2]でも報告されている。

### [2] Oklahoma State University、およびHarvey Mudd Collegeの過去の授業

Thompson, R., Harris, D. L., Stine, J., and Harris, S. L. (2025), *RISC-V System-on-Chip Design Textbook and Course*, ASEE Annual Conference & Exposition. DOI: [10.18260/1-2--57147](https://doi.org/10.18260/1-2--57147)。[論文掲載ページ](https://peer.asee.org/risc-v-system-on-chip-design-textbook-and-course) / [PDF](https://nemo.asee.org/public/conferences/365/papers/48675/download)。

第4節「Courses」（表紙を含むPDFの8ページ目）は、原稿版を使った授業として、Harvey Mudd Collegeの2023〜2025年とOklahoma State Universityの2023〜2024年の実施を報告する。10ページ目には、Oklahoma State Universityで2024年春に行われた基礎寄りの授業も記される。出版後の版を使用したという意味ではない。

### [3] ダルムシュタット工科大学

[Computer Architecture and Implementationの公式ページ](https://www.esa.informatik.tu-darmstadt.de/lehre/202627/cai)の「Lecture Study Materials」欄は、本書を **“this will be the main textbook”** と説明する。
2026/27年の授業ページで、初回講義は2026年10月14日とされる。表にはこの教科書指定を掲載し、授業がすべて終了したことや教育効果を確認したという意味にはしない。

## 3校の集計に含めていない情報

| 教育機関 | 確認できた情報 | 集計に含めない理由 |
| --- | --- | --- |
| Umm Al-Qura University | [CE6000 Computer Architectureの公式シラバス](https://drive.uqu.edu.sa/_/ccomp_cen/files/4e444a38-fbfc-41e0-b104-ed0fa6bc5b18.pdf)の6ページに、同じISBN（9780323994989）の本を参考書として掲載 | Supportive References欄であり、Essential References欄には別の本が指定されているため |
| Rice University | [科目一覧](https://ga.rice.edu/programs-study/departments-programs/engineering/electrical-computer-engineering/)に同名の授業（ELEC 420 / 505）がある | 授業名が同じだけでは、本書の教科書採用を確認できないため |
| University of Nevada, Las Vegas | [2]の著者所属や謝辞に学校名がある | それだけでは特定の授業での教科書使用を示さないため |

「集計に含めない」は「その学校では使っていない」という断定ではない。大学図書館の所蔵、書店の取扱い、Wallyを使用したという情報だけからも、教科書採用とは判断しない。

一覧は[構造化した出典データ](../../source/presentation/rvsoc-adoption/records.json)からスライドへ反映する。
