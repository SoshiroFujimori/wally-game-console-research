#!/usr/bin/env bash
set -euo pipefail

repo=${1:?Specify the pinned RasterIX checkout}
out=${2:?Specify a new output directory}
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
src="$script_dir/rasterix_descriptor_audit.cpp"

mkdir -p "$out"

defs=(
  -DRIX_CORE_COLOR_BUFFER_LOC_0=0x01E00000
  -DRIX_CORE_COLOR_BUFFER_LOC_1=0x01E00000
  -DRIX_CORE_COLOR_BUFFER_LOC_2=0x01C00000
  -DRIX_CORE_DEPTH_BUFFER_LOC=0
  -DRIX_CORE_ENABLE_MIPMAPPING=true
  -DRIX_CORE_ENABLE_VSYNC=false
  -DRIX_CORE_FRAMEBUFFER_SIZE_IN_PIXEL_LG=16
  -DRIX_CORE_GRAM_MEMORY_LOC=0x0E000000
  -DRIX_CORE_MAX_DISPLAY_HEIGHT=600
  -DRIX_CORE_MAX_DISPLAY_WIDTH=1024
  -DRIX_CORE_MAX_TEXTURE_SIZE=256
  -DRIX_CORE_MAX_VBO_COUNT=256
  -DRIX_CORE_NUMBER_OF_TEXTURES=7280
  -DRIX_CORE_NUMBER_OF_TEXTURE_PAGES=7280
  -DRIX_CORE_PERFORMANCE_MODE=false
  -DRIX_CORE_SOFTWARE_RENDERING=false
  -DRIX_CORE_STENCIL_BUFFER_LOC=0
  -DRIX_CORE_TEXTURE_PAGE_SIZE=4096
  -DRIX_CORE_THREADED_RASTERIZATION=false
  '-DRIX_CORE_THREADED_RASTERIZATION_DISPLAY_LIST_SIZE=1024 * 1024 * 4'
  -DRIX_CORE_TMU_COUNT=1
  -DRIX_CORE_USE_FLOAT_INTERPOLATION=false
  -DSPDLOG_ACTIVE_LEVEL=2
)

g++ -std=c++20 -O2 "${defs[@]}" \
  -I"$repo/lib/gl" -I"$repo/lib/3rdParty/span/include" \
  "$src" \
  "$repo/lib/gl/renderer/Rasterizer.cpp" \
  "$repo/lib/gl/renderer/softwarerasterizer/Rasterizer.cpp" \
  -o "$out/rasterix_descriptor_audit"

"$out/rasterix_descriptor_audit"
