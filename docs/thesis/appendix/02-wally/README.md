<!-- appendix-content:start -->
<a id="part_ii"></a>
# 第II部 Wally CPUとSoCアーキテクチャ
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

<!-- appendix-content:start -->
プログラムの一つの命令を出発点に、Wally内部の計算、メモリへのアクセス、周辺回路への通信を追う。設定値や回路を変更したとき、どの処理へ影響するかを調べる。
<!-- appendix-content:end -->

## この分野の章

- [第13章 Wallyが一つのプログラムを実行する過程](cpu.md)
- [第14章 Wallyの階層と構成を読む](wally-hierarchy.md)
- [第15章 命令の流れとプログラムから見えるCPUの状態](instruction-state.md)
- [第16章 番地とメモリとバスを混同せずに追う](memory-bus.md)
- [第17章 メモリシステムとチップ内バス](memory-system.md)
- [第18章 Wallyの構成値が回路になるまで](configuration.md)
- [第19章 IFUによる命令の取得](instruction-fetch.md)
- [第20章 IEUの命令実行と依存関係による停止](execution-hazards.md)
- [第21章 LSUの読書きとキャッシュと番地変換](load-store-cache.md)
- [第22章 権限の切替えと例外と割込み](privilege-traps.md)
- [第23章 CPUから周辺回路までの接続](uncore-peripherals.md)
- [第24章 Wallyを変更する実践課題](wally-design-exercises.md)
