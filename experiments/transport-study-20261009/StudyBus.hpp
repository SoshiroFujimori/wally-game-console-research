// SPDX-License-Identifier: GPL-3.0-or-later
// Experimental transport. Official RasterIX and the product adapter are unchanged.
#pragma once
#include "WallyBusConnector.hpp"
#include <algorithm>
#include <cstdio>
#include <fstream>
#include <string>
#include <time.h>

struct TransportStats {
    uint64_t copyNs = 0, launchNs = 0, completionNs = 0, dmaBytes = 0, dmaLists = 0;
};
class StudyBus final : public rr::IBusConnector {
    static constexpr uint32_t Base = 0x9e800000;
    static constexpr size_t SlotSize = 1024 * 1024;
    static constexpr size_t RegionSize = 12 * SlotSize;
    WallyBusConnector apb;
    volatile uint32_t* regs = nullptr;
    volatile uint64_t* memory = nullptr;
    std::string mode;
    unsigned threshold;
    bool detailed;
    bool pending = false;
    uint32_t token = 0;
    static uint64_t clockNs() {
        timespec t{};
        if (clock_gettime(CLOCK_MONOTONIC_RAW, &t)) throw std::runtime_error("clock_gettime");
        return uint64_t(t.tv_sec) * 1000000000ull + t.tv_nsec;
    }
    static void fence() { asm volatile("fence iorw, iorw" ::: "memory"); }
    void finish() {
        if (!pending) return;
        const auto start = clockNs();
        while ((regs[2] & 2) == 0) {
            if (clockNs() - start > 30000000000ull)
                throw std::runtime_error("DMA completion timeout; reconfigure before reuse");
        }
        const auto received = regs[6];
        fence();
        if (received != token) throw std::runtime_error("DMA completion token mismatch");
        pending = false;
        if (detailed) stats.completionNs += clockNs() - start;
    }
    void mapMemory() {
        if (getWriteBufferCount() * SlotSize > RegionSize)
            throw std::runtime_error("DMA slots exceed reserved region");
        // The fixed experiment DT reserves 0x9e000000..0x9fffffff.
        // Texture allocation ends at 0x9e800000. Stencil begins at 0x9f800000.
        std::ifstream f("/proc/iomem"); std::string line;
        bool reserved = false;
        while (std::getline(f, line)) {
            unsigned long long first = 0, last = 0;
            if (std::sscanf(line.c_str(), " %llx-%llx", &first, &last) != 2) continue;
            if (line.find("System RAM") != std::string::npos && first < Base + RegionSize && last >= Base)
                throw std::runtime_error("DMA region overlaps Linux System RAM");
            if ((line.find("Reserved") != std::string::npos || line.find("reserved") != std::string::npos) && first <= Base && last >= Base + RegionSize - 1)
                reserved = true;
        }
        if (!reserved) throw std::runtime_error("DMA region is not reserved");
        std::ifstream cpu("/proc/cpuinfo");
        std::string info((std::istreambuf_iterator<char>(cpu)), {});
        if (info.find("svpbmt") == std::string::npos)
            throw std::runtime_error("This experiment requires Svpbmt uncached mappings");
        int fd = open("/dev/mem", O_RDWR | O_SYNC);
        if (fd < 0) throw std::runtime_error("DMA /dev/mem");
        void* p = mmap(nullptr, RegionSize, PROT_READ | PROT_WRITE, MAP_SHARED, fd, Base);
        close(fd);
        if (p == MAP_FAILED) throw std::runtime_error("DMA reserved memory mmap");
        memory = static_cast<volatile uint64_t*>(p);
    }
public:
    TransportStats stats;
    StudyBus(std::string selected, unsigned minimum, bool profile)
        : mode(std::move(selected)), threshold(minimum), detailed(profile) {
        if (mode != "apb" && mode != "unrolled" && mode != "dma")
            throw std::runtime_error("Transport must be apb, unrolled, or dma");
        int fd = open("/dev/mem", O_RDWR | O_SYNC);
        if (fd < 0) throw std::runtime_error("Study /dev/mem");
        void* p = mmap(nullptr, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0x10080000);
        close(fd);
        if (p == MAP_FAILED) throw std::runtime_error("Study register mmap");
        regs = static_cast<volatile uint32_t*>(p);
        if (mode == "dma") mapMemory();
    }
    ~StudyBus() override {
        // A failed outstanding transfer requires FPGA reset. Never overwrite its buffer.
        if (memory) munmap(const_cast<uint64_t*>(memory), RegionSize);
        if (regs) munmap(const_cast<uint32_t*>(regs), 4096);
    }
    void writeData(uint8_t index, uint32_t size, uint32_t offset = 0) override {
        finish();
        auto buffer = apb.requestWriteBuffer(index);
        if ((size | offset) % 4 || !size || offset > buffer.size() || size > buffer.size() - offset)
            throw std::runtime_error("Study write range");
        const auto* words = reinterpret_cast<const uint32_t*>(buffer.data() + offset);
        const bool stream = size >= 8 && (words[0] & 0xf0000000u) == 0x90000000u;
        if (mode == "dma" && stream && size - 8 >= threshold) {
            const uint32_t bytes = words[0] & 0x0fffffffu;
            if (bytes != size - 8 || bytes == 0) throw std::runtime_error("Display-list length mismatch");
            const uint32_t padded = (bytes + 63) & ~63u;
            if (padded > SlotSize) throw std::runtime_error("DMA payload exceeds slot");
            const auto a = detailed ? clockNs() : 0;
            auto* dest = memory + index * (SlotSize / 8);
            for (unsigned i = 0; i < padded; i += 8) {
                uint64_t value = 0;
                if (i < bytes) std::memcpy(&value, buffer.data() + offset + 8 + i, std::min(8u, bytes - i));
                dest[i / 8] = value;
            }
            fence(); // Uncached stores must reach DDR before the read command.
            const auto b = detailed ? clockNs() : 0;
            regs[0] = 0xb0000000u | padded; // MEM -> renderer stream (ST1).
            regs[1] = Base + index * SlotSize;
            // The core processes this echo only after consuming the preceding payload.
            regs[0] = 0x50000004u; regs[0] = 0; regs[1] = ++token;
            fence(); pending = true;
            if (detailed) { stats.copyNs += b - a; stats.launchNs += clockNs() - b; }
            stats.dmaBytes += padded; ++stats.dmaLists;
        } else if (mode == "unrolled") {
            const unsigned count = size / 4; unsigned i = 0;
            for (; i + 8 < count; i += 8) {
                regs[0] = words[i]; regs[0] = words[i+1]; regs[0] = words[i+2]; regs[0] = words[i+3];
                regs[0] = words[i+4]; regs[0] = words[i+5]; regs[0] = words[i+6]; regs[0] = words[i+7];
            }
            for (; i + 1 < count; ++i) regs[0] = words[i];
            regs[1] = words[count-1]; fence();
        } else apb.writeData(index, size, offset);
    }
    void readData(uint8_t index, uint32_t size) override { finish(); apb.readData(index, size); }
    void blockUntilTransferIsComplete() override { finish(); apb.blockUntilTransferIsComplete(); }
    tcb::span<uint8_t> requestWriteBuffer(uint8_t i) override { return apb.requestWriteBuffer(i); }
    tcb::span<uint8_t> requestReadBuffer(uint8_t i) override { return apb.requestReadBuffer(i); }
    uint8_t getWriteBufferCount() const override { return apb.getWriteBufferCount(); }
    uint8_t getReadBufferCount() const override { return apb.getReadBufferCount(); }
    uint32_t frameCount() const { return apb.frameCount(); }
    uint32_t frameAddress() const { return apb.frameAddress(); }
    void waitForFrame(uint32_t before) { finish(); apb.waitForFrame(before); }

    void visibilityTest() {
        if (!memory) throw std::runtime_error("Visibility test requires dma");
        // Exercise both ends of the allocation and a 4 KiB crossing.
        for (unsigned offset : {0u, 4032u, unsigned(RegionSize - 65536)}) {
            for (uint32_t salt : {0x12345678u, 0xedcba987u}) {
                for (unsigned i = 0; i < 65536 / 8; ++i) {
                    uint64_t lo = uint32_t((offset + i * 8) ^ salt);
                    uint64_t hi = uint32_t((offset + i * 8 + 4) ^ salt);
                    memory[offset / 8 + i] = lo | (hi << 32);
                }
                fence(); regs[0] = 0x70010000u; regs[1] = Base + offset; fence();
                apb.readData(0, 65536);
                auto* values = reinterpret_cast<uint32_t*>(apb.requestReadBuffer(0).data());
                for (unsigned i = 0; i < 65536 / 4; ++i)
                    if (values[i] != uint32_t((offset + i * 4) ^ salt))
                        throw std::runtime_error("CPU/GPU memory visibility mismatch");
                std::printf("VISIBILITY_PASS offset=%u bytes=65536 salt=%08x\n", offset, salt);
            }
        }
    }
};
