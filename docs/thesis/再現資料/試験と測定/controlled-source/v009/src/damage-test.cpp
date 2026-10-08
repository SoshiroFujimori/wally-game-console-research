// SPDX-License-Identifier: GPL-3.0-or-later
#include "damage.hpp"
#include <cstdio>
#include <stdexcept>
using namespace breakout;
void applyDamage(std::vector<uint16_t>& image, const Scene& scene) {
    auto fill = [&](int x, int y, int w, int h, uint32_t c) {
        const uint16_t value = ((c >> 19) << 11) | (((c >> 10) & 63) << 5) | ((c >> 3) & 31);
        for (int yy = std::max(y, 0); yy < std::min(y + h, Height); ++yy)
            for (int xx = std::max(x, 0); xx < std::min(x + w, Width); ++xx) image[yy * Width + xx] = value;
    };
    for (const auto& r : scene.rects) fill(r.x, r.y, r.w, r.h, r.color);
    for (const auto& g : scene.glyphs) {
        const auto rows = glyph(g.code);
        for (int y = 0; y < 7; ++y) for (int x = 0; x < 5; ++x)
            if (rows[y] & (1 << (4 - x))) fill(g.x + x * g.scale, g.y + y * g.scale, g.scale, g.scale, g.color);
    }
}
int main() {
    unsigned frames = 0, clears = 0, gameOvers = 0;
    for (int mode = 0; mode < 3; ++mode) {
        Game game;
        std::array<Scene, 2> previous;
        std::array<std::vector<uint16_t>, 2> images;
        for (auto& image : images) image.resize(Width * Height);
        for (unsigned frame = 0; frame < 7000; ++frame) {
            const unsigned steps = mode == 2 ? (frame * 17 % 5) + 1 : 1;
            for (unsigned j = 0; j < steps; ++j) {
                Input input = mode == 1 ? Input{0, game.phase == Phase::Ready && game.ticks % 60 == 30} : game.automatic();
                if (game.phase == Phase::Clear || game.phase == Phase::GameOver) {
                    clears += game.phase == Phase::Clear; gameOvers += game.phase == Phase::GameOver; input.start = true;
                }
                game.step(input);
            }
            const auto current = scene(game);
            const unsigned slot = frame % 2;
            if (frame < 2) images[slot] = reference(current);
            else applyDamage(images[slot], damageScene(previous[slot], current));
            const auto expected = reference(current);
            if (images[slot] != expected) { std::fprintf(stderr, "FAIL mode=%d frame=%u\n", mode, frame); return 1; }
            previous[slot] = current;
            ++frames;
        }
    }
    if (!clears || !gameOvers) throw std::runtime_error("Missing terminal-state coverage");
    std::printf("DAMAGE_PASS frames=%u pixels_per_frame=%d clears=%u gameovers=%u\n", frames, Width * Height, clears, gameOvers);
}
