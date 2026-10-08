from pathlib import Path
p=Path('/path/to/research/experiments/fifo-study-20261008/measurement/src/target.cpp')
s=p.read_text()
start="""struct DeviceCounters {
    volatile uint32_t* regs=nullptr;
    DeviceCounters() {
        int fd=open("/dev/mem",O_RDWR|O_SYNC);
        if(fd<0) throw std::runtime_error("counter /dev/mem");
        void* ptr=mmap(nullptr,4096,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0x10080000);
        close(fd);
        if(ptr==MAP_FAILED) throw std::runtime_error("counter mmap");
        regs=static_cast<volatile uint32_t*>(ptr);
    }
    ~DeviceCounters(){if(regs)munmap(const_cast<uint32_t*>(regs),4096);}
    bool enabled() const {return (regs[11]>>16)==0x4649;}
    void clear(){if(enabled()){regs[31]=1;asm volatile("fence iorw, iorw":::"memory");}}
    void report(){
        if(!enabled()){std::puts("HW_COUNTERS unavailable");return;}
        const uint32_t words=regs[7],waits=regs[8],longest=regs[9],cycles=regs[10],id=regs[11];
        std::printf("HW_COUNTERS id=%08x words=%u wait_cycles=%u longest_wait_cycles=%u total_cycles=%u cpu_hz=20000000\\n",id,words,waits,longest,cycles);
    }
};
"""
s=s.replace('struct Counters {',start+'\nstruct Counters {')
s=s.replace('Options o=parse(argc,argv);Counters stats;', 'Options o=parse(argc,argv);DeviceCounters hw;Counters stats;')
s=s.replace('if(i==o.warmup) {submittedQuads=0;', 'if(i==o.warmup) {hw.clear();submittedQuads=0;')
s=s.replace('    std::ofstream csv(o.csv);', '    hw.report();\n    std::ofstream csv(o.csv);')
s=s.replace('    std::printf("FRAME_CHECK count=', '    std::printf("FRAME_CHECK count=')
s=s.replace('pixels=%zu mismatches=%u\\n",count,address,h,ref.size(),mismatch);','pixels=%zu mismatches=%u\\n",count,address,h,ref.size(),mismatch);\n    if(mismatch) throw std::runtime_error("Framebuffer does not match reference");')
p.write_text(s)
print('MEASUREMENT_COUNTERS_AND_STRICT_PIXEL_CHECK_ADDED')
