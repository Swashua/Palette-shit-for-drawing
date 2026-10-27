const assert=require('node:assert/strict');
const {clamp,sourceAt,project,zoomAt}=require('../dist/viewport.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);
assert.deepEqual(clamp({zoom:.2,x:-8,y:20}),{zoom:1,x:.5,y:.5});
assert.deepEqual(clamp({zoom:20,x:0,y:1}),{zoom:8,x:.0625,y:.9375});
assert.deepEqual(zoomAt({zoom:8,x:.1,y:.9},1),{zoom:1,x:.5,y:.5});
let seed=9203;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<2000;i++){
 const view=clamp({zoom:1+random()*7,x:random(),y:random()}),point={x:random(),y:random()},screen=project(view,point),source=sourceAt(view,screen);
 near(point.x,source.x);near(point.y,source.y);
 const focus={x:random(),y:random()},before=sourceAt(view,focus),next=zoomAt(view,Math.min(8,view.zoom+1),focus),after=sourceAt(next,focus);
 near(before.x,after.x);near(before.y,after.y);
 const topLeft=sourceAt(view,{x:0,y:0}),bottomRight=sourceAt(view,{x:1,y:1});
 assert.ok(topLeft.x>=-1e-10&&topLeft.y>=-1e-10&&bottomRight.x<=1+1e-10&&bottomRight.y<=1+1e-10,'view extends outside image');
}
console.log('PASS: 2,000 zoom and pan cases, cursor anchoring, coordinate round trips, zoom limits, and Fit reset.');
