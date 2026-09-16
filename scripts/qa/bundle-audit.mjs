import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const root = '.next';
const routes = ['index','cities','cities/london','methodology','sources','calculator','calculator/results'];
const size = (p) => { const b=fs.readFileSync(p); return { bytes:b.length, gzip:zlib.gzipSync(b).length }; };
const report = {};
for (const route of routes) {
 const file=`${root}/server/app/${route}.html`;
 if(!fs.existsSync(file)) continue;
 const html=fs.readFileSync(file,'utf8');
 const assets=(ext)=>[...new Set(html.match(new RegExp(`/_next/static/[^"<>\\\\ ]+\\.${ext}`,'g'))??[])].map((p)=>`${root}/${p.slice('/_next/'.length)}`);
 const sum=(ps)=>ps.reduce((a,p)=>{const n=size(p);return {bytes:a.bytes+n.bytes,gzip:a.gzip+n.gzip}},{bytes:0,gzip:0});
 report[route]={html:size(file),js:sum(assets('js')),css:sum(assets('css')),jsFiles:assets('js')};
}
const files=fs.readdirSync(`${root}/static/chunks`).filter((p)=>p.endsWith('.js')).map((p)=>`${root}/static/chunks/${p}`);
report.clientChunks=files.map((p)=>({file:path.basename(p),...size(p)})).sort((a,b)=>b.bytes-a.bytes);
report.totalClientJs=files.reduce((a,p)=>a+size(p).bytes,0);
console.log(JSON.stringify(report,null,2));
