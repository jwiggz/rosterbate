(function(){
  if(document.querySelector('.rb-site-bg-layer')) return;
  if(document.body && document.body.querySelector('.site-bg')) return;

  const style = document.createElement('style');
  style.textContent = `
    html,body{background:#040507 !important;}
    body{position:relative;}
    body::before,body::after{display:none !important;}
    .rb-site-bg-layer{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;}
    .rb-site-bg-layer::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,3,5,.985) 0%,rgba(4,5,8,.975) 42%,rgba(5,6,9,.99) 100%);}
    .rb-site-bg-layer::after{content:'';position:absolute;inset:0;background:radial-gradient(68% 48% at 50% 24%,rgba(255,255,255,.012),transparent 60%);}
    .rb-site-bg-glow{position:absolute;inset:-10%;background:
      radial-gradient(24% 18% at 18% 30%, rgba(59,130,246,.025), transparent 75%),
      radial-gradient(26% 20% at 84% 34%, rgba(139,92,246,.022), transparent 75%);
      filter:blur(14px);opacity:.18;
    }
    .rb-site-bg-lines{position:absolute;inset:0;opacity:.32;}
    .rb-site-bg-h,.rb-site-bg-v{position:absolute;background:rgba(200,208,220,.08);will-change:transform,opacity;}
    .rb-site-bg-h{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:rbDrawX .85s cubic-bezier(.22,.61,.36,1) forwards;}
    .rb-site-bg-v{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:rbDrawY .95s cubic-bezier(.22,.61,.36,1) forwards;}
    .rb-site-bg-h:nth-child(1){top:18%;animation-delay:.12s;}
    .rb-site-bg-h:nth-child(2){top:50%;animation-delay:.22s;}
    .rb-site-bg-h:nth-child(3){top:82%;animation-delay:.32s;}
    .rb-site-bg-v:nth-child(4){left:22%;animation-delay:.42s;}
    .rb-site-bg-v:nth-child(5){left:50%;animation-delay:.54s;}
    .rb-site-bg-v:nth-child(6){left:78%;animation-delay:.66s;}
    .rb-site-bg-h::after,.rb-site-bg-v::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);opacity:0;animation:rbShimmer .95s ease-out forwards;}
    .rb-site-bg-h:nth-child(1)::after{animation-delay:.12s;}
    .rb-site-bg-h:nth-child(2)::after{animation-delay:.22s;}
    .rb-site-bg-h:nth-child(3)::after{animation-delay:.32s;}
    .rb-site-bg-v:nth-child(4)::after{animation-delay:.42s;}
    .rb-site-bg-v:nth-child(5)::after{animation-delay:.54s;}
    .rb-site-bg-v:nth-child(6)::after{animation-delay:.66s;}
    .rb-site-bg-v::after{background:linear-gradient(180deg,transparent,rgba(255,255,255,.18),transparent);}
    .rb-site-bg-particles{position:absolute;inset:0;width:100%;height:100%;opacity:.15;mix-blend-mode:screen;}
    body > *:not(.rb-site-bg-layer){position:relative;z-index:1;}
    @keyframes rbDrawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.5}100%{transform:scaleX(1);opacity:.3}}
    @keyframes rbDrawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.5}100%{transform:scaleY(1);opacity:.3}}
    @keyframes rbShimmer{0%{opacity:0}35%{opacity:.12}100%{opacity:0}}
  `;
  document.head.appendChild(style);

  const layer = document.createElement('div');
  layer.className = 'rb-site-bg-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="rb-site-bg-glow"></div>
    <div class="rb-site-bg-lines">
      <div class="rb-site-bg-h"></div>
      <div class="rb-site-bg-h"></div>
      <div class="rb-site-bg-h"></div>
      <div class="rb-site-bg-v"></div>
      <div class="rb-site-bg-v"></div>
      <div class="rb-site-bg-v"></div>
    </div>
    <canvas class="rb-site-bg-particles"></canvas>
  `;
  document.body.insertBefore(layer, document.body.firstChild);

  const canvas = layer.querySelector('.rb-site-bg-particles');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if(!canvas || !ctx) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let particles = [];
  let rafId = 0;

  function setSize(){
    const ratio = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function makeParticle(){
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      v: Math.random() * 0.26 + 0.06,
      o: Math.random() * 0.26 + 0.08,
      l: Math.random() * 3 + 1.2
    };
  }

  function seedParticles(){
    particles = [];
    const count = Math.max(36, Math.floor((window.innerWidth * window.innerHeight) / 14000));
    for(let i = 0; i < count; i += 1) particles.push(makeParticle());
  }

  function drawStatic(){
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(particle => {
      ctx.fillStyle = 'rgba(250,250,250,' + particle.o.toFixed(3) + ')';
      ctx.fillRect(particle.x, particle.y, 0.8, particle.l);
    });
  }

  function draw(){
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(particle => {
      particle.y -= particle.v;
      if(particle.y < -particle.l){
        particle.x = Math.random() * window.innerWidth;
        particle.y = window.innerHeight + Math.random() * 40;
        particle.v = Math.random() * 0.26 + 0.06;
        particle.o = Math.random() * 0.26 + 0.08;
        particle.l = Math.random() * 3 + 1.2;
      }
      ctx.fillStyle = 'rgba(250,250,250,' + particle.o.toFixed(3) + ')';
      ctx.fillRect(particle.x, particle.y, 0.8, particle.l);
    });
    rafId = requestAnimationFrame(draw);
  }

  function refresh(){
    setSize();
    seedParticles();
    if(reducedMotion){
      drawStatic();
      return;
    }
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', refresh);
  refresh();
})();
