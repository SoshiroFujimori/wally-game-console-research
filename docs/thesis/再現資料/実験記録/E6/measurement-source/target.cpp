// SPDX-License-Identifier: GPL-3.0-or-later
// External experiment. All upstream sources and the published Wally adapter are unchanged.
#include "game.hpp"
#include "damage.hpp"
#include "WallyBusConnector.hpp"
#include "RIXGL.hpp"
#include "renderer/devicedatauploader/DeviceDataUploader.hpp"
#include "renderer/threadedvertextransformer/ThreadedVertexTransformer.hpp"
#include "IThreadRunner.hpp"
#include "gl.h"
#include <ctime>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <memory>
#include <stdexcept>
#include <unistd.h>
using namespace breakout;
uint64_t now() { timespec ts{};if(clock_gettime(CLOCK_MONOTONIC_RAW,&ts)) throw std::runtime_error("clock_gettime"); return uint64_t(ts.tv_sec)*1000000000ull+ts.tv_nsec; }
struct DeviceCounters {
    volatile uint32_t* regs=nullptr;
    DeviceCounters() {
        int fd=open("/dev/mem",O_RDWR|O_SYNC);
        if(fd<0) throw std::runtime_error("counter /dev/mem");
        void* ptr=mmap(nullptr,4096,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0x10080000);
        close(fd);
        if(ptr==MAP_FAILED) throw std::runtime_error("counter mmap");
        regs=static_cast<volatile uint32_t*>(ptr);
    }
    ~DeviceCounters(){if(regs)munmap(const_cast<uint32_t*>(regs),4096);}
    bool enabled() const {return (regs[11]>>16)==0x4649;}
    void clear(){if(enabled()){regs[31]=1;asm volatile("fence iorw, iorw":::"memory");}}
    void report(){
        if(!enabled()){std::puts("HW_COUNTERS unavailable");return;}
        const uint32_t words=regs[7],waits=regs[8],longest=regs[9],cycles=regs[10],id=regs[11];
        std::printf("HW_COUNTERS id=%08x words=%u wait_cycles=%u longest_wait_cycles=%u total_cycles=%u cpu_hz=20000000\n",id,words,waits,longest,cycles);
    }
};

