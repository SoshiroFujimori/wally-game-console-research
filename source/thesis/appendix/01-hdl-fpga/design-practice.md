## 第11章 Wally開発者の設計・実装規律

接続先の回路を別の人が作っても組み合わせられるようにするには、入力の意味と、値を受け取ったと数える条件を明記する必要がある。ここでいう設計の規律は、書式だけの話ではない。仕様、コード、試験、変更履歴のどこを読んでも同じ動作を説明できる状態を作る。

### 11.1 先にinterface契約を書く

モジュールを実装する前に、port表、clock/reset、transaction成立条件、遅延、backpressure、error、リセット中の出力を決める。契約が曖昧なまま両側を同時に書くと、片側がvalidをpulseと考え、片側がlevel保持と考えるような不一致が起きる。

既存interfaceへ接続する場合は、独自に意味を作らず、仕様と既存ソースを読む。信号名が似ていても、AHBの`HREADY`とAXI4-Streamの`TREADY`はprotocol上の役割が異なる。

### 11.2 小さい変更単位を作る

board対応、peripheral接続、ソフトウェア driver、performance最適化を一つの巨大diffへ混ぜない。各段階でbuild・test可能な境界を作る。後で`git bisect`でき、reviewerが変更理由を一つずつ確認できる。

一時的な測定codeやSDWire3操作scriptは研究資料側へ置き、公開repositoryの製品ソースと分ける。repositoryへ残すものは、利用者がbuild・利用するために必要な変更へ絞る。

### 11.3 Wallyのcoding styleを使う

RVSOCが説明するWally styleでは、明確な同期式設計、`always_ff`と`always_comb`、パラメータ化、短く責務の明確なモジュール、揃えたport宣言、名前による段表示などを重視する。[Harris26]

styleは外見だけではない。latch、multiple クロック、暗黙幅変換、巨大モジュールを減らし、reviewしやすいハードウェアを作る。既存ファイルへ変更するときは、その周囲のindent、命名、comment、license headerへ合わせる。

### 11.4 commentには理由と契約を書く

codeを英語へ読み替えるだけのcommentより、なぜその遅延、priority、exceptionが必要かを書く。例えば「レジスタを追加」の代わりに「DDR responseを一周期遅らせ、AHB data phaseのselectとそろえる」と書く。

一方、事実と違う古いcommentは危険である。RTL変更時にcomment、diagram、test、パラメータ説明を同じcommitで更新する。

### 11.5 parameter化し過ぎない

複数構成で実際に使う幅や機能はパラメータ化に向く。将来使うか不明な全信号をパラメータ化すると、組合せ爆発と未試験構成が増える。合法値、依存条件、default、test matrixを定める。

`P`のfield追加では、型定義、パラメータ生成、全構成の値、利用モジュール、無効構成の代替接続を更新する。default 0でcompileが通るだけでは、全派生構成の意図を保証しない。

### 11.6 warningを設計情報として扱う

unused 信号、truncation、latch、undriven、CDC warningはbugの手掛かりである。既知で安全なwarningは局所的に抑制し、理由を残す。directory全体のwarningを無効化すると、新しいbugを隠す。

tool更新でwarning種類が変わるため、baselineとの差分を見る。warning数ゼロだけでなく、抑制一覧もreviewする。

### 11.7 generated fileとsource of truth

Vivado IPの`.xci`、生成Tcl、出力RTL、bitstreamのどれをソース of truthとするか決める。人が編集するTclから再生成する設計で、生成済みファイルだけを手修正すると次回buildで消える。

本構成ではboard用MIG/MMCM/FIFOの生成条件をTclに置き、`wally.tcl`がIPをimportする。tool版差で生成物が変わり得るため、再生成環境を記録する。

### 11.8 変更前に影響範囲を描く

![図11.1 一つの構成値を変えたときに追う影響](figs/wdev-change-impact.png)

CPU クロックを変える例では、MMCM、timing constraint、UART divisor、SD クロック、AHB/AXI converter、device tree、performance測定が関係する。番地を変える例ではdecoder、PMA、device tree、driver、testが関係する。値の検索結果を並べるだけでなく、各表現がハードウェアを作るのか、ソフトウェアへ知らせるのかを分類する。

### 11.9 optimizationは測定可能な仮説にする

「MUXが遅そう」ではなく、「Execute 段のworst pathでoperand MUXがlogic delayの何%を占める。選択段数を一段減らせばWNSが改善する」という仮説にする。変更後に同じpath groupと機能testで比較する。

期待どおり改善しなかった結果も保存する。placement変動か、別pathがcriticalになったか、logic削減がrouting増加へ変わったかを調べる。

### 11.10 review可能なcommit

一commitには一つの目的を持たせ、messageは命令形の短い要約とする。生成物、測定資料、機能変更を区別する。公開前に`git diff --check`、対象test、build、report差分、license、submodule ポインタを確認する。

AIが作ったcodeでも責任は同じである。設計者本人がinterface、state、timing、testを説明でき、reviewで指摘された場合に修正できる状態へする。

### 11.11 upstreamへ出せる変更の条件

upstreamの一般利用者に必要で、既存boardや構成を壊さず、repositoryのstyleに合い、再現可能なtestがあり、外部機器固有の一時scriptを含まないことが基本である。研究環境だけの測定codeは別資料に置く。

公式RasterIXをsubmoduleで使う場合、局所forkの変更を隠して「公式」と呼ばない。必要な修正があれば、upstream版、patch理由、互換性、testを明示する。

### 11.12 開発者が残す設計記録

設計判断記録には、問題、制約、候補、採用案、棄却理由、根拠ソース、test、残るriskを書く。結果だけでなく理由を残すと、後から別のクロックやboardへ移す際に再評価できる。
