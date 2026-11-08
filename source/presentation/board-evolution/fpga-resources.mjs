// FPGA hierarchy follows Chu's generic logic-cell and macro-cell distinction.
// The editable cell is a functional schematic, not an Artix-7 slice floorplan.
// RVSOC-inspired groups are blue; individual resource symbols remain white.
export const FPGA_RESOURCE_SOURCES = [
  'Harris et al., RISC-V System-on-Chip Design, Figures 7.11 and 23.2: blue grouping regions, white circuit symbols and black outlines adapted for this slide. The resource hierarchy follows Chu (2018), not these RVSOC figures. https://pages.hmc.edu/harris/ddca/rvsocd.html',
  'Pong P. Chu (2018), FPGA Prototyping by SystemVerilog Examples: Xilinx MicroBlaze MCS SoC Edition, John Wiley & Sons, Chapter 2, Sections 2.1.1-2.1.2, Figure 2.1, pp.19-21. ISBN 9781119282662. Author companion: https://academic.csuohio.edu/chu-pong/sv-mcs-book/',
  'AMD, UG474, CLB Overview and Look-Up Table: https://docs.amd.com/r/en-US/ug474_7Series_CLB/CLB-Overview',
  'AMD, UG473, 7 Series FPGAs Memory Resources User Guide, Block RAM: https://docs.amd.com/api/khub/documents/9gZGbqBxtlKXxBfkBt~lAg/content',
  'AMD, UG479, 7 Series DSP48E1 Slice User Guide: https://docs.amd.com/api/khub/documents/gu4oRPFEh_Pm2uaAlfY6Kg/content',
  'AMD, UG472, 7 Series FPGAs Clocking Resources User Guide: https://docs.amd.com/api/khub/documents/1kFbRqzm2fhwGy~cLQG2yA/content',
  'Digilent, Nexys Video Reference Manual (2020), pp.3 and 9: https://digilent.com/reference/_media/reference/programmable-logic/nexys-video/nexys-video_rm.pdf',
].join('\n');

export const FPGA_RESOURCE_NARRATION = 'FPGAの中には、小さな論理回路を作るロジックセルが多数あります。一つを拡大したものが左の図です。ルックアップテーブルは、入力に対応する0または1を出して、ANDなどの論理を実現します。その出力は、そのまま使うことも、D型フリップフロップで保存してから使うこともできます。保存する場合は、クロックの立上りで入力を取り込み、次の立上りまで保持します。どちらの経路を使うかも設定できます。右は、ロジックセルとは別に用意された専用回路です。FPro本ではマクロセルと呼び、ブロックランダムアクセスメモリや乗算回路、クロック管理回路などを挙げています。ブロックメモリは、番地を指定してまとまったデータを読み書きするための専用回路です。多数のセルや専用回路を、接続先を設定できる配線でつなぎ、CPUや描画回路を実現します。';

