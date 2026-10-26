/* Hosted phone entry; data and inference stay in the visitor's browser. */
(() => {
 'use strict';
 const boot=()=>{
  document.querySelector('#gs-diagnose')?.click();
  const work=document.querySelector('#view-work');
  if(work){
   const info=document.createElement('section');info.id='mobile-entry-info';
   info.innerHTML='<details><summary>使用须知 · 首次分析建议 Wi-Fi</summary><p>首次图像分析会下载所需模型，弱网下可能需要较长时间，请保持页面打开。照片和病例保存在当前设备的浏览器中，请定期导出备份；清除网站数据或换浏览器后不会自动恢复。</p></details><p id="mobile-download-state" role="status" aria-live="polite" aria-atomic="true"></p>';
   work.prepend(info);
  }
  const experimental=document.querySelector('#ft-ai-experimental');if(experimental){experimental.checked=false;experimental.dispatchEvent(new Event('change',{bubbles:true}));}
  const status=document.querySelector('#rag-status');if(status)status.textContent='当前手机网页可检索原文和相似照片。本机 Qwen 文字解释请使用 Windows 版；这里的资料检索和诊断不受影响。';
  const check=document.querySelector('#rag-check');if(check)check.hidden=true;
  const generate=document.querySelector('#rag-generate');if(generate){generate.disabled=true;generate.textContent='文字模型：电脑版可用';}
  // The existing page finishes its enhancements in DOMContentLoaded timers.
  requestAnimationFrame(()=>enhanceUI());
 };
 const icon=name=>{
  const paths={camera:'<path d="M14.5 4h-5L8 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4.5Z"/><circle cx="12" cy="13" r="4"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',work:'<path d="M12 21v-9M12 16C4 16 3 10 3 5c6 0 9 3 9 7M12 12c0-5 3-8 9-8 0 5-1 9-9 9"/>',kb:'<path d="M12 5v16M12 6C9 4 5 4 2 5v14c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1Z"/>',atlas:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',history:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',settings:'<circle cx="12" cy="12" r="4"/><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/>'};
  return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.work)+'</svg>';
 };
 function enhanceUI(attempt=0){
  const $=selector=>document.querySelector(selector),work=$('#view-work'),tabs=$('#tabs');
  if(!work||!tabs||document.body.classList.contains('fm-shell'))return;
  if(!$('#fd-chrome')||!work.querySelector('.fd-heading')||!$('#fm-dialog')){
   if(attempt<40)setTimeout(()=>enhanceUI(attempt+1),50);
   return;
  }
  document.body.classList.add('fm-shell');
  const heading=work.querySelector('.fd-heading'),title=heading?.querySelector('h1');
  if(title)title.textContent='拍下作物，查看线索';
  const intro=heading?.querySelector('p');if(intro)intro.textContent='结合照片与田间信息，辅助判断病虫害。';
  const steps=document.createElement('ol');steps.className='fm-steps';steps.setAttribute('aria-label','诊断步骤');
  steps.innerHTML='<li><span>1</span>拍照片</li><li><span>2</span>补信息</li><li><span>3</span>看建议</li>';
  if(heading)heading.after(steps);
  const install=document.querySelector('.fm-banner');
  if(install)$('#view-settings .fd-heading')?.after(install);
  const drop=$('#drop'),upload=drop?.closest('.card'),fields=$('#crop')?.closest('.card');
  if(upload)upload.classList.add('fm-upload-card');if(fields)fields.classList.add('fm-field-card');
  const uploadHeading=upload?.querySelector('.card-h');if(uploadHeading)uploadHeading.innerHTML='拍摄作物照片<span class="hint">1—3 张 · 整株、病部近景、叶背或虫体</span>';
  const dropTitle=drop?.querySelector('.drop-inner p');if(dropTitle)dropTitle.textContent='先拍一张，留住田间线索';
  const dropHint=drop?.querySelector('.drop-inner > span');if(dropHint)dropHint.textContent='尽量对焦清楚，让受害部位占满画面';
  const dropIcon=drop?.querySelector('.drop-icon');if(dropIcon)dropIcon.innerHTML=icon('camera');
  for(const [selector,name,label]of [['#takePhoto','camera','现在拍照'],['#choosePhotos','photo','从相册选择']]){
   const button=$(selector);if(button)button.innerHTML=icon(name)+'<span>'+label+'</span>';
  }
  const photo=$('#takePhoto');if(photo){photo.classList.remove('ghost');photo.classList.add('primary');}
  const mobileHint=drop?.querySelector('.mobile-hint');if(mobileHint)mobileHint.textContent='照片保存在当前浏览器，请定期备份病例。';
  // Move existing nodes: event bindings, field state and the diagnosis adapter stay intact.
  const notice=work.querySelector(':scope > .notice');
  if(notice&&upload){
   const safety=document.createElement('details');safety.id='mobile-safety';safety.className='fm-disclosure fm-safety';
   const summary=document.createElement('summary');summary.textContent='辅助诊断，请结合田间复核';safety.append(summary,notice);upload.after(safety);
  }
  const info=$('#mobile-entry-info');if(info&&upload)upload.append(info);
  const ai=$('#ft-ai-controls'),similar=$('#ir-panel');
  if(ai&&upload){
   const options=document.createElement('details');options.id='mobile-analysis-options';options.className='fm-disclosure fm-analysis';
   const summary=document.createElement('summary');summary.innerHTML='<span>分析方式与参考照片</span><span id="mobile-analysis-mode"></span>';
   options.append(summary,ai);if(similar)options.append(similar);
   const safety=$('#mobile-safety');(safety||upload).after(options);
   const syncMode=()=>{const mode=$('#ft-ai-mode')?.value;$('#mobile-analysis-mode').textContent=mode==='rules'?'本地规则':mode==='observe'?'分类 + 观察':'图像 AI';};
   document.addEventListener('change',event=>{if(event.target.id==='ft-ai-mode')syncMode();});syncMode();
  }
  const labels={work:'诊断',kb:'知识库',atlas:'图谱',history:'病例',settings:'设置'};
  tabs.querySelectorAll('[data-tab]').forEach(button=>{
   const key=button.dataset.tab;if(!labels[key])return;
   button.setAttribute('aria-label',button.textContent.trim());button.innerHTML=icon(key)+'<span>'+labels[key]+'</span>';
  });
  const tabHome=document.createComment('Phone tabs return here on wider screens');tabs.before(tabHome);
  const viewport=matchMedia('(max-width: 900px)');
  const placeTabs=()=>{if(viewport.matches)document.body.append(tabs);else tabHome.after(tabs);};
  placeTabs();viewport.addEventListener('change',placeTabs);
  const moduleLabels={'gs-diagnose':'病虫诊断','gs-growth':'生长模拟','wx-workspace':'农业气象','mk-workspace':'市场收益'};
  for(const [id,label]of Object.entries(moduleLabels)){const button=$('#'+id);if(button){button.setAttribute('aria-label',button.textContent.trim());button.textContent=label;}}
  const badge=document.createElement('span');badge.className='fm-phone-badge';badge.textContent='田间助手';$('.gs-modulebar > .brand')?.append(badge);
  const empty=$('#resultEmpty');if(empty){const text=empty.querySelector('p');if(text)text.textContent='等待你的田间线索';}
  const syncSteps=()=>{
   const hasPhoto=!!$('#thumbs img'),hasCrop=!!$('#crop')?.value,result=$('#resultBody');
   const current=result&&!result.hidden?2:hasPhoto?1:0;
   steps.querySelectorAll('li').forEach((step,index)=>{
    step.classList.toggle('is-current',index===current);step.classList.toggle('is-complete',index<current&&(index===0?hasPhoto:hasCrop));
    if(index===current)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');
   });
  };
  const progressObserver=new MutationObserver(syncSteps);
  if($('#thumbs'))progressObserver.observe($('#thumbs'),{childList:true});
  if($('#resultBody'))progressObserver.observe($('#resultBody'),{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('change',event=>{if(event.target.id==='crop')syncSteps();});syncSteps();
  const bar=$('#run')?.closest('.run-bar');
  // Reuse the real actions, including their disabled/cancel/result states.
  if(bar){bar.setAttribute('aria-label','诊断操作');bar.setAttribute('role','group');}
  const syncWorkspace=()=>{
   document.body.classList.toggle('fm-diagnosis',$('#gs-diagnose')?.getAttribute('aria-pressed')==='true');
   const isWork=work.classList.contains('active');document.body.classList.toggle('fm-work-active',isWork);
  };
  const observer=new MutationObserver(syncWorkspace);
  document.querySelectorAll('main > .view').forEach(view=>observer.observe(view,{attributes:true,attributeFilter:['class']}));
  syncWorkspace();
  // Only withdraw floating controls when an actual keyboard reduces usable height.
  // Hardware keyboards and ordinary focus must leave navigation reachable.
  const editable=()=>document.activeElement?.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])');
  let fullHeight=window.visualViewport?.height||innerHeight,lastWidth=innerWidth;
  const syncKeyboard=()=>{
   const height=window.visualViewport?.height||innerHeight;
   if(!editable()||Math.abs(innerWidth-lastWidth)>80){fullHeight=height;lastWidth=innerWidth;}
   const keyboard=editable()&&fullHeight-height>140&&(window.visualViewport?.scale||1)===1;
   document.body.classList.toggle('fm-editing',viewport.matches&&keyboard);
  };
  document.addEventListener('focusin',syncKeyboard);document.addEventListener('focusout',()=>queueMicrotask(syncKeyboard));viewport.addEventListener('change',syncKeyboard);
  window.visualViewport?.addEventListener('resize',syncKeyboard);window.addEventListener('resize',syncKeyboard);
  document.documentElement.dataset.mobileUi='20261026';
 }
 document.addEventListener('field-mobile-asset-progress',event=>{
  const state=document.querySelector('#mobile-download-state'),data=event.detail;if(!state||!data)return;
  state.textContent=data.error?'模型下载未完成，请保持联网后重试；也可在分析方式中选择轻量演示配置。':data.done?'本项图像资源已就绪，正在继续分析。':'正在下载本次所需图像资源：'+(data.total>0?Math.min(100,Math.round(data.loaded/data.total*100))+'%':'准备中')+'。请保持页面打开。';
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
