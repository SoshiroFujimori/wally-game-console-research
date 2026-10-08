// SPDX-License-Identifier: GPL-3.0-or-later
// Written: Codex <codex@openai.com> 9 September 2026
// Render a triangle or the upstream textured-cube example through Wally.
#include "WallyBusConnector.hpp"
#include "RIXGL.hpp"
#include "renderer/devicedatauploader/DeviceDataUploader.hpp"
#include "renderer/threadedvertextransformer/ThreadedVertexTransformer.hpp"
#include "NoThreadRunner.hpp"
#include "Minimal.hpp"
#include "gl.h"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>

int main(int argc, char** argv) {
    const char* scene = argc > 1 ? argv[1] : "triangle";
    unsigned frames = argc > 2 ? std::strtoul(argv[2], nullptr, 10) : 120;
    if ((std::strcmp(scene, "triangle") && std::strcmp(scene, "cube") &&
         std::strcmp(scene, "red") && std::strcmp(scene, "green") && std::strcmp(scene, "blue")) || !frames) {
        std::fprintf(stderr, "Usage: %s [triangle|cube|red|green|blue] [frames]\n", argv[0]);
        return 1;
    }
    try {
        WallyBusConnector bus;
        rr::devicedatauploader::DeviceDataUploader uploader(bus);
        // Process the upstream framebuffer strips synchronously on the single CPU.
        rr::NoThreadRunner worker, transfer;
        auto device = std::make_unique<rr::threadedvertextransformer::ThreadedVertexTransformer>(uploader, worker, transfer);
        if (!rr::RIXGL::createInstance(*device)) throw std::runtime_error("Cannot create OpenGL context");
        auto& gl = rr::RIXGL::getInstance();
        // Resolution changes flush the initial list; clear stale internal pixels first.
        glClearColor(0, 0, 0, 1);
        glClear(GL_COLOR_BUFFER_BIT);
        if (!gl.setRenderResolution(640, 480)) throw std::runtime_error("Unsupported resolution");
        const bool cube = std::strcmp(scene, "cube") == 0;
        Minimal cubeScene;
        if (cube) cubeScene.init(640, 480);
        else {
            glViewport(0, 0, 640, 480);
            glMatrixMode(GL_PROJECTION);
            glLoadIdentity();
            glOrtho(0, 640, 0, 480, -1, 1);
            glMatrixMode(GL_MODELVIEW);
            glLoadIdentity();
        }
        std::printf("RasterIX scene=%s frames=%u resolution=640x480\n", scene, frames);
        std::fflush(stdout);
        const auto present = [&] {
            if (cube) cubeScene.draw();
            else {
                glClearColor(!std::strcmp(scene, "red") ? 1.0f : 0.0f,
                             !std::strcmp(scene, "green") ? 1.0f : 0.0f,
                             !std::strcmp(scene, "blue") ? 1.0f : 0.0f, 1.0f);
                glClear(GL_COLOR_BUFFER_BIT);
                if (!std::strcmp(scene, "triangle")) {
                    glBegin(GL_TRIANGLES);
                    glColor3f(1, 0, 0); glVertex2f(320, 400);
                    glColor3f(0, 1, 0); glVertex2f(120, 80);
                    glColor3f(0, 0, 1); glVertex2f(520, 80);
                    glEnd();
                }
            }
            const uint32_t previous = bus.frameCount();
            gl.swapDisplayList();
            bus.waitForFrame(previous);
            if (glGetError() != GL_NO_ERROR) throw std::runtime_error("OpenGL error");
        };
        // Upstream starts with the first buffer twice. Initialize both buffers
        // before the requested frames so even a short run has a valid exit image.
        for (unsigned frame = 0; frame < 3; ++frame) present();
        for (unsigned frame = 0; frame < frames; ++frame) {
            present();
            if (frame == 0 || frame + 1 == frames || (frame + 1) % 30 == 0) {
                std::printf("Frame %u displayed: count=%u address=0x%08x\n", frame + 1,
                            bus.frameCount(), bus.frameAddress());
                std::fflush(stdout);
            }
        }
        // Release the context and select the system framebuffer.
        rr::RIXGL::destroy();
        device->deinit();
        std::puts("Rendering completed");
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "%s\n", error.what());
        return 1;
    }
}
