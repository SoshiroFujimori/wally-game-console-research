#!/usr/bin/env python3
"""Maintain explicit section links and validate the technical Markdown guide."""

import argparse
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / 'docs' / 'technical'
START = '<!-- technical-toc:start -->'
END = '<!-- technical-toc:end -->'


def with_toc(source):
    source = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n*', '', source, flags=re.S)
    source = re.sub(r'<a id="sec-[0-9]+"></a>\n', '', source)
    titles = re.findall(r'^## (.+)$', source, flags=re.M)
    if not titles:
        return source
    entries = [f'- [{title}](#sec-{i})' for i, title in enumerate(titles, 1)]
    toc = START + '\n**このページの目次**\n\n' + '\n'.join(entries) + '\n' + END + '\n\n'
    counter = iter(range(1, len(titles) + 1))
    source = re.sub(r'^## ', lambda _: f'<a id="sec-{next(counter)}"></a>\n## ', source, flags=re.M)
    first = source.index('<a id="sec-1">')
    return source[:first] + toc + source[first:]


def validate_links(path):
    errors = []
    # These authored guides intentionally use simple inline Markdown links.
    for raw in re.findall(r'!?\[[^\]\n]*\]\(([^)\n]+)\)', path.read_text(encoding='utf-8')):
        url = urlsplit(raw)
        if url.scheme or url.netloc:
            continue
        target = (path.parent / unquote(url.path)).resolve() if url.path else path
        if not target.exists():
            errors.append(f'{path.relative_to(ROOT)}: missing target {raw}')
            continue
        if url.fragment and target.suffix == '.md':
            content = target.read_text(encoding='utf-8')
            fragment = unquote(url.fragment)
            # All guide/appendix fragment links use explicit IDs, not guessed slugs.
            if not re.search(r'\bid=["\']' + re.escape(fragment) + r'["\']', content):
                errors.append(f'{path.relative_to(ROOT)}: missing explicit anchor {raw}')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Regenerate per-page tables of contents')
    args = parser.parse_args()
    errors = []
    files = sorted(GUIDE.glob('*.md'))
    for path in files:
        source = path.read_text(encoding='utf-8')
        rendered = with_toc(source)
        if args.write:
            path.write_text(rendered, encoding='utf-8', newline='\n')
        elif rendered != source:
            errors.append(f'{path.relative_to(ROOT)}: regenerate with --write')
    for path in files:
        errors.extend(validate_links(path))
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'Checked navigation and local fragment links in {len(files)} technical pages.')


if __name__ == '__main__':
    main()
