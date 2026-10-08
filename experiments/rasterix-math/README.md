# 数式、RTL、コマンド生成の保存済み検証

技術付録で `qa/rasterix-*` または `qa/rasterix_*` と呼んでいた資料をここへ保存しました。
対象の固定版は、各JSONと付録の記載に従ってください。
旧試験はRasterIX `9fdcf97a31b2e4247594e06d605871980cd5e9e1` を対象とし、
E6の更新後の命令解析回路の試験とは区別します。

## 製品と別の場所に取得する

```bash
export RESEARCH_ROOT="$PWD"
mkdir -p build
git clone https://github.com/ToNi3141/RasterIX.git build/rasterix-pinned
git -C build/rasterix-pinned checkout 9fdcf97a31b2e4247594e06d605871980cd5e9e1
git -C build/rasterix-pinned submodule update --init --recursive
```

公開用の個人情報除去は測定結果の再実験を意味しません。下のコマンドは保存済み
ソースとビルド設定から組み直した再実行手順です。使用コンパイラやツールの版が
変われば、その条件も新しい結果とともに記録してください。

```bash
cmake -S build/rasterix-pinned -B build/rasterix-software \
  -DRIX_BUILD_TESTS_SOFTWARE=ON -DRIX_BUILD_TESTS_VERILATOR=OFF
cmake --build build/rasterix-software -j2
ctest --test-dir build/rasterix-software --output-on-failure

cmake -S build/rasterix-pinned -B build/rasterix-verilator \
  -DRIX_BUILD_TESTS_SOFTWARE=OFF -DRIX_BUILD_TESTS_VERILATOR=ON
cmake --build build/rasterix-verilator -j2
ctest --test-dir build/rasterix-verilator --output-on-failure

bash experiments/rasterix-math/build_descriptor_audit.sh \
  "$RESEARCH_ROOT/build/rasterix-pinned" "$RESEARCH_ROOT/build/rasterix-descriptor"
```

独立した数式検査のコードは `rasterix_math_audit.py`、Z3を用いる検査は
`rasterix_formal_audit.py` です。後者には `z3-solver` が必要です。
これらは同じフォルダーに結果を書き出すため、保存済みJSONを残すには
別の作業フォルダーへコピーして実行してください。
有限の数値テストや限定した数式の証明を、RasterIX全体の正しさの証明とは扱いません。

