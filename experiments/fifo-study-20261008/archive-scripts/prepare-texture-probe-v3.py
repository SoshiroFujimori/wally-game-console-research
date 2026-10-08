from pathlib import Path
import subprocess,gzip,hashlib,json
r=Path('/path/to/research/experiments/fifo-study-20261008')
src=r/'measurement/src/texture-probe.cpp'
s=(r/'measurement/src/texture2d.cpp').read_text()
s=s.replace('#include <algorithm>','#include <algorithm>\n#include <cstdlib>\n#include <fstream>\n#include <string>')
s=s.replace('int main(){','int main(int argc,char** argv){\n  const int only=argc>1?std::atoi(argv[1]):0;\n  const bool keep=argc>2;\n  unsigned failures=0;')
s=s.replace('for(int n:{32,64,256}){','for(int n:{32,64,256}){\n      if(only && only!=n)continue;')
s=s.replace('      if(mismatches)throw std::runtime_error("texture reference mismatch");','      {std::ofstream f("/tmp/texture-probe-"+std::to_string(n)+".rgb565",std::ios::binary);f.write(reinterpret_cast<const char*>(data.data()),data.size());}\n      failures+=mismatches?1:0;')
s=s.replace('      glDeleteTextures(1,&tex);','      if(!keep)glDeleteTextures(1,&tex);')
s=s.replace('    std::puts("TEXTURE_2D_PASS");return 0;','    std::printf("TEXTURE_PROBE_FINISHED failures=%u only=%d keep=%d\\n",failures,only,keep);return failures?1:0;')
src.write_text(s)
cm=r/'measurement/CMakeLists.txt'
s=cm.read_text();assert 'add_executable(texture-probe' not in s
s+='\nadd_executable(texture-probe src/texture-probe.cpp)\ntarget_include_directories(texture-probe PRIVATE \u0024{WALLY_REPO}/examples/rasterix)\ntarget_link_libraries(texture-probe PRIVATE gl span spdlog::spdlog threadrunner)\ntarget_link_options(texture-probe PRIVATE -static)\n'
cm.write_text(s)
with (r/'logs/texture-probe-v3-build.log').open('w') as f:subprocess.run(['cmake','--build',str(r/'software-v2'),'-j','8','--target','texture-probe'],stdout=f,stderr=subprocess.STDOUT,check=True)
out=r/'payload-v3';out.mkdir(exist_ok=False)
dest=out/'texture-probe'
subprocess.run(['/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-strip','-o',str(dest),str(r/'software-v2/texture-probe')],check=True)
data=dest.read_bytes();gz=gzip.compress(data,compresslevel=9,mtime=0);(out/'texture-probe.gz').write_bytes(gz)
manifest={'texture-probe':dict(sha256=hashlib.sha256(data).hexdigest(),gzip_sha256=hashlib.sha256(gz).hexdigest(),size=len(data))}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
s=(r/'scripts/install-v2.py').read_text().replace('payload-v2','payload-v3').replace('fifo-study-20261008-v2','fifo-study-20261008-v3').replace('sd-install-v2.json','sd-install-v3.json').replace('SD_INSTALL_V2_PASS','SD_INSTALL_V3_PASS')
(r/'scripts/install-v3.py').write_text(s)
print(json.dumps(manifest))

