from pathlib import Path
import datetime,hashlib,json,re
root=Path('/path/to/research/experiments/fifo-study-20261008')
base=root/'variants/fifo512'
manifest=json.loads((root/'latest-source.json').read_text())['files']
rtl=[p for p in manifest if p.startswith(('src/','config/','fpga/src/','fpga/constraints/'))]
rtl=[p for p in rtl if (base/p).is_file()]
rows=[]
for kind in ('fifo512','fifo16','mailbox'):
    variant=root/'variants'/kind
    differences=[p for p in rtl if (variant/p).read_bytes()!=(base/p).read_bytes()]
    assert set(differences)<= {'fpga/src/rasterix_apb.sv','fpga/src/rasterix.sv'},differences
    apb=(variant/'fpga/src/rasterix_apb.sv').read_text()
    normalize=lambda t:re.sub(r"32'h4649[0-9a-f]{4}","32'h4649abcd",t)
    assert normalize(apb)==normalize((base/'fpga/src/rasterix_apb.sv').read_text())
    channel=(variant/'fpga/src/rasterix.sv').read_text()
    if kind=='fifo16':channel=channel.replace('axiscommand commandfifo(', 'axiscdc commandfifo(')
    if kind=='mailbox':channel=channel.replace('command_mailbox commandfifo(\n    .m_axis_aresetn(DDRResetn),', 'axiscdc commandfifo(')
    assert channel==(base/'fpga/src/rasterix.sv').read_text()
    provenance=json.loads((variant/'experiment.json').read_text())
    assert all(hashlib.sha256((variant/name).read_bytes()).hexdigest()==sha for name,sha in provenance['files'].items()),'Experiment sources changed since initial recording'
    assert (variant/'addins/rasterix').resolve()==(base/'addins/rasterix').resolve()
    rows.append({'variant':kind,'checked_existing_rtl_and_configuration_files':len(rtl),'differences_from_fifo512':differences,'counter_difference':'Read-only variant identifier only','renderer_difference':'Command crossing instance plus mailbox destination reset pin only','upstream_renderer_shared':True,'recorded_variant_file_hashes_match':True})
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'variants':rows,'additional_files':'FIFO16 vendor command-FIFO generator; mailbox module and its CDC constraints are explicit additions recorded by prepare-variants.py. Implementation recipes are separately qualified without changing original clock periods.'}
(root/'comparison-source-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
