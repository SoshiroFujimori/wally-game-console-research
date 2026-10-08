// SPDX-License-Identifier: GPL-3.0-or-later
// Written: Codex <codex@openai.com> 10 September 2026
// Play Breakout through the Wally UART terminal and HDMI output.
#include "BreakoutRenderer.hpp"
#include "WallyBusConnector.hpp"
#include "NoThreadRunner.hpp"
#include "RIXGL.hpp"
#include "renderer/devicedatauploader/DeviceDataUploader.hpp"
#include "renderer/threadedvertextransformer/ThreadedVertexTransformer.hpp"
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <memory>
#include <termios.h>
#include <unistd.h>

namespace {
volatile std::sig_atomic_t interrupted = 0;
void interrupt(int) {
    interrupted = 1;
}

class Terminal {
  public:
    Terminal() {
        flags = fcntl(STDIN_FILENO, F_GETFL);
        if (flags < 0)
            throw std::runtime_error("Cannot read terminal flags");
        if (isatty(STDIN_FILENO)) {
            if (tcgetattr(STDIN_FILENO, &saved) != 0)
                throw std::runtime_error("Cannot read terminal settings");
            auto settings = saved;
            settings.c_lflag &= ~(ICANON | ECHO);
            settings.c_cc[VMIN] = 0;
            settings.c_cc[VTIME] = 0;
            if (tcsetattr(STDIN_FILENO, TCSANOW, &settings) != 0)
                throw std::runtime_error("Cannot set terminal mode");
            restore = true;
        }
        if (fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK) < 0) {
            if (restore)
                tcsetattr(STDIN_FILENO, TCSANOW, &saved);
            throw std::runtime_error("Cannot enable terminal polling");
        }
    }
    ~Terminal() {
        fcntl(STDIN_FILENO, F_SETFL, flags);
        if (restore)
            tcsetattr(STDIN_FILENO, TCSANOW, &saved);
    }
    Terminal(const Terminal&) = delete;
    Terminal& operator=(const Terminal&) = delete;
    void poll(breakout::Game& game, bool& demo, bool& quit) {
        char bytes[64];
        for (;;) {
            const auto count = read(STDIN_FILENO, bytes, sizeof(bytes));
            if (count < 0) {
                if (errno == EAGAIN || errno == EINTR)
                    return;
                throw std::runtime_error("Cannot read terminal input");
            }
            if (count == 0)
                return;
            for (ssize_t i = 0; i < count; ++i) {
                switch (bytes[i]) {
                case 'a':
                case 'A':
                    input.move = -1;
                    demo = false;
                    break;
                case 'd':
                case 'D':
                    input.move = 1;
                    demo = false;
                    break;
                case 's':
                case 'S':
                    input.move = 0;
                    demo = false;
                    break;
                case ' ':
                    input.start = true;
                    break;
                case 'r':
                case 'R':
                    game.restart();
                    input = {};
                    break;
                case 'm':
                case 'M':
                    demo = !demo;
                    input = {};
                    break;
                case 'q':
                case 'Q':
                    quit = true;
                    break;
                default:
                    break;
                }
            }
        }
    }
    breakout::Input takeInput() {
        const auto value = input;
        input.start = false;
        return value;
    }

  private:
    termios saved{};
    int flags = 0;
    bool restore = false;
    breakout::Input input{};
};
} // namespace

int main(int argc, char** argv) {
    bool demo = false;
    unsigned seconds = 0;
    for (int i = 1; i < argc; ++i) {
        if (!std::strcmp(argv[i], "--demo"))
            demo = true;
        else if (!std::strcmp(argv[i], "--seconds") && i + 1 < argc) {
            char* end = nullptr;
            errno = 0;
            const auto value = std::strtoul(argv[++i], &end, 10);
            if (errno || !*argv[i] || *end || value == 0 || value > 86400) {
                std::fprintf(stderr, "Duration must be between 1 and 86400 seconds\n");
                return 1;
            }
            seconds = value;
        } else {
            std::fprintf(stderr, "Usage: %s [--demo] [--seconds N]\n", argv[0]);
            return 1;
        }
    }
    try {
        WallyBusConnector bus;
        rr::devicedatauploader::DeviceDataUploader uploader(bus);
        rr::NoThreadRunner worker, transfer;
        auto device = std::make_unique<rr::threadedvertextransformer::ThreadedVertexTransformer>(
            uploader, worker, transfer);
        if (!rr::RIXGL::createInstance(*device))
            throw std::runtime_error("Cannot create OpenGL context");
        // Destroy the context before its device and transport on every exit path.
        struct Context {
            rr::threadedvertextransformer::ThreadedVertexTransformer& device;
            ~Context() {
                rr::RIXGL::destroy();
                device.deinit();
            }
        } context{*device};
        auto& gl = rr::RIXGL::getInstance();
        // Resolution changes flush the initial list; clear stale internal pixels first.
        glClearColor(0, 0, 0, 1);
        glClear(GL_COLOR_BUFFER_BIT);
        if (!gl.setRenderResolution(breakout::Width, breakout::Height))
            throw std::runtime_error("Unsupported resolution");
        breakout::Renderer renderer;
        breakout::Game game;
        Terminal terminal;
        std::signal(SIGINT, interrupt);
        std::signal(SIGTERM, interrupt);
        std::puts("Wally Breakout\nA/D: move left/right; S: stop; Space: launch\n"
                  "R: restart; M: toggle demo; Q: quit\nMovement continues until S or the opposite direction "
                  "is pressed.");
        std::fflush(stdout);
        const auto present = [&] {
            renderer.draw(breakout::scene(game));
            const auto previous = bus.frameCount();
            gl.swapDisplayList();
            bus.waitForFrame(previous);
            if (glGetError() != GL_NO_ERROR)
                throw std::runtime_error("OpenGL error");
        };
        // Initialize both buffers even if an exit signal arrives during warmup.
        for (int i = 0; i < 4; ++i)
            present();
        using Clock = std::chrono::steady_clock;
        using Nanoseconds = std::chrono::nanoseconds;
        const auto start = Clock::now();
        auto previousTime = start;
        uint64_t accumulated = 0, frames = 0, ticks = 0;
        bool quit = false;
        while (!quit && !interrupted) {
            const auto currentTime = Clock::now();
            if (seconds && currentTime - start >= std::chrono::seconds(seconds))
                break;
            terminal.poll(game, demo, quit);
            if (quit)
                break;
            // Accumulate nanoseconds multiplied by 60 to avoid rounding the tick
            // period. Rendering can skip pictures but never simulation steps.
            accumulated += std::chrono::duration_cast<Nanoseconds>(currentTime - previousTime).count() * 60;
            previousTime = currentTime;
            while (accumulated >= 1000000000 && !interrupted) {
                const auto manual = terminal.takeInput();
                game.step(demo ? game.automatic() : manual);
                accumulated -= 1000000000;
                ++ticks;
            }
            present();
            ++frames;
        }
        const double elapsed = std::chrono::duration<double>(Clock::now() - start).count();
        std::printf("Game ended: score=%d lives=%d frames=%llu ticks=%llu elapsed=%.3f s\n", game.score,
                    game.lives, static_cast<unsigned long long>(frames),
                    static_cast<unsigned long long>(ticks), elapsed);
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "%s\n", error.what());
        return 1;
    }
}
