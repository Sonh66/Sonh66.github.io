(() => {
  'use strict';
  if (window.sonhGlassUI) return;
  window.sonhGlassUI = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="2"/><path d="M5 9v11h14V9M10 13h4"/>',
    tag: '<path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V4h9l8 7a1.5 1.5 0 0 1 0 2Z"/><circle cx="7.5" cy="8" r="1"/>',
    link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    file: '<path d="M14 3H5v18h14V8Zm0 0v6h5M8 13h8M8 17h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    toc: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>'
  };
  const icon = name => `<svg class="sonh-ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
  const menus = [
    {title:'首页',url:'/',icon:'home'}, {title:'归档',url:'/archives/',icon:'archive'},
    {title:'标签',url:'/tags/',icon:'tag'}, {title:'友链',url:'/links/',icon:'link'},
    {title:'关于',url:'/about/',icon:'user'}
  ];
  let posts = [];
  let indexError = false;
  const dataReady = fetch('/sonh-ui-data.json').then(response => {
    if (!response.ok) throw new Error('Index unavailable');
    return response.json();
  }).then(data => { posts = data.posts; return posts; }).catch(() => { indexError = true; return []; });
  const activeMenu = menus.find(item => item.url === '/' ? location.pathname === '/' || /^\/page\//.test(location.pathname) : location.pathname.startsWith(item.url));

  // Pause border painting outside the viewport, especially on long mobile lists.
  const borderObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('sonh-edge-visible', entry.isIntersecting));
  }, {rootMargin:'100px'}) : null;
  function decorateCardBorder(card) {
    if (card.classList.contains('sonh-bordered-card')) return;
    card.classList.add('sonh-bordered-card');
    const edge=document.createElement('span');edge.className='sonh-card-edge';edge.setAttribute('aria-hidden','true');card.append(edge);
    if (borderObserver) borderObserver.observe(card);
    else card.classList.add('sonh-edge-visible');
  }
  function trackSpotlight(card) {
    if (card.id === 'card-toc' || card.classList.contains('sonh-spotlight')) return;
    card.classList.add('sonh-spotlight');
    decorateCardBorder(card);
    let frame = 0;
    card.addEventListener('pointermove', event => {
      if (!finePointer.matches || reduced.matches || frame) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        card.style.setProperty('--light-x', `${x * 100}%`);
        card.style.setProperty('--light-y', `${y * 100}%`);
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
        card.style.setProperty('--light-on', '1');
        frame = 0;
      });
    }, {passive:true});
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame); frame = 0;
      card.style.setProperty('--tilt-x','0deg'); card.style.setProperty('--tilt-y','0deg'); card.style.setProperty('--light-on','0');
    });
  }
  $$('.recent-post-item, #aside-content .card-widget, .flink-list-item').forEach(trackSpotlight);
  // Structural panels get the same outline, without pointer tilt or positioning changes.
  $$('#post, #page, #archive, #tag, #card-toc, #footer').forEach(decorateCardBorder);

  // Independent mechanical reels. Lower digits settle more quickly.
  const clock=$('.sonh-clock');
  if(clock){
    const reels=$$('.sonh-clock-reel',clock);
    const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    let previous='';let clockTimer;
    function updateClock(){
      clearTimeout(clockTimer);
      const now=new Date(),time=formatter.format(now),digits=time.replace(/:/g,'');
      clock.dateTime=now.toISOString();clock.setAttribute('aria-label',`北京时间 ${time}`);
      reels.forEach((reel,index)=>{
        const digit=Number(digits[index]);if(previous[index]===digits[index])return;
        const height=reel.parentElement.clientHeight;
        const livePosition=new DOMMatrixReadOnly(getComputedStyle(reel).transform).m42;
        reel.getAnimations().forEach(animation=>animation.cancel());
        const position=digit*height;reel.style.transform=`translateY(${-position}px)`;
        if(previous&&!reduced.matches&&!document.hidden){
          const end=digit<Number(previous[index])?height*10:position;
          reel.animate([
            {transform:`translateY(${livePosition}px)`,easing:'cubic-bezier(.3,.03,.25,1)'},
            {transform:`translateY(${-end-.55}px)`,offset:.88,easing:'cubic-bezier(.3,0,.35,1)'},
            {transform:`translateY(${-end}px)`}
          ],{duration:760-index*48,easing:'linear'});
        }
      });
      previous=digits;clockTimer=setTimeout(updateClock,1000-Date.now()%1000+10);
    }
    updateClock();document.addEventListener('visibilitychange',()=>{previous='';updateClock();});
    new ResizeObserver(()=>{previous='';updateClock();}).observe(clock);
  }
  const scrollDown=$('#scroll-down');
  if(scrollDown){
    scrollDown.setAttribute('role','button');scrollDown.setAttribute('tabindex','0');scrollDown.setAttribute('aria-label','向下查看文章');
    scrollDown.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();scrollDown.click();}});
  }

  // A dialog gives us focus trapping and background inertness natively.
  function createDialog(className, label, html) {
    const dialog = document.createElement('dialog'); dialog.className = `sonh-dialog ${className}`;
    dialog.setAttribute('aria-label',label); dialog.innerHTML = html; document.body.append(dialog);
    decorateCardBorder(dialog);
    dialog.addEventListener('click',event=>{ if (event.target === dialog) {
      const r=dialog.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.sonhClose ? dialog.sonhClose() : dialog.close();
    }});
    dialog.addEventListener('close',()=>{ if (!$('dialog[open]')) document.body.classList.remove('sonh-modal-open'); });
    $$('.sonh-close',dialog).forEach(button=>button.addEventListener('click',()=>dialog.close()));
    return dialog;
  }
  function show(dialog) { if (!dialog.open) { dialog.showModal(); document.body.classList.add('sonh-modal-open'); } }

  const command = createDialog('sonh-command','搜索与快速导航',`
    <div class="sonh-command-field">${icon('search')}<input type="search" placeholder="搜索文章或前往页面…" aria-label="搜索文章或页面" role="combobox" aria-autocomplete="list" aria-controls="sonh-command-results" aria-expanded="true" autocomplete="off"><button class="sonh-close" aria-label="关闭搜索">Esc</button></div>
    <div class="sonh-command-list" id="sonh-command-results" role="listbox" aria-label="搜索结果"></div>
    <div class="sonh-command-footer">↑ ↓ 选择 &nbsp; Enter 打开 &nbsp; Esc 关闭</div>`);
  const input = $('input',command), results = $('.sonh-command-list',command);
  let commandEntries = [], selected = 0;
  function marked(text, query) {
    const start = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    return !query || start < 0 ? escape(text) : `${escape(text.slice(0,start))}<mark>${escape(text.slice(start,start+query.length))}</mark>${escape(text.slice(start+query.length))}`;
  }
  function renderCommands() {
    const query = input.value.trim(); selected = 0;
    const all = [...menus.map(item=>({...item,detail:'页面导航'})),...posts.map(post=>({...post,icon:'file',detail:`${post.date} · ${post.tags.join(' / ') || '学习记录'}`}))];
    commandEntries = all.filter(item=>(`${item.title} ${item.detail}`).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,30);
    results.replaceChildren();
    if (!commandEntries.length) {
      const empty = document.createElement('p'); empty.className='sonh-empty'; empty.textContent = indexError ? '文章索引暂时不可用，请使用页面导航。' : '没有找到相关内容，换个关键词试试。'; results.append(empty);
    }
    commandEntries.forEach((entry,index)=>{
      const button = document.createElement('button'); button.className='sonh-command-option'; button.type='button'; button.id=`sonh-option-${index}`;
      button.setAttribute('role','option'); button.setAttribute('aria-selected',String(index===0)); button.tabIndex=-1;
      button.innerHTML=`${icon(entry.icon)}<span>${marked(entry.title,query)}<small>${marked(entry.detail,query)}</small></span>`;
      button.addEventListener('click',()=>location.assign(entry.url));
      button.addEventListener('pointermove',()=>selectCommand(index)); results.append(button);
    });
    selectCommand(0);
  }
  function selectCommand(index) {
    selected = index;
    const options = $$('.sonh-command-option',results);
    options.forEach((option,i)=>option.setAttribute('aria-selected',String(i===index)));
    if (options[index]) input.setAttribute('aria-activedescendant',options[index].id); else input.removeAttribute('aria-activedescendant');
  }
  function openCommand() { show(command); input.value=''; renderCommands(); input.focus(); dataReady.then(()=>{ if(command.open) renderCommands(); }); }
  input.addEventListener('input',renderCommands);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape') {event.preventDefault();event.stopPropagation();command.close();return;}
    if (event.key==='ArrowDown'||event.key==='ArrowUp') {
      event.preventDefault(); if(!commandEntries.length)return;
      selectCommand((selected+(event.key==='ArrowDown'?1:-1)+commandEntries.length)%commandEntries.length);
      $$('.sonh-command-option',results)[selected]?.scrollIntoView({block:'nearest'});
    }
    if(event.key==='Enter'&&commandEntries[selected]) { event.preventDefault(); location.assign(commandEntries[selected].url); }
  });
  document.addEventListener('keydown',event=>{ if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k') {event.preventDefault(); command.open ? command.close() : openCommand();} });

  const dock = document.createElement('nav'); dock.className='sonh-dock'; dock.setAttribute('aria-label','快捷停靠栏');
  menus.forEach(item=>{
    const link = document.createElement('a'); link.href=item.url; link.className='sonh-dock-item'; link.setAttribute('aria-label',item.title);
    if(item===activeMenu)link.setAttribute('aria-current','page'); link.innerHTML=`${icon(item.icon)}<span>${item.title}</span>`; dock.append(link);
  });
  const toc=$('#card-toc');
  if(toc&&$('.toc-link',toc)){
    const mobileToc=matchMedia('(max-width: 900px)');
    const tocButton=document.createElement('button');tocButton.type='button';tocButton.className='sonh-dock-item sonh-toc-toggle';
    tocButton.setAttribute('aria-label','文章目录');tocButton.setAttribute('aria-controls','card-toc');tocButton.setAttribute('aria-expanded','false');
    tocButton.innerHTML=`${icon('toc')}<span>目录</span>`;dock.append(tocButton);dock.classList.add('has-toc');
    toc.setAttribute('role','region');toc.setAttribute('aria-label','文章目录');
    function setTocOpen(open,restoreFocus=false){
      open=Boolean(open&&mobileToc.matches);
      toc.classList.remove('open');toc.classList.toggle('sonh-toc-open',open);
      tocButton.setAttribute('aria-expanded',String(open));
      if(mobileToc.matches){toc.setAttribute('aria-hidden',String(!open));toc.inert=!open;}
      else{toc.removeAttribute('aria-hidden');toc.inert=false;}
      if(restoreFocus)tocButton.focus({preventScroll:true});
    }
    setTocOpen(false);
    tocButton.addEventListener('click',()=>setTocOpen(tocButton.getAttribute('aria-expanded')!=='true'));
    toc.addEventListener('click',event=>{if(event.target.closest('.toc-link'))setTocOpen(false);});
    function dismissOutside(event){
      if(mobileToc.matches&&!toc.contains(event.target)&&!tocButton.contains(event.target))setTocOpen(false);
    }
    document.addEventListener('pointerdown',dismissOutside,{passive:true});
    document.addEventListener('click',dismissOutside);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&tocButton.getAttribute('aria-expanded')==='true'){event.preventDefault();setTocOpen(false,true);}
      else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k')setTocOpen(false);
    });
    mobileToc.addEventListener('change',()=>setTocOpen(false));
  }
  const dockSearch = document.createElement('button'); dockSearch.type='button'; dockSearch.className='sonh-dock-item'; dockSearch.setAttribute('aria-label','打开搜索命令面板'); dockSearch.innerHTML=`${icon('search')}<span>搜索</span>`; dockSearch.addEventListener('click',openCommand); dock.append(dockSearch); document.body.append(dock);
  decorateCardBorder(dock);
  const dockItems=$$('.sonh-dock-item',dock);
  function magnify(index) { if(!finePointer.matches||reduced.matches)return; const visible=dockItems.filter(item=>getComputedStyle(item).display!=='none'); const active=visible.indexOf(dockItems[index]); visible.forEach((item,i)=>{ const distance=Math.abs(i-active); item.style.setProperty('--dock-scale',distance===0?'1.28':distance===1?'1.12':'1'); item.style.setProperty('--dock-lift',distance===0?'-9px':distance===1?'-3px':'0px'); }); }
  dockItems.forEach((item,i)=>{item.addEventListener('pointerenter',()=>magnify(i));item.addEventListener('focus',()=>magnify(i));});
  function resetDock(){dockItems.forEach(item=>{item.style.removeProperty('--dock-scale');item.style.removeProperty('--dock-lift');});}
  dock.addEventListener('pointerleave',resetDock);dock.addEventListener('focusout',event=>{if(!dock.contains(event.relatedTarget))resetDock();});

  // Touch has no hover: move the glass highlight on activation before navigating.
  const capsule=document.createElement('div');capsule.className='sonh-dock-capsule';capsule.style.position='absolute';capsule.setAttribute('aria-hidden','true');dock.prepend(capsule);
  let capsuleTarget=$('[aria-current="page"]',dock),capsuleMotion=null,dockNavigation=0;
  function placeCapsule(target,animate=false){
    if(!target){capsuleMotion?.cancel();capsule.hidden=true;dock.classList.remove('sonh-dock-ready');dockItems.forEach(item=>item.classList.remove('is-dock-target'));return;}
    const dockRect=dock.getBoundingClientRect(),oldRect=capsule.getBoundingClientRect();
    const wasVisible=!capsule.hidden&&dock.classList.contains('sonh-dock-ready');
    // Layout coordinates ignore the existing desktop hover magnification.
    const x=target.offsetLeft,width=target.offsetWidth;
    const from=wasVisible?oldRect.left-dockRect.left-dock.clientLeft+(oldRect.width-width)/2:x;
    const scale=wasVisible?oldRect.width/width:1;
    capsuleMotion?.cancel();capsuleMotion=null;
    capsule.hidden=false;capsule.style.width=`${width}px`;capsule.style.height=`${target.offsetHeight}px`;
    capsule.style.top=`${target.offsetTop}px`;capsule.style.transform=`translateX(${x}px)`;
    dock.classList.add('sonh-dock-ready');
    dockItems.forEach(item=>item.classList.toggle('is-dock-target',item===target));
    capsuleTarget=target;
    if(!animate||reduced.matches||!capsule.animate||(Math.abs(x-from)<1&&Math.abs(scale-1)<.005))return;
    const direction=Math.sign(x-from)||1,stretch=Math.max(scale,1+Math.min(.55,Math.abs(x-from)/240));
    capsuleMotion=capsule.animate([
      {transform:`translateX(${from}px) scaleX(${scale}) scaleY(1)`,offset:0},
      {transform:`translateX(${from+(x-from)*.48}px) scaleX(${stretch}) scaleY(.88)`,offset:.38},
      {transform:`translateX(${x+direction*3}px) scaleX(.94) scaleY(1.04)`,offset:.76},
      {transform:`translateX(${x-direction}px) scaleX(1.025) scaleY(.985)`,offset:.9},
      {transform:`translateX(${x}px) scaleX(1) scaleY(1)`,offset:1}
    ],{duration:460,easing:'cubic-bezier(.22,.65,.3,1)'});
  }
  placeCapsule(capsuleTarget);
  let suppressDockClickUntil=0;
  function activateDockLink(link){
    clearTimeout(dockNavigation);
    const samePage=new URL(link.href).pathname===location.pathname;
    placeCapsule(link,true);
    if(!samePage){
      if(reduced.matches||!capsule.animate)location.assign(link.href);
      else dockNavigation=setTimeout(()=>location.assign(link.href),480);
    }
  }
  const dockLinks=$$('a.sonh-dock-item',dock);
  dockLinks.forEach(link=>link.addEventListener('click',event=>{
    if(performance.now()<suppressDockClickUntil){event.preventDefault();return;}
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.hasAttribute('download')||link.target==='_blank')return;
    if(reduced.matches||!capsule.animate)return;
    event.preventDefault();activateDockLink(link);
  }));
  let dockGesture=null;
  function nearestDockLink(clientX){
    return dockLinks.reduce((nearest,link)=>{
      const rect=link.getBoundingClientRect(),best=nearest.getBoundingClientRect();
      return Math.abs(clientX-rect.left-rect.width/2)<Math.abs(clientX-best.left-best.width/2)?link:nearest;
    },dockLinks[0]);
  }
  dock.addEventListener('pointerdown',event=>{
    const link=event.target.closest('a.sonh-dock-item');
    if(!link)return;
    suppressDockClickUntil=0;
    if(event.pointerType==='mouse'||!event.isPrimary||event.button!==0)return;
    clearTimeout(dockNavigation);
    const gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,active:false,cancelled:false,origin:capsuleTarget};
    dockGesture=gesture;link.setPointerCapture(event.pointerId);
    gesture.timer=setTimeout(()=>{
      if(dockGesture!==gesture||gesture.cancelled)return;
      gesture.active=true;dock.classList.add('is-dragging');placeCapsule(link,true);
    },240);
  });
  dock.addEventListener('pointermove',event=>{
    const gesture=dockGesture;if(!gesture||gesture.id!==event.pointerId)return;
    if(!gesture.active){
      if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>10){clearTimeout(gesture.timer);gesture.cancelled=true;}
      return;
    }
    event.preventDefault();capsuleMotion?.cancel();capsuleMotion=null;
    const rect=dock.getBoundingClientRect(),width=capsule.offsetWidth;
    const x=Math.max(dockLinks[0].offsetLeft,Math.min(dockLinks.at(-1).offsetLeft,event.clientX-rect.left-dock.clientLeft-width/2));
    const stretch=reduced.matches?1:1+Math.min(.42,Math.abs(event.clientX-gesture.lastX)/90);
    capsule.style.transform=`translateX(${x}px) scaleX(${stretch}) scaleY(${1-(stretch-1)*.25})`;
    gesture.lastX=event.clientX;
    const nearest=nearestDockLink(event.clientX);
    dockItems.forEach(item=>item.classList.toggle('is-dock-target',item===nearest));
  },{passive:false});
  function finishDockGesture(event,cancelled=false){
    const gesture=dockGesture;if(!gesture||gesture.id!==event.pointerId)return;
    clearTimeout(gesture.timer);dockGesture=null;dock.classList.remove('is-dragging');
    if(gesture.active||gesture.cancelled){
      suppressDockClickUntil=performance.now()+650;
      if(gesture.active&&!cancelled)activateDockLink(nearestDockLink(event.clientX));
      else placeCapsule(gesture.origin,true);
    }
  }
  dock.addEventListener('pointerup',event=>finishDockGesture(event));
  dock.addEventListener('pointercancel',event=>finishDockGesture(event,true));
  dock.addEventListener('lostpointercapture',event=>finishDockGesture(event,true));
  dock.addEventListener('contextmenu',event=>{if(event.target.closest('a.sonh-dock-item')&&!finePointer.matches)event.preventDefault();});
  // Some touch browsers omit a compatibility click after a cancelled drag.
  // Activate utilities on a completed tap and discard only its duplicate click.
  let utilityTouchClick=null;
  document.addEventListener('pointerdown',()=>{utilityTouchClick=null;},true);
  document.addEventListener('click',event=>{
    const tap=utilityTouchClick;
    if(tap&&event.isTrusted&&event.detail>0&&performance.now()-tap.time<650&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<12){
      utilityTouchClick=null;event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  $$('button.sonh-dock-item',dock).forEach(button=>{
    let touchPress=null;
    button.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'&&event.isPrimary)touchPress={id:event.pointerId,x:event.clientX,y:event.clientY};
    });
    button.addEventListener('pointercancel',()=>{touchPress=null;});
    button.addEventListener('pointerup',event=>{
      const press=touchPress;touchPress=null;
      if(!press||press.id!==event.pointerId||Math.hypot(event.clientX-press.x,event.clientY-press.y)>10)return;
      event.preventDefault();utilityTouchClick={x:event.clientX,y:event.clientY,time:performance.now()};button.click();
    });
  });
  new ResizeObserver(()=>placeCapsule(capsuleTarget)).observe(dock);
  reduced.addEventListener('change',()=>placeCapsule(capsuleTarget));

  const reader=createDialog('sonh-reader','文章详情',`<header class="sonh-reader-top"><span>阅读视图</span><button class="sonh-close" aria-label="关闭阅读视图">关闭 ×</button></header><div class="sonh-reader-scroll" aria-live="polite"></div><nav class="sonh-reader-strip" aria-label="切换阅读文章"></nav>`);
  const readerScroll=$('.sonh-reader-scroll',reader), strip=$('.sonh-reader-strip',reader);
  const articleCache=new Map(); let readerOrigin=null, articleRequest=0, exitAnimation=false;
  const imageDialog=createDialog('sonh-image','查看文章大图','<button class="sonh-close" aria-label="关闭大图">关闭 ×</button><img alt="">');
  let originalFocus=null;
  function originMotion(origin, reverse=false) {
    if(reduced.matches || !origin || !origin.isConnected)return Promise.resolve();
    const from=origin.getBoundingClientRect(), to=reader.getBoundingClientRect();
    const originTransform=`translate(${from.left+from.width/2-to.left-to.width/2}px,${from.top+from.height/2-to.top-to.height/2}px) scale(${Math.max(.12,from.width/to.width)},${Math.max(.12,from.height/to.height)})`;
    return reader.animate(reverse?[{transform:'none',opacity:1},{transform:originTransform,opacity:.1}]:[{transform:originTransform,opacity:.25},{transform:'none',opacity:1}],{duration:reduced.matches?0:440,easing:'cubic-bezier(.2,.75,.25,1)'}).finished.catch(()=>{});
  }
  function closeReader(){if(exitAnimation)return;exitAnimation=true;articleRequest++;originMotion(readerOrigin,true).finally(()=>{reader.close();exitAnimation=false;originalFocus?.focus({preventScroll:true});});}
  reader.sonhClose=closeReader;
  $('.sonh-close',reader).replaceWith($('.sonh-close',reader).cloneNode(true));
  $('.sonh-close',reader).addEventListener('click',closeReader);
  reader.addEventListener('cancel',event=>{event.preventDefault();closeReader();});
  reader.addEventListener('close',()=>{articleRequest++;});
  async function openArticle(post, origin) {
    if (!reader.open) { originalFocus=document.activeElement; readerOrigin=origin; show(reader); originMotion(origin); }
    const request=++articleRequest;
    readerScroll.innerHTML='<div class="sonh-reader-status" role="status">正在打开文章…</div>';
    readerScroll.scrollTop=0;
    if(borderObserver)$$('.sonh-bordered-card',strip).forEach(card=>borderObserver.unobserve(card));
    strip.replaceChildren();
    const available=posts.length?posts:[post];
    available.forEach(item=>{
      const button=document.createElement('button');button.type='button';button.className='sonh-reader-thumb';button.setAttribute('aria-pressed',String(item.url===post.url));
      if(item.cover){const img=document.createElement('img');img.src=item.cover;img.alt='';img.loading='lazy';button.append(img);}
      const label=document.createElement('span');label.textContent=item.title;button.append(label);button.addEventListener('click',()=>openArticle(item));strip.append(button);decorateCardBorder(button);
    });
    $('[aria-pressed="true"]',strip)?.scrollIntoView({block:'nearest',inline:'center'});
    try {
      if(!articleCache.has(post.url)) {
        const response=await fetch(post.url);if(!response.ok)throw new Error('Article unavailable');articleCache.set(post.url,await response.text());
      }
      if(request!==articleRequest||!reader.open)return;
      const doc=new DOMParser().parseFromString(articleCache.get(post.url),'text/html');
      const article=$('#article-container',doc);if(!article)throw new Error('Article body unavailable');
      $$('script, style',article).forEach(node=>node.remove());
      $$('*',article).forEach(node=>Array.from(node.attributes).filter(attribute=>attribute.name.startsWith('on')).forEach(attribute=>node.removeAttribute(attribute.name)));
      $$('img',article).forEach(img=>{ if(img.dataset.lazySrc)img.src=img.dataset.lazySrc; if(img.dataset.src)img.src=img.dataset.src; if(img.getAttribute('src'))img.src=new URL(img.getAttribute('src'),new URL(post.url,location.origin)).href;img.loading='lazy';});
      $$('a[href]',article).forEach(link=>{
        const href=link.getAttribute('href');if(href.startsWith('#')) {link.addEventListener('click',event=>{event.preventDefault();try{$(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`,article)?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}catch{}});}else link.href=new URL(href,new URL(post.url,location.origin)).href;
      });
      readerScroll.replaceChildren();const title=document.createElement('h1');title.textContent=post.title;
      const meta=document.createElement('div');meta.className='sonh-reader-meta';meta.innerHTML=`${escape(post.date||'')} &nbsp; ${escape(post.tags?.join(' / ')||'')} &nbsp; <a href="${escape(post.url)}">打开完整文章</a>`;
      readerScroll.append(title,meta,article);
      $$('figure.highlight, pre',article).filter(block=>!block.matches('figure.highlight pre')).forEach(block=>{
        const copy=document.createElement('button');copy.type='button';copy.className='sonh-code-copy';copy.textContent='复制代码';
        copy.addEventListener('click',async()=>{
          try{await navigator.clipboard.writeText(($('.code',block)||$('code',block)||block).innerText);copy.textContent='已复制';}
          catch{copy.textContent='复制失败，请手动选择';}
          setTimeout(()=>{copy.textContent='复制代码';},1800);
        });block.before(copy);
      });
      $$('img',article).forEach(img=>img.addEventListener('click',event=>{event.preventDefault();const big=$('img',imageDialog);big.src=img.currentSrc||img.src;big.alt=img.alt||post.title;show(imageDialog);}));
    } catch {
      if(request!==articleRequest||!reader.open)return;
      readerScroll.innerHTML=`<div class="sonh-reader-status">暂时无法载入文章。<br><a href="${escape(post.url)}">点击直接打开完整文章</a></div>`;
    }
  }
  function enhanceArticle(card, knownPost) {
    trackSpotlight(card);if($('.sonh-open-article',card))return;
    const link=$('a.article-title',card);if(!link)return;
    const post=knownPost||posts.find(item=>new URL(item.url,location.origin).pathname===new URL(link.href).pathname)||{title:link.textContent.trim(),url:link.getAttribute('href'),date:$('time',card)?.getAttribute('datetime')?.slice(0,10)||'',tags:[]};
    const button=document.createElement('button');button.className='sonh-open-article';button.type='button';button.innerHTML='展开阅读 <span aria-hidden="true">↗</span>';button.setAttribute('aria-label',`展开阅读：${post.title}`);button.addEventListener('click',()=>openArticle(post,card));card.append(button);
    card.addEventListener('click',event=>{if(!event.target.closest('a,button,input,summary')&&!getSelection()?.toString())openArticle(post,card);});
  }
  $$('.recent-post-item').forEach(card=>enhanceArticle(card));

  async function setupLibrary(){
    const recent=$('#recent-posts');if(!recent||/^\/page\//.test(location.pathname))return;
    await dataReady;if(indexError)return;
    const list=$('.recent-post-items',recent);if(!list)return;
    const months=[...new Set(posts.map(post=>post.month))]; let chosen='',limit=10,currentPosts=posts;
    const libraryCard=document.createElement('section');libraryCard.className='card-widget sonh-library-card';libraryCard.setAttribute('aria-label','学习手记与文章统计');
    decorateCardBorder(libraryCard);
    const aside=$('#aside-content');const author=$('.card-info',aside||document);
    if(aside){if(author)author.after(libraryCard);else aside.prepend(libraryCard);}else recent.after(libraryCard);
    const heading=document.createElement('div');heading.className='sonh-library-head';heading.setAttribute('aria-label','文章与时间筛选');
    heading.innerHTML=`<div><h2>学习手记</h2><p>记录每一次探索，也记录成长。</p></div><div class="sonh-date-filter"><button class="sonh-button sonh-date-toggle" aria-expanded="false" aria-controls="sonh-date-options">${icon('calendar')}<span>全部时间</span>${icon('chevron')}</button><div class="sonh-date-options" id="sonh-date-options" aria-label="按月份筛选"></div></div>`;
    libraryCard.append(heading);const filter=$('.sonh-date-filter',heading),toggle=$('.sonh-date-toggle',filter),options=$('.sonh-date-options',filter);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.position='absolute';
    svg.innerHTML='<defs><filter id="sonh-liquid-fusion" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></defs>';
    document.body.append(svg);
    const goo=document.createElement('div');goo.className='sonh-goo';goo.setAttribute('aria-hidden','true');options.prepend(goo);
    const stats=document.createElement('div');stats.className='sonh-filter-stats';stats.innerHTML='<div><span class="sonh-count">0</span><span class="sonh-count-label">篇学习记录</span></div><div class="sonh-chart" role="img" aria-label="最近六个月文章数量"></div>';heading.after(stats);
    const chart=$('.sonh-chart',stats),chartMonths=months.slice(0,6).reverse();
    const maxCount=Math.max(1,...chartMonths.map(month=>posts.filter(post=>post.month===month).length));
    chartMonths.forEach(month=>{const bar=document.createElement('span');const count=posts.filter(post=>post.month===month).length;bar.title=`${month}：${count} 篇`;bar.dataset.month=month;bar.dataset.height=String(6+count/maxCount*34);chart.append(bar);});
    const more=document.createElement('div');more.className='sonh-more';const moreButton=document.createElement('button');moreButton.type='button';moreButton.className='sonh-button';moreButton.textContent='更多学习记录';more.append(moreButton);list.after(more);
    $('#pagination',recent)?.setAttribute('hidden','');
    let countFrame=0;
    function updateStats(){
      const counter=$('.sonh-count',stats),start=Number(counter.textContent)||0,end=currentPosts.length,time=performance.now();cancelAnimationFrame(countFrame);
      function step(now){const progress=reduced.matches?1:Math.min(1,(now-time)/500);counter.textContent=String(Math.round(start+(end-start)*(1-(1-progress)**3)));if(progress<1)countFrame=requestAnimationFrame(step);}
      countFrame=requestAnimationFrame(step);
      $$('.sonh-chart span',chart).forEach(bar=>{const selected=!chosen||bar.dataset.month===chosen;bar.style.setProperty('--bar-height',`${selected?bar.dataset.height:3}px`);bar.style.opacity=selected?'1':'.3';});
      chart.setAttribute('aria-label',chartMonths.map(month=>`${month}：${(!chosen||chosen===month)?posts.filter(post=>post.month===month).length:0}篇`).join('，'));
    }
    function renderPosts(){
      if(borderObserver)$$('.sonh-bordered-card',list).forEach(card=>borderObserver.unobserve(card));
      const oldHeight=list.getBoundingClientRect().height;list.style.minHeight=`${Math.min(oldHeight,400)}px`;list.replaceChildren();
      currentPosts.slice(0,limit).forEach(post=>{
        const card=document.createElement('article');card.className='recent-post-item';
        card.innerHTML=`${post.cover?`<div class="post_cover"><a href="${escape(post.url)}" tabindex="-1" aria-hidden="true"><img class="post-bg" src="${escape(post.cover)}" alt="" loading="lazy"></a></div>`:''}<div class="recent-post-info"><a class="article-title" href="${escape(post.url)}">${escape(post.title)}</a><div class="article-meta-wrap"><time datetime="${escape(post.date)}">${escape(post.date)}</time>${post.tags.length?' &nbsp; / &nbsp; '+escape(post.tags.join(' · ')):''}</div><div class="content">${escape(post.excerpt)}</div></div>`;
        list.append(card);enhanceArticle(card,post);
      });
      if(!currentPosts.length)list.innerHTML='<p class="sonh-empty">这个月份还没有文章。</p>';
      more.hidden=currentPosts.length<=limit;
      if(!reduced.matches)list.animate([{opacity:.35},{opacity:1}],{duration:350});
      requestAnimationFrame(()=>{list.style.minHeight='';});updateStats();
    }
    function closeFilter(){filter.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');$$('button',options).forEach(button=>button.tabIndex=-1);}
    [{month:'',label:'全部时间'},...months.map(month=>({month,label:month.replace('-',' 年 ')+' 月'}))].forEach(({month,label},i)=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;button.tabIndex=-1;button.style.setProperty('--drop-i',String(Math.min(i,7)));button.style.setProperty('--drop-x',i%2?'0px':'70px');button.setAttribute('aria-pressed',String(!month));
      button.addEventListener('click',()=>{chosen=month;limit=10;currentPosts=chosen?posts.filter(post=>post.month===chosen):posts;$$('button',options).forEach(item=>item.setAttribute('aria-pressed',String(item===button)));$('span',toggle).textContent=label;closeFilter();toggle.focus({preventScroll:true});renderPosts();});options.append(button);
      const drop=document.createElement('span');drop.style.setProperty('--drop-i',String(Math.min(i,7)));goo.append(drop);
    });
    function positionDrops(){
      $$('button',options).forEach((button,i)=>{const drop=goo.children[i];drop.style.left=`${button.offsetLeft}px`;drop.style.top=`${button.offsetTop}px`;drop.style.width=`${button.offsetWidth}px`;drop.style.height=`${button.offsetHeight}px`;drop.style.setProperty('--goo-x',`${options.offsetWidth-button.offsetLeft-button.offsetWidth}px`);drop.style.setProperty('--goo-y',`${-button.offsetTop-30}px`);});
    }
    toggle.addEventListener('click',()=>{positionDrops();const open=filter.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));$$('button',options).forEach(button=>button.tabIndex=open?0:-1);});
    filter.addEventListener('keydown',event=>{if(event.key==='Escape'){closeFilter();toggle.focus();}});
    document.addEventListener('pointerdown',event=>{if(!filter.contains(event.target))closeFilter();});
    moreButton.addEventListener('click',()=>{const firstNew=limit;limit+=10;renderPosts();const next=$$('.sonh-open-article',list)[firstNew];next?.focus({preventScroll:true});});
    renderPosts();
  }
  setupLibrary();
})();
