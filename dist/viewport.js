(function(root){
 'use strict';
 function clamp(view){
  const zoom=Math.max(1,Math.min(8,view.zoom)),half=.5/zoom;
  return {zoom,x:Math.max(half,Math.min(1-half,view.x)),y:Math.max(half,Math.min(1-half,view.y))};
 }
 function sourceAt(view,point){return {x:view.x+(point.x-.5)/view.zoom,y:view.y+(point.y-.5)/view.zoom};}
 function project(view,point){return {x:(point.x-view.x)*view.zoom+.5,y:(point.y-view.y)*view.zoom+.5};}
 function zoomAt(view,zoom,focus={x:.5,y:.5}){
  const source=sourceAt(view,focus),next=Math.max(1,Math.min(8,zoom));
  return clamp({zoom:next,x:source.x-(focus.x-.5)/next,y:source.y-(focus.y-.5)/next});
 }
 function anchorPoints(points,box){
  if(box.width<=0||box.height<=0)return points;
  const edges=[[],[],[],[]],cx=box.x+box.width/2,cy=box.y+box.height/2;
  const anchored=points.map(point=>{
   const dx=(point.px-cx)/(box.width/2),dy=(point.py-cy)/(box.height/2),distance=Math.max(Math.abs(dx),Math.abs(dy));
   if(distance<=1)return point;
   // Project to the crop edge in the direction of the actual sample.
   const marker={...point,offscreen:true,px:cx+(point.px-cx)/distance,py:cy+(point.py-cy)/distance};
   const edge=Math.abs(dx)>=Math.abs(dy)?(dx<0?0:1):(dy<0?2:3);
   edges[edge].push(marker);
   return marker;
  });
  // Keep markers separated even when several samples point at the same corner.
  edges.forEach((markers,edge)=>{
   if(!markers.length)return;
   const vertical=edge<2,key=vertical?'py':'px',start=vertical?box.y:box.x,length=vertical?box.height:box.width;
   const inset=Math.min(14,length/4),span=length-2*inset,gap=Math.min(18,span/Math.max(1,markers.length-1));
   markers.sort((a,b)=>a[key]-b[key]||a.index-b.index);
   markers.forEach((marker,i)=>{
    const fraction=Math.max(0,Math.min(1,(marker[key]-start-inset)/span));
    marker[key]=start+inset+i*gap+fraction*(span-gap*(markers.length-1));
   });
  });
  return anchored;
 }
 const api={clamp,sourceAt,project,zoomAt,anchorPoints};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PaletteViewport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
