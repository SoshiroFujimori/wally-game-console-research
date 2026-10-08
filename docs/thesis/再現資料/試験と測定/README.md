# 試験と測定の読み方

## FPGAを使わない接続試験

Ubuntu上でVerilatorとC++コンパイラを用意し、このフォルダで実行します。

```bash
bash run-apb.sh "$WALLY" "$HOME/apb-reproduce-output"
```

第1引数は固定版のWally、第2引数は存在しない新規出力先です。APB_PASSが出れば、保存したテストベンチが確認するデータ位置、送受信待ち、識別値、完了回数の試験を通過したことになります。実機や映像出力は操作しません。

回路試験/tb_display.svは過去の表示切り替え試験です。実際のDVI信号生成部を代替した試験回路を含むため、この試験を電気的な映像規格の検査とは扱いません。ビルド対象には固定版RasterIX内の表示関連RTLも必要です。本パッケージの一コマンド試験はAPBを対象にしています。

## 保存済み27試行の再集計

Python 3の標準ライブラリのみを使います。このフォルダから次を実行します。

```bash
python3 summarize-controlled.py > controlled-summary.json
```

E4の保存計画と全27試行を読み、状態列、最終画素の検査記録、同じbitstreamと実行ファイルを使ったことを確認してから集計します。出力は表示切り替え完了数/秒、描画準備ms、命令byte数の三試行中央値です。新たに実機を動かす処理ではありません。

## 測定プログラムを作る

controlled-source/v009が保存した比較用ソースです。通常ゲームと異なり、1描画ごとに状態を1ステップ進めます。原本のCMakeLists.txtには過去の絶対パスがあるため、外部からWALLY_REPOを指定して上書きします。

```bash
cmake -S controlled-source/v009 -B measurement-build \
  -DWALLY_REPO="$WALLY" \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_SYSTEM_PROCESSOR=riscv64 \
  -DCMAKE_C_COMPILER=riscv64-buildroot-linux-gnu-gcc \
  -DCMAKE_CXX_COMPILER=riscv64-buildroot-linux-gnu-g++ \
  -DCMAKE_BUILD_TYPE=Release
cmake --build measurement-build --target breakout -j
```

これで現在の固定版に対してビルドした新しい実験用実行ファイルができます。元の記録のコンパイル条件・依存ソースはcompile_commands.json、link-command.json、各試行のsourceManifestを参照します。新しく生成したファイルが過去のバイナリと同一になるとは扱いません。

試行引数と順番は実験記録/E4/plans/controlled-finalhdmi.jsonを読みます。回路構成を標準DVIにした場合は、過去のHDMI結果へ追加せず、新しい実験として保存します。本文第12章・第14章・付録Cに、何をそろえ、何を確認し、どう時間を集計するかを説明しています。
