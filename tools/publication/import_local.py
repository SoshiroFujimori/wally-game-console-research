#!/usr/bin/env python3
"""Refresh selected private inputs into a non-published review directory."""
import argparse,hashlib,json
from pathlib import Path
from sanitize import load_config,sanitize_bytes
from shared_read import read_bytes_shared

ROOT=Path(__file__).resolve().parents[2]
def main():
 p=argparse.ArgumentParser(description=__doc__)
 g=p.add_mutually_exclusive_group(required=True);g.add_argument('--check',action='store_true');g.add_argument('--export',action='store_true')
 a=p.parse_args();config=load_config(ROOT/'.private/redactions.json')
 rows=json.loads((ROOT/'.private/imports.json').read_text(encoding='utf-8'))
 count=0;unavailable=0
 for row in rows:
  src=Path(row['source']);rel=Path(row['destination'])
  if rel.is_absolute() or '..' in rel.parts:raise ValueError('Invalid import destination')
  if not src.is_file():unavailable+=1;continue
  if src.suffix.lower()=='.mp4':continue
  data=sanitize_bytes(read_bytes_shared(src),src.name,config)
  old=ROOT/rel
  if not old.exists() or hashlib.sha256(data).digest()!=hashlib.sha256(old.read_bytes()).digest():
   count+=1;print(rel.as_posix())
   if a.export:
    dest=ROOT/'build/import'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 print(json.dumps({'changed_inputs':count,'unavailable_inputs':unavailable,'exported_for_review':a.export}))
 if unavailable:raise SystemExit('Some local sources are unavailable on this operating system; no source paths printed.')
if __name__=='__main__':main()
