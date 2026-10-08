from pathlib import Path
import hashlib,json,datetime,subprocess,re
r=Path('/path/to/research/experiments/fifo-study-20261008')
d=json.loads((r/'latest-source.json').read_text())
v2=dict(d);v2['created_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();v2['note']='After software texture-page alignment; original hardware source manifest remains preserved. Implementation recipes and experiment variants are recorded separately.'
v2['files']={k:hashlib.sha256((r/'latest'/k).read_bytes()).hexdigest() for k in d['files']}
changes=[k for k in d['files'] if d['files'][k]!=v2['files'][k]]
assert changes==['examples/rasterix/CMakeLists.txt'],changes
(r/'latest-source-v2.json').write_text(json.dumps(v2,indent=2)+'\n')
(r/'protocol-amendments.json').write_text(json.dumps({'utc':v2['created_utc'],'source_changes':changes,'updates':[{'change':'Texture page size 2048 in software; regenerate same measurement ELF for all variants','reason':'Hardware/software mismatch caused 519 pixel errors; v1 performance records excluded.','evidence':'board/fifo16-diagnostics and board-v2/fifo16/smoke.json'},{'change':'Track large-texture regression separately from game comparison','reason':'The game passes whole-frame correctness; the upstream parser has a separate source-gap-sensitive failure. No failing-image game case is included.','evidence':'upstream-reproducer/result.json'},{'change':'Do not interpret late_60hz as missed refresh count','reason':'Upstream display counters run 801*526 pixel clocks, 59.811Hz at 25.2MHz.','evidence':'analysis-v2/validation-summary.json'},{'change':'Use a separate placement recipe per variant until original timing constraints pass','reason':'Default placement is congested for updated sources. Clocks and RTL functions are not relaxed to accept a failing build.','evidence':'variants/*/qualification* reports'}]},indent=2)+'\n')
workspace=Path('/path/to/research/archive/experiment-fifo-20261008')
p=workspace/'結果と判断.md';s=p.read_text();marker='## 5. 回路の費用'
s=s.replace(marker,'''### 補助確認

512語FIFO版では、製品ゲームを自動入力で300.011秒連続実行し、17,841回の画面更新処理を完了した。その後の起動し直しでも、初期状態の画面は全307,200画素が一致した。これは映像を録画して確認した結果ではない。

主比較は詳細な時間計測を有効にしている。時計を読む処理の負担を確かめるため、途中の計測を減らし、フレーム全体だけを測る設定でも補助試験を行った。初期状態の全体描画は14.688回／秒、変更領域の描画は58.202回／秒で、どちらも全画素が一致した。主比較の中央値14.628、58.202回／秒と大きく食い違わなかった。ただし、この補助試験は各1回なので、計測の影響を厳密に推定したとは扱わない。

'''+marker)
p.write_text(s)
print(json.dumps({'changed_sources':changes,'manifest':'latest-source-v2.json'}))
