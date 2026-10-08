// SPDX-License-Identifier: GPL-3.0-or-later
// Written: Codex <codex@openai.com> 10 September 2026
// Erase changed regions and redraw overlapping objects in scene order.
#pragma once
#include "Breakout.hpp"

namespace breakout {
inline bool equal(const Rect& a, const Rect& b) {
    return a.x == b.x && a.y == b.y && a.w == b.w && a.h == b.h && a.color == b.color;
}
inline bool equal(const Glyph& a, const Glyph& b) {
    return a.x == b.x && a.y == b.y && a.scale == b.scale && a.code == b.code && a.color == b.color;
}
inline Rect bounds(const Rect& r) {
    return r;
}
inline Rect bounds(const Glyph& g) {
    return {g.x, g.y, 8 * g.scale, 8 * g.scale, 0};
}
inline bool overlaps(const Rect& a, const Rect& b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
inline void addDamage(std::vector<Rect>& regions, const Rect& r) {
    const int x = std::max(0, r.x), y = std::max(0, r.y);
    const int right = std::min(Width, r.x + r.w), bottom = std::min(Height, r.y + r.h);
    if (x < right && y < bottom)
        regions.push_back({x, y, right - x, bottom - y, 0});
}
template <typename T>
void changedBounds(std::vector<Rect>& regions, const std::vector<T>& before, const std::vector<T>& after) {
    if (before.size() == after.size()) {
        for (std::size_t i = 0; i < after.size(); ++i) {
            if (!equal(before[i], after[i])) {
                addDamage(regions, bounds(before[i]));
                addDamage(regions, bounds(after[i]));
            }
        }
    } else {
        for (const auto& item : before)
            if (std::none_of(after.begin(), after.end(),
                             [&](const auto& other) { return equal(item, other); }))
                addDamage(regions, bounds(item));
        for (const auto& item : after)
            if (std::none_of(before.begin(), before.end(),
                             [&](const auto& other) { return equal(item, other); }))
                addDamage(regions, bounds(item));
    }
}
// Include every object overlapping an erased region. Expanding to full object
// bounds permits grouped draws without changing blend order or using a scissor
// for every object. Repeat after merging because a union can touch more objects.
inline Scene damageScene(const Scene& before, const Scene& after) {
    std::vector<Rect> regions;
    regions.reserve(16);
    changedBounds(regions, before.rects, after.rects);
    changedBounds(regions, before.glyphs, after.glyphs);
    std::vector<bool> rects(after.rects.size()), glyphs(after.glyphs.size());
    bool changed = true;
    while (changed) {
        changed = false;
        for (std::size_t i = 0; i < regions.size(); ++i) {
            for (std::size_t j = i + 1; j < regions.size();) {
                if (!overlaps(regions[i], regions[j])) {
                    ++j;
                    continue;
                }
                const auto a = regions[i], b = regions[j];
                const int x = std::min(a.x, b.x), y = std::min(a.y, b.y);
                regions[i] = {x, y, std::max(a.x + a.w, b.x + b.w) - x, std::max(a.y + a.h, b.y + b.h) - y,
                              0};
                regions.erase(regions.begin() + j);
                changed = true;
            }
        }
        auto affected = [&](const Rect& r) {
            return std::any_of(regions.begin(), regions.end(),
                               [&](const Rect& area) { return overlaps(r, area); });
        };
        for (std::size_t i = 0; i < rects.size(); ++i)
            if (!rects[i] && affected(bounds(after.rects[i]))) {
                rects[i] = true;
                addDamage(regions, bounds(after.rects[i]));
                changed = true;
            }
        for (std::size_t i = 0; i < glyphs.size(); ++i)
            if (!glyphs[i] && affected(bounds(after.glyphs[i]))) {
                glyphs[i] = true;
                addDamage(regions, bounds(after.glyphs[i]));
                changed = true;
            }
    }
    Scene result;
    result.rects = std::move(regions);
    for (std::size_t i = 0; i < rects.size(); ++i)
        if (rects[i])
            result.rects.push_back(after.rects[i]);
    for (std::size_t i = 0; i < glyphs.size(); ++i)
        if (glyphs[i])
            result.glyphs.push_back(after.glyphs[i]);
    return result;
}
} // namespace breakout
