# 実行して確かめる説明用モデル

[技術詳説へ戻る](../../docs/technical/README.md)

説明に使った数値と、値を受け渡す規則を、短いPythonプログラムで確かめる。Python 3.9以降の標準機能だけを使う。ハードウェアやSDカードを操作せず、測定値やソースを書き換えない。

研究リポジトリのルートから実行する。

```sh
python3 examples/technical-models/explain.py all
```

個別に実行する場合は`all`を次の名前に変える。

| 名前 | 出力で見るところ | 対応する詳説 |
|---|---|---|
| `timing` | 20 MHzは50 ns、360,000周期は18 ms、180フレームで割ると0.1 ms/frame | [時間条件](../../docs/technical/timing-fpga.md) |
| `handshake` | 停止中に出力の語が変わらず、A、B、C、Dが一回ずつ渡る。最後の印はDだけ | [APBとFIFO](../../docs/technical/cdc-protocols.md) |
| `pixels` | 四角形に含まれる12画素、三角形の辺の値、補間の重み | [画素を作る](../../docs/technical/rasterization.md) |
| `memory` | 色とビット列、画像内の番地、キャッシュの衝突、五本の帯 | [メモリ](../../docs/technical/memory-bus.md)、[画像](../../docs/technical/framebuffer-display.md) |
| `measurement` | 中央値、APB待ちの減少率、一部だけ高速化したときの全体の上限 | [計測](../../docs/technical/measurement.md) |

## 待機の表の読み方

`handshake`の一行は、一つのクロックの立ち上がりを表す。`in_accept=1`ならその語を保存し、`out_accept=1`なら出口の語を受け渡す。`stored_after`は、その立ち上がりの後に残っている語を、先に出る順で示す。

`out_data`にAが複数行続いても、それだけではAが何度も渡ったことにはならない。`out_ready=0`の間は値を提示したまま待っている。`out_accept`が1になった行だけを受理として数える。これが「値が線に出ている」と「値が相手へ渡った」の違いである。

このモデルは2語の保存場所を持つ。満杯の行で同時に一語を取り出しても、同じ行では新しい語を受けない、保守的なreadyの計算を使う。FPGAの既存FIFO IPの全設定で、この遅延になると主張するものではない。

## このモデルで分かる範囲

計算例が本文と一致すること、モデルの仮定の下で順序・回数・保持の規則が守られることを確認できる。モデルには、メタステーブル、配線遅延、CPU命令の実行時間、APBの準備段階、公式FIFO IPの内部実装は入っていない。

従って、成功表示はFPGAの動作保証でも、新しい性能測定でもない。実物の比較結果を確かめる場合は、[保存済みE6データの再計算](../../docs/thesis/再現資料/実験記録/E6/recalculate_wait.py)と[実験条件](../../docs/thesis/再現資料/実験記録/E6/report/実験の目的と方法.md)を使う。
