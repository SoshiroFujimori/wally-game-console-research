#!/usr/bin/env python3
"""Maintain explicit section links and validate the technical Markdown guide."""

import argparse
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / 'docs' / 'thesis' / 'appendix'
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
    parser.add_argument('--write', action='store_true', help='Retained flag: generated pages are rebuilt by the thesis exporter')
    args = parser.parse_args()
    errors = []
    thesis = ROOT / 'docs' / 'thesis'
    files = sorted(GUIDE.rglob('*.md')) + [thesis / '技術付録.md', thesis / '本文.md']
    if args.write:
        raise SystemExit('Pages are generated; run source/thesis/build.py NAME --markdown-only')
    for path in files:
        errors.extend(validate_links(path))
    if (ROOT / 'docs/technical').exists():
        errors.append('Separate technical guides must not be reintroduced')
    index = (thesis / '技術付録.md').read_text(encoding='utf-8')
    for path in GUIDE.rglob('*.md'):
        if path.name not in ('README.md', 'references.md'):
            rel = path.relative_to(thesis).as_posix()
            if '(' + rel + ')' not in index:
                errors.append(f'{rel}: missing from the common appendix index')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'Checked navigation and local fragment links in {len(files)} document pages.')


if __name__ == '__main__':
    main()