struct Counters { uint64_t writeNs=0,readNs=0,writeBytes=0,readBytes=0,writes=0,reads=0,workerNs=0,uploadNs=0; };
class TimedRunner: public rr::IThreadRunner {
    uint64_t& total;
    bool detailed;
public:
    explicit TimedRunner(uint64_t& t,bool d):total(t),detailed(d){}
    void wait() override {} bool isBusy() const override {return false;}
    void run(const std::function<void()>& f) override {if(!detailed) {f();return;} auto a=now();f();total+=now()-a;}
};
struct Packet { uint8_t index; uint32_t offset; std::vector<uint8_t> bytes; };
class MeasuredBus: public rr::IBusConnector {
public:
    WallyBusConnector raw;
    Counters& stats;
    bool detailed;
    std::vector<Packet>* capture=nullptr;
    explicit MeasuredBus(Counters& c,bool d):stats(c),detailed(d){}
    void writeData(uint8_t index,uint32_t size,uint32_t offset=0) override {
        if(capture) {auto p=raw.requestWriteBuffer(index);capture->push_back({index,offset,{p.data()+offset,p.data()+offset+size}});}
        auto a=detailed?now():0;raw.writeData(index,size,offset);if(detailed) stats.writeNs+=now()-a;stats.writeBytes+=size;++stats.writes;
    }
    void readData(uint8_t index,uint32_t size) override {
        if(capture) throw std::runtime_error("Read-dependent command capture is unsupported");
        auto a=detailed?now():0;raw.readData(index,size);if(detailed) stats.readNs+=now()-a;stats.readBytes+=size;++stats.reads;
    }
    void blockUntilTransferIsComplete() override {raw.blockUntilTransferIsComplete();}
    tcb::span<uint8_t> requestWriteBuffer(uint8_t i) override {return raw.requestWriteBuffer(i);}
    tcb::span<uint8_t> requestReadBuffer(uint8_t i) override {return raw.requestReadBuffer(i);}
    uint8_t getWriteBufferCount() const override {return raw.getWriteBufferCount();}
    uint8_t getReadBufferCount() const override {return raw.getReadBufferCount();}
    void replay(const std::vector<Packet>& packets) {
        for(const auto& p:packets) {auto b=raw.requestWriteBuffer(p.index);if(p.offset+p.bytes.size()>b.size()) throw std::runtime_error("Replay range");std::memcpy(b.data()+p.offset,p.bytes.data(),p.bytes.size());writeData(p.index,p.bytes.size(),p.offset);}
    }
};
struct Options {
    unsigned frames=600,warmup=60,stateFrame=0,holdMs=0;
    int blocks=40,tiles=1;
    bool fixed=false,hud=true,replay=false,spin=false,detailed=true,pixelCenters=true,retained=false,grouped=false;
    std::string csv="/tmp/breakout.csv",dump,input;
};
Options parse(int argc,char** argv) {
    Options o;
    for(int i=1;i<argc;++i) {
        std::string a=argv[i];auto value=[&](){if(++i>=argc) throw std::runtime_error("Missing option value");return std::string(argv[i]);};
        if(a=="--frames") o.frames=std::stoul(value());else if(a=="--warmup") o.warmup=std::stoul(value());
        else if(a=="--state-frame") o.stateFrame=std::stoul(value());else if(a=="--hold-ms") o.holdMs=std::stoul(value());
        else if(a=="--blocks") o.blocks=std::stoi(value());else if(a=="--tiles") o.tiles=std::stoi(value());
        else if(a=="--retained") o.retained=true;else if(a=="--grouped") o.grouped=true;
        else if(a=="--legacy-pixel-origin") o.pixelCenters=false;else if(a=="--fixed") o.fixed=true;else if(a=="--no-hud") o.hud=false;else if(a=="--replay") {o.replay=true;o.fixed=true;}
        else if(a=="--wait") {auto v=value();if(v!="spin" && v!="sleep") throw std::runtime_error("Invalid wait");o.spin=v=="spin";}
        else if(a=="--profile") {auto v=value();if(v!="detailed" && v!="frame") throw std::runtime_error("Invalid profile");o.detailed=v=="detailed";}
        else if(a=="--csv") o.csv=value();else if(a=="--dump") o.dump=value();else if(a=="--input") o.input=value();
        else throw std::runtime_error("Unknown option: "+a);
    }
    if(!o.frames || o.frames>100000 || o.blocks<0 || o.blocks>40 || o.tiles<1 || o.tiles>8) throw std::runtime_error("Option range");
    if(o.retained && o.replay) throw std::runtime_error("Retained replay is unsupported");
    return o;
}
void color(uint32_t c) {glColor4ub((c>>16)&255,(c>>8)&255,c&255,255);}
void quad(float x,float y,float w,float h,float u=0,float v=0,float uw=0,float vh=0) {
    glBegin(GL_QUADS);
    glTexCoord2f(u,v);glVertex2f(x,y);glTexCoord2f(u+uw,v);glVertex2f(x+w,y);
    glTexCoord2f(u+uw,v+vh);glVertex2f(x+w,y+h);glTexCoord2f(u,v+vh);glVertex2f(x,y+h);
    glEnd();
}
// Only the characters used by this fixed experiment are needed. One 4096-byte
// RGBA4444 page avoids the multi-page address-stream backpressure defect.
constexpr char FontCharacters[] = " 0123456789ABCDEGIKLMORSTUVWY";
constexpr auto FontSlots = [] {
    std::array<unsigned char,128> slots{};
    for(auto& slot:slots) slot=255;
    for(unsigned i=0;i<sizeof(FontCharacters)-1;++i) slots[unsigned(FontCharacters[i])]=i;
    return slots;
}();
static_assert(sizeof(FontCharacters)-1<=32);
GLuint makeFont() {
    std::vector<uint8_t> pixels(64*32*4,255);
    for(unsigned i=0;i<64*32;++i) pixels[i*4+3]=0;
    for(unsigned slot=0;slot<sizeof(FontCharacters)-1;++slot) {auto rows=glyph(FontCharacters[slot]);for(int y=0;y<7;++y) for(int x=0;x<5;++x) if(rows[y]&(1<<(4-x))) pixels[4*((slot/8*8+y)*64+(slot%8*8+x))+3]=255;}
    GLuint t;glGenTextures(1,&t);glBindTexture(GL_TEXTURE_2D,t);
    glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_NEAREST);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_CLAMP_TO_EDGE);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_CLAMP_TO_EDGE);
    glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA,64,32,0,GL_RGBA,GL_UNSIGNED_BYTE,pixels.data());
    return t;
}
void drawOriginal(const Scene& s,GLuint font) {
    glClearColor(0,0,0,1);glClear(GL_COLOR_BUFFER_BIT);
    glDisable(GL_TEXTURE_2D);glDisable(GL_BLEND);
    for(const auto& r:s.rects) {color(r.color);quad(r.x,r.y,r.w,r.h);}
    glEnable(GL_TEXTURE_2D);glEnable(GL_BLEND);glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);glBindTexture(GL_TEXTURE_2D,font);
    for(const auto& g:s.glyphs) {unsigned slot=g.code<128?FontSlots[g.code]:255;if(slot==255) throw std::runtime_error("Unsupported experiment glyph");color(g.color);quad(g.x,g.y,8*g.scale,8*g.scale,float((slot%8)*8)/64,float((slot/8)*8)/32,8.0f/64,8.0f/32);}
    glDisable(GL_BLEND);glDisable(GL_TEXTURE_2D);
}

