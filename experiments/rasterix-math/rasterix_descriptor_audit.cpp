// Independent source-level audit for RasterIX commit
// 9fdcf97a31b2e4247594e06d605871980cd5e9e1.
//
// This file is kept outside the RasterIX checkout.  It calls the official
// CPU descriptor generator and software rasterizer without modifying either.

#include "renderer/Rasterizer.hpp"
#include "renderer/softwarerasterizer/Rasterizer.hpp"

#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <iostream>
#include <iterator>
#include <set>
#include <utility>
#include <vector>

using Pixel = std::pair<int32_t, int32_t>;

struct Fragment
{
    int32_t x;
    int32_t y;
    uint32_t index;
};

static std::set<Pixel> collect(const rr::TriangleStreamTypes::TriangleDescX& desc)
{
    rr::softwarerasterizer::ResolutionData resolution { 16, 16 };
    rr::softwarerasterizer::Rasterizer walker { resolution };
    walker.init(desc);
    std::set<Pixel> out;
    while (!walker.isDone())
    {
        if (walker.hit())
        {
            const auto& fragment = walker.fragmentData();
            out.emplace(fragment.spx, fragment.spy);
        }
        walker.walk();
    }
    return out;
}

static std::vector<Fragment> collectSequence(const rr::TriangleStreamTypes::TriangleDescX& desc)
{
    rr::softwarerasterizer::ResolutionData resolution { 16, 16 };
    rr::softwarerasterizer::Rasterizer walker { resolution };
    walker.init(desc);
    std::vector<Fragment> out;
    while (!walker.isDone())
    {
        if (walker.hit())
        {
            const auto& fragment = walker.fragmentData();
            out.push_back({ fragment.spx, fragment.spy, static_cast<uint32_t>(fragment.index) });
        }
        walker.walk();
    }
    return out;
}

static rr::TriangleStreamTypes::TriangleDesc makeTriangle(
    const rr::Vec4& a, const rr::Vec4& b, const rr::Vec4& c,
    bool scissor = false)
{
    std::array<rr::Vec4, rr::RenderConfig::TMU_COUNT> ta {};
    std::array<rr::Vec4, rr::RenderConfig::TMU_COUNT> tb {};
    std::array<rr::Vec4, rr::RenderConfig::TMU_COUNT> tc {};
    for (std::size_t i = 0; i < rr::RenderConfig::TMU_COUNT; ++i)
    {
        ta[i] = rr::Vec4 { 0.0f, 0.0f, 0.0f, 1.0f };
        tb[i] = rr::Vec4 { 0.0f, 0.0f, 0.0f, 1.0f };
        tc[i] = rr::Vec4 { 0.0f, 0.0f, 0.0f, 1.0f };
    }
    const rr::Vec4 color { 1.0f, 1.0f, 1.0f, 1.0f };
    const rr::TransformedTriangle triangle { a, b, c, ta, tb, tc, color, color, color };

    // Wally uses fixed-point interpolation, so Renderer constructs Rasterizer
    // with enableScaling=true.
    rr::Rasterizer descriptorGenerator { true };
    if (scissor)
    {
        descriptorGenerator.enableScissor(true);
        // The public Renderer passes end coordinates to this method.  This is
        // the half-open rectangle [1,3) x [1,3).
        descriptorGenerator.setScissorBox(1, 1, 3, 3);
    }
    rr::TriangleStreamTypes::TriangleDesc desc {};
    const bool visible = descriptorGenerator.rasterize(desc, triangle);
    assert(visible);
    return desc;
}

static rr::TriangleStreamTypes::TriangleDesc makeTriangleWithAttributes(
    const rr::Vec4& a, const rr::Vec4& b, const rr::Vec4& c,
    const rr::Vec4& ta, const rr::Vec4& tb, const rr::Vec4& tc,
    const rr::Vec4& ca, const rr::Vec4& cb, const rr::Vec4& cc)
{
    std::array<rr::Vec4, rr::RenderConfig::TMU_COUNT> texA {};
    std::array<rr::Vec4, rr::RenderConfig::TMU_COUNT> texB {};
    std::array<rr::Vec4, rr::RenderConfig::TMU_COUNT> texC {};
    for (std::size_t i = 0; i < rr::RenderConfig::TMU_COUNT; ++i)
    {
        texA[i] = ta;
        texB[i] = tb;
        texC[i] = tc;
    }
    const rr::TransformedTriangle triangle { a, b, c, texA, texB, texC, ca, cb, cc };
    rr::Rasterizer descriptorGenerator { true };
    descriptorGenerator.enableTmu(0, true);
    rr::TriangleStreamTypes::TriangleDesc desc {};
    const bool visible = descriptorGenerator.rasterize(desc, triangle);
    assert(visible);
    return desc;
}

