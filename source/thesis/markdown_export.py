"""Publish chapter-sized Markdown while keeping the print source intact."""

from dataclasses import dataclass
import os
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit, urlunsplit


APPENDIX = Path('技術付録.md')
MAX_PAGE_BYTES = 64 * 1024
PART_DIRECTORIES = {
    'I': '01-hdl-fpga', 'II': '02-wally', 'III': '03-linux',
    'IV': '04-rasterix', 'V': '05-integration',
}
REF_PATTERN = (r'技術付録\s*第\d+章|技術付録\s*\d+\.\d+節|第[IVX]+部|'
               r'付録[A-Z](?:\.\d+)?|第\d+章|(?<![\w.図表])[A-Z]\.\d+(?![\d.])|'
               r'(?<![\w.図表])\d+\.\d+(?=節|[〜～・]\d+\.\d+節)')
ANCHOR = re.compile(r'<a id="([^"]+)"></a>')
HEADING = re.compile(r'^<a id="([^"]+)"></a>\n(#{2,5}) (.+)$', re.M)
LINK_OR_CODE = re.compile(r'`+[^`\n]*`+|!?\[[^\]\n]*\]\((?P<target>[^)\n]+)\)')


def resolve_reference(label, load_source, name):
    match = re.search(r'([A-Z]|\d+)\.(\d+)', label)
    if match:
        ident = match[1] + '.' + match[2]
        dest = '技術付録' if match[1].isalpha() or '技術付録' in label else '本文'
        candidates = (dest, '技術付録') if name == '技術付録' and dest == '本文' else (dest,)
        for candidate in candidates:
            if re.search(r'^#{3,4} ' + re.escape(ident) + r' ', load_source(candidate), re.M):
                return candidate, 's_' + ident.replace('.', '_')
        return None
    match = re.search(r'技術付録\s*第(\d+)章', label)
    if match:
        return '技術付録', 'ch_' + match[1]
    match = re.search(r'第([IVX]+)部', label)
    if match:
        return '技術付録', 'part_' + match[1]
    match = re.search(r'付録([A-Z])|第(\d+)章', label)
    if match:
        if match[1]:
            return '技術付録', 'ch_' + match[1]
        for dest in ('本文', '技術付録'):
            if re.search(r'^#{2,4} 第' + re.escape(match[2]) + r'章(?:\s|$)', load_source(dest), re.M):
                return dest, 'ch_' + match[2]
    return None


def render_markdown(name, title, source, tokens, load_source):
    """Render the same complete document used before chapter splitting."""
    headings = [t for t in tokens if t['kind'] == 'heading']
    references = {t['key'] for t in tokens if t['kind'] == 'reference'}
    other = '技術付録' if name == '本文' else '本文'
    intro = f'# {title}\n\n[資料全体の入口](README.md) ｜ [{other}を開く]({other}.md)'
    if name == '技術付録':
        intro += ' ｜ [図と数値例で読む技術詳説](../technical/README.md)'
    intro += '\n\n## ジャンプできる目次\n\n'
    intro += '\n'.join('  ' * (t['level'] - 1) + f'- [{t["text"]}](#{t["anchor"]})'
                       for t in headings) + '\n\n'

    def inline(line):
        parts = re.split(r'(`[^`]+`|!?\[.*?\]\([^)]+\)|https?://[^\s]+)', line)
        for index, part in enumerate(parts):
            if part.startswith(('`', '![', 'https://', 'http://')) or re.fullmatch(r'\[[^\]]+\]\([^)]+\)', part):
                continue

            def reference(match):
                ref = resolve_reference(match[0], load_source, name)
                if not ref:
                    return match[0]
                dest, anchor = ref
                target = '#' + anchor if dest == name else dest + '.md#' + anchor
                return f'[{match[0]}]({target})'

            part = re.sub(REF_PATTERN, reference, part)
            parts[index] = re.sub(r'\[([A-Za-z][A-Za-z0-9]*)\](?!\()',
                                 lambda m: f'[{m[1]}](#ref_{m[1]})' if m[1] in references else m[0], part)
        return ''.join(parts)

    linked = []
    index = 0
    fence = False
    for line in source.splitlines()[1:]:
        if line.startswith('```'):
            fence = not fence
        if not fence and re.match(r'^#{2,5} ', line):
            linked.append(f'<a id="{headings[index]["anchor"]}"></a>')
            index += 1
        elif not fence:
            match = re.match(r'^\[([A-Za-z][A-Za-z0-9]*)\] ', line)
            if match and match[1] in references:
                linked.append(f'<a id="ref_{match[1]}"></a>')
            else:
                line = inline(line)
        linked.append(line)
    return intro + '\n'.join(linked) + '\n'


