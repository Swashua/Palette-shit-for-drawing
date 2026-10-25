const assert=require('node:assert/strict');
const {route}=require('../dist/routing.js');
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function intersect(a,b,c,d){const p=cross(a,b,c),q=cross(a,b,d),r=cross(c,d,a),s=cross(c,d,b);return p*q < -1e-8 && r*s < -1e-8;}
let seed=173,checks=0;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(const width of [316,700,1120,1800])for(let trial=0;trial<350;trial++){
 const n=4+Math.floor(random()*10),height=Math.max(450,Math.ceil(n/2)*67+50),image={x:width*.23,y:50,width:width*.54,height:trial%3===0?1:height-100};
 const points=Array.from({length:n},(_,index)=>({index,px:image.x+random()*image.width,py:image.y+(trial%3===0?.5:random()*image.height)}));
 const routes=route(points,image,{width,height,labelWidth:width*(width<600?.21:.175),labelHeight:width<600?57:55});
 assert.equal(routes.length,n);
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  const a=routes[i],b=routes[j];
  for(let u=0;u<2;u++)for(let v=0;v<2;v++){assert.ok(!intersect(a.route[u],a.route[u+1],b.route[v],b.route[v+1]),`crossing: ${width}/${trial}/${i}/${j}`);checks++;}
  if(a.side===b.side)assert.ok(a.ly+a.lh<=b.ly||b.ly+b.lh<=a.ly,'labels overlap');
 }
 for(const r of routes){assert.ok(r.ly>=0&&r.ly+r.lh<=height);assert.deepEqual(r.route[0],[r.px,r.py]);}
}
const duplicate=route([{index:0,px:200,py:100},{index:-1,px:200,py:100}],{x:150,y:50,width:300,height:200},{width:600,height:400,labelWidth:100,labelHeight:55});assert.equal(duplicate.length,1);assert.equal(duplicate[0].isPicked,true);
console.log(`PASS: ${checks.toLocaleString()} segment comparisons, 1,400 layouts, equal-row anchors, mobile and desktop spacing, and duplicate picks.`);
