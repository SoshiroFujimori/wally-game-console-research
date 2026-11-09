// Native slide navigation. The slide names remain editable text objects.
export const CONTENTS_SLIDE=14;
export const CONTENTS_ITEMS=[
  {number:1,label:'表紙',group:'発表スライド'},
  {number:2,label:'FPGAチップと周辺部品',group:'発表スライド'},
  {number:3,label:'拡張元のWallyと研究の目的',group:'発表スライド'},
  {number:4,label:'SDカードへ読出しを要求する',group:'発表スライド'},
  {number:5,label:'SDカードから届いた値をCPUへ戻す',group:'発表スライド'},
  {number:6,label:'受け取った値をDDR3へ保存する',group:'発表スライド'},
  {number:7,label:'SDカードからDDR3へコピーする',group:'発表スライド'},
  {number:8,label:'DDR3に置いたプログラムを実行する',group:'発表スライド'},
  {number:9,label:'描画回路へ命令を送る',group:'発表スライド'},
  {number:10,label:'画像を保存し、映像を出す',group:'発表スライド'},
  {number:11,label:'本研究で追加した回路とソフト',group:'発表スライド'},
  {number:12,label:'ブロック崩しの実機動画',group:'発表スライド'},
  {number:13,label:'結論と今後の展望',group:'発表スライド'},
  {number:15,label:'DDCAを教材に挙げる授業',group:'教科書の採用例'},
  {number:16,label:'RVSOCの教科書採用例',group:'教科書の採用例'},
  {number:17,label:'FPGAチップの構成要素',group:'FPGA'},
  {number:18,label:'FPGAの使用量',group:'FPGA'},
  {number:19,label:'lw命令とデータの読出し',group:'命令の実行と周辺接続'},
  {number:20,label:'sw命令とデータの書込み',group:'命令の実行と周辺接続'},
  {number:21,label:'二つのメモリの箱と接続口',group:'命令の実行と周辺接続'},
  {number:22,label:'アドレス判定と読出し値の選択',group:'命令の実行と周辺接続'},
  {number:23,label:'SDカードからDDR3へのコピー',group:'命令の実行と周辺接続'},
  {number:24,label:'sw命令で描画用の数値を送る',group:'命令の実行と周辺接続'},
  {number:25,label:'画像の保存と表示の経路',group:'命令の実行と周辺接続'},
  {number:26,label:'詳細な全体のブロック図',group:'回路の詳細'},
  {number:27,label:'描画回路のFPGAパイプライン',group:'回路の詳細'},
];

const destinations=new Map();

export function linkToSlide(shape,number){
  destinations.set(shape.name,number);
}

export function drawContents(s,api){
  const {text,wire,C}=api;
  text(s,'発表スライド',64,127,544,42,29,true,C.heading);
  text(s,'質問用スライド',668,127,548,42,29,true,C.heading);
  wire(s,64,178,608,178,C.ink,false,1.2);
  wire(s,668,178,1216,178,C.ink,false,1.2);
  const item=(record,x,y)=>{
    const number=text(s,String(record.number),x,y,46,31,25,true,C.heading,'right');
    const label=text(s,record.label,x+63,y,481,31,24,false,C.ink);
    number.name=`contents-number-${record.number}`;
    label.name=`contents-label-${record.number}`;
    linkToSlide(number,record.number);linkToSlide(label,record.number);
  };
  CONTENTS_ITEMS.slice(0,13).forEach((r,i)=>item(r,64,193+i*32));
  CONTENTS_ITEMS.slice(13).forEach((r,i)=>item(r,668,193+i*32));
  text(s,'項目をクリックすると、そのスライドへ移動します',64,628,1152,34,24,true,C.ink);
  text(s,'各スライドの右下の番号をクリックすると、この目次に戻れます',64,670,1100,31,21,false,C.old);
}

export function contentsMarkdown(){
  const lines=[];
  for(const group of ['発表スライド','教科書の採用例','FPGA','命令の実行と周辺接続','回路の詳細']){
    lines.push('### '+(group==='発表スライド'?group:'質問用：'+group),'');
    for(const r of CONTENTS_ITEMS.filter(r=>r.group===group))lines.push(`- [${r.number}. ${r.label}](#slide-${r.number})`);
    lines.push('');
  }
  return lines.join('\n');
}

export function navigationTargets(presentation){
  const links=[];
  for(const [i,slide] of presentation.slides.items.entries()){
    for(const shape of slide.shapes.items){
      const target=destinations.get(shape.name);
      if(target!==undefined)links.push({source:i+1,shape:shape.name,target});
    }
  }
  if(links.length!==destinations.size)throw new Error('Navigation shapes are missing');
  return {links};
}
