// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <algorithm>
#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace breakout {
constexpr int Width=640, Height=480, Q=256, Radius=5, PaddleWidth=88;
enum class Phase { Ready, Playing, Clear, GameOver };
struct Input { int move=0; bool start=false; };
struct Rect { int x,y,w,h; uint32_t color; };
struct Glyph { int x,y,scale; unsigned char code; uint32_t color; };
struct Scene { std::vector<Rect> rects; std::vector<Glyph> glyphs; };
inline Rect brick(int i) { return {44+(i%8)*70,76+(i/8)*26,62,18,0}; }
inline uint32_t rowColor(int row) {
    constexpr uint32_t colors[]={0xff0000,0xffff00,0x00ff00,0x00ffff,0x0000ff};
    return colors[row%5];
}
inline std::array<uint8_t,7> glyph(unsigned char ch) {
    switch(ch) {
    case '0': return {14,17,19,21,25,17,14}; case '1': return {4,12,4,4,4,4,14};
    case '2': return {14,17,1,2,4,8,31}; case '3': return {30,1,1,14,1,1,30};
    case '4': return {2,6,10,18,31,2,2}; case '5': return {31,16,16,30,1,1,30};
    case '6': return {14,16,16,30,17,17,14}; case '7': return {31,1,2,4,8,8,8};
    case '8': return {14,17,17,14,17,17,14}; case '9': return {14,17,17,15,1,1,14};
    case 'A': return {14,17,17,31,17,17,17}; case 'B': return {30,17,17,30,17,17,30};
    case 'C': return {14,17,16,16,16,17,14}; case 'D': return {30,17,17,17,17,17,30};
    case 'E': return {31,16,16,30,16,16,31}; case 'F': return {31,16,16,30,16,16,16};
    case 'G': return {14,17,16,23,17,17,15}; case 'H': return {17,17,17,31,17,17,17};
    case 'I': return {14,4,4,4,4,4,14}; case 'J': return {7,2,2,2,2,18,12};
    case 'K': return {17,18,20,24,20,18,17}; case 'L': return {16,16,16,16,16,16,31};
    case 'M': return {17,27,21,21,17,17,17}; case 'N': return {17,25,21,19,17,17,17};
    case 'O': return {14,17,17,17,17,17,14}; case 'P': return {30,17,17,30,16,16,16};
    case 'Q': return {14,17,17,17,21,18,13}; case 'R': return {30,17,17,30,20,18,17};
    case 'S': return {15,16,16,14,1,1,30}; case 'T': return {31,4,4,4,4,4,4};
    case 'U': return {17,17,17,17,17,17,14}; case 'V': return {17,17,17,17,17,10,4};
    case 'W': return {17,17,17,21,21,21,10}; case 'X': return {17,17,10,4,10,17,17};
    case 'Y': return {17,17,10,4,4,4,4}; case 'Z': return {31,1,2,4,8,16,31};
    case '-': return {0,0,0,31,0,0,0}; case ':': return {0,4,4,0,4,4,0};
    default: return {};
    }
}
struct Game {
    std::array<bool,40> blocks{};
    int paddle=320*Q, x=320*Q, y=425*Q, vx=2*Q, vy=-4*Q;
    int lives=3, score=0;
    uint32_t ticks=0, collisions=0, misses=0, clears=0;
    Phase phase=Phase::Ready;
    Game() { blocks.fill(true); }
    int remaining() const { return int(std::count(blocks.begin(),blocks.end(),true)); }
    void restart() { *this=Game(); }
    void step(Input in) {
        ++ticks;
        if(phase==Phase::Clear || phase==Phase::GameOver) { if(in.start) restart(); return; }
        paddle=std::clamp(paddle+std::clamp(in.move,-1,1)*6*Q,(16+PaddleWidth/2)*Q,(624-PaddleWidth/2)*Q);
        if(phase==Phase::Ready) {
            x=paddle; y=425*Q;
            if(in.start) { phase=Phase::Playing; vx=2*Q; vy=-4*Q; }
            return;
        }
        for(int s=0;s<4 && phase==Phase::Playing;++s) {
            const int ox=x,oy=y;
            x+=vx/4; y+=vy/4;
            if(x<(16+Radius)*Q) { x=(16+Radius)*Q; vx=std::abs(vx); }
            if(x>(624-Radius)*Q) { x=(624-Radius)*Q; vx=-std::abs(vx); }
            if(y<(48+Radius)*Q) { y=(48+Radius)*Q; vy=std::abs(vy); }
            if(vy>0 && oy+Radius*Q<=438*Q && y+Radius*Q>=438*Q &&
               x+Radius*Q>=paddle-PaddleWidth*Q/2 && x-Radius*Q<=paddle+PaddleWidth*Q/2) {
                y=(438-Radius)*Q;
                int angle=std::clamp((x-paddle)*4/(PaddleWidth*Q/2),-4,4);
                if(angle==0) angle=vx<0?-1:1;
                vx=angle*Q; vy=-4*Q; ++collisions;
            }
            for(int i=0;i<40;++i) if(blocks[i]) {
                Rect z=brick(i);
                if(x+Radius*Q>z.x*Q && x-Radius*Q<(z.x+z.w)*Q &&
                   y+Radius*Q>z.y*Q && y-Radius*Q<(z.y+z.h)*Q) {
                    blocks[i]=false; score+=10; ++collisions;
                    if(ox+Radius*Q<=z.x*Q || ox-Radius*Q>=(z.x+z.w)*Q) { vx=-vx; x=ox; }
                    else { vy=-vy; y=oy; }
                    if(remaining()==0) { phase=Phase::Clear; ++clears; }
                    break;
                }
            }
            if(y-Radius*Q>=Height*Q) { --lives; ++misses; phase=lives>0?Phase::Ready:Phase::GameOver; }
        }
    }
    Input automatic() const {
        const int bias=(int((ticks/240)%3)-1)*24*Q;
        const int target=x+bias;
        return {target>paddle+2*Q?1:(target<paddle-2*Q?-1:0),phase==Phase::Ready && ticks%60==30};
    }
    uint32_t hash() const {
        uint32_t h=2166136261u;
        auto add=[&](uint32_t a){for(int i=0;i<4;++i) h=(h^((a>>(8*i))&255))*16777619u;};
        for(auto v:blocks) add(v);
        for(uint32_t v:{uint32_t(paddle),uint32_t(x),uint32_t(y),uint32_t(vx),uint32_t(vy),uint32_t(lives),uint32_t(score),ticks,collisions,misses,clears,uint32_t(phase)}) add(v);
        return h;
    }
};
inline void addText(Scene& out,int x,int y,const std::string& text,int scale=2,uint32_t color=0xffffff) {
    for(unsigned char ch:text) { out.glyphs.push_back({x,y,scale,ch,color}); x+=6*scale; }
}
inline Scene scene(const Game& g,bool hud=true,int subdivisions=1) {
    Scene out;
    out.rects.reserve(60*subdivisions*subdivisions);
    out.rects.push_back({12,44,616,4,0x0000ff});
    out.rects.push_back({12,48,4,406,0x0000ff});
    out.rects.push_back({624,48,4,406,0x0000ff});
    for(int i=0;i<40;++i) if(g.blocks[i]) {
        Rect z=brick(i); z.color=rowColor(i/8);
        for(int sy=0;sy<subdivisions;++sy) for(int sx=0;sx<subdivisions;++sx) {
            int x0=z.x+z.w*sx/subdivisions,x1=z.x+z.w*(sx+1)/subdivisions;
            int y0=z.y+z.h*sy/subdivisions,y1=z.y+z.h*(sy+1)/subdivisions;
            out.rects.push_back({x0,y0,x1-x0,y1-y0,z.color});
        }
    }
    out.rects.push_back({g.paddle/Q-PaddleWidth/2,438,PaddleWidth,12,0xffffff});
    out.rects.push_back({g.x/Q-Radius,g.y/Q-Radius,Radius*2,Radius*2,0xffffff});
    if(hud) {
        addText(out,24,16,"SCORE "+std::to_string(g.score));
        addText(out,440,16,"LIVES "+std::to_string(g.lives));
        addText(out,230,462,"WALLY BREAKOUT",1,0x00ffff);
        if(g.phase==Phase::Ready) addText(out,278,284,"READY",3,0xffff00);
        if(g.phase==Phase::Clear) addText(out,276,284,"CLEAR",3,0x00ff00);
        if(g.phase==Phase::GameOver) addText(out,230,284,"GAME OVER",3,0xff0000);
    }
    return out;
}
inline std::vector<uint16_t> reference(const Scene& s) {
    std::vector<uint16_t> img(Width*Height,0);
    auto fill=[&](int x,int y,int w,int h,uint32_t c) {
        uint16_t rgb=uint16_t(((c>>19)&31)<<11 | ((c>>10)&63)<<5 | ((c>>3)&31));
        for(int yy=std::max(0,y);yy<std::min(Height,y+h);++yy)
            for(int xx=std::max(0,x);xx<std::min(Width,x+w);++xx) img[yy*Width+xx]=rgb;
    };
    for(const auto& r:s.rects) fill(r.x,r.y,r.w,r.h,r.color);
    for(const auto& g:s.glyphs) {
        auto rows=glyph(g.code);
        for(int y=0;y<7;++y) for(int x=0;x<5;++x) if(rows[y]&(1<<(4-x))) fill(g.x+x*g.scale,g.y+y*g.scale,g.scale,g.scale,g.color);
    }
    return img;
}
}
