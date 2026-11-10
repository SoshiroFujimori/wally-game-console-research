import {OPENGL_TOPICS} from './opengl-functions.mjs';
// Native slide navigation. The slide names remain editable text objects.
export const CONTENTS_SLIDE=14;
export const CONTENTS_ITEMS=[
  {number:1,label:'表紙',group:'発表用スライド'},
  {number:2,label:'FPGAチップと周辺部品',group:'発表用スライド'},
  {number:3,label:'教科書とのつながり・研究目的',group:'発表用スライド'},
  {number:4,label:'既存回路と追加した部分',group:'発表用スライド'},
  {number:5,label:'読込みから描画命令の送信まで',group:'発表用スライド'},
  {number:6,label:'SDカードから読み込む',group:'発表用スライド'},
  {number:7,label:'CPUがゲームを実行する',group:'発表用スライド'},
  {number:8,label:'ゲームから描画命令を送る',group:'発表用スライド'},
  {number:9,label:'接続回路で違いに対応する',group:'発表用スライド'},
  {number:10,label:'描画回路が画像を保存する',group:'発表用スライド'},
  {number:11,label:'表示回路が映像を出す',group:'発表用スライド'},
  {number:12,label:'ブロック崩しの実機動画',group:'発表用スライド'},
  {number:13,label:'結論と今後の展望',group:'発表用スライド'},
  {number:15,label:'回路・CPU設計の教科書の利用例',group:'教科書の採用例'},
  {number:16,label:'SoC設計の教科書',group:'教科書の採用例'},
  {number:17,label:'FPGAチップの構成要素',group:'FPGA'},
  {number:18,label:'FPGAの使用量',group:'FPGA'},
  {number:19,label:'命令実行から周辺回路への接続',group:'命令の実行と周辺接続'},
  {number:20,label:'詳細な全体のブロック図',group:'回路の詳細'},
  {number:21,label:'描画回路のFPGAパイプライン',group:'回路の詳細'},
  ...OPENGL_TOPICS.map(record=>({...record,group:'ゲームの描画'})),
];

const destinations=new Map();

export function linkToSlide(shape,number){
  destinations.set(shape.name,number);
}

export function drawContents(s,api){
  const {text,wire,C}=api;
  text(s,'発表用スライド',64,127,544,42,29,true,C.heading);
  text(s,'回答用スライド',668,127,548,42,29,true,C.heading);
  wire(s,64,178,608,178,C.ink,false,1.2);
  wire(s,668,178,1216,178,C.ink,false,1.2);
  const item=(record,x,y,compact=false)=>{
    const number=text(s,String(record.number),x,y,46,compact?26:31,compact?23:25,true,C.heading,'right');
    const label=text(s,record.label,x+63,y,481,compact?26:31,compact?22:24,false,C.ink);
    number.name=`contents-number-${record.number}`;
    label.name=`contents-label-${record.number}`;
    linkToSlide(number,record.number);linkToSlide(label,record.number);
  };
  CONTENTS_ITEMS.slice(0,13).forEach((r,i)=>item(r,64,193+i*32));
  CONTENTS_ITEMS.slice(13).forEach((r,i)=>item(r,668,193+i*26,true));
  text(s,'項目をクリックすると、そのスライドへ移動します',64,628,1152,34,24,true,C.ink);
  text(s,'各スライドの右下の番号をクリックすると、この目次に戻れます',64,670,1100,31,21,false,C.old);
}

export function contentsMarkdown(){
  const lines=[];
  for(const group of ['発表用スライド','教科書の採用例','FPGA','命令の実行と周辺接続','回路の詳細','ゲームの描画']){
    lines.push('### '+(group==='発表用スライド'?group:'回答用：'+group),'');
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
