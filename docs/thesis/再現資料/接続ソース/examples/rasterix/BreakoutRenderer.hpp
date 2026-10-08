// SPDX-License-Identifier: GPL-3.0-or-later
// Written: Codex <codex@openai.com> 10 September 2026
// Draw the 2D Breakout scene with the upstream OpenGL interface.
#pragma once
#include "Breakout.hpp"
#include "BreakoutDamage.hpp"
#include "gl.h"
#include <stdexcept>

namespace breakout {
class Renderer {
  public:
    Renderer() {
        glViewport(0, 0, Width, Height);
        glMatrixMode(GL_PROJECTION);
        glLoadIdentity();
        glOrtho(0, Width, Height, 0, -1, 1);
        glMatrixMode(GL_MODELVIEW);
        glLoadIdentity();
        // RasterIX evaluates edge functions at integer window coordinates.
        // Align half-pixel sample centers with this grid (application Y is down).
        glTranslatef(-0.5f, 0.5f, 0.0f);
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_CULL_FACE);
        glDisable(GL_LIGHTING);
        createFont();
    }

    void draw(const Scene& current) {
        const unsigned slot = drawn % 2;
        // Upstream starts with LOC_1 twice, then alternates LOC_2 and LOC_1.
        // Three full draws initialize both physical buffers and history slots.
        if (drawn < 3)
            drawScene(current, true);
        else
            drawScene(damageScene(previous[slot], current), false);
        previous[slot] = current;
        ++drawn;
    }

  private:
    void drawScene(const Scene& current, bool clear) {
        if (clear) {
            glClearColor(0, 0, 0, 1);
            glClear(GL_COLOR_BUFFER_BIT);
        }
        glDisable(GL_TEXTURE_2D);
        glDisable(GL_BLEND);
        if (!current.rects.empty()) {
            glBegin(GL_QUADS);
            for (const auto& rect : current.rects) {
                color(rect.color);
                quad(rect.x, rect.y, rect.w, rect.h);
            }
            glEnd();
        }
        if (!current.glyphs.empty()) {
            glEnable(GL_TEXTURE_2D);
            glEnable(GL_BLEND);
            glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
            glBindTexture(GL_TEXTURE_2D, font);
            glBegin(GL_QUADS);
            for (const auto& item : current.glyphs)
                drawGlyph(item);
            glEnd();
            glDisable(GL_BLEND);
            glDisable(GL_TEXTURE_2D);
        }
    }
    std::array<Scene, 2> previous;
    uint64_t drawn = 0;

    static void color(uint32_t rgb) { glColor4ub((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, 255); }
    static void quad(float x, float y, float width, float height, float u = 0, float v = 0, float du = 0,
                     float dv = 0) {
        glTexCoord2f(u, v);
        glVertex2f(x, y);
        glTexCoord2f(u + du, v);
        glVertex2f(x + width, y);
        glTexCoord2f(u + du, v + dv);
        glVertex2f(x + width, y + height);
        glTexCoord2f(u, v + dv);
        glVertex2f(x, y + height);
    }
    void drawGlyph(const Glyph& item) {
        const auto slot = item.code < slots.size() ? slots[item.code] : 255;
        if (slot == 255)
            throw std::runtime_error("Unsupported Breakout character");
        color(item.color);
        quad(item.x, item.y, 8 * item.scale, 8 * item.scale, float((slot % 8) * 8) / 64,
             float((slot / 8) * 8) / 32, 8.0f / 64, 8.0f / 32);
    }
    void createFont() {
        // The fixed vocabulary fits one 4096-byte RGBA4444 texture page.
        constexpr char characters[] = " 0123456789ABCDEGIKLMORSTUVWY";
        static_assert(sizeof(characters) - 1 <= 32);
        slots.fill(255);
        std::vector<uint8_t> pixels(64 * 32 * 4, 255);
        for (unsigned i = 0; i < 64 * 32; ++i)
            pixels[i * 4 + 3] = 0;
        for (unsigned slot = 0; slot < sizeof(characters) - 1; ++slot) {
            slots[static_cast<unsigned char>(characters[slot])] = slot;
            const auto rows = glyph(characters[slot]);
            for (int y = 0; y < 7; ++y)
                for (int x = 0; x < 5; ++x)
                    if (rows[y] & (1 << (4 - x)))
                        pixels[4 * ((slot / 8 * 8 + y) * 64 + slot % 8 * 8 + x) + 3] = 255;
        }
        glGenTextures(1, &font);
        glBindTexture(GL_TEXTURE_2D, font);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 64, 32, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    }
    GLuint font = 0;
    std::array<uint8_t, 128> slots{};
};
} // namespace breakout
