(function(root){
 'use strict';
 function route(points, image, options){
  const {width,height,labelWidth,labelHeight,paddingX=0,paddingY=25}=options;
  // A picked pixel can coincide with an existing palette anchor. Share its
  // annotation instead of drawing two leaders on top of one another.
  const unique=[];
  for(const point of points){const duplicate=unique.find(p=>Math.abs(p.px-point.px)<1e-7&&Math.abs(p.py-point.py)<1e-7);if(duplicate){duplicate.isPicked=duplicate.isPicked||point.index===-1;continue;}unique.push({...point});}
  // All leaders inside the image are parallel. A slight common slope separates
  // anchors on the same row without changing the sampled pixel positions.
  const slopes=[0,.015,-.015,.03,-.03,.045,-.045,.06,-.06];let slope=0,bestGap=-1;
  for(const candidate of slopes){const projections=unique.map(p=>p.py-candidate*p.px).sort((a,b)=>a-b);let gap=Infinity;for(let i=1;i<projections.length;i++)gap=Math.min(gap,projections[i]-projections[i-1]);if(gap>bestGap){bestGap=gap;slope=candidate;}if(gap>=2)break;}
  if(bestGap<1e-7){for(let i=1;i<=97;i++){const candidate=i*.06/97,values=unique.map(p=>p.py-candidate*p.px).sort((a,b)=>a-b);let gap=Infinity;for(let j=1;j<values.length;j++)gap=Math.min(gap,values[j]-values[j-1]);if(gap>bestGap){bestGap=gap;slope=candidate;}}}
  const sorted=unique.sort((a,b)=>a.px-b.px||a.py-b.py),half=Math.ceil(sorted.length/2);
  const sides=[sorted.slice(0,half),sorted.slice(half)];
  sides.forEach((side,s)=>{
   const exitX=s?image.x+image.width:image.x;
   side.forEach(p=>{p.exitX=exitX;p.exitY=p.py+slope*(exitX-p.px);});
   // Sorted endpoints at both edges of the outer strip cannot intersect.
   side.sort((a,b)=>a.exitY-b.exitY);
   side.forEach((p,i)=>{
    p.side=s;p.lx=s?width-paddingX-labelWidth:paddingX;p.lw=labelWidth;p.lh=labelHeight;
    p.ly=paddingY+(i+.5)*(height-paddingY*2)/side.length-labelHeight/2;
    const edge=s?p.lx:p.lx+labelWidth,y=p.ly+labelHeight/2;
    p.route=[[p.px,p.py],[p.exitX,p.exitY],[edge,y]];
   });
  });
  return sides.flat();
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={route};else root.PaletteRouting={route};
})(typeof globalThis!=='undefined'?globalThis:this);
