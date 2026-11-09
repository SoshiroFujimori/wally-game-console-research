// Native editable circuit lines. Arrowheads have no outline and the shaft
// stops at their base, so a thick shaft cannot blunt the point. Crossings
// are gaps in the actual line geometry, not background-colored patches.
export function createCircuitWiring() {
  const slides = new Map();
  let serial = 0;
  const state = slide => {
    if (!slides.has(slide)) slides.set(slide, {segments: [], junctions: [], heads: []});
    return slides.get(slide);
  };
  const point = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const distance = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1]);
  const cross = (a,b) => a[0]*b[1]-a[1]*b[0];

  // Filled polygons have exact endpoints; PowerPoint line caps cannot extend
  // the shaft into or beyond an independently drawn arrowhead.
  function shaftPath(a,b,width,left,top){
    const len=distance(a,b),nx=-(b[1]-a[1])*width/(2*len),ny=(b[0]-a[0])*width/(2*len);
    const pts=[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],
      [b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];
    return [{moveTo:{x:pts[0][0]-left,y:pts[0][1]-top}},
      ...pts.slice(1).map(p=>({lineTo:{x:p[0]-left,y:p[1]-top}})),{close:{}}];
  }

  function head(slide, tip, direction, length, halfWidth, color) {
    const base=[tip[0]-direction[0]*length,tip[1]-direction[1]*length];
    const p=[tip,[base[0]-direction[1]*halfWidth,base[1]+direction[0]*halfWidth],
      [base[0]+direction[1]*halfWidth,base[1]-direction[0]*halfWidth]];
    const left=Math.min(...p.map(p=>p[0])),top=Math.min(...p.map(p=>p[1]));
    const width=Math.max(...p.map(p=>p[0]))-left,height=Math.max(...p.map(p=>p[1]))-top;
    slide.shapes.add({geometry:'custom',name:'arrowhead-'+(++serial),
      position:{left,top,width,height},fill:color,line:{fill:'none',width:0},
      customPaths:[{width,height,commands:[{moveTo:{x:p[0][0]-left,y:p[0][1]-top}},
        ...p.slice(1).map(p=>({lineTo:{x:p[0]-left,y:p[1]-top}})),{close:{}}]}]});
  }

  function route(slide, points, color='#231F20', arrows=true, width=2.5) {
    const p=points.filter((p,i)=>!i||distance(p,points[i-1])>0.01);
    if(p.length<2)return;
    const group=++serial;
    const ends=arrows==='both'?[0,p.length-1]:arrows==='start'?[0]:arrows?[p.length-1]:[];
    const trims=new Map();
    for(const end of ends){
      const neighbor=end===0?1:end-1,full=distance(p[end],p[neighbor]);
      const d=[(p[end][0]-p[neighbor][0])/full,(p[end][1]-p[neighbor][1])/full];
      const setback=Math.min(1.3,full*0.06);
      const cap=(p.length===2&&ends.length===2?0.42:0.76)*(full-setback);
      const length=Math.min(Math.max(7,3.8*width),cap);
      const halfWidth=Math.min(Math.max(2.8,1.65*width),length*0.52);
      const tip=[p[end][0]-d[0]*setback,p[end][1]-d[1]*setback];
      trims.set(end,{length:length+setback,d,tip,headLength:length,halfWidth});
    }
    for(let i=0;i<p.length-1;i++){
      const origA=p[i],origB=p[i+1],a=[...origA],b=[...origB];
      for(const [index,v]of [[i,a],[i+1,b]]){
        const trim=trims.get(index);
        if(trim)for(let axis=0;axis<2;axis++)v[axis]-=trim.d[axis]*(trim.length-0.35);
      }
      const length=distance(a,b);
      if(length<0.05)continue;
      const left=Math.min(a[0],b[0])-width/2,top=Math.min(a[1],b[1])-width/2;
      const w=Math.max(1,Math.abs(b[0]-a[0])+width),h=Math.max(1,Math.abs(b[1]-a[1])+width);
      const shape=slide.shapes.add({geometry:'custom',name:'wire-'+(++serial),
        position:{left,top,width:w,height:h},fill:color,line:{fill:'none',width:0},
        customPaths:[{width:w,height:h,commands:shaftPath(a,b,width,left,top)}]});
      state(slide).segments.push({shape,a,b,origA,origB,left,top,w,h,width,color,group,length,cuts:[]});
    }
    for(const trim of trims.values())state(slide).heads.push({tip:trim.tip,d:trim.d,length:trim.headLength,halfWidth:trim.halfWidth,color});
  }

  function wire(slide,x1,y1,x2,y2,color,arrows=false,width=3){route(slide,[[x1,y1],[x2,y2]],color,arrows,width);}
  function junction(slide,x,y,color='#231F20',diameter=4.8){
    state(slide).junctions.push([x,y,diameter/2]);
    return slide.shapes.add({geometry:'ellipse',name:'junction-'+(++serial),
      position:{left:x-diameter/2,top:y-diameter/2,width:diameter,height:diameter},
      fill:color,line:{fill:'none',width:0}});
  }

  function finalize(){
    const report=[];
    for(const [slide,{segments,junctions,heads}]of slides){
      let crossings=0,gaps=0;const crowded=[];
      for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
        const a=segments[i],b=segments[j];
        if(a.group===b.group)continue;
        const u=[a.b[0]-a.a[0],a.b[1]-a.a[1]],v=[b.b[0]-b.a[0],b.b[1]-b.a[1]];
        const den=cross(u,v);if(Math.abs(den)<0.001)continue;
        const q=[b.a[0]-a.a[0],b.a[1]-a.a[1]];
        const t=cross(q,v)/den,s=cross(q,u)/den;
        if(t<=0.001||t>=0.999||s<=0.001||s>=0.999)continue;
        const hit=point(a.a,a.b,t);
        if(junctions.some(p=>distance(p,hit)<=p[2]+1))continue;
        crossings++;
        // Horizontal routes are normally continuous; the crossing route
        // receives a gap. A cramped terminal is never cut through its head.
        const choices=Math.abs(u[1])>Math.abs(v[1])?[[a,t,b],[b,s,a]]:[[b,s,a],[a,t,b]];
        let applied=false;
        for(const [seg,f,other]of choices){
          const sine=Math.abs(den)/(a.length*b.length);
          const radius=Math.max(3.6,(other.width/2+2.3)/Math.max(sine,0.3));
          const at=f*seg.length;
          if(at<radius+1.2||seg.length-at<radius+1.2)continue;
          seg.cuts.push([at-radius,at+radius]);gaps++;applied=true;break;
        }
        if(!applied)crowded.push({at:hit,a:[a.origA,a.origB],b:[b.origA,b.origB]});
      }
      for(const seg of segments){
        if(!seg.cuts.length)continue;
        const cuts=seg.cuts.sort((a,b)=>a[0]-b[0]),merged=[];
        for(const cut of cuts){
          const prev=merged.at(-1);
          if(prev&&cut[0]<=prev[1]+0.6)prev[1]=Math.max(prev[1],cut[1]);else merged.push([...cut]);
        }
        const intervals=[];let start=0;
        for(const [lo,hi]of merged){if(lo-start>0.2)intervals.push([start,lo]);start=hi;}
        if(seg.length-start>0.2)intervals.push([start,seg.length]);
        const commands=[];
        for(const [lo,hi]of intervals){
          const a=point(seg.a,seg.b,lo/seg.length),b=point(seg.a,seg.b,hi/seg.length);
          commands.push(...shaftPath(a,b,seg.width,seg.left,seg.top));
        }
        seg.shape.customPaths=[{width:seg.w,height:seg.h,commands}];
      }
      for(const h of heads)head(slide,h.tip,h.d,h.length,h.halfWidth,h.color);
      report.push({segments:segments.length,arrowheads:heads.length,crossings,gaps,crowded});
    }
    return report;
  }
  return {wire,route,junction,finalize};
}
