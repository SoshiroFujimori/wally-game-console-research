# v009: initialize both retained framebuffers

v008 is a rejected pilot. It assumed that the first two swaps used different
buffers. Upstream Renderer starts with m_selectedColorBuffer=true but writes
COLOR_BUFFER_LOC_1 in its constructor; the first swap toggles the flag to false
and selects LOC_1 again. Thus the first three destinations are LOC_1, LOC_1,
LOC_2. v008 left LOC_2 uninitialized and loaded an earlier experiment image.

This version makes the first three draws complete, then reuses the unchanged
v008 damage algorithm. After draw 2, history slot 0 belongs to LOC_2 and slot 1
to LOC_1; subsequent swaps alternate. No upstream source or FPGA change.

Planned gates: fixed and moving native images, both buffer parities, full-game
state replay and selected complete native pixel comparisons. Performance is
not accepted until correctness gates pass. Initialization is outside steady
state timing in both paths, as in the original baseline.
