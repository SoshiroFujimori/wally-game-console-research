#!/usr/bin/env python3
"""Create public copies. Personal replacement strings exist only in local settings.

No source file is changed. Unknown binary formats fail closed. This is a
publication helper, not a guarantee that arbitrary material is anonymous.
"""
from __future__ import annotations
import argparse
import difflib
import io
import json
from pathlib import Path
import re
import urllib.parse
import zipfile

TEXT_SUFFIXES = {'.md','.txt','.json','.csv','.log','.raw','.rpt','.xml','.rels',
    '.svg','.py','.sh','.ps1','.tcl','.v','.sv','.vh','.h','.hpp','.c','.cpp',
    '.dts','.xdc','.s','.prj','.diff','.patch','.pl','.x','.yml','.yaml','.toml',
    '.cmake','.ini','.cfg','.rst','.css','.html','.js','.cjs','.gitmodules',
    '.gitignore','.gitattributes',''}
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/package/2006/relationships'
NS = {'w': W}

def load_config(path):
    p = Path(path)
    if not p.is_file():
        raise ValueError('Private redaction settings are required; see docs/privacy.md.')
    c = json.loads(p.read_text(encoding='utf-8'))
    if not c.get('replacements') or not c.get('private_terms'):
        raise ValueError('Private names and replacement rules must be configured.')
    return c

def sanitize_text(text, config):
    # Match JSON-escaped and percent-escaped strings as well as ordinary prose.
    # Longest first preserves complete paths/names before shorter identifiers.
    for old, new in sorted(config['replacements'].items(), key=lambda x:-len(x[0])):
        for a,b in [(old,new), (json.dumps(old,ensure_ascii=True)[1:-1],
                               json.dumps(new,ensure_ascii=True)[1:-1]),
                    (urllib.parse.quote(old,safe=''),urllib.parse.quote(new,safe=''))]:
            text = re.sub(re.escape(a), lambda _:b, text, flags=re.I)
    return text

def clean_png(data):
    from PIL import Image
    with Image.open(io.BytesIO(data)) as im:
        # Pixels are retained; EXIF, textual chunks and other metadata are not.
        out=io.BytesIO()
        im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB').save(out,format='PNG')
        return out.getvalue()

def replace_runs(nodes, config):
    """Replace text across OOXML runs without discarding surrounding styles."""
    parts=[n.text or '' for n in nodes]
    old=''.join(parts);new=sanitize_text(old,config)
    if old==new:return
    starts=[];pos=0
    for part in parts:starts.append(pos);pos+=len(part)
    for op,a,b,c,d in reversed(difflib.SequenceMatcher(None,old,new,autojunk=False).get_opcodes()):
        if op=='equal':continue
        indexes=[i for i,s in enumerate(starts) if s < b and s+len(parts[i])>a]
        if not indexes:
            indexes=[next((i for i,s in enumerate(starts) if s+len(parts[i])>=a),len(parts)-1)]
        first,last=indexes[0],indexes[-1]
        if first==last:
            parts[first]=parts[first][:a-starts[first]]+new[c:d]+parts[first][b-starts[first]:]
        else:
            parts[first]=parts[first][:a-starts[first]]+new[c:d]
            for i in indexes[1:-1]:parts[i]=''
            parts[last]=parts[last][b-starts[last]:]
    assert ''.join(parts)==new
    for node,part in zip(nodes,parts):node.text=part

