// SPDX-License-Identifier: GPL-3.0-or-later
// Functional model around unmodified RasterIX_IF; not a CPU timing model.
#pragma once
#include "IBusConnector.hpp"
#include "RenderConfigs.hpp"
#include "VRasterIX_IF.h"
#include "VRasterIX_IF___024root.h"
#include <verilated.h>
#include <array>
#include <cstdio>
#include <cstring>
#include <deque>
#include <random>
#include <stdexcept>
#include <vector>

class GpuSimBus final : public rr::IBusConnector {
    struct Burst { uint32_t address; unsigned beats, size, id; };
    static constexpr uint32_t MemoryBase = 0x9e000000u;
    VerilatedContext context;
    VRasterIX_IF gpu{&context};
    std::vector<uint8_t> memory = std::vector<uint8_t>(32 * 1024 * 1024);
    std::array<std::vector<uint8_t>, 2 * rr::RenderConfig::getDisplayLines() + 1> buffers;
    std::deque<Burst> reads, writes;
    std::deque<unsigned> responses;
    std::deque<uint32_t> output;
    bool readValid = false, readLast = false, responseValid = false;
    uint64_t readDataWord = 0;
    unsigned readId = 0, responseId = 0;
    uint32_t frame = 0, address = 0;
    bool swapSeen = false, swapPending = false;
    unsigned swapDelay = 0;
    std::mt19937 random{1};
    bool dma;
    unsigned gap, chunkBytes;
    uint64_t acceptedWords = 0;
    size_t offset(uint32_t addr) const {
        if (addr < MemoryBase || uint64_t(addr) + 8 > uint64_t(MemoryBase) + memory.size())
            throw std::runtime_error("AXI address outside graphics memory");
        return addr - MemoryBase;
    }
    static void check(bool value, const char* message) { if (!value) throw std::runtime_error(message); }
    void word(uint32_t value) {
        gpu.s_cmd_axis_tdata = value; gpu.s_cmd_axis_tvalid = 1;
        bool accepted = false;
        const auto end = cycles + 30000000;
        while (!accepted) {
            accepted = tick();
            if (accepted) ++acceptedWords;
            if (cycles == end) std::fprintf(stderr,"INTERNAL dma_state=%u remaining=%u parser_state=%u words=%llu\n",gpu.rootp->RasterIX_IF__DOT__dma__DOT__state,gpu.rootp->RasterIX_IF__DOT__dma__DOT__counter,gpu.rootp->RasterIX_IF__DOT__rixif__DOT__graphicCore__DOT__commandParser__DOT__state,(unsigned long long)acceptedWords);
            if (cycles == end) {
                const auto* r=gpu.rootp;
                std::fprintf(stderr,"DEPENDENCIES color=%u depth=%u stencil=%u tmu=%u pixels=%u triangle=%u rasterizer=%u fb_swapped=%u\n",r->RasterIX_IF__DOT__rixif__DOT__colorBufferApplied,r->RasterIX_IF__DOT__rixif__DOT__depthBufferApplied,r->RasterIX_IF__DOT__rixif__DOT__stencilBufferApplied,r->RasterIX_IF__DOT__rixif__DOT__graphicCore__DOT__cmd_tmu0_axis_tready,r->RasterIX_IF__DOT__rixif__DOT__graphicCore__DOT__pixelInPipeline,r->RasterIX_IF__DOT__rixif__DOT__graphicCore__DOT__dataInTriangleInterpolator,r->RasterIX_IF__DOT__rixif__DOT__graphicCore__DOT__rasterizerRunning,gpu.fb_swapped);
                for (const auto& burst:reads) std::fprintf(stderr,"PENDING_READ addr=%08x id=%u beats=%u\n",burst.address,burst.id,burst.beats);
            }
            if (cycles == end) std::fprintf(stderr, "COMMAND_TIMEOUT word=%08x frame=%u address=%08x read_beats=%llu write_beats=%llu reads=%zu writes=%zu responses=%zu rvalid=%u bvalid=%u swap=%u perf=%u stall=%u arvalid=%u awvalid=%u wvalid=%u\n", value, frame, address, (unsigned long long)readBeats, (unsigned long long)writtenBeats, reads.size(), writes.size(), responses.size(), readValid, responseValid, gpu.swap_fb, gpu.perfBusy, gpu.perfRasterizerStall, gpu.m_axi_arvalid, gpu.m_axi_awvalid, gpu.m_axi_wvalid);
            check(cycles < end, "command timeout");
        }
        gpu.s_cmd_axis_tvalid = 0;
        for (unsigned i = 0; i < gap; ++i) tick();
    }
public:
    uint64_t cycles = 0, readBeats = 0, writtenBeats = 0;
    GpuSimBus(bool useDma, unsigned inputGap, unsigned seed, unsigned chunk = 0) : random(seed), dma(useDma), gap(inputGap), chunkBytes(chunk) {
        check(!chunk || !(chunk % 64), "DMA chunk alignment");
        for (auto& b : buffers) b.resize(1024 * 1024);
        gpu.fb_swapped = 1; // Level: the display path is initially available.
        gpu.resetn = 0;
        for (int i = 0; i < 4; ++i) tick();
        gpu.resetn = 1;
        for (int i = 0; i < 4; ++i) tick();
    }
    bool tick() {
        if (!readValid && !reads.empty() && random() % 4) {
            const auto& r = reads.front();
            std::memcpy(&readDataWord, memory.data() + offset(r.address & ~7u), 8);
            readId = r.id; readLast = r.beats == 1; readValid = true;
        }
        if (!responseValid && !responses.empty() && random() % 3) {
            responseId = responses.front(); responses.pop_front(); responseValid = true;
        }
        gpu.m_axi_arready = reads.size() < 8 && random() % 4;
        gpu.m_axi_awready = writes.size() < 8 && random() % 4;
        gpu.m_axi_wready = !writes.empty() && random() % 4;
        gpu.m_axi_rvalid = readValid; gpu.m_axi_rdata = readDataWord;
        gpu.m_axi_rid = readId; gpu.m_axi_rlast = readLast; gpu.m_axi_rresp = 0;
        gpu.m_axi_bvalid = responseValid; gpu.m_axi_bid = responseId; gpu.m_axi_bresp = 0;
        gpu.m_cmd_resp_axis_tready = output.size() < 1024;
        if (!gpu.swap_fb) swapSeen = false;
        if (gpu.swap_fb && !swapSeen) {
            swapSeen = true; swapPending = true; swapDelay = 3; gpu.fb_swapped = 0;
        }
        if (swapPending && swapDelay) --swapDelay;
        if (swapPending && !swapDelay && writes.empty() && responses.empty() && !responseValid) {
            gpu.fb_swapped = 1; swapPending = false; address = gpu.fb_addr; ++frame;
        }
        gpu.aclk = 0; gpu.eval();
        const bool accepted = gpu.s_cmd_axis_tvalid && gpu.s_cmd_axis_tready;
        if (gpu.resetn) {
            if (gpu.m_cmd_resp_axis_tvalid && gpu.m_cmd_resp_axis_tready) output.push_back(gpu.m_cmd_resp_axis_tdata);
            if (readValid && gpu.m_axi_rready) {
                check(!reads.empty(), "read beat without burst");
                auto& r = reads.front(); r.address += 1u << r.size;
                if (!--r.beats) reads.pop_front(); readValid = false; ++readBeats;
            }
            if (responseValid && gpu.m_axi_bready) responseValid = false;
            if (gpu.m_axi_wvalid && gpu.m_axi_wready) {
                check(!writes.empty(), "write beat without burst");
                auto& w = writes.front();
                check(bool(gpu.m_axi_wlast) == (w.beats == 1), "AXI WLAST mismatch");
                auto at = offset(w.address & ~7u);
                for (unsigned i = 0; i < 8; ++i)
                    if (gpu.m_axi_wstrb & (1u << i)) memory[at + i] = uint8_t(gpu.m_axi_wdata >> (8 * i));
                w.address += 1u << w.size; ++writtenBeats;
                if (!--w.beats) { responses.push_back(w.id); writes.pop_front(); }
            }
            if (gpu.m_axi_arvalid && gpu.m_axi_arready) {
                check(gpu.m_axi_arburst == 1 && gpu.m_axi_arsize <= 3, "unsupported read burst");
                check((gpu.m_axi_araddr & 4095) + ((unsigned(gpu.m_axi_arlen) + 1) << gpu.m_axi_arsize) <= 4096, "read crosses 4KiB");
                reads.push_back({gpu.m_axi_araddr, unsigned(gpu.m_axi_arlen) + 1, gpu.m_axi_arsize, gpu.m_axi_arid});
            }
            if (gpu.m_axi_awvalid && gpu.m_axi_awready) {
                check(gpu.m_axi_awburst == 1 && gpu.m_axi_awsize <= 3, "unsupported write burst");
                check((gpu.m_axi_awaddr & 4095) + ((unsigned(gpu.m_axi_awlen) + 1) << gpu.m_axi_awsize) <= 4096, "write crosses 4KiB");
                writes.push_back({gpu.m_axi_awaddr, unsigned(gpu.m_axi_awlen) + 1, gpu.m_axi_awsize, gpu.m_axi_awid});
            }
        }
        gpu.aclk = 1; gpu.eval(); ++cycles;
        return accepted;
    }
    void writeData(uint8_t index, uint32_t size, uint32_t begin = 0) override {
        auto& b = buffers.at(index);
        check(size && !(size % 4) && !(begin % 4) && begin + size <= b.size(), "write bounds");
        const auto* words = reinterpret_cast<const uint32_t*>(b.data() + begin);
        if (dma && size >= 8 && (words[0] & 0xf0000000u) == 0x90000000u) {
            unsigned bytes = words[0] & 0x0fffffffu; check(bytes == size - 8, "packet size");
            unsigned padded = (bytes + 63) & ~63u;
            uint32_t at = MemoryBase + 0x800000u + index * 0x100000u;
            std::memcpy(memory.data()+offset(at), b.data()+begin+8, bytes);
            std::memset(memory.data()+offset(at)+bytes, 0, padded-bytes);
            for (unsigned sent=0; sent<padded;) {
                const unsigned amount=chunkBytes?std::min(chunkBytes,padded-sent):padded;
                word(0xb0000000u | amount); word(at+sent); sent+=amount;
            }
            word(0x50000004u); word(0); word(0xabcd0123u);
            const auto end = cycles + 30000000;
            while (output.empty()) { tick(); check(cycles < end, "DMA echo timeout"); }
            check(output.front() == 0xabcd0123u, "DMA echo mismatch"); output.pop_front();
        } else for (unsigned i = 0; i < size / 4; ++i) word(words[i]);
    }
    void readData(uint8_t index, uint32_t size) override {
        auto* out = reinterpret_cast<uint32_t*>(buffers.at(index).data());
        const auto end = cycles + 30000000;
        for (unsigned i = 0; i < size / 4; ++i) {
            while (output.empty()) { tick(); check(cycles < end, "response timeout"); }
            out[i] = output.front(); output.pop_front();
        }
    }
    void blockUntilTransferIsComplete() override {}
    tcb::span<uint8_t> requestWriteBuffer(uint8_t i) override { return buffers.at(i); }
    tcb::span<uint8_t> requestReadBuffer(uint8_t i) override { return buffers.at(i); }
    uint8_t getWriteBufferCount() const override { return buffers.size(); }
    uint8_t getReadBufferCount() const override { return buffers.size(); }
    uint32_t frameCount() const { return frame; }
    uint32_t frameAddress() const { return address; }
    void waitForFrame(uint32_t before) {
        auto end = cycles + 30000000;
        while (frame == before) { tick(); check(cycles < end, "frame timeout"); }
    }
    const uint8_t* framePixels() const { return memory.data()+offset(address); }
};
