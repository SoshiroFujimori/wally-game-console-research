// Native, editable circuit details adapted from RVSOC figures and console RTL.
// All coordinates are relative to the pre-existing, unchanged Wally datapath.
// Lines at module boundaries can be signal bundles, as in the parent diagram.
export function drawIntegratedInternals(s, api, placement) {
  const { text, box, polygon, wire, C } = api;
  const { x:ox, y:oy, scale:k } = placement;
  const X=x=>ox+x*k, Y=y=>oy+y*k;
  const T=(v,x,y,w,h=9,z=7,b=false,c=C.ink,a='center')=>text(s,v,X(x),Y(y),w*k,h*k,z*k,b,c,a);
  const B=(x,y,w,h,fill=C.white,stroke=C.ink,lw=.8)=>box(s,'',X(x),Y(y),w*k,h*k,fill,7*k,stroke,lw*k);
  const P=(pts,fill=C.white,lw=.8,c=C.ink)=>polygon(s,pts.map(([x,y])=>[X(x),Y(y)]),fill,c,lw*k);
  const L=(x,y,u,v,c=C.ink,lw=.85)=>wire(s,X(x),Y(y),X(u),Y(v),c,false,lw*k);
  const R=(pts,c=C.ink,lw=.85)=>pts.slice(1).forEach((p,i)=>L(...pts[i],...p,c,lw));
  const A=(pts,c=C.ink,lw=.85)=>{
    R(pts,c,lw);
    const p=pts.at(-2),q=pts.at(-1),d=Math.hypot(q[0]-p[0],q[1]-p[1]);
    if(!d)return;
    const dx=(q[0]-p[0])/d,dy=(q[1]-p[1])/d;
    P([q,[q[0]-2.5*dx+dy,q[1]-2.5*dy-dx],[q[0]-2.5*dx-dy,q[1]-2.5*dy+dx]],c,.3,c);
  };
  const J=(x,y)=>s.shapes.add({geometry:'ellipse',position:{left:X(x)-.75*k,top:Y(y)-.75*k,width:1.5*k,height:1.5*k},fill:C.ink,line:{fill:C.ink,width:0}});
  const FF=(x,y,w=7,h=12)=>{B(x,y,w,h);P([[x+1,y],[x+w/2,y+2.7],[x+w-1,y]],'none',.65);};
  const M=(x,y,w=7,h=16,left=false)=>P(left?[[x+w,y],[x,y+3],[x,y+h-3],[x+w,y+h]]:[[x,y],[x+w,y+3],[x+w,y+h-3],[x,y+h]]);
  const Cell=(v,x,y,w,h,z=7,fill=C.white)=>{B(x,y,w,h,fill);T(v,x+1,y+.5,w-2,h-1,z);};
  const RAM=(v,x,y,w,h,z=6.5)=>{
    B(x,y,w,h,C.white);
    L(x,y+3,x+w,y+3,C.ink,.5);L(x,y+h-3,x+w,y+h-3,C.ink,.5);
    T(v,x+.7,y+3,w-1.4,h-6,z);
  };
  const Gate=(kind,x,y,w,h)=>{
    let pts;
    if(kind==='and') {
      pts=[[x,y],[x+w*.45,y]];
      for(let i=0;i<=12;i++){let a=-Math.PI/2+Math.PI*i/12;pts.push([x+w*.45+w*.55*Math.cos(a),y+h/2+h/2*Math.sin(a)]);}
      pts.push([x,y+h]);
    } else {
      const q=(a,b,c,n=10)=>Array.from({length:n+1},(_,i)=>{let t=i/n;return [(1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]];});
      pts=[...q([x,y],[x+w*.65,y-h*.08],[x+w,y+h/2]),...q([x+w,y+h/2],[x+w*.65,y+h*1.08],[x,y+h]),...q([x,y+h],[x+w*.38,y+h/2],[x,y])];
    }
    P(pts);
  };
  function Interior(x,y,w,h,label,z=9.5,fill=C.white) {
    B(x+1.2,y+1.2,w-2.4,h-2.4,fill,'none',0);
    T(label,x+2,y+.6,w-4,10,z,true);
  }

  // RVSOC 7.7: decoder outputs go directly to the original control ports.
  {
    const x=205,y=310;
    Interior(x,y,101,34,'controller');
    Cell('Main',x+9,y+14,24,17,7,C.pale);
    Cell('ALU',x+45,y+17,21,13,7,C.pale);
    Cell('BR',x+75,y+17,22,13,7,C.pale);
    A([[x,y+15],[x+4,y+15],[x+4,y+23],[x+9,y+23]]);
    A([[x+33,y+24],[x+45,y+24]]);
    A([[x+33,y+28],[x+38,y+28],[x+38,y+32],[x+71,y+32],[x+71,y+25],[x+75,y+25]]);
    R([[x+33,y+18],[x+39,y+18],[x+39,y+12],[x+98,y+12],[x+98,y+8],[x+101,y+8]]);
    R([[x+66,y+23],[x+69,y+23],[x+69,y+15],[x+99,y+15],[x+99,y+19],[x+101,y+19]]);
    R([[x+97,y+24],[x+99,y+24],[x+99,y+29],[x+101,y+29]]);
  }

  // RVSOC 7.6: comparator function, without copying its 16-bit example.
  {
    const x=448,y=326;
    Interior(x,y,66,27,'',9);T('comp',x+2,y+1,25,9,8.5,true);
    Cell('= / <',x+23,y+11,31,13,8,C.pale);
    A([[x,y+11],[x+17,y+11],[x+17,y+15],[x+23,y+15]]);
    A([[x,y+22],[x+23,y+22]]);
    R([[x+54,y+17],[x+60,y+17],[x+60,y+4],[x+33,y+4],[x+33,y]]);
  }

  // RVSOC 11.15: address translation, bypass and physical-address checks.
  {
    const x=580,y=333;
    Interior(x,y,160,30,'',9);
    T('MMU',x+2,y+1,33,9,9.5,true);
    Cell('TLB',x+20,y+11,34,14,8,C.pale);
    A([[x,y+16],[x+20,y+16]]);
    A([[x+54,y+17],[x+68,y+17]]);
    M(x+68,y+12,8,14);
    A([[x+7,y+16],[x+7,y+27],[x+64,y+27],[x+64,y+23],[x+68,y+23]]);J(x+7,y+16);
    R([[x+76,y+19],[x+80,y+19],[x+80,y+30]],C.blue,1.15);
    Cell('PMP',x+92,y+5,29,10,7,C.pale);Cell('PMA',x+92,y+18,29,10,7,C.pale);
    A([[x+80,y+19],[x+84,y+19],[x+84,y+10],[x+92,y+10]]);
    A([[x+84,y+19],[x+84,y+23],[x+92,y+23]]);J(x+80,y+19);J(x+84,y+19);
    A([[x+121,y+10],[x+128,y+10]]);T('fault',x+128,y+5,29,10,6.5);
    A([[x+121,y+23],[x+128,y+23]]);T('attr.',x+128,y+18,29,10,6.5);
  }
  {
    const x=112,y=328;
    Interior(x,y,55,29,'MMU',9);
    Cell('TLB',x+6,y+12,15,11,6,C.pale);M(x+27,y+12,5,13);
    A([[x,y+15],[x+6,y+15]]);A([[x+21,y+17],[x+27,y+17]]);
    A([[x+3,y+15],[x+3,y+26],[x+24,y+26],[x+24,y+22],[x+27,y+22]]);J(x+3,y+15);
    R([[x+32,y+19],[x+35,y+19],[x+35,y+27],[x+27,y+27],[x+27,y+29]],C.blue,1.05);
    B(x+37,y+12,16,13,C.pale);
    T('PMP',x+38,y+12,14,6,5);T('PMA',x+38,y+18,14,6,5);
    A([[x+35,y+19],[x+37,y+19]]);J(x+35,y+19);
  }

  // RVSOC 10.24/10.13: tag check, data array, and read-data selection.
  // I-cache deliberately has no CPU store/dirty path.
  {
    const x=111,y=375;
    Interior(x,y,57,40,'',9);T('I-cache',x+1.5,y+1,25,9,7.2,true);
    RAM('Tag',x+4,y+15,14,11,5.5);RAM('Data',x+25,y+15,15,11,5.5);
    R([[x+28,y],[x+28,y+12],[x+11,y+12],[x+11,y+15]]);
    R([[x+28,y+12],[x+33,y+12],[x+33,y+15]]);J(x+28,y+12);
    Cell('=',x+5,y+29,12,9,8);
    R([[x+11,y+26],[x+11,y+29]]);
    A([[x+11,y+12],[x+2,y+12],[x+2,y+34],[x+5,y+34]]);
    M(x+44,y+15,6,15);A([[x+40,y+20],[x+44,y+20]]);
    R([[x+50,y+22],[x+54,y+22],[x+54,y+20],[x+57,y+20]]);
    Cell('FSM',x+19,y+29,17,8,5.8,C.pale);
    L(x+17,y+34,x+19,y+34);
    A([[x+36,y+33],[x+47,y+33],[x+47,y+30]]);
    A([[x+28,y+40],[x+28,y+39],[x+42,y+39],[x+42,y+25],[x+44,y+25]]);
  }
  {
    const x=580,y=395;
    Interior(x,y,83,51,'',9.5);T('D-cache',x+41,y+1,40,9,8.5,true);
    RAM('Tag',x+5,y+15,23,14,6.5);RAM('Data',x+37,y+15,25,14,6.5);
    R([[x+38,y],[x+38,y+12],[x+16,y+12],[x+16,y+15]]);
    R([[x+38,y+12],[x+49,y+12],[x+49,y+15]]);J(x+38,y+12);
    Cell('=',x+37,y+34,11,10,8);
    R([[x+16,y+29],[x+16,y+31],[x+42,y+31],[x+42,y+34]]);
    A([[x+38,y+12],[x+34,y+12],[x+34,y+39],[x+37,y+39]]);
    Cell('cachefsm',x+4,y+34,28,11,6,C.pale);
    R([[x+48,y+39],[x+52,y+39],[x+52,y+47],[x+28,y+47],[x+28,y+45]]);
    M(x+70,y+15,7,21);A([[x+62,y+21],[x+70,y+21]]);
    R([[x+77,y+25],[x+83,y+25]]);
    A([[x+32,y+40],[x+35,y+40],[x+35,y+46],[x+73,y+46],[x+73,y+36]]);
    A([[x+42,y+51],[x+42,y+49],[x+65,y+49],[x+65,y+30],[x+70,y+30]]);
    // The external bidirectional cache-interface connection is a bundle.
    A([[x+65,y+30],[x+65,y+27],[x+62,y+27]]);J(x+65,y+30);
  }

  // Register-file structure, retaining all original A/RD/WD port positions.
  {
    const x=204,y=365;
    B(x+1.5,y+8,99,84,C.ip,'none',0);
    T('regfile',x+29,y+7,43,10,9.5,true);
    T('WE3',x+28,y+.5,22,6,5.7);
    RAM('x1\n...\nx31',x+31,y+30,28,35,7);
    P([[x+42,y+30],[x+45,y+33],[x+48,y+30]],'none',.65);
    Cell('DEC',x+12,y+55,14,17,5,C.white);
    M(x+77,y+18,9,22);M(x+77,y+47,9,22);
    [['A1',2,12],['A2',2,33],['WD3',2,77],['RD1',82,9],['RD2',82,44]].forEach(([v,a,b])=>T(v,x+a,y+b,19,7,6.3));
    T('A3',x+1,y+53,10,7,5.5);
    R([[x,y+21],[x+21,y+21],[x+21,y+25],[x+73,y+25],[x+73,y+16],[x+81,y+16],[x+81,y+18]]);
    R([[x,y+41],[x+28,y+41],[x+28,y+75],[x+81,y+75],[x+81,y+69]]);
    A([[x,y+61],[x+12,y+61]]);A([[x+26,y+62],[x+31,y+62]]);
    A([[x,y+85],[x+45,y+85],[x+45,y+65]]);
    A([[x+59,y+39],[x+68,y+39],[x+68,y+33],[x+77,y+33]]);
    A([[x+59,y+55],[x+68,y+55],[x+68,y+60],[x+77,y+60]]);
    T('0',x+65,y+18,6,6,6);A([[x+71,y+22],[x+77,y+24]]);
    T('0',x+65,y+44,6,6,6);A([[x+71,y+49],[x+77,y+52]]);
    R([[x+86,y+29],[x+95,y+29],[x+95,y+19],[x+102,y+19]]);
    R([[x+86,y+58],[x+95,y+58],[x+95,y+54],[x+102,y+54]]);
  }

  // RVSOC 7.3: arithmetic, bitwise, and shift results into an output MUX.
  // Preserve the original ALU silhouette, input pins and separate Sum output.
  {
    T('alu',470,381,26,10,9.5,true);
    // A/B are two separate bus rails. They never join each other.
    R([[449,390],[455,390],[455,395],[471,395]],C.blue,1.05);
    R([[449,440],[455,440],[455,449],[467,449],[467,397],[471,397]],C.blue,1.05);
    Cell('+ / -',471,391,21,11,7.3,C.white);
    // Independent adder result is the address output; also a result-MUX input.
    R([[492,396],[508,396],[508,398],[511,398]],C.blue,1.05);
    M(500,405,7,33);
    A([[496,396],[496,411],[500,411]]);J(496,396);
    Cell('shift',471,410,21,11,6.2);
    Gate('and',473,430,15,10);
    A([[461,395],[461,400],[469,400],[469,413],[471,413]]);
    A([[467,397],[467,419],[471,419]]);J(467,397);
    A([[469,413],[469,433],[473,433]]);J(469,413);
    A([[467,419],[467,437],[473,437]]);J(467,419);
    A([[492,416],[500,416]]);A([[488,435],[496,435],[496,431],[500,431]]);
    R([[507,421],[509,421],[509,431],[511,431]]);
    T('...',492,422,7,7,5.5);
  }

  // RVSOC 9.25: IFU/LSU request registers, arbitration and address selection.
  {
    const x=755,y=248;
    Interior(x,y,104,29,'',9);
    T('ebu',x+64,y+1,36,10,9.5,true);
    T('I',x+15,y+7,6,7,6);T('D',x+15,y+20,6,7,6);
    FF(x+24,y+10,6,8);FF(x+24,y+20,6,7);
    R([[x,y+21],[x+12,y+21],[x+12,y+14],[x+24,y+14]]);
    R([[x+42,y+29],[x+42,y+28],[x+21,y+28],[x+21,y+24],[x+24,y+24]]);
    M(x+39,y+11,7,15);
    A([[x+30,y+14],[x+39,y+15]]);A([[x+30,y+24],[x+35,y+24],[x+35,y+22],[x+39,y+22]]);
    R([[x+46,y+18],[x+51,y+18],[x+51,y]],C.blue,1.15);
    Cell('ebufsmarb',x+63,y+15,37,11,6.1,C.pale);
    A([[x+69,y+15],[x+69,y+9],[x+43,y+9],[x+43,y+11]]);
  }

  // RVSOC 9.14: register address/control, pass write data, select read data.
  // Vertical colored trunks collect different named signals, not shorted nets.
  {
    const x=426,y=151;
    Interior(x,y,149,45,'ahbapbbridge',10,C.ip);
    R([[x,y+33],[x+8,y+33],[x+8,y+13]],C.blue,1.1);
    R([[x+8,y+33],[x+8,y+40]],C.blue,1.1);
    R([[x+137,y+14],[x+137,y+40]],C.blue,1.1);
    R([[x+137,y+24],[x+149,y+24]],C.blue,1.1);
    FF(x+43,y+12,7,11);A([[x+8,y+17],[x+43,y+17]]);
    A([[x+50,y+17],[x+137,y+17]]);T('PADDR / PWRITE / PSEL',x+54,y+10,80,6,5.3);
    A([[x+8,y+25],[x+137,y+25]]);T('PWDATA / PSTRB',x+50,y+18,75,6,5.8);
    Cell('control',x+29,y+26,29,9,6.2,C.white);FF(x+76,y+26,7,9);
    A([[x+8,y+31],[x+29,y+31]]);A([[x+58,y+31],[x+76,y+31]]);A([[x+83,y+31],[x+137,y+31]]);
    T('PENABLE',x+90,y+25,39,6,5.6);
    M(x+111,y+36,6,8,true);
    A([[x+137,y+38],[x+117,y+38]]);A([[x+137,y+42],[x+117,y+42]]);
    A([[x+111,y+40],[x+8,y+40]]);T('HRDATA',x+37,y+35,64,5.5,5.5);
  }

  // RVSOC 20.11: the UART transmit path, not the complete UART.
  {
    const x=593,y=136;
    Interior(x,y,93,29,'uart_apb',9);
    RAM('FIFO',x+13,y+13,22,12,6.5);
    for(let i=0;i<4;i++)FF(x+53+i*6,y+13,6,12);
    T('TX',x+80,y+11,11,6,5.5);
    A([[x+45,y+29],[x+45,y+27],[x+5,y+27],[x+5,y+19],[x+13,y+19]]);
    A([[x+35,y+19],[x+53,y+19]]);A([[x+77,y+19],[x+93,y+19]]);
  }
  // RVSOC 20.4: GPIO output registers, XOR and output buffer.
  {
    const x=698,y=136;
    Interior(x,y,88,29,'gpio_apb',9);
    RAM('regs',x+10,y+13,18,12,6);
    Cell('XOR',x+41,y+14,17,11,5.5);
    A([[x+43,y+29],[x+43,y+27],[x+5,y+27],[x+5,y+19],[x+10,y+19]]);
    A([[x+28,y+17],[x+41,y+17]]);A([[x+28,y+23],[x+41,y+23]]);
    P([[x+66,y+14],[x+66,y+25],[x+75,y+19.5]],C.white);
    A([[x+58,y+19.5],[x+66,y+19.5]]);A([[x+75,y+19.5],[x+88,y+19.5]]);
  }

  // RVSOC 7.19: one stall and one flush equation as representative gate logic.
  // Parent output branches carry the complete Stall/Flush bundles.
  {
    const x=49,y=543;
    B(x+1.2,y+1.2,691.6,13.6,C.white,'none',0);
    T('hazard',x+4,y+3,47,10,8.5,true);
    T('StallDCause',x+67,y+1,62,6,5.5);T('StallE',x+67,y+8,62,6,5.5);
    Gate('or',x+143,y+2,14,12);
    R([[x+130,y+5],[x+145,y+5]]);R([[x+130,y+11],[x+145,y+11]]);
    A([[x+157,y+8],[x+181,y+8]]);T('StallD',x+182,y+4,38,8,6.5);
    T('~StallE',x+253,y+1,46,6,5.5);T('StallD',x+253,y+8,46,6,5.5);
    Gate('and',x+316,y+2,14,12);R([[x+300,y+5],[x+316,y+5]]);R([[x+300,y+11],[x+316,y+11]]);
    R([[x+330,y+8],[x+342,y+8],[x+342,y+5],[x+487,y+5]]);
    T('LatestUnstalledE',x+350,y+5,83,7,5.5);
    T('FlushECause',x+412,y+9,66,6,5.5);R([[x+478,y+12],[x+487,y+12]]);
    Gate('or',x+485,y+2,14,12);A([[x+499,y+8],[x+517,y+8]]);
    T('FlushE',x+519,y+4,39,8,6.5);T('Stall / Flush …',x+581,y+3,105,10,8);
  }
}
