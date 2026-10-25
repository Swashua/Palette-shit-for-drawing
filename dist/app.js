const $ = s => document.querySelector(s);
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
function storedTheme(){try{return localStorage.getItem('palette-theme');}catch{return null;}}
function applyTheme(theme){const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#themeToggle').setAttribute('aria-pressed',String(dark));$('#themeToggle').title=dark?'Switch to light mode':'Switch to dark mode';$('#themeLabel').textContent=dark?'Light mode':'Dark mode';$('meta[name="theme-color"]').content=dark?'#161922':'#f4f5f8';}
applyTheme(storedTheme()||(systemTheme.matches?'dark':'light'));
$('#themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(next);try{localStorage.setItem('palette-theme',next);}catch{}};
systemTheme.addEventListener('change',e=>{if(!storedTheme())applyTheme(e.matches?'dark':'light');});
const photo = $('#photo'), stage = $('#stage'), svg = $('#connections');
const full = document.createElement('canvas'), ctx = full.getContext('2d', {willReadFrequently:true});
const small = document.createElement('canvas'), sc = small.getContext('2d', {willReadFrequently:true});
let palette = [], pixels = [], count = 6, currentName = 'Misty mountains.jpg', busy = false, picked = null, currentURL = null, generation = 0;
let draggedPoint=null,pointFrame=0,pendingPoint=null,suppressImageClickUntil=0;
const named = {
 'Snow':'fffafa','Ivory':'fffff0','White':'ffffff','Pearl':'eae6dc','Silver':'c0c0c0','Cloud grey':'d6d9dc','Ash grey':'a5aaa8','Slate grey':'708090','Charcoal':'36454f','Black':'000000','Ink blue':'282d43','Midnight blue':'191970','Navy':'000080','Steel blue':'4682b4','Sky blue':'87ceeb','Powder blue':'b0e0e6','Cornflower':'6495ed','Royal blue':'4169e1','Cobalt':'0047ab','Ocean blue':'0077be','Teal':'008080','Turquoise':'40e0d0','Aqua':'00ffff','Seafoam':'9fe2bf','Sage':'9aa98a','Eucalyptus':'728c76','Olive':'808000','Moss green':'5b7042','Forest green':'228b22','Pine green':'184b3b','Fern green':'4f7942','Hunter green':'355e3b','Deep olive':'3d4429','Lime green':'32cd32','Chartreuse':'7fff00','Pistachio':'93c572','Mint':'aaf0d1','Pale green':'c6dbbd','Emerald':'50c878','Jade':'00a86b','Lemon':'fff44f','Golden yellow':'ffdf00','Mustard':'d4a017','Ochre':'cc7722','Marigold':'eaa221','Apricot':'fbceb1','Peach':'ffcba4','Sand':'c2b280','Wheat':'f5deb3','Beige':'d8cbb3','Taupe':'8b8071','Stone':'a49e8d','Umber':'635147','Chocolate':'7b3f00','Chestnut':'954535','Rust':'b7410e','Copper':'b87333','Terracotta':'cb6843','Burnt orange':'cc5500','Tangerine':'f28500','Coral':'ff7f50','Salmon':'fa8072','Scarlet':'ff2400','Crimson':'dc143c','Burgundy':'800020','Wine':'722f37','Rose':'e8a6af','Dusty pink':'c9959d','Blush':'f2c1d1','Pink':'ffc0cb','Hot pink':'ff69b4','Magenta':'ff00ff','Fuchsia':'c154c1','Mauve':'b784a7','Lilac':'c8a2c8','Lavender':'c4b4e2','Wisteria':'9d8fc4','Periwinkle':'ccccff','Amethyst':'9966cc','Violet':'8f00ff','Purple':'800080','Plum':'673147','Eggplant':'483248','Dusk':'63627c','Blue grey':'8e9caa','Mist':'c8d1cf','Deep teal':'214a4a','Khaki':'bdb76b','Olive grey':'757660','Lichen':'a4ad8d','Bottle green':'223b2d','Fog':'e0e2dc','Graphite':'464a48'
};
function rgb(hex){return hex.match(/../g).map(v=>parseInt(v,16));}
function hex(c){return '#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();}
function lab(c){let [r,g,b]=c.map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92;});let x=(r*.4124564+g*.3575761+b*.1804375)/.95047,y=r*.2126729+g*.7151522+b*.072175,z=(r*.0193339+g*.119192+b*.9503041)/1.08883;[x,y,z]=[x,y,z].map(v=>v>.008856?Math.cbrt(v):7.787*v+16/116);return [116*y-16,500*(x-y),200*(y-z)];}
Object.assign(named,{'Red':'ff0000','Blue':'0000ff','Lime':'00ff00','Green':'008000','Yellow':'ffff00','Orange':'ffa500'});
const names=Object.entries(named).map(([name,h])=>({name,lab:lab(rgb(h))}));
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function nameColour(c){const l=lab(c);return names.reduce((best,n)=>distance(l,n.lab)<distance(l,best.lab)?n:best).name;}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast(text.length<25?`${text} copied`:'Palette copied to clipboard');}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity=0;document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();toast(ok?'Copied to clipboard':'Could not copy. Use Export to save your colours.');}}
function setBusy(value){busy=value;$('#loading').hidden=!value;$('#plus').disabled=value||count>=12;$('#minus').disabled=value||count<=4;$('#upload').disabled=value;$('#reset').disabled=value;$('#copyAll').disabled=value||!palette.length;$('#export').disabled=value||!palette.length;}
function extract(k){
 if(!pixels.length)return [];
 // Deterministic farthest-point seeds, followed by perceptual k-means.
 let centres=[pixels[Math.floor(pixels.length/2)].lab.slice()];
 while(centres.length<k){let far=null,score=-1;for(const p of pixels){const d=Math.min(...centres.map(c=>distance(p.lab,c)));if(d>score){far=p;score=d;}}if(score<.01)break;centres.push(far.lab.slice());}
 let groups=[];
 for(let iteration=0;iteration<12;iteration++){
  groups=centres.map(()=>({sum:[0,0,0],rgb:[0,0,0],n:0,points:[]}));
  for(const p of pixels){let best=0,d=Infinity;centres.forEach((c,i)=>{const v=distance(p.lab,c);if(v<d){d=v;best=i;}});const g=groups[best];g.n++;g.points.push(p);for(let j=0;j<3;j++){g.sum[j]+=p.lab[j];g.rgb[j]+=p.rgb[j];}}
  centres=groups.map((g,i)=>g.n?g.sum.map(v=>v/g.n):centres[i]);
 }
 return groups.filter(g=>g.n).map(g=>{
  const avg=g.rgb.map(v=>Math.round(v/g.n));const target=lab(avg);let point=g.points[0],best=Infinity;
  for(const p of g.points){const d=distance(p.lab,target);if(d<best){best=d;point=p;}}
  // Use an actual sampled pixel, so the hex matches its annotation exactly.
  const value=point.rgb;return {rgb:value,hex:hex(value),name:nameColour(value),share:g.n/pixels.length,x:point.x,y:point.y};
 }).sort((a,b)=>b.share-a.share);
}
async function analyse(){
 if(draggedPoint)finishPointDrag(null,true);
 const ticket=++generation;setBusy(true);await new Promise(r=>setTimeout(r,40));
 try{const result=extract(count);if(ticket!==generation)return;palette=result;picked=null;render();}catch(e){toast('Could not analyse this image. Try a smaller JPG or PNG.');console.error(e);}finally{if(ticket===generation)setBusy(false);}
}
function render(){
 $('#count').value=count;$('#count').textContent=count;$('#countLabel').textContent=`${palette.length} colour${palette.length===1?'':'s'}`;
 $('#swatches').replaceChildren();
 palette.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch';b.title=`Copy ${c.hex}, ${c.name}`;b.setAttribute('aria-label',b.title);b.innerHTML=`<span class="swatch-colour" style="background:${c.hex}"></span><span class="swatch-hex">${c.hex}<span class="swatch-share">${c.share==null?'Picked':Math.round(c.share*100)+'%'}</span></span><span class="swatch-name">${c.name}</span>`;b.onclick=()=>copy(c.hex);b.onmouseenter=()=>highlight(i);b.onmouseleave=()=>highlight(-1);$('#swatches').append(b);});
 $('#paletteDescription').textContent=palette.length<count?'This image has fewer distinct colours.':'Colours sampled from your image.';
 requestAnimationFrame(layout);
}
function highlight(index){document.querySelectorAll('.callout').forEach(e=>e.classList.toggle('active',Number(e.dataset.index)===index));svg.querySelectorAll('.leader-group,.point-handle').forEach(g=>{g.style.opacity=index<0||Number(g.dataset.index)===index?'1':'.35';});}
function geometry(){const s=stage.getBoundingClientRect(),p=photo.getBoundingClientRect();return {w:s.width,h:s.height,x:p.left-s.left,y:p.top-s.top,pw:p.width,ph:p.height};}
function pointData(g=geometry()){
 const data=palette.map((c,i)=>({...c,index:i,px:g.x+c.x*g.pw,py:g.y+c.y*g.ph}));
 if(picked)data.push({...picked,index:-1,px:g.x+picked.x*g.pw,py:g.y+picked.y*g.ph});
 return data;
}
function positions(g=geometry()){
 const mobile=g.w<600,labelWidth=g.w*(mobile?.21:.175),labelHeight=mobile?57:55;
 return PaletteRouting.route(pointData(g),{x:g.x,y:g.y,width:g.pw,height:g.ph},{width:g.w,height:g.h,labelWidth,labelHeight});
}
const svgElement=tag=>document.createElementNS('http://www.w3.org/2000/svg',tag);
function layout(){
 if(!photo.naturalWidth||!palette.length)return;
 stage.style.minHeight=(Math.ceil((palette.length+(picked?1:0))/2)*(stage.clientWidth<600?64:67)+50)+'px';
 const g=geometry();svg.setAttribute('viewBox',`0 0 ${g.w} ${g.h}`);
 let handles=svg.querySelector('.point-handles');if(!handles){handles=svgElement('g');handles.setAttribute('class','point-handles');svg.append(handles);}
 const oldGroups=new Map([...svg.querySelectorAll('.leader-group')].map(e=>[Number(e.dataset.index),e]));
 const oldLabels=new Map([...$('#labels').children].map(e=>[Number(e.dataset.index),e]));
 for(const c of positions(g)){
  let group=oldGroups.get(c.index),fresh=!group;
  if(!group){group=svgElement('g');group.setAttribute('class','leader-group');group.dataset.index=c.index;const path=svgElement('path');path.setAttribute('class','connector');group.append(path);svg.insertBefore(group,handles);}
  oldGroups.delete(c.index);group.style.opacity='1';
  const path=group.firstElementChild;path.setAttribute('d',c.route.map((p,i)=>`${i?'L':'M'} ${p[0]} ${p[1]}`).join(' '));
  if(fresh&&!draggedPoint)path.style.animationDelay=`${Math.max(0,c.index)*45}ms`;else{path.style.animation='none';path.style.strokeDashoffset='0';}
  const exact=Boolean(c.index===-1||c.isPicked||c.moved);
  let b=oldLabels.get(c.index);const newLabel=!b;
  if(!b){b=document.createElement('button');b.className='callout';b.dataset.index=c.index;b.innerHTML='<span class="chip"></span><span class="callout-text"><span class="hex"></span><span class="name"></span></span><span class="copy-icon" aria-hidden="true">⧉</span>';$('#labels').append(b);}
  oldLabels.delete(c.index);b.classList.toggle('active',draggedPoint?draggedPoint.index===c.index:exact);b.style.left=c.lx+'px';b.style.top=c.ly+'px';
  if(newLabel&&!draggedPoint)b.style.animationDelay=`${Math.max(0,c.index)*45}ms`;else b.style.animation='none';
  b.title=`Copy ${c.hex}, ${c.name}${exact?' (exact pixel)':''}`;b.querySelector('.chip').style.background=c.hex;b.querySelector('.hex').textContent=c.hex;b.querySelector('.name').textContent=(exact?'Picked: ':'')+c.name;
  b.onclick=()=>copy((c.index===-1?picked:palette[c.index])?.hex||c.hex);b.onmouseenter=()=>{if(!draggedPoint)highlight(c.index);};b.onmouseleave=()=>{if(!draggedPoint)highlight(-1);};
 }
 oldGroups.forEach(e=>e.remove());oldLabels.forEach(e=>e.remove());
 // Keep the actual drag targets in a stable layer, separate from routed labels.
 // Pointer capture and keyboard focus survive every live layout update.
 const oldHandles=new Map([...handles.children].map(e=>[Number(e.dataset.index),e]));
 for(const c of pointData(g)){
  let group=oldHandles.get(c.index);
  if(!group){group=svgElement('g');group.setAttribute('class','point-handle');group.dataset.index=c.index;const pin=svgElement('circle');pin.setAttribute('class','pin');const hit=svgElement('circle');hit.setAttribute('class','pin-hit');hit.setAttribute('r','14');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.dataset.index=c.index;group.append(pin,hit);handles.append(group);}
  oldHandles.delete(c.index);group.style.opacity='1';const [pin,hit]=group.children;
  const active=draggedPoint?.index===c.index;group.classList.toggle('drag-active',active);
  for(const circle of [pin,hit]){circle.setAttribute('cx',c.px);circle.setAttribute('cy',c.py);}
  pin.setAttribute('r',active?7:c.index===-1?6:5);pin.setAttribute('fill',c.hex);
  hit.setAttribute('aria-label',`Move ${c.index===-1?'picked colour':'colour point '+(c.index+1)}: ${c.hex}, ${c.name}. Use arrow keys; Shift moves ten pixels.`);
 }
 oldHandles.forEach(e=>e.remove());
}
function colourPoint(index){return index===-1?picked:palette[index];}
function refreshPoint(index){
 const c=colourPoint(index);if(!c)return;
 if(index>=0){const b=$('#swatches').children[index];if(b){b.title=`Copy ${c.hex}, ${c.name}`;b.setAttribute('aria-label',b.title);b.querySelector('.swatch-colour').style.background=c.hex;b.querySelector('.swatch-hex').firstChild.nodeValue=c.hex;b.querySelector('.swatch-name').textContent=c.name;b.querySelector('.swatch-share').textContent=c.share==null?'Picked':Math.round(c.share*100)+'%';}}
 $('#paletteDescription').textContent=palette.some(c=>c.moved)?'Custom palette. Drag a point to change a colour.':palette.length<count?'This image has fewer distinct colours.':'Colours sampled from your image.';
 layout();
}
function samplePoint(index,pixelX,pixelY){
 const point=colourPoint(index);if(!point||!full.width)return false;
 const x=Math.max(0,Math.min(full.width-1,Math.floor(pixelX))),y=Math.max(0,Math.min(full.height-1,Math.floor(pixelY)));
 if(Math.floor(point.x*full.width)===x&&Math.floor(point.y*full.height)===y)return true;
 const value=ctx.getImageData(x,y,1,1).data;
 if(value[3]<128)return false;
 const c=Array.from(value).slice(0,3);Object.assign(point,{rgb:c,hex:hex(c),name:nameColour(c),x:(x+.5)/full.width,y:(y+.5)/full.height,moved:true,share:null});refreshPoint(index);return true;
}
function sampleClient(index,x,y){const r=photo.getBoundingClientRect();if(!r.width||!r.height)return false;const grip=draggedPoint?.index===index?draggedPoint:null;return samplePoint(index,(x-r.left-(grip?.offsetX||0))/r.width*full.width,(y-r.top-(grip?.offsetY||0))/r.height*full.height);}
function flushPoint(){if(pointFrame)cancelAnimationFrame(pointFrame);pointFrame=0;const next=pendingPoint;pendingPoint=null;if(next&&draggedPoint)sampleClient(draggedPoint.index,next.x,next.y);}
function finishPointDrag(event,cancel=false){
 if(!draggedPoint||event&&event.pointerId!==draggedPoint.pointerId)return;
 const drag=draggedPoint;
 if(cancel){if(pointFrame)cancelAnimationFrame(pointFrame);pointFrame=0;pendingPoint=null;const target=colourPoint(drag.index);if(target){Object.assign(target,drag.before);if(!drag.before.moved)delete target.moved;}}
 else{if(event)pendingPoint={x:event.clientX,y:event.clientY};flushPoint();}
 draggedPoint=null;stage.classList.remove('is-point-dragging');if(stage.hasPointerCapture(drag.pointerId))stage.releasePointerCapture(drag.pointerId);suppressImageClickUntil=performance.now()+300;refreshPoint(drag.index);
 const point=colourPoint(drag.index);if(!cancel&&point)toast(`${point.hex}, ${point.name}`);
}
stage.addEventListener('pointerdown',event=>{
 const hit=event.target.closest?.('.pin-hit');if(!hit||busy||draggedPoint||event.button!==0)return;
 const index=Number(hit.dataset.index),point=colourPoint(index);if(!point)return;
 event.preventDefault();event.stopPropagation();hit.focus({preventScroll:true});const r=photo.getBoundingClientRect();draggedPoint={index,pointerId:event.pointerId,before:{...point},offsetX:event.clientX-r.left-point.x*r.width,offsetY:event.clientY-r.top-point.y*r.height};stage.classList.add('is-point-dragging');stage.setPointerCapture(event.pointerId);layout();
});
stage.addEventListener('pointermove',event=>{if(!draggedPoint||event.pointerId!==draggedPoint.pointerId)return;event.preventDefault();pendingPoint={x:event.clientX,y:event.clientY};if(!pointFrame)pointFrame=requestAnimationFrame(()=>{pointFrame=0;flushPoint();});});
stage.addEventListener('pointerup',event=>finishPointDrag(event));
stage.addEventListener('pointercancel',event=>finishPointDrag(event,true));
stage.addEventListener('lostpointercapture',event=>{if(draggedPoint?.pointerId===event.pointerId)finishPointDrag(null,true);});
window.addEventListener('blur',()=>finishPointDrag(null,true));
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&draggedPoint){event.preventDefault();finishPointDrag(null,true);return;}
 const hit=event.target.closest?.('.pin-hit'),moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(!hit||!moves[event.key]||busy||draggedPoint)return;event.preventDefault();const index=Number(hit.dataset.index),point=colourPoint(index);if(!point)return;const [dx,dy]=moves[event.key],step=event.shiftKey?10:1;samplePoint(index,Math.floor(point.x*full.width)+dx*step,Math.floor(point.y*full.height)+dy*step);
});
async function loadImage(source,name,description){
 if(busy)return;setBusy(true);const img=new Image();
 try{
  img.src=source;await img.decode();if(img.naturalWidth*img.naturalHeight>40000000)throw new Error('This image is too large. Please use an image under 40 megapixels.');
  const incoming=document.createElement('canvas');incoming.width=img.naturalWidth;incoming.height=img.naturalHeight;const incomingCtx=incoming.getContext('2d');incomingCtx.drawImage(img,0,0);
  const ratio=Math.min(1,160/Math.max(incoming.width,incoming.height));small.width=Math.max(1,Math.round(incoming.width*ratio));small.height=Math.max(1,Math.round(incoming.height*ratio));
  const d=incomingCtx.getImageData(0,0,incoming.width,incoming.height).data,nextPixels=[];
  for(let y=0;y<small.height;y++)for(let x=0;x<small.width;x++){const fx=Math.min(incoming.width-1,Math.floor((x+.5)/small.width*incoming.width)),fy=Math.min(incoming.height-1,Math.floor((y+.5)/small.height*incoming.height)),i=(fy*incoming.width+fx)*4;if(d[i+3]<128)continue;const c=[d[i],d[i+1],d[i+2]];nextPixels.push({rgb:c,lab:lab(c),x:(fx+.5)/incoming.width,y:(fy+.5)/incoming.height});}
  if(!nextPixels.length)throw new Error('This image is fully transparent. Try an image with visible colours.');
  full.width=incoming.width;full.height=incoming.height;ctx.drawImage(incoming,0,0);pixels=nextPixels;
  currentName=name;photo.src=source;photo.alt=description||`Colour study of ${name}`;await photo.decode();$('#filename').textContent=name;$('#dimensions').textContent=`${full.width} × ${full.height}`;
  await analyse();
 }catch(e){toast(e.message.includes('image')?e.message:'Could not open this file. Try a JPG, PNG or WebP.');setBusy(false);}
}
async function openFile(file){if(!file)return;if(!file.type.startsWith('image/'))return toast('Choose an image file, such as a JPG, PNG or WebP.');if(file.size>20*1024*1024)return toast('Choose an image smaller than 20 MB.');if(busy)return;const old=currentURL;currentURL=URL.createObjectURL(file);await loadImage(currentURL,file.name);if(old)URL.revokeObjectURL(old);}
$('#upload').onclick=()=>$('#file').click();$('#file').onchange=e=>{openFile(e.target.files[0]);e.target.value='';};
$('#reset').onclick=()=>loadImage('landscape.jpg','Misty mountains.jpg','Fog drifting over green mountain ridges');
$('#plus').onclick=()=>{if(count<12&&!busy){count++;analyse();}};$('#minus').onclick=()=>{if(count>4&&!busy){count--;analyse();}};
$('#copyAll').onclick=()=>copy(palette.map(c=>c.hex).join(', '));
$('#toggleLines').onclick=()=>{const off=stage.classList.toggle('no-lines');$('#toggleLines').textContent=off?'Show annotations':'Hide annotations';$('#toggleLines').setAttribute('aria-pressed',String(!off));};
photo.onclick=e=>{
 if(busy||draggedPoint||performance.now()<suppressImageClickUntil)return;const r=photo.getBoundingClientRect();const x=Math.min(full.width-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*full.width))),y=Math.min(full.height-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*full.height)));const p=ctx.getImageData(x,y,1,1).data;
 if(p[3]<128)return toast('This pixel is transparent. Pick a visible part of the image.');const c=Array.from(p).slice(0,3);picked={rgb:c,hex:hex(c),name:nameColour(c),x:(x+.5)/full.width,y:(y+.5)/full.height,share:0};
 stage.classList.remove('no-lines');$('#toggleLines').textContent='Hide annotations';$('#toggleLines').setAttribute('aria-pressed','true');layout();toast(`${picked.hex}, ${picked.name} (exact pixel)`);
};
let dragDepth=0;
const dropPrompt=$('#dropPrompt');
function isImageDrag(event){const types=Array.from(event.dataTransfer?.types||[]);return types.includes('Files')||types.includes('text/uri-list')||types.includes('text/html');}
function showDropPrompt(){dropPrompt.classList.add('visible');dropPrompt.setAttribute('aria-hidden','false');}
function clearDropPrompt(){dragDepth=0;dropPrompt.classList.remove('visible');dropPrompt.setAttribute('aria-hidden','true');}
document.addEventListener('dragenter',e=>{if(!isImageDrag(e))return;e.preventDefault();dragDepth++;showDropPrompt();});
document.addEventListener('dragover',e=>{if(!isImageDrag(e))return;e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy';showDropPrompt();});
document.addEventListener('dragleave',e=>{if(!dragDepth)return;dragDepth=Math.max(0,dragDepth-1);if(!dragDepth||(!e.relatedTarget&&(e.clientX<=0||e.clientY<=0||e.clientX>=window.innerWidth||e.clientY>=window.innerHeight)))clearDropPrompt();});
document.addEventListener('drop',async e=>{
 if(!isImageDrag(e))return;e.preventDefault();clearDropPrompt();
 if(busy)return toast('Wait for the current image to finish, then drop your image again.');
 const files=Array.from(e.dataTransfer.files||[]),file=files.find(f=>f.type.startsWith('image/'))||files[0];
 if(file)return openFile(file);
 // Images dragged from another browser page may arrive as a URL instead of a file.
 const html=e.dataTransfer.getData('text/html'),image=new DOMParser().parseFromString(html,'text/html').querySelector('img');
 const source=image?.getAttribute('src')||e.dataTransfer.getData('text/uri-list').split('\n').find(line=>line.trim()&&!line.startsWith('#'));
 try{
  const url=new URL(source);if(!['https:','http:','data:'].includes(url.protocol))throw new Error('Unsupported image link');
  toast('Opening image');const response=await fetch(url.href,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Image unavailable');
  const blob=await response.blob();if(!blob.type.startsWith('image/'))throw new Error('Not an image');
  const filename=url.protocol==='data:'?'Dropped image.png':decodeURIComponent(url.pathname.split('/').pop()||'Dropped image');await openFile(new File([blob],filename,{type:blob.type}));
 }catch{toast('This image link can’t be opened. Save the image, then drag the file here.');}
});
window.addEventListener('dragend',clearDropPrompt);window.addEventListener('blur',clearDropPrompt);window.addEventListener('pagehide',clearDropPrompt);
document.addEventListener('keydown',e=>{if(e.key==='Escape')clearDropPrompt();});
document.addEventListener('paste',e=>{const item=Array.from(e.clipboardData?.items||[]).find(i=>i.type.startsWith('image/'));if(item){e.preventDefault();openFile(item.getAsFile());}});
new ResizeObserver(()=>{requestAnimationFrame(layout);}).observe(stage);
$('#about').onclick=()=>$('#aboutDialog').showModal();$('.close-dialog').onclick=()=>$('#aboutDialog').close();$('#aboutDialog').onclick=e=>{if(e.target===$('#aboutDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
$('#export').onclick=e=>{e.stopPropagation();$('#exportMenu').hidden=!$('#exportMenu').hidden;$('#export').setAttribute('aria-expanded',String(!$('#exportMenu').hidden));};
document.addEventListener('click',()=>{$('#exportMenu').hidden=true;$('#export').setAttribute('aria-expanded','false');});document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#exportMenu').hidden=true;$('#export').setAttribute('aria-expanded','false');}});
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=currentName.replace(/\.[^.]+$/,'')+'-palette.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Palette exported');}
function exportPNG(){
 const out=document.createElement('canvas');out.width=1800;out.height=1180;const c=out.getContext('2d'),dark=document.documentElement.dataset.theme==='dark',ink=dark?'#e4e7f1':'#282d43',muted=dark?'#a2a9bc':'#777c8b';c.fillStyle=dark?'#161922':'#f4f5f8';c.fillRect(0,0,out.width,out.height);c.fillStyle=ink;c.font='500 36px sans-serif';c.fillText('palette.',65,65);c.font='20px sans-serif';c.fillStyle=muted;c.fillText(currentName,65,105);
 const box={x:450,y:150,w:900,h:700};const scale=Math.min(box.w/full.width,box.h/full.height);const w=full.width*scale,h=full.height*scale,x=box.x+(box.w-w)/2,y=box.y+(box.h-h)/2;c.drawImage(full,x,y,w,h);
 const data=palette.map((p,i)=>({...p,index:i,px:x+p.x*w,py:y+p.y*h}));if(picked)data.push({...picked,index:-1,px:x+picked.x*w,py:y+picked.y*h});
 const routes=PaletteRouting.route(data,{x,y,width:w,height:h},{width:1800,height:900,labelWidth:270,labelHeight:65,paddingX:70,paddingY:150});
 for(const p of routes){const yy=p.ly+p.lh/2,xx=p.lx;c.strokeStyle=dark?'#9299af':'#8e94a4';c.lineWidth=1.5;c.beginPath();p.route.forEach((point,i)=>{if(i)c.lineTo(...point);else c.moveTo(...point);});c.stroke();c.fillStyle=p.hex;c.beginPath();c.arc(p.px,p.py,6,0,Math.PI*2);c.fill();c.strokeStyle=dark?'#e1e5ee':'#fff';c.lineWidth=3;c.stroke();c.fillStyle=p.hex;c.fillRect(xx,yy-19,30,38);c.fillStyle=ink;c.font='21px sans-serif';c.fillText(p.hex,xx+45,yy-1);c.fillStyle=muted;c.font='17px sans-serif';c.fillText((p.index===-1||p.isPicked?'Picked: ':'')+p.name,xx+45,yy+23);}
 const sw=1670/palette.length;palette.forEach((p,i)=>{c.fillStyle=p.hex;c.fillRect(65+i*sw,920,sw-9,105);c.fillStyle=ink;c.font='18px sans-serif';c.fillText(p.hex,65+i*sw,1058);});c.fillStyle=muted;c.font='17px sans-serif';c.fillText('Colour names are approximate. Hex codes match the sampled pixels.',65,1135);out.toBlob(b=>{if(b)download(b,'png');else toast('Could not export the image. Try another format.');});
}
async function exportEveryColour(){
 setBusy(true);toast('Reading pixel colours. Large images may take longer.');
 try{
  const counts=new Uint32Array(16777216);let total=0;
  for(let y=0;y<full.height;y+=128){const data=ctx.getImageData(0,y,full.width,Math.min(128,full.height-y)).data;for(let i=0;i<data.length;i+=4){if(data[i+3]<128)continue;counts[(data[i]<<16)|(data[i+1]<<8)|data[i+2]]++;total++;}await new Promise(r=>setTimeout(r,0));}
  const chunks=['Hex,Red,Green,Blue,Pixels\n'];let lines=[],unique=0;
  for(let n=0;n<counts.length;n++){if(counts[n]){unique++;const value='#'+n.toString(16).padStart(6,'0').toUpperCase();lines.push(`${value},${n>>16},${(n>>8)&255},${n&255},${counts[n]}\n`);if(lines.length===16384){chunks.push(lines.join(''));lines=[];}}if(n%1048576===0)await new Promise(r=>setTimeout(r,0));}
  chunks.push(lines.join(''));download(new Blob(chunks,{type:'text/csv'}),'all-colours.csv');toast(`${unique.toLocaleString()} unique colours exported from ${total.toLocaleString()} pixels`);
 }catch(e){toast('Could not export every colour. Try a smaller image or export the palette.');}finally{setBusy(false);}
}
const everyButton=document.createElement('button');everyButton.dataset.format='all';everyButton.textContent='Every unique colour (.csv)';$('#exportMenu').append(everyButton);
document.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{
 const format=b.dataset.format,data=palette.map(({hex,name,rgb,share,x,y})=>({hex,name,rgb,proportion:share==null?null:Number(share.toFixed(4)),sample:{x,y}}));
 if(format==='png')return exportPNG();
 if(format==='all')return exportEveryColour();
 if(format==='json')download(new Blob([JSON.stringify({image:currentName,colours:data,picked:picked?{hex:picked.hex,name:picked.name,rgb:picked.rgb}:null},null,2)],{type:'application/json'}),'json');
 if(format==='css')download(new Blob([':root {\n'+palette.map((p,i)=>`  --colour-${i+1}: ${p.hex}; /* ${p.name} */`).join('\n')+'\n}\n'],{type:'text/css'}),'css');
 if(format==='csv')download(new Blob(['Hex,Name,Red,Green,Blue,Proportion\n'+data.map(p=>`${p.hex},${p.name},${p.rgb.join(',')},${p.proportion??''}`).join('\n')],{type:'text/csv'}),'csv');
});
loadImage('landscape.jpg','Misty mountains.jpg','Fog drifting over green mountain ridges');
