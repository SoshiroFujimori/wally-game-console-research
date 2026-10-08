#!/usr/bin/env python3
"""Check active local Markdown links and the document reference manifest."""
import json,re,sys,urllib.parse
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
def links(text):
    text=re.sub(r'^```.*?^```[^\n]*$', '',text,flags=re.M|re.S)
    return re.findall(r'!?\[[^\]\n]*\]\(([^)\n]+)\)',text)

def main():
 errors=[];count=0
 for p in ROOT.rglob('*.md'):
  rel=p.relative_to(ROOT)
  if any(x in ('.git','.private','console','.venv','build','source') or x.startswith('build-') for x in rel.parts):continue
  text=p.read_text(encoding='utf-8')
  for target in links(text):
   target=urllib.parse.unquote(target.strip('<>'))
   if target.startswith(('http:','https:','mailto:','#')):continue
   path=target.split('#',1)[0]
   if not path:continue
   dest=p.parent/path
   count+=1
   if not dest.exists() and dest.resolve()!=ROOT/'console':
    errors.append({'file':rel.as_posix(),'target':target})
 for entry in json.loads((ROOT/'publication/references.json').read_text(encoding='utf-8')):
  if entry.get('kind')=='git-submodule':continue
  if not (ROOT/entry['path']).exists():errors.append(entry)
 print(json.dumps({'local_links':count,'errors':errors},ensure_ascii=False))
 return bool(errors)
if __name__=='__main__':sys.exit(main())