static void printPixels(const std::set<Pixel>& pixels)
{
    bool first = true;
    std::cout << "[";
    for (const auto& [x, y] : pixels)
    {
        if (!first)
            std::cout << ",";
        first = false;
        std::cout << "[" << x << "," << y << "]";
    }
    std::cout << "]";
}

static void printVec3i(const rr::Vec3i& values)
{
    std::cout << "[" << values[0] << "," << values[1] << "," << values[2] << "]";
}

template <std::size_t N>
static void printFloatVector(const rr::Vec<N>& values)
{
    std::cout << "[";
    for (std::size_t i = 0; i < N; ++i)
    {
        if (i)
            std::cout << ",";
        std::cout << values[i];
    }
    std::cout << "]";
}

static void printSequence(const std::vector<Fragment>& fragments)
{
    std::cout << "[";
    for (std::size_t i = 0; i < fragments.size(); ++i)
    {
        if (i)
            std::cout << ",";
        std::cout << "[" << fragments[i].x << "," << fragments[i].y << "," << fragments[i].index << "]";
    }
    std::cout << "]";
}

int main()
{
    // The Breakout renderer translates by half a pixel before passing a
    // rectangle [0,4) x [0,4).  After the coordinate conversion the official
    // RasterIX edge walker samples the integer lattice.
    const rr::Vec4 p0 { -0.5f, -0.5f, 0.5f, 1.0f };
    const rr::Vec4 p1 {  3.5f, -0.5f, 0.5f, 1.0f };
    const rr::Vec4 p2 {  3.5f,  3.5f, 0.5f, 1.0f };
    const rr::Vec4 p3 { -0.5f,  3.5f, 0.5f, 1.0f };

    const auto d0 = makeTriangle(p0, p1, p2);
    const auto d1 = makeTriangle(p0, p2, p3);
    const rr::TriangleStreamTypes::TriangleDescX x0 { d0 };
    const rr::TriangleStreamTypes::TriangleDescX x1 { d1 };
    const auto pixels0 = collect(x0);
    const auto pixels1 = collect(x1);
    const auto sequence0 = collectSequence(x0);
    const auto sequence1 = collectSequence(x1);

    std::set<Pixel> overlap;
    std::set_intersection(pixels0.begin(), pixels0.end(), pixels1.begin(), pixels1.end(),
        std::inserter(overlap, overlap.end()));
    std::set<Pixel> united;
    std::set_union(pixels0.begin(), pixels0.end(), pixels1.begin(), pixels1.end(),
        std::inserter(united, united.end()));

    const std::set<Pixel> expectedOverlap { { 0, 0 }, { 1, 1 }, { 2, 2 }, { 3, 3 } };
    assert(overlap == expectedOverlap);
    assert(united.size() == 16);
    assert(pixels0.size() + pixels1.size() == 20);

    // The descriptor generator uses scissor only for an early empty-overlap
    // rejection; it does not rewrite the descriptor bounding box.  Fragment
    // masking is performed later by the hardware FramebufferScissor stage.
    const auto scissored = makeTriangle(p0, p1, p2, true);
    assert(scissored.param.bbStartX == d0.param.bbStartX);
    assert(scissored.param.bbStartY == d0.param.bbStartY);
    assert(scissored.param.bbEndX == d0.param.bbEndX);
    assert(scissored.param.bbEndY == d0.param.bbEndY);

    // Execute the exact Veci conversion for values around zero.  C++ integer
    // conversion truncates toward zero after RasterIX adds 0.5.
    const std::array<float, 8> inputs { -1.0f, -0.5f, -1.0f / 32.0f, 0.0f,
        1.0f / 32.0f, 0.5f, 1.0f, 1.5f };
    std::array<int32_t, inputs.size()> fixed {};
    for (std::size_t i = 0; i < inputs.size(); ++i)
    {
        fixed[i] = rr::Veci<int32_t, 1, 5>::createFromVec<std::array<float, 1>, 5>({ inputs[i] })[0];
    }
    const std::array<int32_t, inputs.size()> expectedFixed { -31, -15, 0, 0, 1, 16, 32, 48 };
    assert(fixed == expectedFixed);

    // Repeat the rectangle away from the viewport boundary.  This is the
    // representative Breakout case: application coordinates [10,14) become
    // window boundaries [9.5,13.5) after the half-pixel alignment.
    const rr::Vec4 q0 {  9.5f,  9.5f, 0.5f, 1.0f };
    const rr::Vec4 q1 { 13.5f,  9.5f, 0.5f, 1.0f };
    const rr::Vec4 q2 { 13.5f, 13.5f, 0.5f, 1.0f };
    const rr::Vec4 q3 {  9.5f, 13.5f, 0.5f, 1.0f };
    const auto interiorD0 = makeTriangle(q0, q1, q2);
    const auto interiorD1 = makeTriangle(q0, q2, q3);
    const rr::TriangleStreamTypes::TriangleDescX interiorX0 { interiorD0 };
    const rr::TriangleStreamTypes::TriangleDescX interiorX1 { interiorD1 };
    const auto interiorPixels0 = collect(interiorX0);
    const auto interiorPixels1 = collect(interiorX1);
    std::set<Pixel> interiorOverlap;
    std::set_intersection(interiorPixels0.begin(), interiorPixels0.end(),
        interiorPixels1.begin(), interiorPixels1.end(),
        std::inserter(interiorOverlap, interiorOverlap.end()));
    std::set<Pixel> interiorUnited;
    std::set_union(interiorPixels0.begin(), interiorPixels0.end(),
        interiorPixels1.begin(), interiorPixels1.end(),
        std::inserter(interiorUnited, interiorUnited.end()));
    const std::set<Pixel> expectedInteriorOverlap {
        { 10, 10 }, { 11, 11 }, { 12, 12 }, { 13, 13 }
    };
    assert(interiorOverlap == expectedInteriorOverlap);
    assert(interiorUnited.size() == 16);
    assert(interiorPixels0.size() + interiorPixels1.size() == 20);

    // Representative first triangle of an 8x8 Breakout font glyph.  The
    // renderer uses a 64x32 atlas, so one glyph spans 1/8 by 1/4 in texture
    // coordinates.  Colors are uniform within each quad.
    const rr::Vec4 glyphP0 { 99.5f, 49.5f, 0.5f, 1.0f };
    const rr::Vec4 glyphP1 {107.5f, 49.5f, 0.5f, 1.0f };
    const rr::Vec4 glyphP2 {107.5f, 57.5f, 0.5f, 1.0f };
    const rr::Vec4 tex0 { 0.0f,   0.0f,  0.0f, 1.0f };
    const rr::Vec4 tex1 { 0.125f, 0.0f,  0.0f, 1.0f };
    const rr::Vec4 tex2 { 0.125f, 0.25f, 0.0f, 1.0f };
    const rr::Vec4 white { 1.0f, 1.0f, 1.0f, 1.0f };
    const auto glyphD0 = makeTriangleWithAttributes(
        glyphP0, glyphP1, glyphP2, tex0, tex1, tex2, white, white, white);

    std::cout << "{\n";
    std::cout << "  \"triangle0_bbox\":[" << d0.param.bbStartX << "," << d0.param.bbStartY
              << "," << d0.param.bbEndX << "," << d0.param.bbEndY << "],\n";
    std::cout << "  \"triangle1_bbox\":[" << d1.param.bbStartX << "," << d1.param.bbStartY
              << "," << d1.param.bbEndX << "," << d1.param.bbEndY << "],\n";
    std::cout << "  \"triangle0_w_init\":"; printVec3i(x0.param.wInit); std::cout << ",\n";
    std::cout << "  \"triangle0_w_x_inc\":"; printVec3i(x0.param.wXInc); std::cout << ",\n";
    std::cout << "  \"triangle0_w_y_inc\":"; printVec3i(x0.param.wYInc); std::cout << ",\n";
    std::cout << "  \"triangle1_w_init\":"; printVec3i(x1.param.wInit); std::cout << ",\n";
    std::cout << "  \"triangle1_w_x_inc\":"; printVec3i(x1.param.wXInc); std::cout << ",\n";
    std::cout << "  \"triangle1_w_y_inc\":"; printVec3i(x1.param.wYInc); std::cout << ",\n";
    std::cout << "  \"triangle0_pixels\":"; printPixels(pixels0); std::cout << ",\n";
    std::cout << "  \"triangle1_pixels\":"; printPixels(pixels1); std::cout << ",\n";
    std::cout << "  \"triangle0_sequence\":"; printSequence(sequence0); std::cout << ",\n";
    std::cout << "  \"triangle1_sequence\":"; printSequence(sequence1); std::cout << ",\n";
    std::cout << "  \"shared_edge_pixels\":"; printPixels(overlap); std::cout << ",\n";
    std::cout << "  \"union_count\":" << united.size() << ",\n";
    std::cout << "  \"fragment_count_with_duplicates\":" << pixels0.size() + pixels1.size() << ",\n";
    std::cout << "  \"scissor_rewrites_descriptor_bbox\":false,\n";
    std::cout << "  \"fixed_inputs\":[-1.0,-0.5,-0.03125,0.0,0.03125,0.5,1.0,1.5],\n";
    std::cout << "  \"fixed_outputs\":[";
    for (std::size_t i = 0; i < fixed.size(); ++i)
    {
        if (i) std::cout << ",";
        std::cout << fixed[i];
    }
    std::cout << "],\n";
    std::cout << "  \"interior_triangle0_bbox\":[" << interiorD0.param.bbStartX << ","
              << interiorD0.param.bbStartY << "," << interiorD0.param.bbEndX << ","
              << interiorD0.param.bbEndY << "],\n";
    std::cout << "  \"interior_triangle0_w_init\":"; printVec3i(interiorX0.param.wInit); std::cout << ",\n";
    std::cout << "  \"interior_triangle0_w_x_inc\":"; printVec3i(interiorX0.param.wXInc); std::cout << ",\n";
    std::cout << "  \"interior_triangle0_w_y_inc\":"; printVec3i(interiorX0.param.wYInc); std::cout << ",\n";
    std::cout << "  \"interior_triangle1_bbox\":[" << interiorD1.param.bbStartX << ","
              << interiorD1.param.bbStartY << "," << interiorD1.param.bbEndX << ","
              << interiorD1.param.bbEndY << "],\n";
    std::cout << "  \"interior_triangle1_w_init\":"; printVec3i(interiorX1.param.wInit); std::cout << ",\n";
    std::cout << "  \"interior_triangle1_w_x_inc\":"; printVec3i(interiorX1.param.wXInc); std::cout << ",\n";
    std::cout << "  \"interior_triangle1_w_y_inc\":"; printVec3i(interiorX1.param.wYInc); std::cout << ",\n";
    std::cout << "  \"interior_triangle0_pixels\":"; printPixels(interiorPixels0); std::cout << ",\n";
    std::cout << "  \"interior_triangle1_pixels\":"; printPixels(interiorPixels1); std::cout << ",\n";
    std::cout << "  \"interior_shared_edge_pixels\":"; printPixels(interiorOverlap); std::cout << ",\n";
    std::cout << "  \"interior_union_count\":" << interiorUnited.size() << ",\n";
    std::cout << "  \"interior_fragment_count_with_duplicates\":"
              << interiorPixels0.size() + interiorPixels1.size() << ",\n";
    std::cout << "  \"solid_color_x_inc\":"; printFloatVector(d0.param.colorXInc); std::cout << ",\n";
    std::cout << "  \"solid_color_y_inc\":"; printFloatVector(d0.param.colorYInc); std::cout << ",\n";
    std::cout << "  \"solid_depth_x_inc\":"; printFloatVector(d0.param.depthZwXInc); std::cout << ",\n";
    std::cout << "  \"solid_depth_y_inc\":"; printFloatVector(d0.param.depthZwYInc); std::cout << ",\n";
    std::cout << "  \"glyph_color_x_inc\":"; printFloatVector(glyphD0.param.colorXInc); std::cout << ",\n";
    std::cout << "  \"glyph_color_y_inc\":"; printFloatVector(glyphD0.param.colorYInc); std::cout << ",\n";
    std::cout << "  \"glyph_texture_stq\":"; printFloatVector(glyphD0.texture[0].texStq); std::cout << ",\n";
    std::cout << "  \"glyph_texture_x_inc\":"; printFloatVector(glyphD0.texture[0].texStqXInc); std::cout << ",\n";
    std::cout << "  \"glyph_texture_y_inc\":"; printFloatVector(glyphD0.texture[0].texStqYInc); std::cout << "\n}\n";
}
