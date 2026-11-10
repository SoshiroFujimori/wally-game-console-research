import {OPENGL_TOPICS} from './opengl-functions.mjs';

// Keep the main talk and contents positions stable when adding answer topics.
export const CONTENTS_SLIDE=10;
export const ANSWER_CATEGORIES=[
  {label:'教科書・教育',numbers:[11,12]},
  {label:'FPGA・CPU',numbers:[13,14,15,16,17]},
  {label:'描画回路',numbers:[18,19,20]},
  {label:'OpenGL：図形',numbers:[21,22,23]},
  {label:'OpenGL：文字',numbers:[24,25,26,27]},
  {label:'OpenGL：実行と表示',numbers:[28,29]},
];
const answerCategories=new Map(ANSWER_CATEGORIES.flatMap(group=>group.numbers.map(number=>[number,group.label])));
export const CONTENTS_ITEMS=[
  {number:1,label:'表紙'},
  {number:2,label:'背景：FPGAとは'},
  {number:3,label:'背景：チップ上の回路の例'},
  {number:4,label:'本研究の概要'},
  {number:5,label:'構成：ソフトウェア'},
  {number:6,label:'構成：ハードウェア'},
  {number:7,label:'FPGAチップの使用量'},
  {number:8,label:'ブロック崩しの実機動画'},
  {number:9,label:'まとめと今後の展望'},
  {number:11,label:'回路・CPU設計の教科書の利用例',shortLabel:'DDCAの授業利用例'},
  {number:12,label:'SoC設計の教科書',shortLabel:'RVSOCの採用大学'},
  {number:13,label:'FPGAチップの構成要素'},
  {number:14,label:'Wallyの命令実行と分岐予測',shortLabel:'Wally：命令実行・分岐予測'},
  {number:15,label:'Wallyのメモリと特権機能',shortLabel:'Wally：メモリ・特権機能'},
  {number:16,label:'命令実行から周辺回路への接続',shortLabel:'命令実行と周辺回路の接続'},
  {number:17,label:'詳細な全体のブロック図',shortLabel:'詳細な全体ブロック図'},
  {number:18,label:'RasterIXの描画と画素処理',shortLabel:'RasterIX：描画機能'},
  {number:19,label:'RasterIXの処理分担とメモリ',shortLabel:'RasterIX：処理分担・メモリ'},
  {number:20,label:'描画回路のFPGAパイプライン',shortLabel:'FPGAパイプライン'},
  ...OPENGL_TOPICS,
].map(record=>({...record,group:answerCategories.get(record.number)||'発表用スライド'}));

const destinations=new Map();

export function linkToSlide(shape,number){
  destinations.set(shape.name,number);
}

export function addAnswerCategory(slide,number,api){
  const category=answerCategories.get(number);
  if(!category)return;
  // Match the main slides' title row and right body margin.
  api.text(slide,category,960,60,256,28,18,true,api.C.heading,'right').name=`answer-category-${number}`;
}

export function drawContents(s,api){
  const {text,wire,C}=api;
  text(s,'発表用スライド',64,127,330,42,28,true,C.heading);
  text(s,'回答用スライド',438,127,778,42,28,true,C.heading);
  wire(s,64,178,394,178,C.ink,false,1.2);
  wire(s,438,178,1216,178,C.ink,false,1.2);
  const item=(record,x,y,width,main=false)=>{
    const number=text(s,String(record.number),x,y,32,30,22,true,C.heading,'right');
    const label=text(s,record.shortLabel||record.label,x+45,y,width-45,30,main?21:20,false,C.ink);
    number.name=`contents-number-${record.number}`;
    label.name=`contents-label-${record.number}`;
    linkToSlide(number,record.number);linkToSlide(label,record.number);
  };
  CONTENTS_ITEMS.filter(r=>r.group==='発表用スライド').forEach((r,i)=>item(r,64,201+i*43,330,true));
  const group=(index,x,y,width)=>{
    const category=ANSWER_CATEGORIES[index];
    const heading=text(s,category.label,x,y,width,32,24,true,C.heading);
    heading.name=`contents-category-${index+1}`;
    linkToSlide(heading,category.numbers[0]);
    category.numbers.forEach((number,i)=>item(CONTENTS_ITEMS.find(r=>r.number===number),x,y+38+i*34,width));
  };
  group(0,438,193,372);
  group(1,438,303,372);
  group(2,438,518,372);
  group(3,848,193,368);
  group(4,848,346,368);
  group(5,848,533,368);
  text(s,'項目から各スライドへ移動 ／ 各スライド右下の番号から目次へ戻る',64,668,1130,28,20,false,C.old);
}

export function contentsMarkdown(){
  const lines=[];
  for(const group of ['発表用スライド',...ANSWER_CATEGORIES.map(r=>r.label)]){
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
