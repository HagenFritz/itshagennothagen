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

**8:00 to 11:00 AM** — Slow morning. Cook breakfast, hang out on the patio, swap stories.

**11:00 AM to 1:30 PM** — Experience the town. Park near Marktplatz (free lot at 100 W
Main St) or the Visitor Center lot (302 E Austin St). Street parking on Main has
a two-hour limit, so the lots are safer for a full afternoon.

Shops and stops along Main Street:

| Place | Address | What | Dog? |
| --- | --- | --- | --- |
| Dogologie | 148 E Main St | Dog boutique; "Dog Pause" daycare + stroller rental | 🐶 |
| RS Hanna Gallery | 244 W Main St | Fine art gallery | 🐶 |
| Chocolat (Quintessential Chocolates) | 251 W Main St | European liquid-filled chocolates, truffles | 🐶 |
| Rustlin' Rob's | 121 E Main St | Gourmet Texas sauces, salsas, free sampling | 🐶 |
| Vaudeville | 230 E Main St | 3-floor design/art/retail + gourmet bistro | 🤷 (patio yes, interior unclear) |
| Lone Star Candy Bar | 254 E Main St | Chocolate-covered bacon, nostalgic sweets, sodas | 🤷 |
| Felt Boutique | 204 E Main St | "Hat bar," customize a felt/straw hat | 🤷 |
| Fredericksburg General Store | 143 E Main St | Texas souvenirs, nostalgic candy, jams | 🤷 |
| Berkman Books | 416 E Main St | New/used/rare books + antique maps | ❌ (resident shop cats) |
| Marktplatz / Vereins Kirche | 100 block W Main St | Central public square, lawns, picnic tables | 🐶 outdoors / ❌ museum |

I wanted to visit places in a logical order (naturally), so I asked to Claude help me figure out the ideal routing and timing for our stops. We have from parking to lunch location, both with and without the pup in tow.

