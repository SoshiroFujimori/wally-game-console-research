<!-- appendix-content:start -->
<a id="part_iii"></a>
# 第III部 Linuxとシステムソフトウェア
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

<!-- appendix-content:start -->
開発用PCで作ったプログラムが、SDカードから起動したLinux上で動き、回路を操作するまでを扱う。コンパイラ、起動処理、番地の変換、MMIO、ゲームの処理をつなぐ。
<!-- appendix-content:end -->

## この分野の章

- [第25章 Linuxの起動から描画回路への書込みまで](linux.md)
- [第26章 開発用PCとFPGA上の実行環境](host-and-target.md)
- [第27章 クロスコンパイルと実行ファイルと呼出し規約](compiler-elf-abi.md)
- [第28章 SDカードからLinuxが起動するまで](boot-chain.md)
- [第29章 Linuxのプロセスと仮想メモリとシステムコール](processes-virtual-memory.md)
- [第30章 デバイスツリーで回路の情報をLinuxへ伝える](device-tree.md)
- [第31章 MMIOの番地対応とアクセス順序](mmio-ordering.md)
- [第32章 RasterIXの描画ソフトウェアの処理経路](graphics-software-stack.md)
- [第33章 ゲームの繰返し処理と入力と時間と描画](game-loop.md)
- [第34章 入力機器を追加するときに設計する境界](peripherals.md)
- [第35章 ソフトウェアとハードウェアの不具合を切り分ける](system-diagnosis.md)
- [第36章 ソフトウェアと回路の仕事を対応付けて測る](hardware-software-measurement.md)
