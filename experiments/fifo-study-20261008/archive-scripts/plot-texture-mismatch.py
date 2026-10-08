from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
r=Path('/path/to/research/experiments/fifo-study-20261008');out=r/'analysis-v2'
f=FontProperties(fname='/mnt/c/Windows/Fonts/meiryo.ttc')
a=np.fromfile(r/'board-v2/mailbox/texture-probe-v3/only64-64.rgb565',dtype='<u2').reshape(480,640)[208:272,288:352]
colors=np.array([0xf800,0x07e0,0x001f,0xffe0,0xf81f,0x07ff,0xffff,0],dtype=np.uint16)
y,x=np.indices((64,64));e=colors[(x//8+3*(y//8))%8]
def rgb(v):return np.stack(((v>>11)*255/31,((v>>5)&63)*255/63,(v&31)*255/31),axis=-1).astype('uint8')
fig,axs=plt.subplots(1,3,figsize=(10,4.7))
fig.subplots_adjust(left=.07,right=.99,bottom=.22,top=.82,wspace=.28)
for ax,v,t in zip(axs,[rgb(e),rgb(a),np.where((a!=e)[...,None],np.array([220,60,50]),np.array([245,245,245]))],['期待した模様','実機の読み戻し','不一致の画素（赤）']):
 ax.imshow(v,interpolation='nearest',extent=(0,64,64,0));ax.set_title(t,fontproperties=f)
 ax.set_xticks([0,16,32,48,64]);ax.set_yticks([0,16,32,48,64]);ax.set_xlabel('横の位置 [画素]',fontproperties=f)
axs[0].set_ylabel('縦の位置 [画素]',fontproperties=f)
fig.suptitle('64×64テクスチャの切り分け：1語ずつの接続',fontproperties=f,fontsize=14)
fig.supxlabel('上半分は一致し、下半分の2,048画素が不一致。画面から該当領域を切り出した。',fontproperties=f,fontsize=10)
for ext in ['png','svg','pdf']:fig.savefig(out/f'texture-mismatch.{ext}',dpi=170)
assert (a!=e).sum()==2048
print('TEXTURE_PLOT_CHECK mismatches=2048')