def outside_fences(text, transform, fenced=lambda line: line):
    """Do not reinterpret example commands, comments, or Markdown in fences."""
    output = []
    fence = None
    for line in text.splitlines(keepends=True):
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if fence:
            output.append(fenced(line))
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence):
                fence = None
        elif marker:
            fence = marker[1]
            output.append(fenced(line))
        else:
            output.append(transform(line))
    if fence:
        raise ValueError('Unclosed code fence')
    return ''.join(output)


def rewrite_links(text, source, destination, appendix, routes):
    """Relocate URLs only; preserve labels and literal code."""
    normalized_routes = {anchor.lower(): path.resolve() for anchor, path in routes.items()}
    appendix_pages = set(normalized_routes.values())

    def replace(match):
        raw = match['target']
        if raw is None:
            return match[0]
        bracketed = raw.startswith('<') and raw.endswith('>')
        url = urlsplit(raw[1:-1] if bracketed else raw)
        if url.scheme or url.netloc:
            return match[0]
        target = (source.parent / unquote(url.path)).resolve() if url.path else source.resolve()
        fragment = unquote(url.fragment)
        if target == appendix.resolve() and fragment:
            if fragment.lower() not in normalized_routes:
                raise ValueError(f'Unknown appendix anchor: {fragment}')
            target = normalized_routes[fragment.lower()]
        # GitHub normalizes custom IDs to lowercase when rendering Markdown.
        if target in appendix_pages and fragment:
            fragment = fragment.lower()
        path = '' if target == destination.resolve() and url.fragment else Path(os.path.relpath(target, destination.parent)).as_posix()
        value = urlunsplit(('', '', path, url.query, fragment))
        if bracketed:
            value = '<' + value + '>'
        start, end = match.span('target')
        return match[0][:start - match.start()] + value + match[0][end - match.start():]

    return outside_fences(text, lambda line: LINK_OR_CODE.sub(replace, line))


def mask_code(text):
    return outside_fences(text, lambda line: line, lambda line: re.sub(r'[^\n]', ' ', line))


def normalize_anchors(text):
    return outside_fences(text, lambda line: ANCHOR.sub(lambda m: f'<a id="{m[1].lower()}"></a>', line))


@dataclass
class Piece:
    path: Path
    title: str
    body: str
    promote: int
    part: str | None = None
    kind: str = 'chapter'


def split_pieces(markdown):
    toc_end = markdown.index('\n\n', markdown.index('## ジャンプできる目次')) + 2
    for line in markdown[toc_end:].splitlines(keepends=True):
        if line.strip() and not re.match(r'^ *- \[', line):
            break
        toc_end += len(line)
    body = markdown[toc_end:]
    # Mask code while retaining offsets, so sample headings cannot split a page.
    fence_free = mask_code(body)
    boundaries = [m for m in HEADING.finditer(fence_free)
                  if m[1].startswith(('part_', 'ch_')) or m[3] == '参考文献と実験記録']
    if not boundaries or boundaries[0][1] != 'part_I':
        raise ValueError('Missing appendix part boundaries')
    pieces = [Piece(APPENDIX, 'この付録の使い方', body[:boundaries[0].start()], 0, kind='index')]
    part = None
    for index, match in enumerate(boundaries):
        end = boundaries[index + 1].start() if index + 1 < len(boundaries) else len(body)
        anchor, level, title = match.groups()
        if anchor.startswith('part_'):
            part = anchor.removeprefix('part_')
            path = Path('appendix') / PART_DIRECTORIES[part] / 'README.md'
            kind = 'part'
        elif anchor.startswith('ch_'):
            label = anchor.removeprefix('ch_')
            filename = f'chapter-{int(label):02d}.md' if label.isdigit() else f'appendix-{label.lower()}.md'
            path = Path('appendix') / PART_DIRECTORIES[part] / filename
            kind = 'chapter'
        else:
            path = Path('appendix/references.md')
            kind = 'references'
        pieces.append(Piece(path, title, body[match.start():end], len(level) - 1, part, kind))
    # Every byte after the old TOC belongs to exactly one new page.
    assert ''.join(piece.body for piece in pieces) == body
    if len({p.path for p in pieces}) != len(pieces):
        raise ValueError('Duplicate output path')
    return pieces


def content_block(text):
    return '<!-- appendix-content:start -->\n' + text.rstrip() + '\n<!-- appendix-content:end -->\n'