def sanitize_docx(data, config):
    from lxml import etree as E
    result=io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as src, zipfile.ZipFile(result,'w',zipfile.ZIP_DEFLATED) as dst:
        names=src.namelist()
        forbidden=[n for n in names if n.startswith('word/embeddings/') or 'vbaProject' in n]
        if forbidden:raise ValueError('Embedded objects or macros require manual review.')
        removed={n for n in names if n.startswith('customXml/') or n.startswith('docProps/thumbnail')
                 or n=='docProps/custom.xml' or re.match(r'word/(comments|people)',n)}
        for name in names:
            if name in removed or name.endswith('/'):continue
            value=src.read(name)
            if name.startswith('word/media/'):
                if name.lower().endswith('.png'):value=clean_png(value)
                else:raise ValueError('Non-PNG embedded image requires manual review.')
            elif name.endswith(('.xml','.rels')):
                root=E.fromstring(value)
                for node in list(root.iter()):
                    local=E.QName(node).localname
                    if local in ('del','moveFrom','commentRangeStart','commentRangeEnd','commentReference','docVars'):
                        if node.getparent() is not None:node.getparent().remove(node)
                        continue
                    if name.endswith('.rels') and local=='Relationship':
                        target=node.get('Target','')
                        typ=node.get('Type','')
                        if any(x in typ.lower() for x in ('customxml','comments','people','thumbnail','custom-properties','attachedtemplate')):
                            node.getparent().remove(node);continue
                        if target.startswith('file:'):
                            raise ValueError('Unmapped local file relationship in document.')
                    if local=='Override' and node.get('PartName','').lstrip('/') in removed:
                        node.getparent().remove(node);continue
                    for key in list(node.attrib):
                        kl=E.QName(key).localname
                        if kl.startswith('rsid') or kl in ('author','initials','lastModifiedBy'):
                            del node.attrib[key]
                        else:node.attrib[key]=sanitize_text(node.attrib[key],config)
                for para in root.findall('.//w:p',NS):
                    replace_runs(para.findall('.//w:t',NS),config)
                for node in root.iter():
                    if node.text:node.text=sanitize_text(node.text,config)
                    if node.tail:node.tail=sanitize_text(node.tail,config)
                if name=='docProps/core.xml':
                    for n in list(root):
                        if E.QName(n).localname in ('creator','lastModifiedBy','keywords','description','category','lastPrinted'):
                            root.remove(n)
                if name=='docProps/app.xml':
                    for n in root.iter():
                        if E.QName(n).localname in ('Company','Manager','Template'):n.text=''
                value=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
            else:
                raise ValueError(f'Unexpected DOCX part {name}')
            info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            dst.writestr(info,value)
    return result.getvalue()

def sanitize_pdf(data,config):
    from pypdf import PdfReader,PdfWriter
    reader=PdfReader(io.BytesIO(data))
    if any(sanitize_text(p.extract_text() or '',config)!=(p.extract_text() or '') for p in reader.pages):
        raise ValueError('PDF text contains private data; redact visually before importing.')
    writer=PdfWriter()
    for page in reader.pages:
        page.pop('/Annots',None);writer.add_page(page)
    if '/Metadata' in writer._root_object:del writer._root_object['/Metadata']
    writer.add_metadata({'/Producer':'Research publication'})
    out=io.BytesIO();writer.write(out);return out.getvalue()

def sanitize_bytes(data,path,config,depth=0):
    if depth>5:raise ValueError('Nested archive limit exceeded')
    suffix=Path(path).suffix.lower()
    if suffix=='.docx':return sanitize_docx(data,config)
    if suffix=='.png':return clean_png(data)
    if suffix=='.pdf':return sanitize_pdf(data,config)
    if suffix=='.zip':
        out=io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(data)) as src,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as dst:
            if sum(i.file_size for i in src.infolist())>100_000_000:raise ValueError('Archive too large')
            for i in src.infolist():
                if i.is_dir():continue
                if '..' in Path(i.filename).parts or i.filename.startswith(('/','\\')):raise ValueError('Unsafe archive path')
                n=sanitize_text(i.filename,config)
                info=zipfile.ZipInfo(n,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
                info.external_attr=i.external_attr
                dst.writestr(info,sanitize_bytes(src.read(i),n,config,depth+1))
        return out.getvalue()
    if suffix in TEXT_SUFFIXES or Path(path).name in ('.gitignore','.gitattributes','.gitmodules'):
        text=data.decode('utf-8-sig',errors='backslashreplace' if suffix=='.raw' else 'strict')
        if suffix=='.raw':text=text.replace('\x00','\\x00')
        if '\x00' in text:raise ValueError('NUL bytes in text file')
        return sanitize_text(text,config).encode('utf-8')
    raise ValueError(f'Unsupported format: {suffix}')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('destination',type=Path)
    parser.add_argument('--config',type=Path,required=True)
    args=parser.parse_args()
    if args.source.resolve()==args.destination.resolve():parser.error('Source and destination must differ.')
    data=sanitize_bytes(args.source.read_bytes(),args.source.name,load_config(args.config))
    args.destination.parent.mkdir(parents=True,exist_ok=True);args.destination.write_bytes(data)
    print('Sanitized copy written; run check.py and inspect changed pages/media before publishing.')

if __name__=='__main__':main()
