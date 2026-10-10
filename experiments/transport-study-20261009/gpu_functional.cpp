// SPDX-License-Identifier: GPL-3.0-or-later
// Full RTL functional check. Host elapsed time is not FPGA or Wally performance.
#include "GpuSimBus.hpp"
#include "game.hpp"
#include "NoThreadRunner.hpp"
#include "RIXGL.hpp"
#include "renderer/devicedatauploader/DeviceDataUploader.hpp"
#include "renderer/threadedvertextransformer/ThreadedVertexTransformer.hpp"
#include "gl.h"
#include <cstdio>
#include <memory>

static void quad(int x,int y,int w,int h,uint32_t color) {
    glColor4ub(color>>16,color>>8,color,255);
    glVertex2f(x,y); glVertex2f(x+w,y); glVertex2f(x+w,y+h); glVertex2f(x,y+h);
}
int main(int argc,char** argv) {
    try {
        if (argc != 5 && argc != 6) throw std::runtime_error("Use: gpu-functional apb|dma STATE INPUT_GAP SEED [DMA_CHUNK_BYTES]");
        const std::string mode=argv[1];
        if (mode!="apb" && mode!="dma") throw std::runtime_error("Invalid mode");
        const unsigned state=std::stoul(argv[2]), gap=std::stoul(argv[3]), seed=std::stoul(argv[4]);
        GpuSimBus bus(mode=="dma",gap,seed,argc==6?std::stoul(argv[5]):0);
        rr::devicedatauploader::DeviceDataUploader uploader(bus);
        rr::NoThreadRunner worker,transfer;
        auto device=std::make_unique<rr::threadedvertextransformer::ThreadedVertexTransformer>(uploader,worker,transfer);
        if (!rr::RIXGL::createInstance(*device)) throw std::runtime_error("context");
        auto& gl=rr::RIXGL::getInstance();
        if (!gl.setRenderResolution(640,480)) throw std::runtime_error("resolution");
        glViewport(0,0,640,480); glMatrixMode(GL_PROJECTION); glLoadIdentity(); glOrtho(0,640,480,0,-1,1);
        glMatrixMode(GL_MODELVIEW); glLoadIdentity(); glTranslatef(-0.5f,0.5f,0);
        glDisable(GL_DEPTH_TEST); glDisable(GL_CULL_FACE); glDisable(GL_LIGHTING);
        glDisable(GL_BLEND); glDisable(GL_TEXTURE_2D);
        breakout::Game game;
        for (unsigned i=0;i<state;++i) game.step(game.automatic());
        for (unsigned repeat=0;repeat<4;++repeat) {
            if (repeat) game.step(game.automatic());
            auto scene=breakout::scene(game,true,1);
            glClearColor(0,0,0,1); glClear(GL_COLOR_BUFFER_BIT);
            glBegin(GL_QUADS);
            for (const auto& r:scene.rects) quad(r.x,r.y,r.w,r.h,r.color);
            // Glyph pixels as quads isolate command/DDR correctness from texture loading.
            for (const auto& g:scene.glyphs) {
                auto rows=breakout::glyph(g.code);
                for (int y=0;y<7;++y) for (int x=0;x<5;++x)
                    if (rows[y] & (1u<<(4-x))) quad(g.x+x*g.scale,g.y+y*g.scale,g.scale,g.scale,g.color);
            }
            glEnd();
            auto previous=bus.frameCount(); gl.swapDisplayList(); bus.waitForFrame(previous);
            if (glGetError()!=GL_NO_ERROR) throw std::runtime_error("GL error");
            auto expected=breakout::reference(scene); const auto* actual=bus.framePixels();
            unsigned mismatch=0; uint32_t hash=2166136261u;
            for (unsigned i=0;i<expected.size();++i) {
                uint16_t got=actual[2*i] | (actual[2*i+1]<<8);
                if (got!=expected[i]) { if (mismatch<4) std::printf("DIFF x=%u y=%u got=%04x expected=%04x\n",i%640,i/640,got,expected[i]); ++mismatch; }
                hash=(hash^actual[2*i])*16777619u; hash=(hash^actual[2*i+1])*16777619u;
            }
            std::printf("GPU_FRAME mode=%s state=%u gap=%u seed=%u repeat=%u pixels=%zu mismatches=%u hash=%08x cycles=%llu\n",mode.c_str(),state,gap,seed,repeat,expected.size(),mismatch,hash,(unsigned long long)bus.cycles);
            std::fflush(stdout);
            if (mismatch) throw std::runtime_error("frame mismatch");
        }
        device->deinit(); std::puts("GPU_FUNCTIONAL_PASS");
    } catch (const std::exception& e) { std::fprintf(stderr,"GPU_FUNCTIONAL_FAIL %s\n",e.what()); return 1; }
}
