#!/usr/bin/env python3
"""Audit public content before it enters Git history or leaves this machine."""
from __future__ import annotations
import argparse, hashlib, io, json, re, subprocess, sys, urllib.parse, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from sanitize import TEXT_SUFFIXES, load_config

ROOT=Path(__file__).resolve().parents[2]
ERRORS=[]
CHECK_CONFIG={}
EMAIL=re.compile(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}')
HOST_PATH=re.compile(r'(?:C:[\\/]+Users[\\/]+|/home/)(?!researcher(?:[/\\\s\"\']|$)|harris/)([\w.-]+)',re.I)
SECRET=re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\bAKIA[A-Z0-9]{16}\b')

def fail(path,reason):
    # Never print the matched value; check output may be published by CI.
    if any(term.casefold() in path.casefold() for term in CHECK_CONFIG.get('private_terms',[])):
        path='[private path]'
    ERRORS.append({'path':path,'reason':reason})

def texts_to_check(text):
    yield text
    yield urllib.parse.unquote(text)
    yield re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m[1],16)),text)

def check_text(text,path,config,allowed_emails):
    for decoded in texts_to_check(text):
        folded=decoded.casefold()
        if any(term.casefold() in folded for term in config.get('private_terms',[])):
            fail(path,'private redaction term remains');break
    if SECRET.search(text):fail(path,'credential-like content')
    if HOST_PATH.search(text):fail(path,'personal home-directory path')
    if re.search(r'\b(?:DESKTOP|LAPTOP)-[A-Z0-9]{5,}\b',text):fail(path,'machine name')
    if re.search(r'\bS-1-5-21-\d+-\d+-\d+-\d+\b',text):fail(path,'Windows account identifier')
    if any(e.casefold() not in allowed_emails for e in EMAIL.findall(text)):
        fail(path,'email address outside reviewed upstream attribution list')

def check_binary(data,path,reviewed):
    if hashlib.sha256(data).hexdigest() not in reviewed:
        fail(path,'image/video/PDF has not been reviewed at this exact hash')

def check_file(data,path,config,allowed_emails,reviewed,depth=0):
    if depth>5:fail(path,'archive recursion limit');return
    suffix=Path(path).suffix.lower()
    if suffix in ('.zip','.docx'):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if sum(i.file_size for i in z.infolist())>200_000_000:raise ValueError('archive too large')
                for item in z.infolist():
                    if item.is_dir():continue
                    member=item.filename;p=path+'!'+member
                    if '..' in Path(member).parts or member.startswith(('/','\\')):fail(p,'unsafe archive member');continue
                    if suffix=='.docx':
                        if member.startswith(('customXml/','word/embeddings/','docProps/thumbnail')) or re.match(r'word/(comments|people)',member) or member=='docProps/custom.xml':
                            fail(p,'private document part remains')
                        body=z.read(item)
                        if member.endswith(('.xml','.rels')):
                            root=ET.fromstring(body)
                            check_text(body.decode('utf-8'),p,config,allowed_emails)
                            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                                check_text(''.join(para.itertext()),p,config,allowed_emails)
                            for node in root.iter():
                                if node.tag.rsplit('}',1)[-1] in ('creator','lastModifiedBy','Company','Manager') and node.text:
                                    fail(p,'document author or organization metadata remains')
                        else:check_file(body,p,config,allowed_emails,reviewed,depth+1)
                    else:check_file(z.read(item),p,config,allowed_emails,reviewed,depth+1)
        except (ValueError,zipfile.BadZipFile,ET.ParseError):fail(path,'invalid archive/document')
    elif suffix in ('.png','.mp4','.pdf'):
        check_binary(data,path,reviewed)
        if suffix=='.png':
            from PIL import Image
            with Image.open(io.BytesIO(data)) as im:
                if any(k in im.info for k in ('exif','XML:com.adobe.xmp','Comment','Author','Description')):
                    fail(path,'image metadata remains')
        elif suffix=='.pdf':
            from pypdf import PdfReader
            reader=PdfReader(io.BytesIO(data))
            check_text(str(reader.metadata),path,config,allowed_emails)
            for page in reader.pages:check_text(page.extract_text() or '',path,config,allowed_emails)
    elif suffix in TEXT_SUFFIXES or Path(path).name in ('.gitmodules','.gitattributes','.gitignore','Makefile','CMakeLists.txt','pre-commit','pre-push'):
        try:
            text=data.decode('utf-8-sig')
            if '\x00' in text:raise ValueError()
            check_text(text,path,config,allowed_emails)
        except (UnicodeDecodeError,ValueError):fail(path,'non-text data in a text file')
    else:fail(path,'unreviewed file type')

def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args])

def tree_files(ref):
    for line in git('ls-tree','-r','-z',ref).split(b'\0'):
        if not line:continue
        head,name=line.split(b'\t',1);mode,kind,sha=head.decode().split()
        path=name.decode('utf-8')
        if kind=='commit':
            if path!='console':fail(path,'unexpected submodule')
            continue
        if mode=='120000':fail(path,'symlink not allowed in publication tree');continue
        yield path,sha

def main():
    global CHECK_CONFIG
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--staged',action='store_true')
    parser.add_argument('--pre-push',action='store_true')
    parser.add_argument('--public',action='store_true',help='CI audit without local private names')
    parser.add_argument('--config',type=Path,default=ROOT/'.private/redactions.json')
    args=parser.parse_args()
    config={} if args.public else load_config(args.config)
    CHECK_CONFIG=config
    policy=json.loads((ROOT/'publication/policy.json').read_text(encoding='utf-8'))
    allowed={e.casefold() for e in policy['allowed_attribution_emails']}
    review_path=ROOT/'publication/media-review.json'
    reviewed=set(json.loads(review_path.read_text(encoding='utf-8'))['sha256']) if review_path.exists() else set()
    count=0;seen=set()
    if args.staged:
        refs=[git('write-tree').decode().strip()]
    elif args.pre_push:
        refs=[]
        for line in sys.stdin:
            local_ref,local,remote_ref,remote=line.split()
            if local=='0'*40:continue
            rev=[local]
            if remote!='0'*40:rev+=['^'+remote]
            refs+=git('rev-list',*rev).decode().splitlines()
    else:refs=None
    if refs is not None:
        for ref in refs:
            if args.pre_push:
                identity=git('show','-s','--format=%an <%ae>%n%cn <%ce>%n%B',ref).decode('utf-8')
                check_text(identity,'commit:'+ref,config,allowed)
            for path,sha in tree_files(ref):
                if (path,sha) in seen:continue
                seen.add((path,sha))
                if any(p in ('.private','.env','credentials') for p in Path(path).parts):fail(path,'private file staged')
                check_text(path,path,config,allowed)
                check_file(git('cat-file','blob',sha),path,config,allowed,reviewed);count+=1
    else:
        for p in ROOT.rglob('*'):
            if any(x in ('.git','.private','console','.venv','__pycache__','build') or x.startswith('build-') for x in p.relative_to(ROOT).parts):continue
            if not p.is_file():continue
            path=p.relative_to(ROOT).as_posix()
            if p.is_symlink():fail(path,'symlink not allowed');continue
            check_text(path,path,config,allowed)
            check_file(p.read_bytes(),path,config,allowed,reviewed);count+=1
    print(json.dumps({'files_checked':count,'mode':'public' if args.public else 'private-and-public','errors':ERRORS},ensure_ascii=False))
    return bool(ERRORS)

if __name__=='__main__':sys.exit(main())
