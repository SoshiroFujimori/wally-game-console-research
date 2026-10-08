// SPDX-License-Identifier: GPL-3.0-or-later
#include "game.hpp"
#include <cstdio>
#include <fstream>
#include <stdexcept>
using namespace breakout;
void require(bool b,const char* message) { if(!b) throw std::runtime_error(message); }
int main(int argc,char** argv) {
 try {
    if(argc>1 && std::string(argv[1])=="selftest") {
        Game g; require(g.remaining()==40 && g.lives==3,"Initial state");
        g.step({0,true}); require(g.phase==Phase::Playing,"Launch");
        g.x=21*Q; g.y=300*Q; g.vx=-2*Q; g.vy=0; g.step({}); require(g.vx>0,"Left wall");
        g.x=619*Q; g.vx=2*Q; g.step({}); require(g.vx<0,"Right wall");
        g.x=320*Q;g.y=53*Q;g.vx=0;g.vy=-4*Q;g.step({});require(g.vy>0,"Top wall");
        g.x=g.paddle;g.y=432*Q;g.vx=Q;g.vy=4*Q;g.step({});require(g.vy<0,"Paddle collision");
        g=Game();g.phase=Phase::Playing;Rect r=brick(32);g.x=(r.x+20)*Q;g.y=(r.y+r.h+5)*Q;g.vx=0;g.vy=-4*Q;g.step({});
        require(!g.blocks[32] && g.score==10 && g.vy>0,"Brick collision");
        g=Game();g.blocks.fill(false);g.blocks[32]=true;g.phase=Phase::Playing;g.x=(r.x+20)*Q;g.y=(r.y+r.h+5)*Q;g.vx=0;g.vy=-4*Q;g.step({});require(g.phase==Phase::Clear,"Clear");
        g.step({0,true});require(g.remaining()==40 && g.phase==Phase::Ready,"Restart after clear");
        for(int life=3;life>0;--life) { g.phase=Phase::Playing;g.y=485*Q;g.vy=4*Q;g.step({});require(g.lives==life-1,"Life loss"); }
        require(g.phase==Phase::GameOver,"Game over");g.step({0,true});require(g.lives==3,"Restart after game over");
        Game a,c;for(int i=0;i<20000;++i) { auto input=a.automatic();a.step(input);c.step(input);require(a.hash()==c.hash(),"Deterministic replay"); }
        require(reference(scene(Game(),true,1))==reference(scene(Game(),true,4)),"Identical tiled image");
        std::printf("HOST_TEST_PASS tests=11 replay_steps=20000 final_hash=%08x remaining=%d phase=%d collisions=%u\n",a.hash(),a.remaining(),int(a.phase),a.collisions);
        return 0;
    }
    unsigned frames=argc>1?std::stoul(argv[1]):0;
    std::string prefix=argc>2?argv[2]:"reference";
    Game game;std::ofstream input(prefix+".input");
    for(unsigned i=0;i<frames;++i) { Input in=game.automatic(); input<<in.move<<' '<<in.start<<'\n';game.step(in); }
    auto pixels=reference(scene(game));
    std::ofstream raw(prefix+".rgb565",std::ios::binary);for(auto p:pixels){raw.put(char(p&255));raw.put(char(p>>8));}
    std::ofstream ppm(prefix+".ppm",std::ios::binary);ppm<<"P6\n640 480\n255\n";
    for(auto p:pixels){ppm.put(char(((p>>11)&31)*255/31));ppm.put(char(((p>>5)&63)*255/63));ppm.put(char((p&31)*255/31));}
    std::printf("REFERENCE frame=%u hash=%08x blocks=%d score=%d phase=%d\n",frames,game.hash(),game.remaining(),game.score,int(game.phase));
 }catch(const std::exception& e){std::fprintf(stderr,"%s\n",e.what());return 1;}
}
