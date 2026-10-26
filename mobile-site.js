/* Hosted phone entry; data and inference stay in the visitor's browser. */
(() => {
 'use strict';
 const boot=()=>{
  document.querySelector('#gs-diagnose')?.click();
  const work=document.querySelector('#view-work');
  if(work){
   const info=document.createElement('section');info.className='ft-card';info.id='mobile-entry-info';
   info.innerHTML='<h3>手机诊断与复查</h3><p>首次图像分析会下载所需模型，建议使用 Wi-Fi。照片和病例保存在当前设备的浏览器中，请定期导出备份。</p><p id="mobile-download-state" role="status" aria-live="polite"></p>';
   work.prepend(info);
  }
  const experimental=document.querySelector('#ft-ai-experimental');if(experimental){experimental.checked=false;experimental.dispatchEvent(new Event('change',{bubbles:true}));}
  const status=document.querySelector('#rag-status');if(status)status.textContent='当前手机网页可检索原文和相似照片。本机 Qwen 文字解释请使用 Windows 版；这里的资料检索和诊断不受影响。';
  const check=document.querySelector('#rag-check');if(check)check.hidden=true;
  const generate=document.querySelector('#rag-generate');if(generate){generate.disabled=true;generate.textContent='文字模型：电脑版可用';}
  const style=document.createElement('style');style.textContent='#mobile-entry-info{margin:0 0 20px}#mobile-entry-info h3{margin:0 0 8px}#mobile-entry-info p{line-height:1.7;margin:6px 0;font-size:14px}#mobile-download-state:empty{display:none}#mobile-download-state{color:#296c47}html{-webkit-text-size-adjust:100%}button,[role=button],.tab,.chip{-webkit-user-select:none;user-select:none}';document.head.append(style);
 };
 document.addEventListener('field-mobile-asset-progress',event=>{
  const state=document.querySelector('#mobile-download-state'),data=event.detail;if(!state||!data)return;
  state.textContent=data.error?'模型下载未完成，请保持联网后重试；也可选择轻量演示配置。':data.done?'本项图像资源已就绪，正在继续分析。':'正在下载本次所需图像资源：'+Math.round(data.loaded/data.total*100)+'%。请保持页面打开。';
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
