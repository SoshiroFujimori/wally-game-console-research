// External 2D integration test: one-page and multi-page texture uploads.
#include "WallyBusConnector.hpp"
#include "NoThreadRunner.hpp"
#include "RIXGL.hpp"
#include "renderer/devicedatauploader/DeviceDataUploader.hpp"
#include "renderer/threadedvertextransformer/ThreadedVertexTransformer.hpp"
#include "gl.h"
#include <vector>
#include <memory>
#include <cstdio>
#include <stdexcept>
#include <algorithm>
#include <cstdlib>
#include <fstream>
#include <string>
int main(int argc,char** argv){
  const int only=argc>1?std::atoi(argv[1]):0;
  const bool keep=argc>2;
  unsigned failures=0;
  try{
    WallyBusConnector bus;
    rr::devicedatauploader::DeviceDataUploader uploader(bus);
    rr::NoThreadRunner worker,transfer;
    auto device=std::make_unique<rr::threadedvertextransformer::ThreadedVertexTransformer>(uploader,worker,transfer);
    if(!rr::RIXGL::createInstance(*device))throw std::runtime_error("context");
    auto& gl=rr::RIXGL::getInstance();
    glClearColor(0,0,0,1);glClear(GL_COLOR_BUFFER_BIT);
    if(!gl.setRenderResolution(640,480))throw std::runtime_error("resolution");
    glViewport(0,0,640,480);glMatrixMode(GL_PROJECTION);glLoadIdentity();glOrtho(0,640,480,0,-1,1);
    glMatrixMode(GL_MODELVIEW);glLoadIdentity();glTranslatef(-0.5f,0.5f,0);
    glDisable(GL_DEPTH_TEST);glDisable(GL_CULL_FACE);glDisable(GL_LIGHTING);glDisable(GL_BLEND);
    glColor4f(1,1,1,1);
    constexpr unsigned colors[]={0xff0000,0x00ff00,0x0000ff,0xffff00,0xff00ff,0x00ffff,0xffffff,0x000000};
    constexpr uint16_t rgb565[]={0xf800,0x07e0,0x001f,0xffe0,0xf81f,0x07ff,0xffff,0};
    for(int n:{32,64,256}){
      if(only && only!=n)continue;
      std::vector<unsigned char> pixels(n*n*4);
      for(int y=0;y<n;y++)for(int x=0;x<n;x++){
        unsigned c=colors[((x/8)+3*(y/8))%8];size_t i=(y*n+x)*4;
        pixels[i]=c>>16;pixels[i+1]=c>>8;pixels[i+2]=c;pixels[i+3]=255;
      }
      GLuint tex;glGenTextures(1,&tex);glBindTexture(GL_TEXTURE_2D,tex);
      glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_NEAREST);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_NEAREST);
      glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_CLAMP_TO_EDGE);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_CLAMP_TO_EDGE);
      std::printf("TEXTURE_BEGIN size=%d\n",n);std::fflush(stdout);
      glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA,n,n,0,GL_RGBA,GL_UNSIGNED_BYTE,pixels.data());
      const int x0=(640-n)/2,y0=(480-n)/2;
      for(int repeat=0;repeat<4;repeat++){
        glClear(GL_COLOR_BUFFER_BIT);glEnable(GL_TEXTURE_2D);
        glBegin(GL_QUADS);
        glTexCoord2f(0,0);glVertex2f(x0,y0);
        glTexCoord2f(1,0);glVertex2f(x0+n,y0);
        glTexCoord2f(1,1);glVertex2f(x0+n,y0+n);
        glTexCoord2f(0,1);glVertex2f(x0,y0+n);
        glEnd();glDisable(GL_TEXTURE_2D);
        auto before=bus.frameCount();gl.swapDisplayList();bus.waitForFrame(before);
      }
      if(glGetError()!=GL_NO_ERROR)throw std::runtime_error("GL error");
      uint32_t address=bus.frameAddress(),count=bus.frameCount();
      if(address!=0x9fc00000 && address!=0x9fe00000)throw std::runtime_error("frame address");
      std::vector<unsigned char> data(640*480*2);
      for(unsigned offset=0;offset<data.size();offset+=65536){
        auto length=std::min<unsigned>(65536,data.size()-offset);
        if(!uploader.readFromDeviceMemory({data.data()+offset,length},address-0x9e000000+offset))throw std::runtime_error("readback");
      }
      if(count!=bus.frameCount() || address!=bus.frameAddress())throw std::runtime_error("frame changed");
      unsigned mismatches=0;
      for(int y=0;y<480;y++)for(int x=0;x<640;x++){
        uint16_t expected=0;
        if(x>=x0&&x<x0+n&&y>=y0&&y<y0+n)expected=rgb565[(((x-x0)/8)+3*((y-y0)/8))%8];
        size_t i=(y*640+x)*2;
        if(uint16_t(data[i]|(data[i+1]<<8))!=expected){if(mismatches<12)std::printf("TEXTURE_DIFF x=%d y=%d actual=%04x expected=%04x\n",x,y,uint16_t(data[i]|(data[i+1]<<8)),expected);mismatches++;}
      }
      std::printf("TEXTURE_CHECK size=%d pixels=307200 mismatches=%u\n",n,mismatches);std::fflush(stdout);
      {std::ofstream f("/tmp/texture-probe-"+std::to_string(n)+".rgb565",std::ios::binary);f.write(reinterpret_cast<const char*>(data.data()),data.size());}
      failures+=mismatches?1:0;
      if(!keep)glDeleteTextures(1,&tex);
    }
    rr::RIXGL::destroy();device->deinit();
    std::printf("TEXTURE_PROBE_FINISHED failures=%u only=%d keep=%d\n",failures,only,keep);return failures?1:0;
  }catch(const std::exception& e){std::fprintf(stderr,"TEXTURE_2D_FAIL %s\n",e.what());return 1;}
}
