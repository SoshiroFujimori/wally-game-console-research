// One editable choropleth derived from the attributed CC0 prefecture geometry.
function exampleNames(data, category) {
  const selected={kosen:['K02','K04'],undergraduate:['U07','U09','U13'],graduate:['G02']};
  const labels={K02:'豊田高専',K04:'久留米高専',G02:'北陸先端科学技術大学院大学（JAIST）'};
  return selected[category].map(id=>{
    const record=data.records.find(r=>r.id===id && r.category===category);
    if (!record) throw new Error(`Missing course source for example ${id}`);
    return labels[id] || record.institution;
  });
}

export function summarizeDdca(data) {
  const institutions = new Set(data.records.map(r => r.institution_key || r.institution));
  const prefectures = new Set(data.records.map(r => r.prefecture_code));
  const years = data.records.map(r => r.academic_year).filter(Number.isInteger);
  return {
    institutions: institutions.size, prefectures: prefectures.size,
    firstYear: Math.min(...years), lastYear: Math.max(...years),
    undated: data.records.filter(r => r.academic_year === null).length,
    categories: data.categories.map(c => ({ ...c, examples: exampleNames(data,c.id),
      institutions: new Set(data.records.filter(r => r.category === c.id)
        .map(r => r.institution_key || r.institution)).size }))
  };
}

function area(points) {
  return Math.abs(points.reduce((a,p,i) => {
    const q = points[(i+1) % points.length];
    return a+p[0]*q[1]-q[0]*p[1];
  },0))/2;
}

function clipX(points, boundary, keepRight) {
  const result = [];
  if (!points.length) return result;
  const inside = p => keepRight ? p[0] >= boundary : p[0] <= boundary;
  for (let i=0;i<points.length;i++) {
    const previous=points[(i+points.length-1)%points.length], current=points[i];
    const before=inside(previous), after=inside(current);
    if (before !== after) {
      const t=(boundary-previous[0])/(current[0]-previous[0]);
      result.push([boundary,previous[1]+t*(current[1]-previous[1])]);
    }
    if (after) result.push(current);
  }
  return result;
}

export function drawDdcaMap(slide, api, data, geography) {
  const { text, box, C }=api;
  const summary=summarizeDdca(data);
  const x=84, y=162, size=476, scale=size/geography.view_box[2];
  const byCode=new Map(geography.prefectures.map(p=>[p.code,p]));
  if (byCode.size!==47) throw new Error('Expected all 47 prefectures');
  for (const r of data.records) {
    if (!byCode.has(r.prefecture_code)) throw new Error(`Unknown prefecture ${r.prefecture_code}`);
    if (!data.categories.some(c=>c.id===r.category)) throw new Error(`Unknown category ${r.category}`);
  }

  function draw(contours, name, fill, outline=false) {
    const points=contours.flat(), xs=points.map(p=>p[0]), ys=points.map(p=>p[1]);
    const left=Math.min(...xs), top=Math.min(...ys);
    const width=Math.max(...xs)-left, height=Math.max(...ys)-top;
    if (width<=0 || height<=0) throw new Error(`Degenerate map shape ${name}`);
    return slide.shapes.add({geometry:'custom',name,
      position:{left:x+left*scale,top:y+top*scale,width:width*scale,height:height*scale},
      fill,line:{fill:outline?'#FFFFFF':'none',width:outline?1.2:0},
      customPaths:contours.map(contour=>({width,height,commands:[
        {moveTo:{x:contour[0][0]-left,y:contour[0][1]-top}},
        ...contour.slice(1).map(p=>({lineTo:{x:p[0]-left,y:p[1]-top}})),{close:{}}
      ]}))});
  }

  for (const prefecture of geography.prefectures) {
    const categories=data.categories.filter(c=>data.records.some(r=>
      r.category===c.id && r.prefecture_code===prefecture.code));
    const code=String(prefecture.code).padStart(2,'0');
    const base=draw(prefecture.contours,`ddca-prefecture-${code}`,
      categories.length===1?categories[0].color:'#E3E5E7');
    base.altText=`${prefecture.name}：${categories.length?categories.map(c=>c.label).join('・'):'この一覧では未確認'}`;
    if (categories.length>1) {
      const xs=prefecture.contours.flat().map(p=>p[0]);
      const left=Math.min(...xs), right=Math.max(...xs);
      const count=categories.length*2, step=(right-left)/count;
      let clippedArea=0;
      for (let i=0;i<count;i++) {
        const lo=left+i*step, hi=left+(i+1)*step;
        const contours=prefecture.contours.map(c=>clipX(clipX(c,lo,true),hi,false))
          .filter(c=>c.length>=3 && area(c)>1e-7);
        if (!contours.length) continue;
        clippedArea+=contours.reduce((a,c)=>a+area(c),0);
        draw(contours,`ddca-band-${code}-${categories[i%categories.length].id}-${i}`,
          categories[i%categories.length].color);
      }
      const originalArea=prefecture.contours.reduce((a,c)=>a+area(c),0);
      if (Math.abs(clippedArea-originalArea)>originalArea*1e-8)
        throw new Error(`Incomplete stripe coverage for ${prefecture.name}`);
    }
    draw(prefecture.contours,`ddca-boundary-${code}`,'none',true);
  }

  text(slide,`${summary.institutions}機関・${summary.prefectures}都道府県`,654,171,562,52,36,true,C.heading);
  text(slide,'公式シラバス・授業資料で掲載を確認',654,225,562,34,23,false,C.ink);
  summary.categories.forEach((c,i)=>{
    const top=266+i*76;
    box(slide,'',654,top+4,34,28,c.color,20,c.color,0);
    text(slide,c.label,710,top,315,38,27,true,C.ink);
    text(slide,`${c.institutions}機関`,1055,top,155,38,27,false,C.ink,'right');
    text(slide,'例：'+c.examples.join('・'),710,top+38,506,29,21,false,C.ink);
  });
  // A striped swatch explains overlaps without introducing another map.
  data.categories.forEach((c,i)=>box(slide,'',654+i*12,508,12,28,c.color,20,c.color,0));
  text(slide,'縞模様：同じ県で複数の区分を確認',710,503,506,38,22,false,C.ink);
  box(slide,'',654,549,34,28,'#E3E5E7',20,'#E3E5E7',0);
  text(slide,'灰色：この一覧では未確認',710,544,506,38,22,false,C.ink);
  text(slide,'同じ大学の学部・大学院は、全体では1機関。',654,586,562,27,19,false,C.old);
  text(slide,`${summary.firstYear}〜${summary.lastYear}年度・年度不明${summary.undated}件を含む。`,654,614,562,27,19,false,C.old);
  text(slide,'全国の採用校を網羅した地図ではありません。',64,648,1152,29,22,false,C.ink);
}
