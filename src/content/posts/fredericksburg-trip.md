---
title: 'Fredericksburg Trip'
date: 2026-06-25
summary: 'A long weekend itinerary for Fredericksburg, TX: wine tasting and World Cup watching'
tags: [travel]
---

My friend and I have been more conscious about taking trips for each other's birthdays each year. For his birthday this year (early June), we decided to travel west to Fredericksburg for a more low-key weekend. His only request: that we watch World Cup games in a cool environment and really lean into the rowdy 'football' fan persona.

## Thursday, June 25

**12:00 PM to 2:00 PM** — HEB run, last-minute packing additions, pack up the car (his)

**2:00 PM** — Drive out to Fredericksburg

**4:00 PM** — Check in, unpack, and check out the Airbnb.

**6:00 PM** — Cook and eat dinner at the Airbnb.

**8:00 PM** — Head to **Cultures Grill & Bar** (318 E Main St). US game kicks off
at 9:00 PM.

**11:00 PM** — Back to the Airbnb.

## Friday, June 26

**~8:30 AM** — Drive to Enchanted Rock State Natural Area (~20 minutes from
Fredericksburg).

> [!NOTE]
> Dog is in tow, so "elevated trails" (like the famous Summit Trail) are off limits. The Loop
> Trail is dog-friendly the whole way.

Take the Loop Trail south from the main parking area, following it up to the
Turkey Pass Trail junction, then turn around and walk the same
path back. ~4 miles round trip, mostly scrubby hill
country with a river to follow and some exposed granite.

<div class="erock-route">
<style>
.erock-route { font-family: inherit; }
.erock-route .er-wrap {
  position: relative; background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden; margin-bottom: 1.25rem;
}
.erock-route canvas { width: 100%; height: auto; display: block; }
.erock-route .er-attr {
  position: absolute; bottom: 4px; right: 6px; font-size: 0.5625rem;
  color: rgba(255,255,255,0.45); pointer-events: auto;
}
.erock-route .er-attr a { color: rgba(255,255,255,0.55); text-decoration: none; }
.erock-route .er-attr a:hover { text-decoration: underline; }
.erock-route .er-stats {
  display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;
  font-size: 0.8125rem; color: var(--muted-foreground);
}
.erock-route .er-stats strong { color: var(--foreground); }
</style>
<div class="er-wrap">
  <canvas id="erock-map" width="920" height="520"></canvas>
  <div class="er-attr"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</div>
</div>
<div class="er-stats">
  <div><strong>~4 mi</strong> round trip</div>
  <div><strong>~3 hrs</strong> on trail</div>
  <div><strong>Loop Trail</strong> to Turkey Pass junction</div>
</div>
<script>
(function(){
  var W=920,H=520,Z=15,PAD=40;
  var hikedRoute=[[30.4973,-98.8181],[30.4976,-98.8177],[30.4978,-98.8175],[30.4980,-98.8175],[30.4983,-98.8173],[30.4984,-98.8173],[30.4987,-98.8173],[30.4989,-98.8171],[30.4990,-98.8170],[30.4991,-98.8168],[30.4992,-98.8167],[30.4994,-98.8167],[30.4995,-98.8167],[30.4996,-98.8168],[30.4997,-98.8168],[30.4998,-98.8168],[30.5000,-98.8167],[30.5002,-98.8165],[30.5002,-98.8163],[30.5004,-98.8161],[30.5005,-98.8159],[30.5005,-98.8157],[30.5005,-98.8156],[30.5006,-98.8154],[30.5008,-98.8152],[30.5010,-98.8149],[30.5012,-98.8146],[30.5014,-98.8144],[30.5016,-98.8143],[30.5017,-98.8143],[30.5019,-98.8141]];
  var canvas=document.getElementById('erock-map');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var lats=hikedRoute.map(function(p){return p[0]});
  var lngs=hikedRoute.map(function(p){return p[1]});
  var minLat=Math.min.apply(null,lats)-0.004,maxLat=Math.max.apply(null,lats)+0.006;
  var minLng=Math.min.apply(null,lngs)-0.006,maxLng=Math.max.apply(null,lngs)+0.006;
  var cLat=(minLat+maxLat)/2,cLng=(minLng+maxLng)/2;
  var scale=Math.pow(2,Z);
  function lngToX(lng){return((lng+180)/360)*256*scale}
  function latToY(lat){var r=lat*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*256*scale}
  var cx=lngToX(cLng),cy=latToY(cLat);
  var bxMin=lngToX(minLng),bxMax=lngToX(maxLng);
  var byMin=latToY(maxLat),byMax=latToY(minLat);
  var sX=W/(bxMax-bxMin),sY=H/(byMax-byMin);
  var fitScale=Math.min(sX,sY);
  var ox=cx-W/(2*fitScale),oy=cy-H/(2*fitScale);
  function project(lat,lng){return[(lngToX(lng)-ox)*fitScale,(latToY(lat)-oy)*fitScale]}
  var tileSize=256;
  var tilesLoaded=0,totalTiles=0;
  var tileMinX=Math.floor(ox/tileSize),tileMaxX=Math.floor((ox+W/fitScale)/tileSize);
  var tileMinY=Math.floor(oy/tileSize),tileMaxY=Math.floor((oy+H/fitScale)/tileSize);
  totalTiles=(tileMaxX-tileMinX+1)*(tileMaxY-tileMinY+1);
  ctx.fillStyle='#131a2e';
  ctx.fillRect(0,0,W,H);
  for(var tx=tileMinX;tx<=tileMaxX;tx++){
    for(var ty=tileMinY;ty<=tileMaxY;ty++){
      (function(tx,ty){
        var img=new Image();
        img.crossOrigin='anonymous';
        img.onload=function(){
          var dx=(tx*tileSize-ox)*fitScale;
          var dy=(ty*tileSize-oy)*fitScale;
          var dw=tileSize*fitScale;
          ctx.drawImage(img,dx,dy,dw,dw);
          tilesLoaded++;
          if(tilesLoaded>=totalTiles)drawOverlay();
        };
        img.onerror=function(){tilesLoaded++;if(tilesLoaded>=totalTiles)drawOverlay()};
        img.src='https://tile.openstreetmap.org/'+Z+'/'+tx+'/'+ty+'.png';
      })(tx,ty);
    }
  }
  function drawOverlay(){
    ctx.save();
    ctx.globalCompositeOperation='multiply';
    ctx.fillStyle='rgba(19,26,46,0.4)';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
    ctx.beginPath();
    for(var i=0;i<hikedRoute.length;i++){
      var p=project(hikedRoute[i][0],hikedRoute[i][1]);
      if(i===0)ctx.moveTo(p[0],p[1]);
      else ctx.lineTo(p[0],p[1]);
    }
    ctx.strokeStyle='rgba(194,65,12,0.9)';
    ctx.lineWidth=4;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.setLineDash([]);
    ctx.stroke();
    function drawPin(lat,lng,radius,fill,label,labelYOff){
      var p=project(lat,lng);
      ctx.beginPath();
      ctx.arc(p[0],p[1],radius,0,Math.PI*2);
      ctx.fillStyle=fill;
      ctx.fill();
      ctx.strokeStyle='#131a2e';
      ctx.lineWidth=2.5;
      ctx.stroke();
      if(label){
        ctx.font='600 12px system-ui, sans-serif';
        ctx.fillStyle='#eef2fb';
        ctx.textAlign='center';
        ctx.fillText(label,p[0],p[1]+(labelYOff||20));
      }
    }
    drawPin(30.4973,-98.8181,11,'#3b5bdb','Parking',24);
    var pp=project(30.4973,-98.8181);
    ctx.font='700 12px system-ui, sans-serif';
    ctx.fillStyle='#fff';
    ctx.textAlign='center';
    ctx.fillText('P',pp[0],pp[1]+4);
    var tp=project(30.5019,-98.8141);
    ctx.beginPath();
    ctx.arc(tp[0],tp[1],18,0,Math.PI*2);
    ctx.strokeStyle='rgba(194,65,12,0.3)';
    ctx.lineWidth=1.5;
    ctx.stroke();
    drawPin(30.5019,-98.8141,10,'#c2410c',null,0);
    ctx.font='700 11px system-ui, sans-serif';
    ctx.fillStyle='#fff';
    ctx.textAlign='center';
    ctx.fillText('↻',tp[0],tp[1]+4);
    ctx.font='600 12px system-ui, sans-serif';
    ctx.fillStyle='#eef2fb';
    ctx.fillText('Turkey Pass junction',tp[0],tp[1]-20);
    ctx.font='10px system-ui, sans-serif';
    ctx.fillStyle='#c2410c';
    ctx.fillText('turnaround',tp[0],tp[1]-33);
  }
})();
</script>
</div>

