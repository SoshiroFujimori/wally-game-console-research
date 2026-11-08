# FPGA resource use before and after graphics integration

This is a comparison of archived implementation reports, not a new hardware run.
The presentation shows utilization percentages from two development stages of
the Nexys Video design (Artix-7 XC7A200T, `xc7a200tsbg484-1`). Both reports use
Vivado 2025.2 and describe the complete design after routing.

| FPGA resource | Before (2026-09-08) | After (2026-11-08) |
| --- | ---: | ---: |
| Slice LUTs | 36.22% | 50.39% |
| Slice Registers | 11.68% | 18.96% |
| Block RAM Tile | 23.01% | 58.63% |
| DSPs | 3.38% | 8.24% |

## Sources

- **Before:** [saved board-bring-up utilization report](before-utilization.rpt),
  recorded at 13:16:56 on 2026-09-08. This is the Wally configuration without
  graphics; the instantiated-netlist list contains the clock/reset, DDR and
  CPU bus-conversion IP. The report was retained as
  `fpga/generator/reports/nexysvideo_utilization.rpt` in the product workspace.
  [Nexys Video support](https://github.com/SoshiroFujimori/wally-game-console/commit/f0764f003f7c55197882bc1b2f90c84132395472)
  provides the board-support context. The saved report does not identify its
  exact source revision or bitstream hash, so that commit is not asserted as
  an exact source-to-report mapping. The published report removes private host
  and path information; the original and published hashes are recorded separately.
- **After:** [implementation record](../basic-operation-20261108/results/implementation.json)
  and [utilization report](../basic-operation-20261108/results/implementation/utilization.rpt)
  from experiment E8. This is the graphics-enabled research HDMI configuration
  used for gameplay verification, including the later title-layout video. It is
  not a measurement of the product's standard DVI configuration.
- [Machine-readable comparison and provenance](comparison.json).

## Interpretation and reproducibility

The archived source reports retain used/available counts. The percentages are
checked against those counts and use the same resource capacities for both
records. Block RAM is counted in 36-Kibit tile equivalents. Values are rounded
to two decimal places, matching the reports.

The two designs also differ in development revision and implementation history.
This historical comparison does not isolate graphics integration as the only
variable. In particular, subtracting Before from After is not a measurement of
RasterIX alone. The comparison uses archived reports and provides no new
performance measurement.
