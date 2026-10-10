# Experimental decisions and limits

This study evaluates changes that could improve the existing 640 x 480 2D
console without changing the game. A passing functional test, a faster local
operation, and an improved whole-frame result are different decision gates.
The product and official RasterIX submodule are unchanged by this study.

| Candidate | Evidence | Decision for the tested console |
| --- | --- | --- |
| Published APB command path | Software matrix and image comparisons; retained drawing near 58 completed swaps/s | Retain as the product reference |
| Eight-write MMIO loop | Same command sequences and images; full-redraw write time 7.904 to 6.074 ms | A bounded software option; whole-frame gains depend on drawing mode |
| Link-time optimization | Same game and image checks; grouped drawing 14.953 to 19.611 swaps/s | Useful for that workload; no comparable gain established for retained drawing |
| Unmodified internal command DMA | Standalone reader passes; full renderer model stalls and board trial times out | Not qualified as a product transport |
| DMA read FIFO and parser candidate | Qualified implementation, APB/DMA image checks, repeated game measurements | Keep as experimental RTL; it establishes a working comparison, not a general upstream fix |
| Copied command DMA | Full redraw 11.844 versus 14.728 swaps/s on the same candidate circuit | Do not adopt for a claimed speedup; uncached staging-copy cost is included |
| DMA minimum lengths 64, 1,024, 8,192 bytes | Same game, original command volumes, and final images | Larger thresholds did not improve the reported medians beyond APB |
| IF working buffer 65,536 to 131,072 pixels | Strips fall from five to three; BRAM grows 215 to 285.5 tiles; little game throughput gain | Retain IF16 for this workload |

The values and observed ranges are in [RESULTS.md](RESULTS.md); measurement
boundaries and reproduction are in [METHODS.md](METHODS.md). These decisions
are not statements that a candidate is always ineffective.

## Designs not implemented in this study

- **Direct command generation in uncached shared memory:** it could remove the
  measured staging copy, but it also changes every command-buffer read/write,
  allocation, and ownership boundary. It is a different renderer-memory design,
  not a DMA threshold setting. No speedup is claimed without implementing and
  checking those changes. The current measurements identify why it might be a
  later comparison; they do not estimate its result.
- **A coherent or explicitly cache-maintained DMA driver:** the user-space
  reserved-memory experiment does not implement kernel-managed DMA mappings or
  cache ownership. A different mapping/driver must establish those properties
  before its speed can be compared.
- **External AXI DMA IP:** replacing the command reader alone would not remove
  this implementation's CPU staging copy. The built-in reader plus an isolated
  experimental buffer already provides a working board comparison. This study
  does not rank every external DMA engine or integrate a second engine into the
  product.
- **More APB FIFO depths or CPU frequencies:** E6 compares one-word, 16-word,
  and 512-word connections. E7 keeps the CPU at 20 MHz. It does not find a
  minimum FIFO depth, maximum clock rate, or global hardware optimum.

These are explicit untested limits, not failed experiment results. The supplied
2D workload already approaches its display cadence with retained drawing, so
large architecture changes are not prerequisites for the bounded design and
performance conclusions reported here. External video reception and controller
input remain separate validation questions.