**~12:30 PM** — Back at the Airbnb. Shower, get ready.

**~1:30 PM** — Head to **West End Pizza Co.** (207 E San Antonio St) for the
France game at 2:00 PM.

**~4:00 PM** — After the game, walk around downtown Fredericksburg for a couple
hours. No particular agenda, just meander up and down Main Street and duck into
whatever looks interesting.

**~6:00 PM** — Back to the Airbnb. Cook dinner, hot tub.

## Saturday, June 27

**Morning** — Slow morning, same as Friday.

**9:45 AM** — Head to the shuttle pickup.

**10:00 AM to 6:00 PM** — 290 Wine Shuttle, departing from 308 S Washington St
(upper parking lot, Inn on Barons Creek).

| Time | Stop | Food | Why |
| --- | --- | --- | --- |
| ~10:00 AM | Barelle Vineyards (6258 US Hwy 290 E) | Light bites | Restored 1902 schoolhouse, boutique, women-crafted reds |
| ~11:00 AM | Barons Creek Vineyards (5865 Hwy 290 E) | Tapas + food and wine pairing | Three distinct Cabs (Crazy Train, Boots, Reserve); dedicated red flight |
| ~12:30 PM | Slate Theory Winery (10915 E US Hwy 290) | Small bites | Underground cellar; Cab Sauv + red blends (Schizophrenic, Insomniac) |
| ~2:30 PM | Longhorn Cellars (315 RR 1376) | Wine-paired tapas | Cozy barn; Bordeaux blend (Cab/Merlot/Petit Verdot); pet-friendly patio |
| ~4:00 PM | Becker Vineyards (464 Becker Farms Rd, Stonewall) | Picnic grounds | Bordeaux/Rhone style; solid Cab Sauv; big but not rowdy |

**6:00 PM** — Shuttle ends.

**6:30 PM** — Portugal game.

- **Option A:** HEB pre-made meals (not sure I want to cook after a full day of wine tasting). Watch from the Airbnb.
- **Option B:** **Sozial Haus** (107 S Llano St). Relaxed bar, large TVs, full
  menu.

## Sunday, June 28

**Morning** — Slow morning. Coffee, games, pack up. Depart when ready.

## Game Quick Reference

| Game | Day | Time | Where |
| --- | --- | --- | --- |
| USA | Thursday | 9:00 PM | [Cultures Grill & Bar](https://www.culturesfbg.com/) |
| France | Friday | 2:00 PM | [West End Pizza Co.](https://westendpizzacompany.com/) / [Auslander](https://theauslander.com/) |
| Portugal | Saturday | 6:30 PM | Airbnb / [Sozial Haus](https://www.sozialhaus.com/) |
