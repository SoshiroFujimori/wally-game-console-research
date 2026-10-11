"""Guard content preservation and navigation when publishing split documents."""

from pathlib import Path
import re
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'source/thesis'))
from markdown_export import (APPENDIX, MAX_PAGE_BYTES, mask_code, normalize_anchors,
                             publish_markdown, published_routes, rewrite_links,
                             split_markdown, split_pieces)


DOCUMENT = '''# Technical appendix

[Other document](本文.md)

## ジャンプできる目次

- [First part](#part_I)
- [Second chapter](#ch_2)

Introduction preserved in full.

<a id="guide"></a>
## How to read

[Go to section](#s_2_1).

<a id="part_I"></a>
## 第I部 HDL

Part introduction.

<a id="ch_1"></a>
### 第1章 Signals

<a id="s_1_1"></a>
#### 1.1 Transfer

[Next section](#s_2_1), [source](#ref_Book), [main](本文.md#ch_7).
![Figure](figs/example.png)

| Value | Meaning |
|---|---|
| 4.393 | unchanged |

The literal `[example](#not_a_link)` remains code.

````markdown
<a id="ch_99"></a>
### 第99章 Not a chapter
```text
[literal](#not_a_link)
```
````

<a id="part_IV"></a>
## 第IV部 RasterIX

Second part introduction.

<a id="ch_2"></a>
### 第2章 Pixels

<a id="s_2_1"></a>
#### 2.1 Calculation

Equation and exact value: $x = 307200$.
[Previous section](#s_1_1).
[External source](https://example.org/source?q=1#section).

<a id="references"></a>
## 参考文献と実験記録

<a id="ref_Book"></a>
[Book] Unchanged citation.
'''


class AppendixMarkdownTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / 'docs/thesis'

    def test_every_source_block_survives_in_order(self):
        pieces = split_pieces(DOCUMENT)
        expected = DOCUMENT[DOCUMENT.index('Introduction preserved'):]
        self.assertEqual(''.join(p.body for p in pieces), expected)
        self.assertEqual(sum(p.kind == 'chapter' for p in pieces), 2)
        files, routes, _ = split_markdown(DOCUMENT, self.output)
        for piece in pieces:
            text = files[self.output / piece.path]
            chunks = re.findall(r'<!-- appendix-content:start -->\n(.*?)\n<!-- appendix-content:end -->', text, re.S)
            expected = normalize_anchors(rewrite_links(piece.body, self.output / APPENDIX,
                                     self.output / piece.path, self.output / APPENDIX, routes))
            # Heading levels are the only non-URL changes in source content.
            plain = lambda s: re.sub(r'^#+ ', '', mask_code(s), flags=re.M).rstrip()
            self.assertEqual(plain('\n\n'.join(chunks)), plain(expected))
        first = files[self.output / 'appendix/01-hdl-fpga/chapter-01.md']
        code = DOCUMENT[DOCUMENT.index('````markdown'):DOCUMENT.index('\n\n<a id="part_IV"')]
        self.assertIn(code, first)
        self.assertIn('`[example](#not_a_link)`', first)
        self.assertNotIn('ch_99', routes)

    def test_cross_chapter_images_main_and_references_are_rebased(self):
        files, routes, _ = split_markdown(DOCUMENT, self.output)
        first = files[self.output / 'appendix/01-hdl-fpga/chapter-01.md']
        self.assertIn('(../04-rasterix/chapter-02.md#s_2_1)', first)
        self.assertIn('(../references.md#ref_book)', first)
        self.assertIn('(../../本文.md#ch_7)', first)
        self.assertIn('(../../figs/example.png)', first)
        for anchor in routes:
            self.assertIn(f'id="{anchor.lower()}"', files[self.output / APPENDIX])
        second = files[self.output / 'appendix/04-rasterix/chapter-02.md']
        self.assertIn('(https://example.org/source?q=1#section)', second)

    def test_regeneration_and_inbound_links(self):
        publish_markdown('技術付録', DOCUMENT, self.output)
        result = publish_markdown('技術付録', DOCUMENT, self.output, check=True)
        self.assertFalse(result['changed'])
        routes = published_routes(self.output)
        source = self.output.parent / 'technical/guide.md'
        rewritten = rewrite_links('[Details](../thesis/技術付録.md#s_2_1)', source, source,
                                  self.output / APPENDIX, routes)
        self.assertEqual(rewritten, '[Details](../thesis/appendix/04-rasterix/chapter-02.md#s_2_1)')
        target = self.output / 'appendix/04-rasterix/chapter-02.md'
        target.write_text('incomplete')
        with self.assertRaisesRegex(ValueError, 'regeneration'):
            publish_markdown('技術付録', DOCUMENT, self.output, check=True)
        self.assertEqual(target.read_text(), 'incomplete')

    def test_duplicate_and_unknown_anchors_stop_publication(self):
        duplicate = DOCUMENT.replace('<a id="s_2_1">', '<a id="s_1_1">')
        with self.assertRaisesRegex(ValueError, 'Duplicate anchor'):
            split_markdown(duplicate, self.output)
        unknown = DOCUMENT.replace('[Go to section](#s_2_1)', '[Go to section](#missing)')
        with self.assertRaisesRegex(ValueError, 'Unknown appendix anchor'):
            split_markdown(unknown, self.output)

    def test_oversized_page_requires_a_new_split(self):
        oversized = DOCUMENT.replace('Part introduction.', 'x' * MAX_PAGE_BYTES)
        with self.assertRaisesRegex(ValueError, 'exceeds'):
            split_markdown(oversized, self.output)


if __name__ == '__main__':
    unittest.main()
