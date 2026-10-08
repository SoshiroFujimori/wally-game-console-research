from pathlib import Path
import subprocess,json,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008')
main=Path('/path/to/wally-game-console')
for repo in (main,r/'latest'):
    p=repo/'examples/rasterix/CMakeLists.txt'
    s=p.read_text()
    needle='set(RIX_CORE_NUMBER_OF_TEXTURE_PAGES 4096 CACHE STRING "Texture pages")'
    assert s.count(needle)==1 and 'set(RIX_CORE_TEXTURE_PAGE_SIZE ' not in s
    s=s.replace(needle,'# Match the texture page size of the upstream RasterIX_IF hardware.\nset(RIX_CORE_TEXTURE_PAGE_SIZE 2048 CACHE STRING "Texture page bytes")\n'+needle)
    p.write_text(s)
(r/'texture-page-alignment.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hardware_default_bytes':2048,'previous_software_default_bytes':4096,'new_software_bytes':2048,'hardware_unchanged':True,'first_observed_mismatches':519,'status':'candidate fix; board retest pending'},indent=2)+'\n')
args=['cmake','-S',str(r/'measurement'),'-B',str(r/'software-v2'),'-DCMAKE_BUILD_TYPE=Release','-DCMAKE_C_COMPILER=/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-gcc','-DCMAKE_CXX_COMPILER=/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-g++','-DWALLY_REPO='+str(r/'latest'),'-DRIX_BUILD_TESTS_VERILATOR=OFF','-DRIX_BUILD_TESTS_SOFTWARE=OFF','-DRIX_BUILD_EXAMPLES=OFF','-DRIX_BUILD_NATIVE=OFF','-DRIX_BUILD_SHARED_LIBRARY=OFF','-DRIX_ENABLE_SPDLOG=OFF']
with (r/'logs/software-v2.log').open('w') as f:
    subprocess.run(args,stdout=f,stderr=subprocess.STDOUT,check=True)
    subprocess.run(['cmake','--build',str(r/'software-v2'),'-j','12','--target','breakout','rasterix-breakout','rasterix-demo','texture2d'],stdout=f,stderr=subprocess.STDOUT,check=True)
print('SOFTWARE_V2_BUILD_PASS',flush=True)