void emitQuad(float x,float y,float w,float h,float u=0,float v=0,float uw=0,float vh=0) {
    glTexCoord2f(u,v);glVertex2f(x,y);glTexCoord2f(u+uw,v);glVertex2f(x+w,y);
    glTexCoord2f(u+uw,v+vh);glVertex2f(x+w,y+h);glTexCoord2f(u,v+vh);glVertex2f(x,y+h);
}
uint64_t submittedQuads=0,fullFrames=0;
void drawGrouped(const Scene& s,GLuint font,bool clear) {
    if(clear) {glClearColor(0,0,0,1);glClear(GL_COLOR_BUFFER_BIT);}
    glDisable(GL_TEXTURE_2D);glDisable(GL_BLEND);
    if(!s.rects.empty()) {
        glBegin(GL_QUADS);
        for(const auto& r:s.rects) {color(r.color);emitQuad(r.x,r.y,r.w,r.h);}
        glEnd();
    }
    if(!s.glyphs.empty()) {
        glEnable(GL_TEXTURE_2D);glEnable(GL_BLEND);glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);glBindTexture(GL_TEXTURE_2D,font);
        glBegin(GL_QUADS);
        for(const auto& g:s.glyphs) {
            unsigned slot=g.code<128?FontSlots[g.code]:255;
            if(slot==255) throw std::runtime_error("Unsupported glyph");
            color(g.color);emitQuad(g.x,g.y,8*g.scale,8*g.scale,float((slot%8)*8)/64,float((slot/8)*8)/32,8.0f/64,8.0f/32);
        }
        glEnd();glDisable(GL_BLEND);glDisable(GL_TEXTURE_2D);
    }
}
void draw(const Scene& s,GLuint font,const Options& o) {
    static std::array<Scene,2> previous;
    static unsigned drawn=0;
    if(!o.retained) {
        submittedQuads+=s.rects.size()+s.glyphs.size();++fullFrames;
        if(o.grouped) drawGrouped(s,font,true);else drawOriginal(s,font);
        return;
    }
    const unsigned slot=drawn%2;
    // The upstream renderer initially selects LOC_1 twice before alternating.
    // Three complete draws initialize both physical buffers and both history slots.
    if(drawn<3) {drawGrouped(s,font,true);submittedQuads+=s.rects.size()+s.glyphs.size();++fullFrames;}
    else {auto delta=damageScene(previous[slot],s);drawGrouped(delta,font,false);submittedQuads+=delta.rects.size()+delta.glyphs.size();}
    previous[slot]=s;++drawn;
}