export const FPGA_RESOURCE_DETAIL = `本の分類と図の読み方
FPro本とは、Pong P. Chu著『FPGA Prototyping by SystemVerilog Examples: Xilinx MicroBlaze MCS SoC Edition』（2018年）を指す。第2章2.1.1節と図2.1は、汎用ロジックセルと、それらをつなぐプログラマブル相互接続をFPGAの基本構造として説明する。同節のMacro cellと2.1.2節は、メモリ、乗算、クロック管理、入出力などの専用回路を説明する。この図でも、ロジックセルを囲う枠の中にルックアップテーブルとD型フリップフロップを置き、ブロックメモリは別のマクロセルとして示す。ルックアップテーブル、フリップフロップ、ブロックメモリを同じ階層の三つの部品として並べる図ではない。マクロセルの枠は分類を示し、その中身が実物で一か所に集まっているという意味ではない。

配色と文字
RVSOCの図7.11と図23.2を参考に、チップ全体を青、内部のまとまりを淡い青、個々の回路を白で示す。Look-up table、D-type flip-flop、Multiplexer、Block random access memoryは、図中に英語で太字表記し、それぞれ略称LUT、DFF、MUX、BRAMを括弧で添える。同じ名前のカタカナ表記は重ねない。動作の補足は日本語で、通常の太さで示す。この色は種類や包含関係を読み取りやすくするためのものであり、使用量や動作中の信号値を表さない。FPGAの構成要素の分類はFPro本に従い、配色と線の表現をRVSOCに寄せている。

図の左側に描くロジックセルは、多数あるセルの一例である。FPro図2.1に沿って、出力をそのまま使う経路と、フリップフロップを経由する経路を描く。本書の一般的なセルの図は5入力であるが、この図では入力の配線を2本で代表している。実際の入力数を2に限定する意味ではない。Artix-7の具体的な構造や個数をそのまま描いたものではない。外側の枠はFPGAチップの境界を示し、配置、面積比、使用率は示していない。CPUや描画回路は、これらの多数の部品を組み合わせて実装する機能の名前である。CPUを一つのセルだけで作るわけではない。

ルックアップテーブル（Look-up table）
略称はLUTである。入力の組合せごとに出力する0または1を設定しておく回路と考える。例えば2入力のANDを作るなら、入力abが00、01、10のときの出力を0、11のときの出力を1と設定する。入力が11になれば、この表から1が選ばれて出る。表の内容を変えればORやXORなど別の論理を実現できる。一般にn入力なら入力の組合せは2のn乗通りあるので、その数の1ビットの値を用意する。FPGAを構成するときに用意するこの設定値と、CPUが実行中にメモリへ書くゲームのデータは区別する。

ルックアップテーブルの出力は組合せ論理であり、入力が変わると伝搬遅延の後に変わる。Artix-7では一つの6入力ルックアップテーブルで、最大6入力の任意の1ビット出力論理を実現できる。ALUの論理演算や制御の条件判定などに利用でき、複雑な機能は複数の部品を組み合わせる。加算には専用の桁上がり回路も利用する。一部のスライスではルックアップテーブルを分散メモリやシフトレジスタとして使えるため、「メモリはすべてブロックメモリで作る」という意味ではない。

D型フリップフロップ（D-type flip-flop）と二つの出力経路
略称はD FFやDFFである。Dは入力、Qは保存された値の出力を表す。図の三角印はクロックの立上りで値を取り込むことを表す。取り込んだ1ビットは、次の有効な立上りまで出力に保持される。図では、ルックアップテーブルからの線が二つに分かれる。上の経路は保存せずにそのまま選択回路へ入り、下の経路はフリップフロップで保存した値を選択回路へ渡す。選択回路はマルチプレクサとも呼ばれる。どちらを出力へ接続するかはセルの構成によって設定する。図の「設定」は構成による経路の選択を示し、CPUが毎回実行する処理を意味しない。

上の経路は入力に応じて値が変わる組合せ回路を作るのに使える。下の経路は値を保持するので、過去の状態を使う順序回路を作るのに使える。例えばPCやパイプライン段間で値を保持するときにフリップフロップを利用する。32ビットや64ビットの値なら、必要なビット数を保持できるだけの資源を使う。実物にはクロックイネーブルやリセットもあり、入力を安定させるセットアップ時間・ホールド時間の条件もあるが、この概念図では省略する。レジスタ群やFIFOの実装は合成条件や容量によって異なり、名前だけで全てフリップフロップだとは決められない。

マクロセルとブロックランダムアクセスメモリ（Block random access memory）
マクロセルは、特定の機能を担当するようにあらかじめ製造された専用回路であり、汎用ロジックセルを補う。マクロセルという名前は、このスライドではFPro本の用語に従う。ブロックランダムアクセスメモリは、その一種であり、略称BRAM、通常の呼び方はブロックRAMである。番地を指定し、その番地に対応する複数ビットのデータを読み書きするために使う。ルックアップテーブルやフリップフロップを多数使って記憶を作る以外に、まとまった記憶を実現する専用の実装先となる。

Artix-7を含む7シリーズでは、36 Kbitの同期メモリブロックを二つの18 Kbitとして使うなど、幅や深さを設定できる。読み書きはクロックに同期し、複数ブロックを組み合わせて容量や幅を増やす。キャッシュ、FIFO、描画途中の画素を保存する作業領域などに利用できる。今回の描画回路の内部作業領域と、外付けDDR3上の完成画像の保存先は別である。DDR3はFPGAチップの外、ボード上にある別のメモリチップであり、このブロックメモリとは接続方法や制御方法も異なる。実際に何個のメモリブロックを使うかは合成・配置配線のレポートで確認する。このスライドは使用量の測定結果ではない。

そのほかのマクロセルと配線
乗算・加算の専用回路は、汎用ロジックだけで演算回路を組む以外の実装先となる。Artix-7ではデジタル信号処理用のDSP48E1があり、25ビット×18ビットの乗算や48ビットの加算・累算などを行う。すべての加算・乗算が必ずこの専用回路を使うわけではない。クロック管理回路は、入力クロックから周波数や位相を調整したクロックを作る。入出力回路は、チップの端子を通じてボード上の機器と信号をやり取りする。図は主要な例を示し、アナログデジタル変換器など全種類を列挙するものではない。

プログラマブル相互接続は、接続先を設定できる配線とスイッチのことである。セルの内部設定と、セル同士・専用回路との接続を設定して、設計した回路を実現する。図の下の線はその接続をまとめた概念図であり、すべてを一本の共通バスにつなぐという意味ではない。また、この物理的な配線の仕組みと、CPUの通信規約としてのバスも異なる概念である。コードから新しい物理ゲートを製造するのではなく、チップに用意された部品の機能と配線の設定を変える。

Artix-7の実際のまとまり
Nexys VideoにはArtix-7 XC7A200Tが搭載されている。Artix-7の1スライスには、4個の6入力ルックアップテーブル、8個のフリップフロップ、選択回路、桁上がり用の論理がある。2スライスで1個の構成可能ロジックブロック（Configurable logic block、CLB）を構成する。FProはこのまとまりをロジックセル、スライス、CLBの順に説明する。図中の「ルックアップテーブル1個とフリップフロップ1個」は、二つの出力経路を理解するための一般的なセルの概念であり、Artix-7のスライスの全資源を示すものではない。ブロックメモリや乗算用の専用回路は、この汎用のロジックブロックとは別に用意される。`;

