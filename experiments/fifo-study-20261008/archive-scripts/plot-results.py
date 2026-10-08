from pathlib import Path
import csv,json,statistics,hashlib,datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import numpy as np
r=Path('/path/to/research/experiments/fifo-study-20261008')
a=r/'analysis-v2'
rows=list(csv.DictReader((a/'runs.csv').open()))
assert len(rows)==90
f=Path('/mnt/c/Windows/Fonts/meiryo.ttc')
assert f.is_file()
font=FontProperties(fname=str(f))
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'path'})
variants=['mailbox','fifo16','fifo512'];labels=['1語ずつの接続','16語FIFO','512語FIFO'];colors=['#777777','#3c83b8','#0b476f']
styles=['full','grouped','retained'];names=['毎回全体を描画','描画の呼び出しを統合','変更した領域だけ描画']
fig,axs=plt.subplots(3,3,figsize=(12,10),sharey=True,layout='constrained')
for i,style in enumerate(styles):
 for j,state in enumerate([0,1800,3600]):
  ax=axs[i,j]
  for k,v in enumerate(variants):
   values=[float(x['completed_swaps_s']) for x in rows if x['variant']==v and x['style']==style and int(x['state'])==state]
   assert len(values)==3
   m=statistics.median(values)
   ax.bar(k,m,color=colors[k],width=.6)
   ax.errorbar(k,m,yerr=[[m-min(values)],[max(values)-m]],fmt='none',ecolor='black',capsize=3)
   ax.text(k,m+2,f'{m:.2f}',ha='center',fontsize=9)
  ax.set_ylim(0,65);ax.set_xticks(range(3),labels,fontproperties=font,fontsize=8)
  ax.set_title(f'{names[i]} / 開始状態 {state}',fontproperties=font,fontsize=11)
  ax.yaxis.grid(True,alpha=.2);ax.set_axisbelow(True)
  if j==0:ax.set_ylabel('画面切り替え完了回数 / 秒',fontproperties=font)
fig.suptitle('接続方式を変えたブロック崩しの比較',fontproperties=font,fontsize=17)
fig.supxlabel('棒：3回の中央値　線：最小値〜最大値。録画から数えたFPSではありません。',fontproperties=font,fontsize=11)
for ext in ['png','svg','pdf']:fig.savefig(a/f'game-comparison.{ext}',dpi=170)
plt.close(fig)
fig,axs=plt.subplots(1,2,figsize=(11,4.5),layout='constrained')
for j,(style,title) in enumerate([('full','毎回全体を描画'),('retained','変更した領域だけ描画')]):
 ax=axs[j]
 for k,v in enumerate(variants):
  selected=[x for x in rows if x['variant']==v and x['style']==style and int(x['state'])==0]
  total=statistics.median(float(x['transfer_ms']) for x in selected)
  waiting=statistics.median(float(x['apb_wait_ms_frame']) for x in selected)
  ax.bar(k,total,color=colors[k],width=.6,label='送信処理の全時間' if k==0 else None)
  ax.bar(k,waiting,color='#efab43',width=.6,label='そのうちAPBの待ち' if k==0 else None)
  ax.text(k,total+.18,f'{total:.2f} ms',ha='center',fontsize=10)
  ax.text(k,waiting+.12,f'待ち {waiting:.2f}',ha='center',fontproperties=font,fontsize=9)
 ax.set_xticks(range(3),labels,fontproperties=font)
 ax.set_ylim(0,14 if j==0 else 4.5)
 ax.set_title(title,fontproperties=font,fontsize=12)
 ax.set_ylabel('1フレーム当たりの時間 [ms]',fontproperties=font)
 ax.yaxis.grid(True,alpha=.2);ax.set_axisbelow(True)
 ax.legend(prop=font,loc='upper right',fontsize=8)
fig.suptitle('FIFOでCPUの送信待ちが短くなった',fontproperties=font,fontsize=17)
fig.supxlabel('開始状態0、各方式3回の中央値。橙色の待ち時間は送信処理の内数です。',fontproperties=font,fontsize=11)
for ext in ['png','svg','pdf']:fig.savefig(a/f'transfer-wait.{ext}',dpi=170)
plt.close(fig)
period=801*526/25_200_000
info={'generated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runs':len(rows),'measured_frames':sum(int(x['frames']) for x in rows),'game_runs':sum(x['style']!='replay' for x in rows),'replay_runs':sum(x['style']=='replay' for x in rows),'exact_pixel_checked_cases':sum(x['pixel_check']=='True' for x in rows),'refresh_period_ms_from_rtl':period*1000,'refresh_hz_from_rtl':1/period,'refresh_parameters':{'horizontal_counter_states':801,'vertical_counter_states':526,'pixel_clock_hz':25200000},'plots':'Median with min/max of three repetitions; not confidence intervals','clock':'CLOCK_MONOTONIC_RAW on the board; hardware waiting counters at 20 MHz'}
(a/'validation-summary.json').write_text(json.dumps(info,indent=2)+'\n')
print(json.dumps(info))
