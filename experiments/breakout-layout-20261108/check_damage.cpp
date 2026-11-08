// SPDX-License-Identifier: GPL-3.0-or-later
#include "BreakoutDamage.hpp"
#include <fstream>
#include <iostream>

using namespace breakout;
using Pixels = std::vector<uint32_t>;

void rect(Pixels& pixels, const Rect& r) {
    for (int y = std::max(0, r.y); y < std::min(Height, r.y + r.h); ++y)
        for (int x = std::max(0, r.x); x < std::min(Width, r.x + r.w); ++x)
            pixels[y * Width + x] = r.color;
}
void draw(Pixels& pixels, const Scene& s) {
    for (const auto& r : s.rects)
        rect(pixels, r);
    for (const auto& g : s.glyphs) {
        const auto rows = glyph(g.code);
        for (int y = 0; y < 7; ++y)
            for (int x = 0; x < 5; ++x)
                if (rows[y] & (1 << (4 - x)))
                    rect(pixels, {g.x + x * g.scale, g.y + y * g.scale,
                                  g.scale, g.scale, g.color});
    }
}
void save(const char* name, const Pixels& pixels) {
    std::ofstream stream(name, std::ios::binary);
    stream << "P6\n" << Width << " " << Height << "\n255\n";
    for (auto p : pixels) {
        const char rgb[] = {char(p >> 16), char(p >> 8), char(p)};
        stream.write(rgb, 3);
    }
}
int main() {
    Game game;
    std::array<Scene, 2> history;
    std::array<Pixels, 2> buffers{Pixels(Width * Height), Pixels(Width * Height)};
    for (int frame = 0; frame < 6000; ++frame) {
        const int slot = frame % 2;
        const auto current = scene(game);
        Pixels expected(Width * Height);
        draw(expected, current);
        if (frame < 3) {
            buffers[slot].assign(Width * Height, 0);
            draw(buffers[slot], current);
        } else {
            draw(buffers[slot], damageScene(history[slot], current));
        }
        if (buffers[slot] != expected) {
            std::size_t count = 0;
            for (std::size_t i = 0; i < expected.size(); ++i)
                if (expected[i] != buffers[slot][i]) {
                    if (count++ == 0)
                        std::cout << "First difference x=" << i % Width << " y=" << i / Width << "\n";
                }
            std::cout << "FAIL frame=" << frame << " score=" << game.score << " pixels=" << count << "\n";
            save("damage-actual.ppm", buffers[slot]);
            save("damage-expected.ppm", expected);
            return 1;
        }
        history[slot] = current;
        game.step(game.automatic());
    }
    std::cout << "PASS: 6000 alternating-buffer scenes equal full redraws.\n";
}
