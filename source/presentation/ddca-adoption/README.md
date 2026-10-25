# DDCA course-listing map

`records.json` contains selected official syllabus textbook/reference listings.
Categories describe the level of the listed course, not the institution's
legal type. Prefectures follow the relevant campus, not the head office.
Years follow the course source; null means the course year is unspecified.
The institution_key field deduplicates undergraduate and graduate records
of one university when computing the total number of institutions. Historical listings are not claims
of current adoption. Gray means unverified in this selection, not non-use.
Reference-book recommendations are not mandatory textbook use.

See the [Japanese evidence table](../../../docs/presentation/DDCA授業利用の出典.md)
for course names, source sections, dates and qualifications. Keep it in sync
with `records.json`. The drawing helper derives the colored sets and counts
directly from that file. The map is a hidden question slide, with no added
main-presentation narration time.

## Geography and license

`prefectures.json` preserves the 47 prefecture polygons from lalamalink's
[deformed prefecture map](https://github.com/lalamalink/japan-map-svg/blob/864884e8881cdc6d1c0dfb487a2588bb00774003/svg/deformed-japan-prefecture-map.svg),
released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The [license notice](LICENSE.txt) retains the creator credit and CC0 declaration.
The creator contact email is omitted from this public copy; the original
notice remains available in the linked upstream repository.
Original SVG SHA-256: `c4817c97dedab08d20a2f4afccd4a780befc57040d48f7f0cded79d10e084fbc`.
Only the `data-code`/`data-name` prefecture-fill paths are used. Their M/L/Z
coordinates are retained without geometric simplification. The slide draws
them as editable PowerPoint paths. For a prefecture with several course
levels, vertical color bands are clipped to its original polygon; the
outer prefecture boundary is unchanged. Band width does not encode counts.
This is a stylized statistical map, not a survey map or physical-area estimate.
One map contains all three categories. Multicolor stripes identify
overlapping categories; gray prefectures remain unverified in this dataset.