<div class="fredi-routes">
<style>
.fredi-routes { font-family: inherit; }
.fredi-routes .fr-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
.fredi-routes .fr-tab {
  padding: 0.5rem 1.25rem; border: 1px solid var(--border); border-radius: 0.5rem;
  background: transparent; color: var(--muted-foreground); font-size: 0.8125rem;
  font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.fredi-routes .fr-tab:hover { border-color: var(--navy-bright); color: var(--foreground); }
.fredi-routes .fr-tab.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.fredi-routes .fr-map {
  position: relative; background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden; margin-bottom: 1.25rem;
}
.fredi-routes .fr-map svg { width: 100%; height: auto; display: block; }
.fredi-routes .fr-tt {
  position: absolute; background: var(--muted); border: 1px solid var(--border);
  border-radius: 0.375rem; padding: 0.375rem 0.625rem; font-size: 0.6875rem;
  color: var(--foreground); pointer-events: none; opacity: 0; transition: opacity 0.15s;
  white-space: nowrap; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.fredi-routes .fr-tt.visible { opacity: 1; }
.fredi-routes .fr-pin { cursor: pointer; }
.fredi-routes .fr-pin:hover circle:first-child { filter: brightness(1.3); }
.fredi-routes .fr-park {
  display: flex; align-items: flex-start; gap: 0.625rem; background: var(--muted);
  border: 1px solid var(--border); border-radius: var(--radius); padding: 0.75rem 1rem;
  margin-bottom: 1.25rem; font-size: 0.8125rem; color: var(--muted-foreground); line-height: 1.5;
}
.fredi-routes .fr-park strong { color: var(--foreground); }
.fredi-routes .fr-park-icon {
  flex-shrink: 0; width: 20px; height: 20px; background: var(--navy-bright); border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.6875rem; color: #fff; margin-top: 1px;
}
.fredi-routes .fr-list { display: flex; flex-direction: column; }
.fredi-routes .fr-stop {
  display: grid; grid-template-columns: 3.5rem 1.5rem 1fr auto;
  gap: 0 0.75rem; align-items: start; padding: 0.625rem 0;
}
.fredi-routes .fr-time {
  font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-align: right;
  padding-top: 0.125rem; font-variant-numeric: tabular-nums; white-space: nowrap;
}
.fredi-routes .fr-dot-col { display: flex; flex-direction: column; align-items: center; padding-top: 0.25rem; }
.fredi-routes .fr-dot {
  width: 10px; height: 10px; border-radius: 50%; background: var(--primary);
  border: 2px solid var(--background); z-index: 1; flex-shrink: 0;
}
.fredi-routes .fr-dot.dest { width: 14px; height: 14px; box-shadow: 0 0 0 3px rgba(194,65,12,0.3); }
.fredi-routes .fr-dot.park { background: var(--navy-bright); }
.fredi-routes .fr-line { width: 2px; background: var(--border); flex: 1; min-height: 1rem; margin-top: 0.25rem; }
.fredi-routes .fr-stop:last-child .fr-line { display: none; }
.fredi-routes .fr-name { font-size: 0.875rem; font-weight: 600; color: var(--foreground); line-height: 1.3; }
.fredi-routes .fr-desc { font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.125rem; line-height: 1.4; }
.fredi-routes .fr-badges { display: flex; gap: 0.375rem; align-self: start; margin-top: 0.125rem; flex-wrap: wrap; }
.fredi-routes .bw {
  font-size: 0.6875rem; font-weight: 600; color: var(--foreground);
  background: rgba(238,242,251,0.08); border: 1px solid rgba(238,242,251,0.15);
  border-radius: 0.25rem; padding: 0.125rem 0.5rem; white-space: nowrap;
}
.fredi-routes .bd {
  font-size: 0.6875rem; font-weight: 600; color: var(--primary);
  background: rgba(194,65,12,0.1); border: 1px solid rgba(194,65,12,0.2);
  border-radius: 0.25rem; padding: 0.125rem 0.5rem; white-space: nowrap;
}
.fredi-routes .bg {
  font-size: 0.6875rem; font-weight: 600; color: #4ade80;
  background: rgba(31,122,67,0.15); border: 1px solid rgba(31,122,67,0.25);
  border-radius: 0.25rem; padding: 0.125rem 0.5rem; white-space: nowrap;
}
.fredi-routes .dog {
  display: inline-block; font-size: 0.625rem; font-weight: 600;
  padding: 0.0625rem 0.375rem; border-radius: 0.1875rem; margin-left: 0.375rem;
  vertical-align: middle; text-transform: uppercase; letter-spacing: 0.03em;
}
.fredi-routes .dog.y { background: rgba(31,122,67,0.2); color: #4ade80; border: 1px solid rgba(31,122,67,0.3); }
.fredi-routes .dog.m { background: rgba(234,179,8,0.15); color: #facc15; border: 1px solid rgba(234,179,8,0.2); }
.fredi-routes .dog.n { background: rgba(218,54,51,0.15); color: #f87171; border: 1px solid rgba(218,54,51,0.2); }
.fredi-routes .fr-arrival {
  display: flex; align-items: center; gap: 0.625rem;
  background: rgba(194,65,12,0.1); border: 1px solid rgba(194,65,12,0.25);
  border-radius: var(--radius); padding: 0.75rem 1rem; margin-top: 0.5rem;
  font-size: 0.8125rem; line-height: 1.4;
}
.fredi-routes .fr-arrival strong { color: var(--primary); }
.fredi-routes .fr-legend {
  display: flex; gap: 1rem; margin-top: 1rem; padding-top: 1rem;
  border-top: 1px solid var(--border); font-size: 0.6875rem; color: var(--muted-foreground);
  flex-wrap: wrap; align-items: center;
}
.fredi-routes .fr-legend-item { display: flex; align-items: center; gap: 0.375rem; }
.fredi-routes .fr-legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.fredi-routes .fr-panel { display: none; }
.fredi-routes .fr-panel.active { display: block; }
@media (max-width: 600px) {
  .fredi-routes .fr-stop { grid-template-columns: 3rem 1.25rem 1fr auto; gap: 0 0.5rem; }
  .fredi-routes .fr-time { font-size: 0.6875rem; }
  .fredi-routes .fr-tabs { flex-wrap: wrap; }
  .fredi-routes .fr-badges { flex-direction: column; gap: 0.25rem; }
}
</style>

<div class="fr-tabs">
  <button class="fr-tab active" data-sc="nodog" onclick="frSwitch('nodog')">No Dog &#8594; West End Pizza</button>
  <button class="fr-tab" data-sc="dog" onclick="frSwitch('dog')">With Dog &#8594; The Auslander</button>
</div>

<!-- ══ SCENARIO 1: NO DOG ══ -->
<div class="fr-panel active" id="fr-nodog">
<div class="fr-map">
  <div class="fr-tt" id="frt1"></div>
  <svg viewBox="0 0 920 440" xmlns="http://www.w3.org/2000/svg" id="frs1">
    <defs><linearGradient id="sf1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#283256" stop-opacity="0"/><stop offset="8%" stop-color="#283256" stop-opacity="1"/><stop offset="92%" stop-color="#283256" stop-opacity="1"/><stop offset="100%" stop-color="#283256" stop-opacity="0"/></linearGradient></defs>
    <rect width="920" height="440" fill="#131a2e"/>
    <line x1="30" y1="200" x2="890" y2="200" stroke="url(#sf1)" stroke-width="2.5"/>
    <text x="40" y="192" fill="#555c72" font-size="9" font-family="inherit" opacity="0.7">&#8592; W MAIN ST</text>
    <text x="880" y="192" fill="#555c72" font-size="9" font-family="inherit" text-anchor="end" opacity="0.7">E MAIN ST &#8594;</text>
    <line x1="520" y1="70" x2="520" y2="400" stroke="#283256" stroke-width="1" stroke-dasharray="4,4" opacity="0.4"/>
    <text x="526" y="84" fill="#555c72" font-size="8" font-family="inherit" opacity="0.5">SAN ANTONIO ST</text>
    <path d="M 130,200 L 190,200 L 340,200 L 390,200 L 410,200 L 530,200 L 570,200 L 770,200 L 770,320 L 520,320" fill="none" stroke="#c2410c" stroke-width="2" stroke-dasharray="6,4" opacity="0.5"/>
    <g class="fr-pin" data-name="Marktplatz" data-time="11:00 AM" data-addr="100 W Main St"><circle cx="130" cy="200" r="8" fill="#3b5bdb" stroke="#131a2e" stroke-width="2"/><text x="130" y="203" fill="#fff" font-size="8" font-weight="700" font-family="inherit" text-anchor="middle">P</text><text x="130" y="180" fill="#eef2fb" font-size="9" font-weight="600" font-family="inherit" text-anchor="middle">Marktplatz</text></g>
    <g class="fr-pin" data-name="Chocolat" data-time="11:13 AM" data-addr="251 W Main St"><circle cx="190" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="190" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">2</text><text x="190" y="228" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Chocolat</text></g>
    <g class="fr-pin" data-name="Rustlin' Rob's" data-time="11:33 AM" data-addr="121 E Main St"><circle cx="340" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="340" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">3</text><text x="340" y="180" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Rustlin' Rob's</text></g>
    <g class="fr-pin" data-name="General Store" data-time="11:53 AM" data-addr="143 E Main St"><circle cx="390" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="390" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">4</text><text x="390" y="228" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">General Store</text></g>
    <g class="fr-pin" data-name="Dogologie" data-time="12:05 PM" data-addr="148 E Main St"><circle cx="410" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="410" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">5</text><text x="432" y="180" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Dogologie</text></g>
    <g class="fr-pin" data-name="Vaudeville" data-time="12:18 PM" data-addr="230 E Main St"><circle cx="530" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="530" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">6</text><text x="530" y="228" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Vaudeville</text></g>
    <g class="fr-pin" data-name="Lone Star Candy" data-time="12:38 PM" data-addr="254 E Main St"><circle cx="570" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="570" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">7</text><text x="570" y="180" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Lone Star Candy</text></g>
    <g class="fr-pin" data-name="Berkman Books" data-time="12:53 PM" data-addr="416 E Main St"><circle cx="770" cy="200" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="770" y="203" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">8</text><text x="770" y="228" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Berkman Books</text></g>
    <g class="fr-pin" data-name="West End Pizza Co." data-time="1:30 PM" data-addr="207 E San Antonio St"><circle cx="520" cy="320" r="15" fill="none" stroke="#c2410c" stroke-width="1.5" opacity="0.3"/><circle cx="520" cy="320" r="10" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="520" y="323" fill="#fff" font-size="9" font-weight="700" font-family="inherit" text-anchor="middle">&#9733;</text><text x="520" y="350" fill="#eef2fb" font-size="10" font-weight="600" font-family="inherit" text-anchor="middle">West End Pizza Co.</text><text x="520" y="363" fill="#c2410c" font-size="8" font-family="inherit" text-anchor="middle">1:30 PM · France at 2:00</text></g>
    <text x="40" y="425" fill="#555c72" font-size="8" font-family="inherit" opacity="0.4">Schematic. Stops positioned by address number along Main St.</text>
  </svg>
</div>
<div class="fr-park"><div class="fr-park-icon">P</div><div><strong>Park at Marktplatz</strong> (100 W Main St). Free lot, no time limit. Street parking on Main has a 2-hour cap.</div></div>
<div class="fr-list">
  <div class="fr-stop"><div class="fr-time">11:00</div><div class="fr-dot-col"><div class="fr-dot park"></div><div class="fr-line"></div></div><div><div class="fr-name">Marktplatz / Vereins Kirche</div><div class="fr-desc">Central square. Get bearings, start walking.</div></div><div class="fr-badges"><span class="bd">10 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">11:13</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Chocolat <span class="dog y">dog ok</span></div><div class="fr-desc">251 W Main St. European liquid-filled chocolates, truffles.</div></div><div class="fr-badges"><span class="bw">3 min walk</span><span class="bd">15 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">11:33</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Rustlin' Rob's <span class="dog y">dog ok</span></div><div class="fr-desc">121 E Main St. Gourmet sauces, salsas, free sampling.</div></div><div class="fr-badges"><span class="bw">5 min walk</span><span class="bd">15 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">11:53</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Fredericksburg General Store <span class="dog m">maybe</span></div><div class="fr-desc">143 E Main St. Souvenirs, nostalgic candy, jams.</div></div><div class="fr-badges"><span class="bw">2 min walk</span><span class="bd">10 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:05</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Dogologie <span class="dog y">dog ok</span></div><div class="fr-desc">148 E Main St. Dog boutique + "Dog Pause" daycare.</div></div><div class="fr-badges"><span class="bw">1 min walk</span><span class="bd">10 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:18</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Vaudeville <span class="dog m">patio</span></div><div class="fr-desc">230 E Main St. 3-floor design/art/retail + bistro.</div></div><div class="fr-badges"><span class="bw">3 min walk</span><span class="bd">15 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:38</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Lone Star Candy Bar <span class="dog m">maybe</span></div><div class="fr-desc">254 E Main St. Chocolate-covered bacon, nostalgic sweets.</div></div><div class="fr-badges"><span class="bw">2 min walk</span><span class="bd">10 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:53</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Berkman Books <span class="dog n">no dogs</span></div><div class="fr-desc">416 E Main St. New/used/rare books + antique maps. Resident shop cats.</div></div><div class="fr-badges"><span class="bw">5 min walk</span><span class="bd">20 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">1:20</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Walk south to West End Pizza Co.</div><div class="fr-desc">207 E San Antonio St. One block south of Main.</div></div><div class="fr-badges"><span class="bw">10 min walk</span></div></div>
  <div class="fr-stop"><div class="fr-time">1:30</div><div class="fr-dot-col"><div class="fr-dot dest"></div></div><div><div class="fr-name">West End Pizza Co.</div><div class="fr-desc">France kicks off at 2:00. Big-screen HDTVs, covered patio, full bar.</div></div><div class="fr-badges"><span class="bg">game time</span></div></div>
</div>
<div class="fr-arrival"><strong>1:30 PM</strong> &#8212; 30 minutes to settle in before France. 9 stops, ~2.5 hours.</div>
<div class="fr-legend">
  <div class="fr-legend-item"><div class="fr-legend-dot" style="background:var(--navy-bright)"></div> Parking</div>
  <div class="fr-legend-item"><div class="fr-legend-dot" style="background:var(--primary)"></div> Stop</div>
  <div class="fr-legend-item"><span class="bw" style="font-size:0.625rem;padding:0 0.375rem">walk</span> Walk time</div>
  <div class="fr-legend-item"><span class="bd" style="font-size:0.625rem;padding:0 0.375rem">dwell</span> Time at stop</div>
</div>
</div>

<!-- ══ SCENARIO 2: WITH DOG ══ -->
<div class="fr-panel" id="fr-dog">
<div class="fr-map">
  <div class="fr-tt" id="frt2"></div>
  <svg viewBox="0 0 920 340" xmlns="http://www.w3.org/2000/svg" id="frs2">
    <defs><linearGradient id="sf2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#283256" stop-opacity="0"/><stop offset="8%" stop-color="#283256" stop-opacity="1"/><stop offset="92%" stop-color="#283256" stop-opacity="1"/><stop offset="100%" stop-color="#283256" stop-opacity="0"/></linearGradient></defs>
    <rect width="920" height="340" fill="#131a2e"/>
    <line x1="30" y1="175" x2="890" y2="175" stroke="url(#sf2)" stroke-width="2.5"/>
    <text x="40" y="167" fill="#555c72" font-size="9" font-family="inherit" opacity="0.7">&#8592; W MAIN ST</text>
    <text x="880" y="167" fill="#555c72" font-size="9" font-family="inherit" text-anchor="end" opacity="0.7">E MAIN ST &#8594;</text>
    <path d="M 140,175 L 210,175 L 390,175 L 440,175 L 560,175 L 600,175 L 720,175" fill="none" stroke="#c2410c" stroke-width="2" stroke-dasharray="6,4" opacity="0.5"/>
    <g class="fr-pin" data-name="Marktplatz" data-time="11:00 AM" data-addr="100 W Main St"><circle cx="140" cy="175" r="8" fill="#3b5bdb" stroke="#131a2e" stroke-width="2"/><text x="140" y="178" fill="#fff" font-size="8" font-weight="700" font-family="inherit" text-anchor="middle">P</text><text x="140" y="155" fill="#eef2fb" font-size="9" font-weight="600" font-family="inherit" text-anchor="middle">Marktplatz</text></g>
    <g class="fr-pin" data-name="Chocolat" data-time="11:13 AM" data-addr="251 W Main St"><circle cx="210" cy="175" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="210" y="178" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">2</text><text x="210" y="203" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Chocolat</text></g>
    <g class="fr-pin" data-name="Rustlin' Rob's" data-time="11:33 AM" data-addr="121 E Main St"><circle cx="390" cy="175" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="390" y="178" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">3</text><text x="390" y="155" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Rustlin' Rob's</text></g>
    <g class="fr-pin" data-name="Dogologie" data-time="11:53 AM" data-addr="148 E Main St"><circle cx="440" cy="175" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="440" y="178" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">4</text><text x="440" y="203" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Dogologie</text></g>
    <g class="fr-pin" data-name="Vaudeville" data-time="12:11 PM" data-addr="230 E Main St"><circle cx="560" cy="175" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="560" y="178" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">5</text><text x="560" y="155" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Vaudeville</text></g>
    <g class="fr-pin" data-name="Lone Star Candy" data-time="12:36 PM" data-addr="254 E Main St"><circle cx="600" cy="175" r="7" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="600" y="178" fill="#fff" font-size="7" font-weight="700" font-family="inherit" text-anchor="middle">6</text><text x="600" y="203" fill="#9aa6c2" font-size="8" font-family="inherit" text-anchor="middle">Lone Star Candy</text></g>
    <g class="fr-pin" data-name="The Auslander" data-time="1:30 PM" data-addr="323 E Main St"><circle cx="720" cy="175" r="15" fill="none" stroke="#c2410c" stroke-width="1.5" opacity="0.3"/><circle cx="720" cy="175" r="10" fill="#c2410c" stroke="#131a2e" stroke-width="2"/><text x="720" y="178" fill="#fff" font-size="9" font-weight="700" font-family="inherit" text-anchor="middle">&#9733;</text><text x="720" y="155" fill="#eef2fb" font-size="10" font-weight="600" font-family="inherit" text-anchor="middle">The Auslander</text><text x="720" y="143" fill="#c2410c" font-size="8" font-family="inherit" text-anchor="middle">1:30 PM · France at 2:00</text></g>
    <text x="40" y="325" fill="#555c72" font-size="8" font-family="inherit" opacity="0.4">Schematic. Stops positioned by address number along Main St.</text>
  </svg>
</div>
<div class="fr-park"><div class="fr-park-icon">P</div><div><strong>Park at Marktplatz</strong> (100 W Main St). Free lot, no time limit. Shorter route, plenty of buffer.</div></div>
<div class="fr-list">
  <div class="fr-stop"><div class="fr-time">11:00</div><div class="fr-dot-col"><div class="fr-dot park"></div><div class="fr-line"></div></div><div><div class="fr-name">Marktplatz (outdoor square) <span class="dog y">dog ok</span></div><div class="fr-desc">Central square, lawns. Let the dog stretch.</div></div><div class="fr-badges"><span class="bd">10 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">11:13</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Chocolat <span class="dog y">dog ok</span></div><div class="fr-desc">251 W Main St. European liquid-filled chocolates, truffles.</div></div><div class="fr-badges"><span class="bw">3 min walk</span><span class="bd">15 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">11:33</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Rustlin' Rob's <span class="dog y">dog ok</span></div><div class="fr-desc">121 E Main St. Gourmet sauces, salsas, free sampling.</div></div><div class="fr-badges"><span class="bw">5 min walk</span><span class="bd">15 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">11:53</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Dogologie <span class="dog y">dog ok</span></div><div class="fr-desc">148 E Main St. Dog boutique + "Dog Pause" daycare if needed.</div></div><div class="fr-badges"><span class="bw">2 min walk</span><span class="bd">15 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:11</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Vaudeville (patio) <span class="dog m">patio</span></div><div class="fr-desc">230 E Main St. 3-floor design/art/retail + bistro. Dog on patio.</div></div><div class="fr-badges"><span class="bw">3 min walk</span><span class="bd">20 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:36</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Lone Star Candy Bar <span class="dog m">maybe</span></div><div class="fr-desc">254 E Main St. Chocolate-covered bacon, nostalgic sweets.</div></div><div class="fr-badges"><span class="bw">2 min walk</span><span class="bd">10 min</span></div></div>
  <div class="fr-stop"><div class="fr-time">12:50</div><div class="fr-dot-col"><div class="fr-dot"></div><div class="fr-line"></div></div><div><div class="fr-name">Walk to The Auslander</div><div class="fr-desc">323 E Main St. Just up the street.</div></div><div class="fr-badges"><span class="bw">5 min walk</span></div></div>
  <div class="fr-stop"><div class="fr-time">1:30</div><div class="fr-dot-col"><div class="fr-dot dest"></div></div><div><div class="fr-name">The Auslander Biergarten</div><div class="fr-desc">Dog-friendly patio, German food, TVs at the bar. France at 2:00 PM.</div></div><div class="fr-badges"><span class="bg">game time</span></div></div>
</div>
<div class="fr-arrival"><strong>1:30 PM</strong> &#8212; 30 minutes to settle in before France. 7 stops, ~2.5 hours, relaxed pace with the dog.</div>
<div class="fr-legend">
  <div class="fr-legend-item"><div class="fr-legend-dot" style="background:var(--navy-bright)"></div> Parking</div>
  <div class="fr-legend-item"><div class="fr-legend-dot" style="background:var(--primary)"></div> Stop</div>
  <div class="fr-legend-item"><span class="bw" style="font-size:0.625rem;padding:0 0.375rem">walk</span> Walk time</div>
  <div class="fr-legend-item"><span class="bd" style="font-size:0.625rem;padding:0 0.375rem">dwell</span> Time at stop</div>
</div>
</div>

<script>
function frSwitch(id) {
  document.querySelectorAll('.fredi-routes .fr-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.fredi-routes .fr-tab[data-sc="'+id+'"]').classList.add('active');
  document.querySelectorAll('.fredi-routes .fr-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('fr-'+id).classList.add('active');
}
document.querySelectorAll('.fredi-routes .fr-pin').forEach(pin => {
  const svg = pin.closest('svg');
  const map = svg.closest('.fr-map');
  const tt = map.querySelector('.fr-tt');
  pin.addEventListener('mouseenter', () => {
    tt.innerHTML = '<strong>'+pin.dataset.name+'</strong><br><span style="color:#c2410c">'+pin.dataset.time+'</span> · <span style="color:#9aa6c2">'+pin.dataset.addr+'</span>';
    tt.classList.add('visible');
    const rect = map.getBoundingClientRect();
    const c = pin.querySelector('circle');
    const pt = svg.createSVGPoint();
    pt.x = parseFloat(c.getAttribute('cx'));
    pt.y = parseFloat(c.getAttribute('cy'));
    const sp = pt.matrixTransform(svg.getScreenCTM());
    tt.style.left = (sp.x - rect.left - tt.offsetWidth/2) + 'px';
    tt.style.top = (sp.y - rect.top - 40) + 'px';
  });
  pin.addEventListener('mouseleave', () => tt.classList.remove('visible'));
});
</script>
</div>

Arrive by 1:30 PM in either scenario, 30 minutes before France kicks off.

**~4:00 PM** — Return to the Airbnb. Patio, cook dinner, hot tub.

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
| USA | Thursday | 9:00 PM | Cultures Grill & Bar |
| France | Friday | 2:00 PM | West End Pizza Co. / Auslander |
| Portugal | Saturday | 6:30 PM | Airbnb / Sozial Haus |
