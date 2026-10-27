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
 const api={clamp,sourceAt,project,zoomAt};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PaletteViewport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
