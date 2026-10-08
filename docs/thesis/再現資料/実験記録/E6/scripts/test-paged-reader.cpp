#include "VPagedMemoryReader.h"
#include <deque>
#include <cstdio>
#include <cstdint>
#include <stdexcept>
#include <string>
struct Burst { uint32_t address; unsigned beat, length, ready; };
static uint32_t rng=0x81239a;
static uint32_t random32(){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return rng;}
static uint64_t value(uint32_t a){return (uint64_t(a^0x5a1d31f3)<<32)|(a^0xabc98761);}
static void tick(VPagedMemoryReader& t){t.aclk=0;t.eval();t.aclk=1;t.eval();}
int main(){
  constexpr unsigned pageBytes=2048, bytes=8, pages=4, words=pages*pageBytes/bytes;
  unsigned cases=0;
  for(unsigned outstanding:{1u,2u,4u,16u,32u})for(unsigned latency:{0u,4u,64u})for(unsigned gap:{0u,100u}){
    VPagedMemoryReader t;t.resetn=0;t.s_axis_tvalid=0;t.s_axis_tlast=0;t.m_mem_axi_arready=0;t.m_mem_axi_rvalid=0;t.m_mem_axi_rlast=0;t.m_mem_axi_rresp=0;t.m_mem_axi_rid=0;
    for(int i=0;i<5;i++)tick(t);t.resetn=1;
    for(unsigned transfer=0;transfer<2;transfer++){
      std::deque<Burst> q;unsigned sent=0,received=0,lasts=0,nextSource=0;
      const uint32_t base=0x9e000000+transfer*0x200000;
      for(unsigned cycle=0;cycle<500000 && received<words;cycle++){
        t.aclk=0;
        t.s_axis_tvalid=sent<pages && cycle>=nextSource;
        t.s_axis_tdata=base+sent*0x10000;
        t.s_axis_tlast=sent==pages-1;
        t.m_mem_axi_arready=q.size()<outstanding && (random32()%7)!=0;
        bool rv=!q.empty() && cycle>=q.front().ready && (random32()%5)!=0;
        t.m_mem_axi_rvalid=rv;
        t.m_mem_axi_rlast=rv && q.front().beat+1==q.front().length;
        t.m_mem_axi_rdata=rv?value(q.front().address+q.front().beat*bytes):0;
        t.eval();
        bool source=t.s_axis_tvalid && t.s_axis_tready;
        bool ar=t.m_mem_axi_arvalid && t.m_mem_axi_arready;
        bool rd=rv && t.m_mem_axi_rready;
        uint32_t addr=t.m_mem_axi_araddr;unsigned len=t.m_mem_axi_arlen+1;
        t.aclk=1;t.eval();
        if(source){sent++;nextSource=cycle+gap;}
        if(rd){if(++q.front().beat==q.front().length)q.pop_front();}
        if(ar)q.push_back({addr,0,len,cycle+latency+1});
        if(t.m_axis_tvalid){
          uint32_t wantAddr=base+(received/(pageBytes/bytes))*0x10000+(received%(pageBytes/bytes))*bytes;
          if(t.m_axis_tdata!=value(wantAddr)){
            std::printf("PAGED_FAIL kind=data outstanding=%u latency=%u gap=%u transfer=%u word=%u got=%016llx expected=%016llx\n",outstanding,latency,gap,transfer,received,(unsigned long long)t.m_axis_tdata,(unsigned long long)value(wantAddr));return 1;
          }
          bool wantLast=received+1==words;
          if(bool(t.m_axis_tlast)!=wantLast){
            std::printf("PAGED_FAIL kind=last outstanding=%u latency=%u gap=%u transfer=%u word=%u actual_last=%u expected_last=%u\n",outstanding,latency,gap,transfer,received,unsigned(t.m_axis_tlast),unsigned(wantLast));return 1;
          }
          lasts+=t.m_axis_tlast;received++;
        }
      }
      if(received!=words || lasts!=1 || !q.empty()){std::puts("PAGED_FAIL incomplete");return 1;}
      t.s_axis_tvalid=0;t.m_mem_axi_arready=0;t.m_mem_axi_rvalid=0;t.m_mem_axi_rlast=0;
      for(int i=0;i<6;i++)tick(t);
    }
    cases++;std::printf("PAGED_PASS outstanding=%u latency=%u gap=%u words=%u\n",outstanding,latency,gap,2*words);
  }
  std::printf("PAGED_ALL_PASS cases=%u\n",cases);
}

