# 映像記録用のHDMI出力構成

このディレクトリは、ゲーム機の映像を取り込み機器で記録するための研究用構成を保存する。製品リポジトリの標準構成を変更するものではない。CPU、描画回路、ゲームの変更と混同しないため、表示回路の差分をここに分けた。

CPUとRasterIX、ゲームプログラムを維持し、DDR3の画像を読み出す表示回路と、その出力クロックを変更する。[公式hdl-util/hdmi](https://github.com/hdl-util/hdmi)を変更せずに使い、1280×720のHDMI映像を生成する。ゲームの画像は640×480のままで、縦横をそれぞれ1.5倍にして中央の960×720へ表示する。左右には160画素ずつ黒い余白が付く。

二つの行バッファでDDR3から読み出した画素を保持する。画像の切り替えは垂直帰線期間の始まりで行い、前の画像の読み出しが残っていないことを確認する。新しい画像の先頭行を読み終えた後に、描画側へ切り替え完了を返す。CPUが書いた描画命令を受ける接続や、公式RasterIX内部のRTLには手を加えない。

## 固定したソース

| 対象 | コミット |
|---|---|
| ゲーム機 | `261832d48832dd6e26c4971ab8893ce61200688b` |
| RasterIX | `9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0` |
| hdl-util/hdmi | `83b1c9543a91b776671a44e68e130f81cae437b7` |

[source-manifest.json](source-manifest.json)に、差分と変更後ファイルのハッシュを示す。[output.patch](output.patch)の対象は表示回路、二つのIP生成設定、制約、ソースの登録だけである。`prepare.py`は新しい作業ディレクトリに展開して適用する。入力として指定した製品とHDMIのチェックアウトは書き換えない。

## 再生成

LinuxまたはWSLで、上表の製品と公式HDMIを用意する。製品のサブモジュールも指定された版へそろえる。以下の`/path/to/...`は、利用者が実際の場所へ置き換える。

```sh
python3 experiments/basic-operation-20261108/hdmi/prepare.py \
  --product /path/to/wally-game-console \
  --hdmi-source /path/to/hdl-util-hdmi \
  --output "$PWD/build/hdmi-source"

source /path/to/Vivado/settings64.sh
source /path/to/wally-game-console/setup.sh
export WALLY=/path/to/wally-game-console-research/build/hdmi-source
make -C "$WALLY/fpga/generator" nexysvideo-rasterix
```

回路生成が完了した後、`qualify.tcl`へ生成したソースと新しい出力ディレクトリを渡す。配置・配線の完了、セットアップ時間とホールド時間、DRC、HDMI出力ピンへの接続を調べ、レポートを保存する。パルス幅、配線、未制約経路、クロック間の警告もレポートで確認する。ファイルが生成されたことだけで合格とはしない。

```sh
vivado -mode batch -source experiments/basic-operation-20261108/hdmi/qualify.tcl \
  -tclargs "$WALLY" /path/to/new-qualification-directory
```

このスクリプトはFPGAへ書き込まない。実機操作では対象ボードを明示し、確認した設定ファイルのハッシュを照合してから書き込む。

## シミュレーションの範囲

```sh
python3 experiments/basic-operation-20261108/hdmi/simulate.py \
  --source-tree "$WALLY" --output /path/to/new-simulation-directory
```

画素ごとに期待値を計算し、画像の位置、左右の余白、画像切り替えを調べる。メモリ応答を遅らせる条件、リセット、読み出しエラーを与える条件も含む。この試験はHDMIコアへ渡す画素までを対象とし、シリアル出力を省略する。実際のピン出力と受信は、配置・配線の検査と実機の録画で別に確かめる。

取得した映像と、採用した構成・条件は[実験記録](../README.md)を参照する。標準構成で受信できなかった試行と、HDMI構成の結果を混ぜずに記録する。