struct Frame {unsigned index;uint32_t stateHash,done;uint64_t logic,api,swap,wait,total,interval,polls;Counters c;};
uint64_t waitForFrame(MeasuredBus& bus,uint32_t previous,bool spin) {
    const auto deadline=now()+30000000000ull;uint64_t polls=0;
    while(bus.raw.frameCount()==previous) {++polls;if(now()>deadline) throw std::runtime_error("Display timeout");if(!spin) usleep(1000);}
    if(uint32_t(bus.raw.frameCount()-previous)!=1) throw std::runtime_error("Unexpected completed-swap count");
    return polls;
}
void dumpFrame(MeasuredBus& bus,rr::devicedatauploader::DeviceDataUploader& dev,const Scene& s,const std::string& path) {
    const auto address=bus.raw.frameAddress(),count=bus.raw.frameCount();
    if(address!=0x9fc00000 && address!=0x9fe00000) throw std::runtime_error("Unexpected framebuffer address");
    std::vector<uint8_t> data(640*480*2);
    for(unsigned offset=0;offset<data.size();offset+=65536) {auto n=std::min<unsigned>(65536,data.size()-offset);if(!dev.readFromDeviceMemory({data.data()+offset,n},address-0x9e000000+offset)) throw std::runtime_error("Frame readback failed");}
    if(bus.raw.frameAddress()!=address || bus.raw.frameCount()!=count) throw std::runtime_error("Display changed during readback");
    std::ofstream f(path,std::ios::binary);f.write(reinterpret_cast<const char*>(data.data()),data.size());if(!f) throw std::runtime_error("Cannot save readback");
    auto ref=reference(s);std::ofstream rf(path+".expected",std::ios::binary);unsigned mismatch=0;uint32_t h=2166136261u;
    for(unsigned i=0;i<ref.size();++i) {rf.put(char(ref[i]&255));rf.put(char(ref[i]>>8));if(uint16_t(data[i*2]|(data[i*2+1]<<8))!=ref[i]) ++mismatch;}
    for(auto a:data) h=(h^a)*16777619u;
    std::printf("FRAME_CHECK count=%u address=%08x fnv1a=%08x pixels=%zu mismatches=%u\n",count,address,h,ref.size(),mismatch);
    if(mismatch) throw std::runtime_error("Framebuffer does not match reference");
}
int main(int argc,char** argv) {
 try {
    Options o=parse(argc,argv);DeviceCounters hw;Counters stats;MeasuredBus bus(stats,o.detailed);
    rr::devicedatauploader::DeviceDataUploader uploader(bus);TimedRunner worker(stats.workerNs,o.detailed),upload(stats.uploadNs,o.detailed);
    auto device=std::make_unique<rr::threadedvertextransformer::ThreadedVertexTransformer>(uploader,worker,upload);
    if(!rr::RIXGL::createInstance(*device)) throw std::runtime_error("OpenGL context");auto& gl=rr::RIXGL::getInstance();
    if(!gl.setRenderResolution(640,480)) throw std::runtime_error("Resolution");
    glViewport(0,0,640,480);glMatrixMode(GL_PROJECTION);glLoadIdentity();glOrtho(0,640,480,0,-1,1);glMatrixMode(GL_MODELVIEW);glLoadIdentity();
    // Upstream Rasterizer::rasterize evaluates edge functions at integer window
    // coordinates. Translate standard half-pixel sample centers into that grid.
    // With a top-left projection, negative window Y is positive application Y.
    if(o.pixelCenters) glTranslatef(-0.5f,0.5f,0.0f);
    glDisable(GL_DEPTH_TEST);glDisable(GL_CULL_FACE);glDisable(GL_LIGHTING);GLuint font=makeFont();
    Game game;for(unsigned i=0;i<o.stateFrame;++i) game.step(game.automatic());
    if(o.blocks!=40) for(int i=o.blocks;i<40;++i) game.blocks[i]=false;
    std::vector<Input> inputs;
    if(!o.input.empty()) {std::ifstream f(o.input);int move,start;while(f>>move>>start) inputs.push_back({move,start!=0});if(!f.eof()) throw std::runtime_error("Input file");if(inputs.size()<o.frames+o.warmup) throw std::runtime_error("Input file too short");}
    Scene current=scene(game,o.hud,o.tiles);
    // Prime textures, both external buffers, the code path, and the current MMIO mapping.
    for(int i=0;i<4;++i) {draw(current,font,o);auto n=bus.raw.frameCount();gl.swapDisplayList();waitForFrame(bus,n,o.spin);}
    std::array<std::vector<Packet>,2> captured;
    if(o.replay) for(int i=0;i<2;++i) {bus.capture=&captured[i];draw(current,font,o);auto n=bus.raw.frameCount();gl.swapDisplayList();waitForFrame(bus,n,o.spin);bus.capture=nullptr;}
    std::vector<Frame> records;records.reserve(o.frames);
    auto t0=now();for(int i=0;i<1000;++i) (void)now();const auto clockCost=(now()-t0)/1000;
    std::printf("BEGIN_BREAKOUT frames=%u warmup=%u fixed=%d blocks=%d tiles=%d hud=%d wait=%s replay=%d state_frame=%u profile=%s pixel_centers=%d clock_call_ns=%llu\n",o.frames,o.warmup,o.fixed,o.blocks,o.tiles,o.hud,o.spin?"spin":"sleep",o.replay,o.stateFrame,o.detailed?"detailed":"frame",o.pixelCenters,(unsigned long long)clockCost);std::fflush(stdout);
    uint64_t start=0,finish=0,previousCompletion=0;
    for(unsigned i=0;i<o.warmup+o.frames;++i) {
        if(i==o.warmup) {hw.clear();submittedQuads=0;fullFrames=0;previousCompletion=start=now();}
        stats={};const auto a=now();
        if(!o.fixed) {Input in=inputs.empty()?game.automatic():inputs[i];game.step(in);}
        current=scene(game,o.hud,o.tiles);const auto b=o.detailed?now():0;
        if(!o.replay) draw(current,font,o);const auto c=o.detailed?now():0;auto previous=bus.raw.frameCount();
        if(o.replay) bus.replay(captured[i%2]);else gl.swapDisplayList();const auto d=o.detailed?now():0;
        auto polls=waitForFrame(bus,previous,o.spin);const auto e=now();
        auto error=glGetError();if(error!=GL_NO_ERROR) throw std::runtime_error("OpenGL error "+std::to_string(error));
        if(i>=o.warmup) records.push_back({i-o.warmup,game.hash(),bus.raw.frameCount(),o.detailed?b-a:0,o.detailed?c-b:0,o.detailed?d-c:0,o.detailed?e-d:0,e-a,e-previousCompletion,polls,stats});
        previousCompletion=finish=e;
    }
    hw.report();
    std::ofstream csv(o.csv);if(!csv) throw std::runtime_error("Cannot open CSV");
    csv<<"frame,state_hash,display_count,logic_ns,api_ns,swap_ns,wait_ns,total_ns,completion_interval_ns,polls,worker_inclusive_ns,upload_inclusive_ns,write_ns,read_ns,write_bytes,read_bytes,write_calls,read_calls\n";
    for(const auto& f:records) csv<<f.index<<','<<f.stateHash<<','<<f.done<<','<<f.logic<<','<<f.api<<','<<f.swap<<','<<f.wait<<','<<f.total<<','<<f.interval<<','<<f.polls<<','<<f.c.workerNs<<','<<f.c.uploadNs<<','<<f.c.writeNs<<','<<f.c.readNs<<','<<f.c.writeBytes<<','<<f.c.readBytes<<','<<f.c.writes<<','<<f.c.reads<<'\n';
    csv.close();if(!csv) throw std::runtime_error("CSV write failure");
    uint64_t sumLogic=0,sumApi=0,sumSwap=0,sumWait=0,sumWrite=0,sumWorker=0,sumUpload=0,sumBytes=0;std::vector<uint64_t> intervals;unsigned late=0;
    for(const auto& f:records){sumLogic+=f.logic;sumApi+=f.api;sumSwap+=f.swap;sumWait+=f.wait;sumWrite+=f.c.writeNs;sumWorker+=f.c.workerNs;sumUpload+=f.c.uploadNs;sumBytes+=f.c.writeBytes;intervals.push_back(f.interval);late+=f.interval>16666667;}
    std::sort(intervals.begin(),intervals.end());const double div=double(o.frames)*1e6;
    std::printf("RESULT frames=%u elapsed_s=%.9f fps=%.6f logic_ms=%.6f api_ms=%.6f swap_ms=%.6f wait_ms=%.6f worker_inclusive_ms=%.6f upload_inclusive_ms=%.6f write_ms=%.6f bytes_per_frame=%.2f p50_ms=%.6f p95_ms=%.6f max_ms=%.6f late_60hz=%u first_count=%u last_count=%u state_hash=%08x remaining=%d score=%d\n",o.frames,double(finish-start)/1e9,double(o.frames)*1e9/(finish-start),sumLogic/div,sumApi/div,sumSwap/div,sumWait/div,sumWorker/div,sumUpload/div,sumWrite/div,double(sumBytes)/o.frames,intervals[intervals.size()/2]/1e6,intervals[(intervals.size()-1)*95/100]/1e6,intervals.back()/1e6,late,records.front().done,records.back().done,game.hash(),game.remaining(),game.score);
    std::printf("RENDER_PATH retained=%d grouped=%d quads=%llu full_frames=%llu\n",o.retained,o.grouped,(unsigned long long)submittedQuads,(unsigned long long)fullFrames);
    std::fflush(stdout);
    if(!o.dump.empty()) dumpFrame(bus,uploader,current,o.dump);
    if(o.holdMs) usleep(o.holdMs*1000);
    device->deinit();
    // The completed framebuffer remains selected for external capture.
    std::puts("BREAKOUT_PASS");return 0;
 }catch(const std::exception& e){std::fprintf(stderr,"BREAKOUT_FAIL: %s\n",e.what());return 1;}
}
