// SPDX-License-Identifier: GPL-3.0-or-later
// Written: Codex <codex@openai.com> 9 September 2026
// Linux transport for the Wally APB RasterIX command port.
#pragma once
#include "IBusConnector.hpp"
#include "RenderConfigs.hpp"
#include <array>
#include <chrono>
#include <cstring>
#include <fcntl.h>
#include <stdexcept>
#include <sys/mman.h>
#include <unistd.h>
#include <vector>

class WallyBusConnector final : public rr::IBusConnector {
public:
    WallyBusConnector() {
        for (auto& buffer : buffers) buffer.resize(1024 * 1024 / sizeof(uint32_t));
        int fd = open("/dev/mem", O_RDWR | O_SYNC);
        if (fd < 0) throw std::runtime_error("Cannot open /dev/mem");
        void* mapping = mmap(nullptr, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0x10080000);
        close(fd);
        if (mapping == MAP_FAILED) throw std::runtime_error("Cannot map RasterIX registers");
        regs = static_cast<volatile uint32_t*>(mapping);
        if (regs[3] != 0x52495831) {
            munmap(mapping, 4096);
            regs = nullptr;
            throw std::runtime_error("RasterIX register ID does not match");
        }
    }
    ~WallyBusConnector() override {
        if (regs) munmap(const_cast<uint32_t*>(regs), 4096);
    }
    WallyBusConnector(const WallyBusConnector&) = delete;
    WallyBusConnector& operator=(const WallyBusConnector&) = delete;

    void writeData(uint8_t index, uint32_t size, uint32_t offset = 0) override {
        checkRange(index, size, offset);
        const uint32_t* data = buffers[index].data() + offset / 4;
        for (uint32_t i = 0; i < size / 4; ++i) {
            // PREADY applies backpressure until the asynchronous FIFO has room.
            regs[(i + 1 == size / 4) ? 1 : 0] = data[i];
        }
        blockUntilTransferIsComplete();
    }
    void readData(uint8_t index, uint32_t size) override {
        checkRange(index, size, 0);
        const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
        for (uint32_t i = 0; i < size / 4; ++i) {
            while ((regs[2] & 2) == 0) {
                if (std::chrono::steady_clock::now() > deadline)
                    throw std::runtime_error("RasterIX response timeout");
            }
            buffers[index][i] = regs[6];
        }
        blockUntilTransferIsComplete();
    }
    void blockUntilTransferIsComplete() override {
        // Once the MMIO writes complete, the FIFO owns the copied words.
        asm volatile("fence iorw, iorw" ::: "memory");
    }
    tcb::span<uint8_t> requestWriteBuffer(uint8_t index) override {
        if (index >= buffers.size()) return {};
        return {reinterpret_cast<uint8_t*>(buffers[index].data()), buffers[index].size() * 4};
    }
    tcb::span<uint8_t> requestReadBuffer(uint8_t index) override { return requestWriteBuffer(index); }
    uint8_t getWriteBufferCount() const override { return buffers.size(); }
    uint8_t getReadBufferCount() const override { return buffers.size(); }
    uint32_t frameCount() const { return regs[4]; }
    uint32_t frameAddress() const { return regs[5]; }
    void waitForFrame(uint32_t previous) const {
        const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
        // Avoid sleep granularity delaying work for the next display frame.
        while (frameCount() == previous) {
            if (std::chrono::steady_clock::now() > deadline)
                throw std::runtime_error("RasterIX display swap timeout");
        }
    }
private:
    void checkRange(uint8_t index, uint32_t size, uint32_t offset) const {
        if (index >= buffers.size() || (size | offset) % 4 ||
            offset > buffers[index].size() * 4 || size > buffers[index].size() * 4 - offset)
            throw std::runtime_error("Invalid RasterIX transfer range");
    }
    volatile uint32_t* regs = nullptr;
    // Two lists per framebuffer strip and a separate buffer for device transfers.
    std::array<std::vector<uint32_t>, 2 * rr::RenderConfig::getDisplayLines() + 1> buffers;
};
