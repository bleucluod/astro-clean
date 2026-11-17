#!/usr/bin/env node
/**
 * Batch export of 12 signs × 2 approved palettes from the existing Halleus
 * /shop/nemad-man/bahman-preview renderer + its original PNG export button.
 * Nothing is drawn or approximated by this script. Repo remains read-only.
 * Run after git pull: node scripts/export-nemad-24.mjs
 */
import { spawn, execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, openSync, readSync, closeSync, mkdtempSync, unlinkSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredBase = 'c09396b80ad6828fef1429472c1e8961b5eb64d5';
const rendererBlob = 'e6e95201bc06c91ef65a38fe6a51e20f1bf3ce5d';
const signs = [
  ['farvardin','aries'], ['ordibehesht','taurus'], ['khordad','gemini'],
  ['tir','cancer'], ['mordad','leo'], ['shahrivar','virgo'],
  ['mehr','libra'], ['aban','scorpio'], ['azar','sagittarius'],
  ['dey','capricorn'], ['bahman','aquarius'], ['esfand','pisces'],
];
const themes = [['dark','مینیمال مشکی','#111820'],['light','مینیمال روشن','#EBF1F5']];
const sizes = { '10x15':[10,15], '20x30':[20,30], '30x45':[30,45] };
const chosenSize = process.argv[2] || '10x15';
if (!(chosenSize in sizes)) throw Error('Valid print sizes: 10x15, 20x30, 30x45');
const pixels = sizes[chosenSize].map(cm => Math.ceil(cm / 2.54 * 300));
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const downloads = path.join(homedir(),'Downloads');
const outputDir = path.join(downloads,'Halleus-Nemad-24-'+chosenSize+'-'+stamp);
let browser,server,socket,profile,trace=[];
let nextId=0;
const outstanding = new Map();
const sleep = ms => new Promise(ok=>setTimeout(ok,ms));
function log(message) {
  const line = new Date().toISOString() + ' ' + message;
  trace.push(line); console.log(line);
}
function git(...args) { return execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim(); }
function preflight() {
  if (Number(process.versions.node.split('.')[0]) < 22 || typeof WebSocket !== 'function') throw Error('Node.js 22+ required');
  if (git('rev-parse','--show-toplevel').toLowerCase() !== repo.toLowerCase()) throw Error('SAFETY_FATAL: Wrong repository root');
  if (!/^(https:\/\/github\.com\/bleucluod\/astro-clean(?:\.git)?|git@github\.com:bleucluod\/astro-clean(?:\.git)?)$/.test(git('remote','get-url','origin'))) throw Error('SAFETY_FATAL: Wrong origin');
  if (git('branch','--show-current') !== 'main') throw Error('SAFETY_FATAL: Wrong branch');
  const ancestor = spawnSync('git',['-C',repo,'merge-base','--is-ancestor',requiredBase,'HEAD']);
  if (ancestor.status!==0) throw Error('SAFETY_FATAL: Unexpected HEAD; pull main before exporting');
  if (git('hash-object','components/shop/NemadManBahmanArtwork.tsx')!==rendererBlob) throw Error('SAFETY_FATAL: Approved poster renderer has changed; review it before exporting');
  const checked = [
    'components/shop/NemadManBahmanPreview.tsx',
    'lib/shop/nemad-man-bahman-preview.ts',
    'lib/shop/nemad-man-preview-export.ts',
    'lib/shop/nemad-man-zodiac-glyphs.ts',
    'app/shop/nemad-man/bahman-preview/page.tsx',
  ];
  if (git('status','--porcelain','--',...checked)) throw Error('SAFETY_FATAL: Preview/export sources have local edits');
  for(const file of ['node_modules/next/dist/bin/next',
    'assets/shop-print/fonts/Estedad-Light.ttf',
    'assets/shop-print/fonts/Estedad-Regular.ttf',
    'assets/shop-print/fonts/Estedad-Medium.ttf',
    ...signs.map(x=>'public/nemad-man/zodiac-glyphs-v1/'+x[1]+'.webp')]) {
    if (!existsSync(path.join(repo,file))) throw Error('EXTERNAL_BLOCK: Missing required local file: '+file);
  }
}
function browserPath() {
  const paths = process.platform === 'win32' ? [
    [process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'],
    [process.env['ProgramFiles(x86)'],'Google/Chrome/Application/chrome.exe'],
    [process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'],
    [process.env.PROGRAMFILES,'Microsoft/Edge/Application/msedge.exe'],
    [process.env['ProgramFiles(x86)'],'Microsoft/Edge/Application/msedge.exe'],
  ].filter(x=>x[0]).map(x=>path.join(...x)) : [
    '/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'
  ];
  const found = paths.find(existsSync);
  if(!found) throw Error('EXTERNAL_BLOCK: Chrome or Microsoft Edge is required to export the original artwork');
  return found;
}
async function isPreview(url) {
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(4000)});
    return response.ok && (await response.text()).includes('data-shop-page="bahman-dev-preview"');
  } catch {return false;}
}
async function startPreview() {
  const first='http://127.0.0.1:3000/shop/nemad-man/bahman-preview';
  if(await isPreview(first)) return first;
  const alt='http://127.0.0.1:3217/shop/nemad-man/bahman-preview';
  if(await isPreview(alt)) return alt;
  log('Starting existing Next dev preview on port 3217');
  server=spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3217'],
    {cwd:repo,windowsHide:true,stdio:'ignore'});
  for(let i=0;i<120;i++){
    if(await isPreview(alt)) return alt;
    if(server.exitCode!==null) break;
    await sleep(1000);
  }
  throw Error('EXTERNAL_BLOCK: Existing Halleus preview did not start on localhost:3217');
}
function send(method, params={}) {
  return new Promise((resolve,reject)=>{
    const id=++nextId;
    const timer=setTimeout(()=>{outstanding.delete(id); reject(Error('CDP timeout: '+method));},30000);
    outstanding.set(id,{resolve,reject,timer});
    try{socket.send(JSON.stringify({id,method,params}));}
    catch(err){clearTimeout(timer);outstanding.delete(id);reject(err);}
  });
}
async function openBrowser(url, executable) {
  profile=mkdtempSync(path.join(tmpdir(),'halleus-sign-export-'));
  const args=['--headless=new','--disable-gpu','--disable-extensions',
    '--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
    '--user-data-dir='+profile,'about:blank'];
  if(process.platform!=='win32')args.unshift('--no-sandbox','--disable-dev-shm-usage');
  browser=spawn(executable,args,{stdio:'ignore',windowsHide:true});
  let port;
  for(let i=0;i<180;i++){
    const active=path.join(profile,'DevToolsActivePort');
    if(existsSync(active)){port=Number(readFileSync(active,'utf8').split(/\r?\n/)[0]);break;}
    if(browser.exitCode!==null)break;
    await sleep(120);
  }
  if(!port)throw Error('Chromium remote debugger did not start');
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
  const tab=targets.find(x=>x.type==='page');
  if(!tab)throw Error('Chromium page target missing');
  await new Promise((resolve,reject)=>{
    socket=new WebSocket(tab.webSocketDebuggerUrl);
    socket.onopen=resolve;
    socket.onerror=()=>reject(Error('Browser WebSocket failed'));
    socket.onmessage=e=>{
      let value;try{value=JSON.parse(e.data);}catch{return;}
      const req=outstanding.get(value.id);
      if(!req)return;
      outstanding.delete(value.id);clearTimeout(req.timer);
      value.error?req.reject(Error(JSON.stringify(value.error))):req.resolve(value.result);
    };
  });
  await send('Page.enable');
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:outputDir});
  const nav=await send('Page.navigate',{url});
  if(nav.errorText)throw Error('Cannot open original preview: '+nav.errorText);
  await until(()=>evaluate('Boolean(document.querySelector(\'main[data-shop-page="bahman-dev-preview"] svg[viewBox="0 0 900 1350"]\') && document.querySelector("#nemad-date"))'),
    'approved renderer',90000);
}
async function evaluate(expression){
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('Browser eval: '+result.exceptionDetails.text);
  return result.result?.value;
}
async function until(fn,label,timeout=30000){
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){
    try{const value=await fn();if(value)return value;last=value;}
    catch(e){last=String(e);}
    await sleep(190);
  }
  throw Error('Timeout: '+label+' last='+last);
}
async function fillDate(date){
  await evaluate('document.querySelector("#nemad-date").focus(); true');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2});
  await send('Input.insertText',{text:date});
  await until(()=>evaluate('document.querySelector("#nemad-date").value === '+JSON.stringify(date)),
    'entered date '+date,7000);
  await evaluate('document.querySelector(\'main[data-shop-page="bahman-dev-preview"] form button[type="submit"]\').click();true');
}
async function selectTheme(themeName,color){
  const js='(()=>{let b=[...document.querySelectorAll(\'main[data-shop-page="bahman-dev-preview"] button\')].find(x=>x.textContent.trim()==='
    +JSON.stringify(themeName)+');if(!b)return false;b.click();return true})()';
  if(!await evaluate(js))throw Error('Theme button missing: '+themeName);
  await until(()=>evaluate('(()=>{const svg=document.querySelector(\'svg[viewBox="0 0 900 1350"]\');const b=[...document.querySelectorAll(\'main[data-shop-page="bahman-dev-preview"] button\')].find(x=>x.textContent.trim()==='
    +JSON.stringify(themeName)+');const rect=[...(svg?.children||[])].find(x=>x.tagName.toLowerCase()==="rect");return b?.getAttribute("aria-pressed")==="true"&&rect?.getAttribute("fill")==='
    +JSON.stringify(color)+'})()'), 'active color '+themeName,20000);
}
function pngOkay(file){
  if(!existsSync(file)||statSync(file).size<20000)return false;
  const head=Buffer.alloc(24),fd=openSync(file,'r');
  try{readSync(fd,head,0,24,0);}finally{closeSync(fd);}
  if(head.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG: '+file);
  if(head.readUInt32BE(16)!==pixels[0]||head.readUInt32BE(20)!==pixels[1])throw Error('Incorrect PNG pixel dimensions: '+file);
  return true;
}
async function awaitDownload(filename){
  const file=path.join(outputDir,filename),end=Date.now()+120000;
  let last=0,stable=0;
  while(Date.now()<end){
    if(existsSync(file)&&!existsSync(file+'.crdownload')){
      const size=statSync(file).size;
      stable=size===last?stable+1:0;last=size;
      if(stable>=3&&pngOkay(file))return file;
    }
    await sleep(250);
  }
  throw Error('Original renderer PNG download failed: '+filename);
}
async function exportAll(){
  const failures=[];
  let good=0;
  for(let i=0;i<signs.length;i++){
    const [month,sign]=signs[i],date='1375/'+String(i+1).padStart(2,'0')+'/15';
    try{
      await fillDate(date);
      await until(()=>evaluate('document.querySelector(\'svg[viewBox="0 0 900 1350"] title\')?.textContent.includes('
        +JSON.stringify(sign.toUpperCase())+')'), 'real Sun sign: '+month,25000);
    }catch(e){failures.push({month,stage:'sign',error:String(e)});log('FAIL '+month+' sign '+e);continue;}
    for(const [theme,label,color] of themes){
      const name=String(i+1).padStart(2,'0')+'-'+month+'-sign-'+theme+'.png';
      try{
        await selectTheme(label,color);
        const raw='halleus-nemad-'+sign+'-'+theme+'-'+chosenSize+'.png';
        if(existsSync(path.join(outputDir,raw)))unlinkSync(path.join(outputDir,raw));
        const clicked=await evaluate('(()=>{const b=[...document.querySelectorAll(\'main[data-shop-page="bahman-dev-preview"] button\')].find(x=>x.textContent.includes("دریافت PNG"));if(!b||b.disabled)return false;b.click();return true})()');
        if(!clicked)throw Error('Original PNG export button unavailable');
        renameSync(await awaitDownload(raw),path.join(outputDir,name));
        good++;log('PASS '+name);
      }catch(e){failures.push({month,theme,stage:'PNG',error:String(e)});log('FAIL '+name+' '+e);}
    }
  }
  const files=readdirSync(outputDir).filter(x=>x.endsWith('.png'));
  const report={expected:24,passed:good,found:files.length,pixelSize:pixels,printSize:chosenSize,failures};
  writeFileSync(path.join(outputDir,'export-report.json'),JSON.stringify(report,null,2),'utf8');
  if(good!==24||files.length!==24)throw Error('CANDIDATE_FAILURE: Only '+good+'/24 exports passed. See '+outputDir);
  return report;
}
async function stop(){
  try{socket?.close();}catch{}
  for(const req of outstanding.values()){clearTimeout(req.timer);req.reject(Error('Browser closed'));}
  outstanding.clear();
  try{browser?.kill();}catch{}
  if(server){
    try{if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore'});else server.kill();}catch{}
  }
  await sleep(250);
  if(profile)try{rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}catch{}
}
async function main(){
  preflight();
  const executable=browserPath();
  mkdirSync(outputDir,{recursive:true});
  log('Original 12-sign × 2-theme preview export; size '+chosenSize+' at 300 PPI');
  try{
    const url=await startPreview();
    await openBrowser(url,executable);
    const report=await exportAll();
    log('ALL_24_REAL_RENDERER_PNGS=PASS; '+pixels.join('x'));
    log('OUTPUT_FOLDER='+outputDir);
    if(process.platform==='win32'){
      const destination=outputDir+'.zip';
      const ps="Compress-Archive -Path '"+path.join(outputDir,'*.png').replace(/'/g,"''")+"' -DestinationPath '"+destination.replace(/'/g,"''")+"' -CompressionLevel Optimal -Force";
      // Compress only PNGs, not report or temporary state.
      const result=spawnSync('powershell.exe',['-NoProfile','-Command',ps],{stdio:'pipe'});
      if(result.status===0)log('OUTPUT_ZIP='+destination);
      else log('ZIP_UNAVAILABLE; 24 complete PNGs are in '+outputDir);
    }
    return report;
  }catch(error){
    log('BATCH_FAILURE='+String(error?.stack||error));
    writeFileSync(path.join(outputDir,'failure-log.json'),JSON.stringify({trace,error:String(error?.stack||error)},null,2),'utf8');
    if(process.platform==='win32'){
      const failureZip=path.join(downloads,'Halleus-Nemad-FailureLogs-'+stamp+'.zip');
      const zipCommand="Compress-Archive -Path '"+path.join(outputDir,'*.json').replace(/'/g,"''")+
        "' -DestinationPath '"+failureZip.replace(/'/g,"''")+"' -CompressionLevel Optimal -Force";
      const zipped=spawnSync('powershell.exe',['-NoProfile','-Command',zipCommand],{stdio:'pipe'});
      if(zipped.status===0)log('FAILURELOGS_ZIP='+failureZip);
    }
    throw error;
  }finally{
    await stop();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
