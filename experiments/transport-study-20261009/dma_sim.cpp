// SPDX-License-Identifier: GPL-3.0-or-later
// Test the unmodified upstream FrameStreamingCore with a stalling AXI model.
#include "VFrameStreamingCore.h"
#include <verilated.h>
#include <cstdint>
#include <deque>
#include <iostream>
#include <random>
#include <stdexcept>
#include <vector>

static uint32_t pattern(uint32_t address) {
    uint32_t x = address ^ 0xa71d039bu;
    x ^= x >> 13; x *= 0x85ebca6bu; x ^= x >> 16;
    return x;
}
static void require(bool ok, const char* message) {
    if (!ok) throw std::runtime_error(message);
}
struct Burst { uint32_t address; unsigned remaining; };

static uint64_t trial(unsigned seed, unsigned bytes, unsigned offset, bool memory) {
    VerilatedContext context;
    VFrameStreamingCore t{&context};
    t.resetn = 0; t.aclk = 0; t.eval(); t.aclk = 1; t.eval();
    t.resetn = 1;
    std::mt19937 random(seed);
    const uint32_t base = 0x9e800000u + offset;
    std::vector<uint32_t> commands;
    std::vector<uint32_t> expected;
    // Two consecutive transfers test cleanup and restart without a reset.
    for (unsigned repeat = 0; repeat < 2; ++repeat) {
        commands.push_back((memory ? 0xb0000000u : 0x90000000u) | bytes);
        commands.push_back(base + repeat * 0x200000u);
        for (unsigned i = 0; i < bytes / 4; ++i) {
            auto value = pattern(base + repeat * 0x200000u + i * 4);
            expected.push_back(value);
            if (!memory) commands.push_back(value);
        }
        // An ordered echo acknowledges that the preceding list was consumed.
        commands.insert(commands.end(), {0x50000004u, 0, 0xcafe0000u + repeat});
    }
    size_t source = 0, sink = 0, tokens = 0, reads = 0;
    std::deque<Burst> bursts;
    bool sourceValid = false, readValid = false;
    uint32_t sourceWord = 0, readWord = 0;
    bool readLast = false;
    for (uint64_t cycle = 0; cycle < uint64_t(bytes) * 80 + 30000; ++cycle) {
        if (!sourceValid && source < commands.size() && random() % 5 != 0) {
            sourceValid = true; sourceWord = commands[source];
        }
        if (!readValid && !bursts.empty() && random() % 4 != 0) {
            readValid = true; readWord = pattern(bursts.front().address);
            readLast = bursts.front().remaining == 1;
        }
        t.s_st0_axis_tvalid = sourceValid; t.s_st0_axis_tdata = sourceWord;
        t.s_st0_axis_tlast = 0; // The core frames transfers by command length.
        t.s_st1_axis_tvalid = 0; t.s_st1_axis_tlast = 0; t.s_st1_axis_tdata = 0;
        t.m_st0_axis_tready = random() % 3 != 0;
        t.m_st1_axis_tready = cycle % 4096 >= 512 && random() % 4 != 0;
        t.m_mem_axi_arready = bursts.size() < 8 && random() % 3 != 0;
        t.m_mem_axi_rvalid = readValid; t.m_mem_axi_rdata = readWord;
        t.m_mem_axi_rlast = readLast; t.m_mem_axi_rid = 0; t.m_mem_axi_rresp = 0;
        t.m_mem_axi_awready = 0; t.m_mem_axi_wready = 0;
        t.m_mem_axi_bvalid = 0; t.m_mem_axi_bresp = 0; t.m_mem_axi_bid = 0;
        t.aclk = 0; t.eval();
        if (t.m_st1_axis_tvalid && t.m_st1_axis_tready) {
            require(sink < expected.size(), "extra render word");
            require(t.m_st1_axis_tdata == expected[sink], "render data mismatch");
            require(bool(t.m_st1_axis_tlast) == ((sink + 1) % (bytes / 4) == 0), "render TLAST mismatch");
            ++sink;
        }
        if (t.m_st0_axis_tvalid && t.m_st0_axis_tready) {
            require(tokens < 2, "extra completion token");
            require(t.m_st0_axis_tdata == 0xcafe0000u + tokens, "completion token mismatch");
            require(t.m_st0_axis_tlast, "completion TLAST missing");
            require(sink == (tokens + 1) * bytes / 4, "token preceded payload");
            ++tokens;
        }
        if (readValid && t.m_mem_axi_rready) {
            require(!bursts.empty(), "read without address");
            bursts.front().address += 4;
            if (--bursts.front().remaining == 0) bursts.pop_front();
            readValid = false;
        }
        if (t.m_mem_axi_arvalid && t.m_mem_axi_arready) {
            require(memory, "unexpected memory read in stream mode");
            require(t.m_mem_axi_arlen == 15 && t.m_mem_axi_arsize == 2 && t.m_mem_axi_arburst == 1, "unexpected AXI burst");
            const uint32_t a = t.m_mem_axi_araddr;
            const unsigned repeat = reads / (bytes / 64);
            require(a == base + repeat * 0x200000u + (reads % (bytes / 64)) * 64, "AXI address mismatch");
            require((a & 63) == 0 && (a & 4095) <= 4032, "unaligned or crossing AXI burst");
            bursts.push_back({a, 16}); ++reads;
        }
        if (sourceValid && t.s_st0_axis_tready) { sourceValid = false; ++source; }
        t.aclk = 1; t.eval();
        if (tokens == 2) {
            require(source == commands.size() && sink == expected.size(), "incomplete transfer");
            require(bursts.empty() && !readValid, "outstanding read at completion");
            require(reads == (memory ? bytes / 64 * 2 : 0), "read count mismatch");
            t.final(); return cycle + 1;
        }
    }
    throw std::runtime_error("transfer timeout");
}
int main() {
    unsigned cases = 0;
    try {
        std::cout << "mode,seed,bytes,address_offset,cycles\n";
        for (bool memory : {false, true})
            for (unsigned seed = 1; seed <= 8; ++seed)
                for (unsigned bytes : {64u, 128u, 192u, 4096u, 4160u, 65536u, 1048576u})
                    for (unsigned offset : {0u, 4032u}) {
                        auto cycles = trial(seed, bytes, offset, memory);
                        std::cout << (memory ? "dma" : "stream") << ',' << seed << ',' << bytes << ',' << offset << ',' << cycles << '\n';
                        ++cases;
                    }
        std::cerr << "DMA_SIM_PASS cases=" << cases << " transfers=" << cases * 2 << '\n';
    } catch (const std::exception& e) {
        std::cerr << "DMA_SIM_FAIL after_cases=" << cases << " error=" << e.what() << '\n';
        return 1;
    }
}
