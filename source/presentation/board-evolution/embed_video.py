#!/usr/bin/env python3
"""Attach one previously reviewed MP4 to an existing poster picture.

The slide itself is authored with Artifact Tool. This small packaging step adds
the Office video relationship and click-to-play timing, which the local slide
authoring API does not expose. It does not render or rewrite other slides.

Format references:
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.video
https://python-pptx.readthedocs.io/en/latest/dev/analysis/shp-movie.html
"""
from pathlib import Path
import argparse
import hashlib
import json
import zipfile
from lxml import etree as E

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
P14 = 'http://schemas.microsoft.com/office/powerpoint/2010/main'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
NS = {'p': P, 'a': A, 'r': R, 'p14': P14}


def child(parent, namespace, tag, **attrs):
    return E.SubElement(parent, f'{{{namespace}}}{tag}', attrs)


def xml(root):
    return E.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)


def embed(source, destination, video, review_path, slide_number):
    data = video.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    reviewed = set(json.loads(review_path.read_text(encoding='utf-8'))['sha256'])
    if digest not in reviewed:
        raise ValueError('The exact video bytes must pass the repository media review first.')
    if video.suffix.lower() != '.mp4' or data[4:8] != b'ftyp':
        raise ValueError('An MP4 file is required.')
    if source.resolve() == destination.resolve():
        raise ValueError('Source and destination must differ.')
    with zipfile.ZipFile(source) as archive:
        entries = {name: archive.read(name) for name in archive.namelist()}
    part = f'ppt/slides/slide{slide_number}.xml'
    relpart = f'ppt/slides/_rels/slide{slide_number}.xml.rels'
    root = E.fromstring(entries[part])
    pictures = root.findall('.//p:pic', NS)
    if len(pictures) != 1 or root.find('p:timing', NS) is not None:
        raise ValueError('Expected a slide with one poster picture and no existing timing.')
    picture = pictures[0]
    properties = picture.find('p:nvPicPr/p:cNvPr', NS)
    shape_id = properties.get('id')
    properties.set('name', 'Breakout demonstration video')
    # The built-in media action needs no hyperlink destination. Omit the
    # optional r:id rather than storing a dangling empty relationship ID.
    click = E.Element(f'{{{A}}}hlinkClick', {'action': 'ppaction://media'})
    properties.insert(0, click)
    nonvisual = picture.find('p:nvPicPr/p:nvPr', NS)
    if nonvisual is None:
        nonvisual = child(picture.find('p:nvPicPr', NS), P, 'nvPr')
    rels = E.fromstring(entries[relpart])
    used = {r.get('Id') for r in rels}
    identifiers = ('rIdBreakoutVideo', 'rIdBreakoutMedia')
    if used.intersection(identifiers):
        raise ValueError('Video relationship identifiers are already in use.')
    child(nonvisual, A, 'videoFile', **{f'{{{R}}}link': identifiers[0]})
    extensions = child(nonvisual, P, 'extLst')
    extension = child(extensions, P, 'ext', uri='{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}')
    child(extension, P14, 'media', **{f'{{{R}}}embed': identifiers[1]})
    member = 'ppt/media/breakout-demo.mp4'
    for identifier, kind in zip(identifiers, (R + '/video', 'http://schemas.microsoft.com/office/2007/relationships/media')):
        child(rels, REL, 'Relationship', Id=identifier, Type=kind, Target='../media/breakout-demo.mp4')

    timing = E.Element(f'{{{P}}}timing')
    tree = child(child(timing, P, 'tnLst'), P, 'par')
    clock = child(tree, P, 'cTn', id='1', dur='indefinite', restart='never', nodeType='tmRoot')
    movie = child(child(clock, P, 'childTnLst'), P, 'video')
    media = child(movie, P, 'cMediaNode', vol='0')
    clock = child(media, P, 'cTn', id='2', fill='hold', display='0')
    child(child(clock, P, 'stCondLst'), P, 'cond', delay='indefinite')
    child(child(media, P, 'tgtEl'), P, 'spTgt', spid=shape_id)
    extensions = root.find('p:extLst', NS)
    root.insert(root.index(extensions) if extensions is not None else len(root), timing)
    content_types = E.fromstring(entries['[Content_Types].xml'])
    if not any(n.get('Extension') == 'mp4' for n in content_types):
        child(content_types, CT, 'Default', Extension='mp4', ContentType='video/mp4')
    entries[part] = xml(root)
    entries[relpart] = xml(rels)
    entries['[Content_Types].xml'] = xml(content_types)
    entries[member] = data
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w') as archive:
        for name, body in entries.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED if name == member else zipfile.ZIP_DEFLATED
            archive.writestr(info, body)
    print(json.dumps({'embedded_video_sha256': digest, 'bytes': len(data), 'slide': slide_number, 'playback': 'on-click'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('video', type=Path)
    parser.add_argument('--review', required=True, type=Path)
    parser.add_argument('--slide', type=int, default=9)
    args = parser.parse_args()
    embed(args.source, args.destination, args.video, args.review, args.slide)
