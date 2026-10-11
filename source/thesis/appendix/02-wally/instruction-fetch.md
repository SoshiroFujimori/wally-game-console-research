## 第19章 IFUによる命令の取得

CPUは計算する前に、実行する命令をメモリから取得する必要がある。この章では「次はどの番地を読むか」と「その番地から正しい命令を得られたか」を分けて扱う。分岐予測、キャッシュ、番地変換は、その二つの仕事に関係する。

### 19.1 IFUの責務

Instruction Fetch Unitは、次に実行するPCを選び、その番地から命令bitを得て、decode 段へ渡す。単にメモリを一回読むだけではない。分岐予測、圧縮命令、命令キャッシュ、仮想番地変換、access権、bus待ち、例外、stallとflushを一つの流れへ統合する。[Harris26][RISCVUnpriv26][RISCVPriv26]

固定版の入口は`src/ifu/ifu.sv`である。外側からは`StallF`、`FlushD`、privilegeとSATP、PMP設定を受け、EBUへ`IFUHADDR`、`IFUHTRANS`などを出す。decode側へは`InstrD`、`InstrValidD`、PC関連値、fault情報を渡す。

![図19.1 PC選択からdecode stageまでの命令取得経路](figs/deep-ifu-instruction.png)

### 19.2 PCはどこから選ばれるか

通常の次PCは、現在の命令長を足した値である。RISC-V C extensionがあると命令は16 bitまたは32 bitなので、常にPC+4ではない。分岐予測が有効なら予測先、execute 段で予測誤りが分かれば正しいbranch先、trapならtrap vector、returnならEPCを選ぶ。

PC selectionはpriorityが重要である。trapを処理すべき周期に予測器の値を選べば、architectural control flowを失う。ソースを読むときはMUXの入力名だけでなく、select条件の優先順位と、それぞれが確定するパイプライン 段を見る。

### 19.3 圧縮命令と境界をまたぐ命令

16 bit命令を許すと、32 bit命令がfetch wordの境界をまたぐ場合がある。`src/ifu/spill.sv`は、前回fetchした一部と次の一部を組み合わせる。`src/ifu/decompress.sv`は16 bit compressed instructionを、後段が扱う32 bit形式へ展開する。

ここで「メモリから32 bit読めば一命令」とは限らない。fetch単位、キャッシュ line、bus beat、ISA上の命令長は異なる。PCの下位bit、前半の保持、access faultがどの半分で起きたかを追う必要がある。

### 19.4 branch predictorの予測と学習

`src/ifu/bpred`には方向予測、Branch Target Buffer、Return Address Stack、命令class予測などがある。予測器はarchitectural stateではない。予測が外れても、誤った命令をretireさせず、正しいPCからやり直せばISA上の結果は同じである。

方向予測はbranchを取るか、BTBは予測先番地、RASは関数return先を予測する。executeまたはメモリ 段で実際の結果と比較し、`BPWrongE`などを作る。`hazard.sv`はその信号を使って後続命令をflushする。

性能評価では予測精度だけでなく、誤予測一回のpenalty、predictorのaccess timing、storage量を見る。精度が高くてもcritical pathを延ばしクロックを下げれば、全体性能が悪化し得る。

### 19.5 命令cacheとuncached access

命令キャッシュ hitなら、必要なwordを短い経路で返す。missならキャッシュ lineを外部メモリから補充し、その間`IFUStallF`でパイプラインを止める。PMAでcacheableではない領域なら、キャッシュを迂回してbus accessする。

キャッシュ lineは複数命令を含む。tagはどのメモリ blockか、indexはどのsetか、offsetはline内の位置かを示す。hit判定、valid bit、replacement、refillのFSMを分けて読む。キャッシュを大きくする変更はhit率だけでなくBRAM数、tag比較、配線、refill時間へ影響する。

### 19.6 instruction-side MMU

Linuxのuser プロセスが使うPCは仮想番地である。instruction TLBに変換があれば物理番地へ直す。TLB missならHardware Page Table Walkerがpage tableをメモリから読み、PTEを調べる。permissionやPTE不正ならinstruction page faultを発生させる。

仮想番地変換とPMP/PMAは目的が違う。page tableはOSが作る仮想から物理への対応とpermission、PMPはmachine modeが物理領域への権限を制限する仕組み、PMAはその物理領域がメモリかI/Oか、キャッシュ可能かなどの属性である。順序を混ぜず、最終的な物理番地とfault原因を追う。

### 19.7 stall中とflush時の命令

stallは段 レジスタを保持する。flushはその段の命令を無効にする。IFUがbus待ちでも、同じ周期に古い命令がtrapを起こす可能性がある。固定版の`hazard.sv`は、IFU stallをflush原因でgateする条件を持ち、trapやbranch correctionを優先できるようにする。

波形ではPCの数値だけを見ず、`InstrValidD`、`StallF/D`、`FlushD/E`、fault 信号を一緒に見る。同じPCが数周期続くことはstallなら正常であり、同じ命令が複数回retireすることとは異なる。

### 19.8 一命令をsourceで追う手順

1. 逆assemblyで対象命令のPCとbit列を得る。
2. IFUでPC selectionとcache/TLB pathを確認する。
3. `InstrD`と`InstrValidD`へ入る周期を波形で探す。
4. branchなら予測値と実際値、loadなら後続LSU pathへつなぐ。
5. RVVIまたはretirement logでarchitectural resultを確認する。

`InstrD`が見えたことは、その命令が実行完了した証拠ではない。flushされた可能性がある。最後にretireまたはarchitectural stateの更新へ到達したかを確認する。
