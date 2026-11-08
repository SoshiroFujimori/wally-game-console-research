// SPDX-License-Identifier: GPL-3.0-or-later
#include "Breakout.hpp"
#include <iostream>
int main() {
    const auto scene = breakout::scene(breakout::Game{});
    bool first = true;
    std::cout << "[\n";
    for (const auto& g : scene.glyphs) {
        if (g.code == ' ') continue;
        const char* group = nullptr;
        if (g.y == 15 && g.x < 84) group = "SCORE";
        else if (g.y == 15 && g.x >= 534 && g.x < 594) group = "LIVES";
        else if (g.y == 15 && g.color == 0x00ffff) group = "WALLY BREAKOUT";
        if (!group) continue;
        if (!first) std::cout << ",\n";
        first = false;
        std::cout << "{\"group\":\"" << group << "\",\"char\":\"" << char(g.code)
                  << "\",\"x\":" << g.x << ",\"y\":" << g.y << ",\"scale\":" << g.scale
                  << ",\"color\":" << g.color << ",\"rows\":[";
        const auto rows = breakout::glyph(g.code);
        for (int y = 0; y < 7; ++y) { if (y) std::cout << ','; std::cout << unsigned(rows[y]); }
        std::cout << "]}";
    }
    std::cout << "\n]\n";
}
