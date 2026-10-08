#include "VCommandParser.h"
#include <cstdint>
#include <cstdio>
#include <vector>
static void tick(VCommandParser& t){t.aclk=0;t.eval();t.aclk=1;t.eval();}
int main(){
 unsigned cases=0, failures=0;
 for(unsigned gap:{0u,5u,20u,100u})for(unsigned delay:{0u,100u,500u}){
  VCommandParser t;t.resetn=0;t.s_cmd_axis_tvalid=0;t.s_cmd_axis_tlast=0;
  t.m_cmd_fog_axis_tready=1;t.m_cmd_rasterizer_axis_tready=1;t.m_cmd_tmu0_axis_tready=1;t.m_cmd_tmu1_axis_tready=1;t.m_cmd_config_axis_tready=1;
  t.rasterizerRunning=0;t.pixelInPipeline=0;t.dataInTriangleInterpolator=0;
  t.colorBufferApplied=1;t.depthBufferApplied=1;t.stencilBufferApplied=1;
  for(int i=0;i<5;i++)tick(t);t.resetn=1;
  constexpr unsigned pages=8; unsigned sent=0,received=0,nextSource=0,readyCycle=0; bool failed=false;
  for(unsigned cycle=0;cycle<20000 && received<pages;cycle++){
   t.aclk=0;t.s_cmd_axis_tvalid=sent<pages+1 && cycle>=nextSource;
   t.s_cmd_axis_tdata=sent?0x9e000000+(sent-1)*2048:0x50000000|pages;
   t.m_cmd_tmu0_axis_tready=cycle>=readyCycle;t.eval();
   bool sh=t.s_cmd_axis_tvalid && t.s_cmd_axis_tready;
   bool mh=t.m_cmd_tmu0_axis_tvalid && t.m_cmd_tmu0_axis_tready;
   uint32_t data=t.m_cmd_xxx_axis_tdata; bool last=t.m_cmd_xxx_axis_tlast;
   t.aclk=1;t.eval();
   if(sh){sent++;nextSource=cycle+gap+1;}
   if(mh){
    uint32_t expected=0x9e000000+received*2048;
    if(data!=expected || last!=(received==pages-1)){
      std::printf("PARSER_DIFF gap=%u delay=%u word=%u actual=%08x expected=%08x last=%u\n",gap,delay,received,data,expected,last);failed=true;
    }
    received++;readyCycle=cycle+delay+1;
   }
  }
  if(received!=pages || sent!=pages+1)failed=true;
  std::printf("PARSER_CASE gap=%u delay=%u sent=%u received=%u result=%s\n",gap,delay,sent,received,failed?"FAIL":"PASS");cases++;failures+=failed;
 }
 std::printf("PARSER_SUMMARY cases=%u failures=%u\n",cases,failures);return failures?1:0;
}
