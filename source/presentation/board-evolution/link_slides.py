"""Attach native slide jumps to the validated, privacy-scrubbed PPTX."""
from __future__ import annotations
import argparse,copy,json,re,zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

A='http://schemas.openxmlformats.org/drawingml/2006/main'
P='http://schemas.openxmlformats.org/presentationml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL='http://schemas.openxmlformats.org/package/2006/relationships'
for prefix,uri in [('a',A),('p',P),('r',R)]:ET.register_namespace(prefix,uri)

def attach(source:Path,destination:Path,manifest:Path)->dict:
    links=json.loads(manifest.read_text(encoding='utf-8'))['links']
    expected={(r['source'],r['shape']):r['target'] for r in links}
    if not links or len(expected)!=len(links):raise ValueError('Missing or duplicate navigation shapes')
    changes={};seen=set()
    with zipfile.ZipFile(source) as archive:
        members=set(archive.namelist())
        for name in sorted(members):
            match=re.fullmatch(r'ppt/slides/slide(\d+)\.xml',name)
            if not match:continue
            number=int(match[1]);root=ET.fromstring(archive.read(name))
            rel_name=f'ppt/slides/_rels/slide{number}.xml.rels'
            rels=ET.fromstring(archive.read(rel_name))
            ids={e.get('Id') for e in rels};target_ids={};changed=False
            for properties in root.iter(f'{{{P}}}cNvPr'):
                key=(number,properties.get('name'))
                if key not in expected:continue
                if key in seen:raise ValueError(f'Duplicate named shape: {key}')
                seen.add(key);target=expected[key]
                if not isinstance(target,int) or f'ppt/slides/slide{target}.xml' not in members:
                    raise ValueError(f'Missing target slide: {target}')
                if properties.find(f'{{{A}}}hlinkClick') is not None:
                    raise ValueError(f'Navigation shape already has a link: {key}')
                if target not in target_ids:
                    rid=f'navSlide{target}'
                    if rid in ids:raise ValueError(f'Relationship ID collision: {rid}')
                    ids.add(rid);target_ids[target]=rid
                    ET.SubElement(rels,f'{{{REL}}}Relationship',{'Id':rid,'Type':R+'/slide','Target':f'slide{target}.xml'})
                # hlinkClick precedes extLst in CT_NonVisualDrawingProps.
                click=ET.Element(f'{{{A}}}hlinkClick',{'{'+R+'}id':target_ids[target],'action':'ppaction://hlinksldjump'})
                ext=properties.find(f'{{{A}}}extLst')
                properties.insert(list(properties).index(ext) if ext is not None else len(properties),click)
                changed=True
            if changed:
                changes[name]=ET.tostring(root,encoding='utf-8',xml_declaration=True)
                changes[rel_name]=ET.tostring(rels,encoding='utf-8',xml_declaration=True)
        if seen!=set(expected):raise ValueError('Some navigation shapes are missing')
        destination.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as out:
            for info in archive.infolist():out.writestr(copy.copy(info),changes.get(info.filename,archive.read(info.filename)))
    return {'internal_slide_links':len(links),'links':links}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('source',type=Path);p.add_argument('destination',type=Path);p.add_argument('manifest',type=Path)
    args=p.parse_args();print(json.dumps(attach(args.source,args.destination,args.manifest)))