export function drawFpgaResources(s, api) {
  const {text, box, wire, route, polygon, C} = api;
  text(s, '小さな論理を作るセルと、メモリなどの専用回路を組み合わせる', 64, 119, 1152, 57, 27, true, C.blue);
  box(s, '', 64, 188, 1152, 441, C.chip, 25, C.ink, 2.2);
  text(s, 'FPGAチップ', 86, 196, 1050, 34, 25, true, C.ink);

  // Generic logic cell: the lookup output branches into two selectable paths.
  box(s, '', 86, 242, 700, 313, C.pale, 25, C.ink, 1.8);
  text(s, '汎用ロジックセルの例', 102, 249, 276, 36, 24, true);
  text(s, '（多数あるセルの一つ）', 382, 252, 377, 32, 21);
  box(s, 'Look-up\ntable (LUT)', 138, 356, 174, 92, C.white, 27);
  text(s, '入力', 102, 316, 70, 28, 20);
  wire(s, 104, 380, 138, 380, C.ink, true, 2.2);
  wire(s, 104, 424, 138, 424, C.ink, true, 2.2);
  text(s, '入力に応じた\n0 / 1を出す', 122, 484, 206, 57, 23, false, C.ink, 'center');
  wire(s, 312, 402, 340, 402, C.ink, false, 2.2);
  box(s, '', 337.5, 399.5, 5, 5, C.ink, 1, C.ink, 0);
  route(s, [[340,402],[340,370],[642,370]], C.ink, false, 2.2);
  text(s, 'そのまま出す', 390, 326, 212, 30, 22, false, C.ink, 'center');

  box(s, 'D-type\nflip-flop (DFF)', 386, 393, 198, 82, C.white, 25);
  route(s, [[340,402],[340,434],[386,434]], C.ink, true, 2.2);
  wire(s, 584, 434, 642, 434, C.ink, false, 2.2);
  polygon(s, [[475,475],[485,465],[495,475]], C.white, C.ink, 1.8);
  wire(s, 485, 503, 485, 475, C.ink, false, 1.8);
  text(s, 'Clock', 498, 479, 86, 27, 20);
  text(s, '立上りで1ビットを保存', 349, 516, 270, 30, 21, false, C.ink, 'center');

  polygon(s, [[642,344],[684,364],[684,440],[642,460]], C.white, C.ink, 2.2);
  wire(s, 684, 402, 752, 402, C.ink, true, 2.2);
  text(s, '出力', 701, 363, 65, 30, 20);
  wire(s, 663, 488, 663, 450, C.ink, false, 1.8);
  text(s, '設定で選択', 610, 491, 163, 30, 21, false, C.ink, 'center');
  text(s, 'Multiplexer (MUX)', 610, 522, 163, 26, 18, true, C.ink, 'center');

  // Macro cells supplement generic logic; block memory is outside the cell.
  box(s, '', 810, 242, 384, 313, C.pale, 25, C.ink, 1.8);
  text(s, 'マクロセル（専用回路）', 826, 249, 352, 36, 24, true);
  box(s, 'Block random\naccess memory (BRAM)', 830, 302, 344, 115, C.white, 27, C.ink, 1.8);
  text(s, '番地を指定してデータを読み書き', 826, 422, 352, 31, 21, false, C.ink, 'center');
  for (const [label, y] of [['乗算・加算回路',454], ['クロック管理回路',487], ['入出力回路',520]]) {
    box(s, '', 830, y, 344, 28, C.white, 21, C.ink, 1.8);
    text(s, label, 838, y, 328, 28, 21, true, C.ink, 'center');
  }

  // This line summarizes programmable routing, not a shared protocol bus.
  wire(s, 436, 555, 436, 577, C.ink, false, 2.2);
  wire(s, 1002, 555, 1002, 577, C.ink, false, 2.2);
  wire(s, 436, 577, 1002, 577, C.ink, false, 2.2);
  text(s, '設定できる配線で、多数のセルと専用回路をつなぐ', 102, 587, 1076, 32, 23, true, C.ink);
  text(s, 'Block RAMはロジックセルとは別の専用回路。外付けDDR3とも別', 64, 640, 1152, 34, 24, true);
}