def split_markdown(markdown, output):
    pieces = split_pieces(markdown)
    routes = {}
    for piece in pieces:
        for anchor in ANCHOR.findall(mask_code(piece.body)):
            if anchor in routes:
                raise ValueError(f'Duplicate anchor: {anchor}')
            routes[anchor] = output / piece.path

    def link(source, target, title, fragment=''):
        path = Path(os.path.relpath(target, source.parent)).as_posix()
        return f'[{title}]({path}{"#" + fragment if fragment else ""})'

    rendered = {}
    reading_order = [p for p in pieces if p.kind in ('chapter', 'references')]
    for piece in pieces:
        destination = output / piece.path
        body = normalize_anchors(rewrite_links(piece.body, output / APPENDIX, destination, output / APPENDIX, routes))
        body = outside_fences(body, lambda line: re.sub(r'^(#{2,5})(?= )', lambda m: '#' * (len(m[1]) - piece.promote), line))
        links = [link(destination, output / APPENDIX, '付録の総目次'),
                 link(destination, output / '本文.md', '論文本文'),
                 link(destination, output / 'appendix/references.md', '参考文献')]
        if piece.kind == 'index':
            header = markdown.splitlines()[0] + '\n\n'
            header += '[資料全体の入口](README.md) ｜ [論文本文](本文.md) ｜ [Word版（全体）](技術付録.docx)\n\n'
            header += 'GitHubでは章ごとにページを分けている。説明・図・表・コードは省略していない。'
            header += '読みたい分野から章を選び、各ページの目次で節へ移動できる。\n\n'
            page = header + content_block(body) + '\n## 章別目次\n\n'
            for part in (p for p in pieces if p.kind == 'part'):
                page += f'<a id="part_{part.part.lower()}"></a>\n### ' + link(destination, output / part.path, part.title) + '\n\n'
                for chapter in (p for p in pieces if p.kind == 'chapter' and p.part == part.part):
                    # Old section bookmarks still land on the relevant chapter entry.
                    aliases = ''.join(f'<a id="{anchor.lower()}"></a>' for anchor in ANCHOR.findall(mask_code(chapter.body)))
                    page += '- ' + aliases + link(destination, output / chapter.path, chapter.title) + '\n'
                page += '\n'
            reference = next(p for p in pieces if p.kind == 'references')
            page += ''.join(f'<a id="{anchor.lower()}"></a>' for anchor in ANCHOR.findall(mask_code(reference.body))) + '\n'
            page += link(destination, output / reference.path, reference.title) + '\n'
        else:
            head, remainder = body.split('\n\n', 1)
            page = content_block(head) + '\n' + ' ｜ '.join(links) + '\n\n'
            if piece.kind == 'part':
                page += content_block(remainder) + '\n## この分野の章\n\n'
                for chapter in (p for p in pieces if p.kind == 'chapter' and p.part == piece.part):
                    page += '- ' + link(destination, output / chapter.path, chapter.title) + '\n'
            else:
                if piece.part and piece.kind == 'chapter':
                    parent = next(p for p in pieces if p.kind == 'part' and p.part == piece.part)
                    page += link(destination, output / parent.path, parent.title) + '\n\n'
                page += 'ファイルパスの表記は、[資料フォルダー](' + Path(os.path.relpath(output / 'README.md', destination.parent)).as_posix() + ')を基準とする。\n\n'
                entries = list(HEADING.finditer(mask_code(piece.body)))[1:]
                if entries:
                    page += '## このページの目次\n\n'
                    base = min(len(m[2]) for m in entries)
                    page += '\n'.join('  ' * (len(m[2]) - base) + f'- [{m[3]}](#{m[1].lower()})' for m in entries) + '\n\n'
                page += content_block(remainder)
                index = reading_order.index(piece)
                previous_next = []
                if index:
                    previous = reading_order[index - 1]
                    previous_next.append(link(destination, output / previous.path, '前：' + previous.title))
                if index + 1 < len(reading_order):
                    following = reading_order[index + 1]
                    previous_next.append(link(destination, output / following.path, '次：' + following.title))
                page += '\n---\n\n' + ' ｜ '.join(previous_next) + '\n'
        if len(page.encode('utf-8')) > MAX_PAGE_BYTES:
            raise ValueError(f'{piece.path} exceeds {MAX_PAGE_BYTES} bytes; split at a section boundary')
        rendered[destination] = page
    return rendered, routes, pieces


def published_routes(output):
    routes = {}
    index = output / APPENDIX
    if index.exists():
        routes.update((a, index) for a in ANCHOR.findall(mask_code(index.read_text(encoding='utf-8'))))
    for path in sorted((output / 'appendix').rglob('*.md')):
        routes.update((a, path) for a in ANCHOR.findall(mask_code(path.read_text(encoding='utf-8'))))
    return routes


def publish_markdown(name, markdown, output, check=False):
    output = Path(output).resolve()
    if name == '技術付録':
        files, routes, _ = split_markdown(markdown, output)
    else:
        destination = output / (name + '.md')
        files = {destination: rewrite_links(markdown, destination, destination, output / APPENDIX, published_routes(output))}
    changed = []
    for path, content in files.items():
        if not path.exists() or path.read_text(encoding='utf-8') != content:
            changed.append(path.relative_to(output).as_posix())
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding='utf-8', newline='\n')
    if check and changed:
        raise ValueError('Markdown needs regeneration: ' + ', '.join(changed))
    return {'markdown_pages': len(files), 'changed': changed,
            'largest_page_bytes': max(len(s.encode('utf-8')) for s in files.values())}
