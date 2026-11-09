// Functional connection of the two CPU memory interfaces. Arbitration,
// selection, and the returned value are separate from the protocol timing.
export function drawMemoryPorts(s,a,{focus='all'}={}){
  const {text,box,polygon,route,wire,junction,C}=a;
  const gray='#9AA4B4',ink=C.ink,blue=C.blue;
  const T=(v,x,y,w,h=28,z=20,b=false,c=ink,align='left')=>text(s,v,x,y,w,h,z,b,c,align);
  const dataOnly=focus==='copy'||focus==='command';
  const ic=dataOnly?gray:blue,dc=blue,rd=focus==='command'?gray:blue;
  box(s,'',64,192,1152,432,C.chip,20,ink,2.1);
  T('FPGAチップ内の接続',80,195,280,28,21,true);
  T('AD：アドレス　WD：書込みデータ　WE：書込みイネーブル　RD：読出しデータ',64,125,1152,36,23,true,blue);

  for(const [y,label,tag,c] of [[245,'命令メモリ','I',ic],[432,'データメモリ','D',dc]]){
    box(s,'',82,y,220,130,C.white,20,ink,2.2);
    T(label,92,y+12,156,30,24,true);
    T('接続口 '+tag,92,y+49,147,30,24,true,c);
    T(tag==='I'?'読出し専用・WE=0':'読出し・書込み',92,y+89,154,26,16,false,c);
    for(const [n,dy]of [['AD',15],['WD',43],['WE',71],['RD',102]])
      T(n,256,y+dy-12,40,24,18,true,tag==='I'&&n==='WD'?gray:c,'center');
  }
  T('要求を一方ずつ選ぶ',359,194,249,29,21,true);

  const mux=(cy,name,c)=>{
    polygon(s,[[438,cy-35],[494,cy-20],[494,cy+20],[438,cy+35]],C.white,ink,2.1);
    T('I',445,cy-30,25,22,15,true,ic,'center');
    T('D',445,cy+9,25,22,15,true,dc,'center');
    T(name,498,cy-30,50,25,18,true,c);
  };
  mux(270,'AD',blue);mux(407,'WD',blue);mux(540,'WE',blue);
  const R=(p,c=blue,ar=true,w=3)=>route(s,p,c,ar,w);
  R([[302,260],[338,260],[338,250],[438,250]],ic);
  R([[302,447],[326,447],[326,310],[414,310],[414,290],[438,290]],dc);
  R([[302,288],[350,288],[350,387],[438,387]],gray);
  R([[302,475],[374,475],[374,427],[438,427]],dc);
  R([[302,316],[398,316],[398,520],[438,520]],ic,true,1.4);
  R([[302,503],[420,503],[420,560],[438,560]],dc,true,1.4);
  // Named control ports denote the same request-selection signal.
  // Keep them separate from the selected read-data return below.
  for(const cy of [270,407,540]){
    R([[465,cy+50],[465,cy+29]],ink,true,1.2);
    T('I/D',440,cy+50,50,25,17,true,ink,'center');
  }

  const defs=[
    {x:662,label:'SD制御',key:'sd',select:'S0'},
    {x:850,label:'DDR制御\nAMD製IP',key:'ddr',select:'S1'},
    {x:1038,label:'描画命令の\n接続回路',key:'gpu',select:'S2'}];
  const on=d=>focus==='all'||(focus==='copy'&&d.key!=='gpu')||(focus==='command'&&d.key==='gpu');
  box(s,'アドレスデコーダ',632,205,238,48,C.white,23,blue,2.3);
  R([[494,270],[568,270],[568,316],[1102,316]],blue,false,3);
  R([[568,270],[602,270],[602,229],[632,229]],blue,true,3);junction(s,568,270,blue,5);
  R([[494,407],[545,407],[545,348],[1142,348]],blue,false,3);
  R([[494,540],[588,540],[588,380],[1182,380]],blue,false,1.4);
  for(const [i,d]of defs.entries()){
    const c=on(d)?blue:gray;
    const selx=d.x+12,sy=266+i*14;
    R([[662+i*63,253],[662+i*63,sy],[selx,sy],[selx,451]],c,true,1.4);
    T(d.select,selx+4,419,33,25,18,true,c);
    for(const [off,y,name,width]of [[64,316,'AD',3],[104,348,'WD',3],[144,380,'WE',1.4]]){
      wire(s,d.x+off,y,d.x+off,451,blue,true,width);
      if(i<2)junction(s,d.x+off,y,blue,5);
      T(name,d.x+off-11,419,27,25,15,true,blue,'center');
    }
    box(s,d.label,d.x,451,174,70,d.key==='ddr'?C.ip:C.white,22,c,on(d)?2.7:1.8);
  }
  // Each returned value occupies its own wire into the read multiplexer.
  polygon(s,[[636,548],[582,560],[582,600],[636,612]],C.white,rd,2.1);
  T('選択',585,565,49,27,18,true,rd,'center');
  defs.forEach((d,i)=>{
    const c=on(d)?rd:gray,y=560+i*20;
    R([[d.x+87,521],[d.x+87,y],[636,y]],c,true,3);
    T('RD',d.x+95,521,40,24,17,true,c);
  });
  T('S0〜S2',618,622,105,27,18,true,rd);
  R([[661,622],[661,620],[607,620],[607,605]],rd,true,1.2);
  R([[582,580],[318,580],[318,347],[302,347]],rd,true,3);
  R([[318,534],[302,534]],rd,true,3);junction(s,318,534,rd,5);
  T('RD',514,586,46,25,19,true,rd);
  T(focus==='copy'?'CPUはSD制御から値を読み、同じ値をDDR制御へ書く':
    focus==='command'?'描画用のアドレスを出すと、S2で描画命令の接続回路を選ぶ':
    '選んだ回路のRDを返し、アクセスを行った側が受け取る',64,650,1152,30,23,true);
}

export const MEMORY_PORTS_DETAIL='命令メモリとデータメモリの箱は、前の説明用CPUの形と位置を引き継いだ接続口を表す。実機に二つの独立したローカルメモリを残す意味ではない。命令側は読出し専用なのでWE=0、WDは未使用として描く。データ側は読出しと書込みの両方を扱う。三つのMUXには同じ要求選択が入り、AD、WD、WEを一方の要求にそろえる。二つの出力同士をつながない。CPU WallyのebuがIFUとLSUの要求を調停する。アドレスデコーダがアドレス範囲を調べ、S0、S1、S2のうち対応する相手を選ぶ。ADの下位部分は、その回路内のレジスタやメモリ位置を指定する。接続先からのRDは読出し選択回路を通り、CPU側の両接続口へ届く。アクセスを行った側が応答を取り込む。実装では要求と応答の間に時間があるので、応答の選択には保持した選択情報を使う。この図はその機能をまとめたもので、AHB/APBやAXIの全信号、変換、待ち、キャッシュ、クロックの違いは省略する。WE=0を読む意味に使うのは有効な要求の間である。要求のない時間まで連続して読み出す意味ではない。命令側のADはPCから始まる命令読出し先、データ側のADはALUが求めた読書き先に対応する。実機はパイプラインとキャッシュを備えるため、毎命令の取得が必ず外部への要求になるわけではない。';
