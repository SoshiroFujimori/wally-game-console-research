// Keep CPU, peripheral controllers and board parts in fixed positions as the
// two existing implementation examples become one game-console composition.
export function drawPriorImplementations(s,api){drawConsoleEvolution(s,api,{mode:'prior'});}
export function drawAddressDecode(s,api){drawConsoleEvolution(s,api,{mode:'decode'});}

export function drawConsoleEvolution(s,api,{mode='addition'}={}){
  const {text,box,polygon,route,wire,junction,C}=api;
  const split=mode==='prior',decode=mode==='decode',access=mode==='access';
  const frame='#718299',muted='#A6B2C3',edge='#BBC6D6';
  const existing=split?C.ink:access||decode?muted:frame;
  const graphics=split?C.ink:C.blue,memory=access?C.blue:existing;
  const cpu=split||access||decode?C.ink:existing;
  const T=(v,x,y,w,h=26,size=21,bold=false,color=C.ink,align='left')=>text(s,v,x,y,w,h,size,bold,color,align);
  const R=(p,col=C.ink,ar=true,width=2.7)=>route(s,p,col,ar,width);
  for(const [x,width] of split?[[64,800],[904,312]]:[[64,1152]]){
    box(s,'',x,175,width,400,'#F6F8FC',22,frame,1.5);
    T('FPGAボード',x+16,179,width-32,28,23,true,frame);
    box(s,'',x+20,210,width-40,297,'#E8EFF9',22,frame,1.8);
    T('FPGAチップ',x+36,215,width-72,25,20,true,frame);
  }
  const origin=box(s,'',100,245,724,252,'none',20,edge,1.2);
  origin.line={style:'dashed',fill:frame,width:1.2};
  T('Wallyリポジトリの既存回路',340,decode?215:249,466,24,19,true,existing,'right');
  T('RasterIXリポジトリ',934,249,242,26,19,true,graphics,'center');
  if(decode)T('AD = 0x10080000',805,214,370,28,22,true,C.blue,'right');
  if(access){
    T('0x80000000〜\n0x9FFFFFFF',510,274,150,38,16,true,C.blue,'center');
    T('0x10080000〜0x100800FF',934,280,242,25,17,true,C.blue,'center');
  }
  const nodes=[
    {id:'sd',x:330,w:150,c:existing,label:'SDカード\n制御回路',ad:375,en:450,wd:360,we:395},
    {id:'ddr',x:510,w:150,c:memory,label:'DDRメモリ\n制御回路',ad:555,en:630,wd:540,we:575},
    {id:'gpio',x:690,w:120,c:existing,label:'その他の\n周辺回路',ad:735,en:790,wd:720,we:755},
    {id:'graphics',x:934,w:242,c:graphics,label:'描画・表示回路',ad:980,en:1140,wd:980,we:1090}
  ];
  if(decode){
    // AD and WD reach every illustrated target; independent enable outputs
    // select one target. WE qualifies a write at that selected target.
    R([[185,350],[185,322]],C.blue,true,3);
    box(s,'アドレスデコーダ',112,250,210,72,C.white,22,C.blue,2.4);
    R([[185,335],[nodes[0].ad,335]],C.blue,false,3);
    junction(s,185,335,C.blue,4.5);
    nodes.forEach((n,i)=>{
      if(i<nodes.length-1)wire(s,n.ad,335,nodes[i+1].ad,335,C.blue,false,3);
      wire(s,n.ad,335,n.ad,350,C.blue,true,3);
      if(i<nodes.length-1)junction(s,n.ad,335,C.blue,4.5);
      R([[322,260+i*18],[n.en,260+i*18],[n.en,350]],n.id==='graphics'?C.blue:frame,true,1.4);
    });
    for(const [signal,yStart,xRail,yRail,width] of [['wd',382,294,451,3],['we',412,310,480,1.4]]){
      R([[270,yStart],[xRail,yStart],[xRail,yRail],[nodes[0][signal],yRail]],C.blue,false,width);
      nodes.forEach((n,i)=>{
        const x=n[signal];
        if(i<nodes.length-1)wire(s,x,yRail,nodes[i+1][signal],yRail,C.blue,false,width);
        wire(s,x,yRail,x,430,C.blue,true,width);
        if(i<nodes.length-1)junction(s,x,yRail,C.blue,4.5);
      });
    }
    T('WD：描画命令',112,445,171,25,18,true,C.blue);
    T('WE = 1',112,473,166,25,18,true,C.blue);
  }else{
    // This path summarizes reads and writes, not a single physical net.
    const centers=[405,585,750];
    R([[270,390],[296,390],[296,315],[405,315]],access?C.blue:existing,false,3);
    centers.forEach((x,i)=>{
      if(i<centers.length-1)wire(s,x,315,centers[i+1],315,existing,false,3);
      wire(s,x,315,x,350,access&&i===1?C.blue:existing,'both',2.7);
      if(i<centers.length-1||!split)junction(s,x,315,access&&i===1?C.blue:existing,4.5);
    });
    if(!split){
      R([[750,315],[1055,315],[1055,350]],C.blue,true,3);
      T('追加',851,280,73,27,21,true,C.blue,'center');
    }
    T('読出し・書込み',112,282,175,28,21,true,cpu,'center');
  }
  box(s,'CPU\nWally',120,350,150,80,C.white,25,cpu,2.3);
  nodes.forEach(n=>{
    const active=n.id==='graphics'&&!split||n.id==='ddr'&&access;
    box(s,'',n.x,350,n.w,80,active?'#DCEAF9':C.white,22,n.c,active?3:2);
    if(decode){
      T('AD',n.ad-15,352,30,19,14,true,C.blue,'center');
      T('EN='+Number(n.id==='graphics'),n.en-24,352,48,19,14,true,n.id==='graphics'?C.blue:frame,'center');
    }
    T(n.label,n.x+6,decode?373:359,n.w-12,n.id==='graphics'?32:58,n.id==='graphics'?24:21,true,n.c,'center');
    if(n.id==='graphics')T('RasterIX',n.x+6,decode?405:396,n.w-12,24,20,false,n.c,'center');
  });
  // The controller connects to the slot first; the card is inserted into it.
  const program=!split,highlightProgram=program&&!decode&&!access;
  const cardColor=highlightProgram?C.blue:existing;
  R([[405,430],[405,510]],existing,'both',2.2);
  box(s,'',315,510,180,26,C.white,18,frame,1.5);
  T('SDカードスロット',319,512,172,21,16,true,frame,'center');
  polygon(s,[[330,535],[468,535],[480,547],[480,570],[330,570]],highlightProgram?'#DCEAF9':C.white,cardColor,highlightProgram?2.8:1.8);
  T('SDカード',334,536,142,14,12,true,cardColor,'center');
  T(program?'ブロック崩し':'プログラム',334,550,142,19,18,true,cardColor,'center');
  R([[585,430],[585,538]],memory,'both',2.2);
  box(s,'DDR3メモリ',510,538,150,35,C.white,21,memory,1.8);
  R([[1098,430],[1098,538]],graphics,true,2.4);
  box(s,'HDMI端子',1008,538,180,35,C.white,22,graphics,1.8);
  if(!split&&!decode){
    R([[960,430],[960,465],[624,465],[624,430]],access?C.blue:frame,'both',2.3);
    T('画像の保存・読出し',635,470,178,23,16,false,frame,'center');
  }
}
