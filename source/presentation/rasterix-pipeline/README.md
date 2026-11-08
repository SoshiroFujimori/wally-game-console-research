# RasterIX FPGA pipeline diagram

The hidden question slide 17 adapts the official RasterIX README figure into
native PowerPoint blocks and wires, using the active deck's RVSOC-inspired
fonts, line weights and colors.

## Upstream source

- Repository: [ToNi3141/RasterIX](https://github.com/ToNi3141/RasterIX).
- Latest `main` checked on 2026-11-08: `3e2ee5aa5214b829c2a824250c445ce799ac8dc0`.
- [FPGA pipeline figure](https://github.com/ToNi3141/RasterIX/blob/3e2ee5aa5214b829c2a824250c445ce799ac8dc0/pictures/fpgaFlow.drawio.png).
- [README explanation](https://github.com/ToNi3141/RasterIX/blob/3e2ee5aa5214b829c2a824250c445ce799ac8dc0/README.md#fpga-pipeline).
- [Source metadata and image hash](source.json).
- [GNU GPL version 3](LICENSE.txt); the upstream repository states version 3 or later.

The native adaptation is provided under GPL-3.0-or-later. Its complete editable
source is [rasterix-pipeline.mjs](../board-evolution/rasterix-pipeline.mjs);
[the deck builder](../board-evolution/README.md) supplies the common style and
rendering utilities. The original image is not embedded in the slide.

## Adaptation and scope

All 27 processing blocks and 33 directed connections in the source figure are
retained. Phase containers are replaced with four headings. Blue paths mark
parallel reads of destination color, depth and stencil values; dashed blocks
mark the optional second TMU and its texture cache. Native wire crossings use
gaps and explicit junction dots, as in the rest of the deck. Box names retain
the upstream English terminology; Japanese phase headings, notes and narration
explain their roles.

This is a conceptual rendering path, not an exhaustive RTL diagram or a claim
that each block takes one cycle. Frame Streaming Core is a transfer frontend,
not the HDMI display controller. Texture-cache arrows preserve the source's
reference relation rather than enumerating every request and response port.

## Difference from the measured console

The console still uses RasterIX `9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0`.
`console/fpga/src/rasterix.sv` selects `RasterIX_IF` with `TMU_COUNT=1`.
`ENABLE_EXTERNAL_TEXTURE_MEMORY` remains at its default value of zero, selecting
the `TextureBuffer` path in `RasterIXRenderCore.v`. The optional second TMU and
the latest figure's Texture Cache / MMU route are therefore not a depiction of
the current measured hardware. IF framebuffer readers and writers access the
internal rendering buffers, not individual direct DDR transactions. The slide
states the TMU/texture difference explicitly; its notes explain the IF scope.

Adding this slide does not update the product submodule, hardware bitstream,
measurements or main presentation narrative.
