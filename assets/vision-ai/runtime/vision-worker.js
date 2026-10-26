const assetJobs=new Map();let assetSequence=0,queue=Promise.resolve();
 globalThis.__readVisionAsset=name=>new Promise((resolve,reject)=>{const id='asset-'+(++assetSequence);assetJobs.set(id,{resolve,reject});self.postMessage({type:'asset',id,name});});
 globalThis.__visionPixels=request=>new Promise((resolve,reject)=>{const id='pixels-'+(++assetSequence);assetJobs.set(id,{resolve,reject});self.postMessage({type:'pixels',id,request});});
 /* Actual local neural inference. Captions are observations, never prescriptions. */
const LocalVision=(()=>{
 'use strict';
 let runtimePromise,processorPromise,vlmPromise,embeddingPromise;
 const models=new Map();
 function packagedAsset(name){if(typeof document==='undefined'||!window.FieldAssetConfig?.portable)return null;const nodes=[...document.querySelectorAll('[data-vision-file]')].filter(n=>n.dataset.visionFile===name);if(!nodes.length)throw Error('离线AI资源缺失：'+name);return {chunks:nodes.map(node=>node.textContent),encoding:nodes[0].dataset.encoding};}
 async function decodeAsset(payload){const chunks=payload.chunks.map(value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0))),size=chunks.reduce((sum,c)=>sum+c.length,0),all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}return payload.encoding==='gzip'?new Uint8Array(await new Response(new Blob([all]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()):all;}
 async function bytes(name){
  if(globalThis.__readVisionAsset)return globalThis.__readVisionAsset(name);
  const payload=packagedAsset(name);if(payload)return decodeAsset(payload);
  const base=window.FieldAssetConfig?'./assets/vision-ai/':'./assets/vision-ai/';const response=await fetch(base+name);if(!response.ok)throw Error('AI资源读取失败：'+name);return new Uint8Array(await response.arrayBuffer());
 }
 async function runtime(){
  if(!runtimePromise)runtimePromise=(async()=>{
   const source=await bytes('runtime/transformers.min.js'),url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));let lib;try{lib=await import(url);}finally{URL.revokeObjectURL(url);}
   if(globalThis.__visionPixels&&typeof OffscreenCanvas==='undefined'){
    // WebKit workers lack canvas. Only pixel decoding/resizing goes to the page;
    // model execution remains in the worker and can still be terminated.
    lib.RawImage.fromURL=async dataURL=>{const p=await globalThis.__visionPixels({dataURL});return new lib.RawImage(p.data,p.width,p.height,4);};
    lib.RawImage.prototype.resize=async function(width,height){if(this.width===width&&this.height===height)return this;const channels=this.channels,p=await globalThis.__visionPixels({pixels:this.clone().rgba().data,width:this.width,height:this.height,targetWidth:width,targetHeight:height});return new lib.RawImage(p.data,p.width,p.height,4).convert(channels);};
   }
   lib.env.allowRemoteModels=false;lib.env.allowLocalModels=true;lib.env.useBrowserCache=false;lib.env.useFSCache=false;lib.env.useCustomCache=true;lib.env.localModelPath='/field-models/';
   const aliases={'leaf/onnx/model.onnx':'leaf/crop_leaf_diseases_vit.onnx'};
   lib.env.customCache={match:async request=>{const name=String(request instanceof Request?request.url:request).split('/field-models/field/')[1];if(!name)return undefined;const local=aliases[name]||name.replace(/^([^/]+)\/onnx\/model\.onnx$/,'$1/model.onnx');try{return new Response(await bytes(local),{headers:{'Content-Type':name.endsWith('.json')?'application/json':'application/octet-stream'}});}catch(error){if(/资源缺失|读取失败/.test(error.message))return undefined;throw error;}},put:async()=>{return undefined;}};
   const helper=URL.createObjectURL(new Blob([await bytes('runtime/ort-wasm-simd-threaded.jsep.mjs')],{type:'text/javascript'}));
   const wasm=URL.createObjectURL(new Blob([await bytes('runtime/ort-wasm-simd-threaded.jsep.wasm')],{type:'application/wasm'}));
   lib.env.backends.onnx.wasm.numThreads=1;lib.env.backends.onnx.wasm.proxy=false;lib.env.backends.onnx.wasm.wasmPaths={mjs:helper,wasm};
   return lib;
  })().catch(error=>{runtimePromise=null;throw error;});return runtimePromise;
 }
 async function classifier(id){
  if(!models.has(id)){
   if(models.size>=2){const oldest=models.keys().next().value,pending=models.get(oldest);models.delete(oldest);const previous=await pending.catch(()=>null);if(previous)await previous.net.dispose();}
   const lib=await runtime();models.set(id,(async()=>{const config=JSON.parse(new TextDecoder().decode(await bytes(id+'/config.json'))),vision=config.vision||(id==='soy'?{size:224,mean:[.485,.456,.406],std:[.229,.224,.225],classes:6}:{size:224,mean:[.5,.5,.5],std:[.5,.5,.5],classes:13});const net=await lib.PreTrainedModel.from_pretrained('field/'+id,{device:'wasm',dtype:'fp32',local_files_only:true});return {net,vision};})());
  }
  const pending=models.get(id);models.delete(id);models.set(id,pending);
  try{return await pending;}catch(error){if(models.get(id)===pending)models.delete(id);throw error;}
 }
 const roundEven=n=>n%1===.5?2*Math.round(n/2):Math.round(n);
 async function pixels(request){
  if(globalThis.__visionPixels&&typeof OffscreenCanvas==='undefined')return globalThis.__visionPixels(request);
  const canvas=(w,h)=>{if(typeof document==='undefined')return new OffscreenCanvas(w,h);const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  let source,width=request.width,height=request.height;
  if(request.dataURL){if(typeof document==='undefined')source=await createImageBitmap(await(await fetch(request.dataURL)).blob());else{source=new Image();source.src=request.dataURL;await source.decode();}width=source.width;height=source.height;}
  else{source=canvas(width,height);source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(request.pixels),width,height),0,0);}
  let sx=0,sy=0,sw=width,sh=height;
  if(request.crop){const b=request.crop;if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)throw Error('虫体裁切范围无效');const clamp=n=>Math.max(0,Math.min(1,n));sx=clamp(b.x)*width;sy=clamp(b.y)*height;sw=clamp(b.x+b.width)*width-sx;sh=clamp(b.y+b.height)*height-sy;if(sw<=0||sh<=0)throw Error('虫体裁切为空');}
  let w=request.targetWidth,h=request.targetHeight;if(!(w>0)&&!(h>0)){w=sw;h=sh;}else if(!(w>0))w=h/sh*sw;else if(!(h>0))h=w/sw*sh;
  const out=canvas(w,h);w=out.width;h=out.height;let drawWidth=w,drawHeight=h,left=0,top=0;
  if(request.letterbox){const scale=Math.min(w/sw,h/sh);drawWidth=Math.max(1,roundEven(sw*scale));drawHeight=Math.max(1,roundEven(sh*scale));left=Math.floor((w-drawWidth)/2);top=Math.floor((h-drawHeight)/2);out.getContext('2d').fillStyle='#000';out.getContext('2d').fillRect(0,0,w,h);}
  out.getContext('2d').drawImage(source,sx,sy,sw,sh,left,top,drawWidth,drawHeight);if(source.close)source.close();
  return {data:out.getContext('2d').getImageData(0,0,w,h).data,width:w,height:h,geometry:{sourceWidth:sw,sourceHeight:sh,drawWidth,drawHeight,left,top}};
 }
 async function tensor(dataURL,vision,crop){
  const lib=await runtime(),size=vision.size,{data,geometry}=await pixels({dataURL,targetWidth:size,targetHeight:size,letterbox:vision.letterbox,crop}),values=new Float32Array(3*size*size);
  for(let i=0;i<size*size;i++)for(let c=0;c<3;c++)values[c*size*size+i]=(data[i*4+c]/255-vision.mean[c])/vision.std[c];return {input:new lib.Tensor('float32',values,[1,3,size,size]),geometry};
 }
 async function classify(dataURL,id='leaf',crop){
  const {net,vision}=await classifier(id),{input}=await tensor(dataURL,vision,crop);let tensors=[];
  try{const output=await net({pixel_values:input});tensors=Object.values(output).filter(value=>value?.data&&value?.dims);if(tensors.length!==1||tensors[0].dims.at(-1)!==vision.classes)throw Error('分类模型输出结构不匹配 '+id);const values=Array.from(tensors[0].data);if(values.some(v=>!Number.isFinite(v)))throw Error('分类模型输出非有限数值');let scores;
   if(vision.scoreType==='probabilities'){const sum=values.reduce((a,b)=>a+b,0);if(values.some(v=>v<0||v>1)||Math.abs(sum-1)>.001)throw Error('概率模型输出不合法');scores=values;}else{const max=Math.max(...values),sum=values.reduce((s,x)=>s+Math.exp(x-max),0);scores=values.map(x=>Math.exp(x-max)/sum);}
   return {model:id,scores,raw:values,outputs:Object.keys(output)};
  }finally{tensors.forEach(t=>t.dispose());input.dispose();}
 }
 async function detect(dataURL){
  const {net,vision}=await classifier('insect-detector'),{input,geometry:g}=await tensor(dataURL,vision);let tensors=[];
  try{const output=await net({pixel_values:input});tensors=Object.values(output).filter(t=>t?.data&&t?.dims);const prediction=output[vision.output];if(prediction?.dims?.length!==3||prediction.dims.at(-1)!==6)throw Error('虫体定位输出不匹配');const proposals=[],data=prediction.data;
   if(data.some(v=>!Number.isFinite(v)))throw Error('虫体定位输出非有限数值');
   for(let i=0;i<data.length;i+=6){const objectness=data[i+4],score=objectness*data[i+5];if(objectness<=.5||score<.25||score>1)continue;const x1=Math.max(0,Math.min(1,(data[i]-data[i+2]/2-g.left)/g.drawWidth)),y1=Math.max(0,Math.min(1,(data[i+1]-data[i+3]/2-g.top)/g.drawHeight)),x2=Math.max(0,Math.min(1,(data[i]+data[i+2]/2-g.left)/g.drawWidth)),y2=Math.max(0,Math.min(1,(data[i+1]+data[i+3]/2-g.top)/g.drawHeight));if((x2-x1)*g.sourceWidth<30||(y2-y1)*g.sourceHeight<30)continue;proposals.push({x:x1,y:y1,width:x2-x1,height:y2-y1,score});}
   const kept=[];for(const box of proposals.sort((a,b)=>b.score-a.score).slice(0,300)){if(kept.some(other=>{const overlap=Math.max(0,Math.min(box.x+box.width,other.x+other.width)-Math.max(box.x,other.x))*Math.max(0,Math.min(box.y+box.height,other.y+other.height)-Math.max(box.y,other.y));return overlap/(box.width*box.height+other.width*other.height-overlap)>.5;}))continue;kept.push(box);if(kept.length===3)break;}return {model:'insect-detector',boxes:kept,geometry:g};
  }finally{tensors.forEach(t=>t.dispose());input.dispose();}
 }
 async function describe(dataURL,crop='crop',onToken){
  const lib=await runtime();processorPromise||=lib.AutoProcessor.from_pretrained('field/vlm',{local_files_only:true}).catch(error=>{processorPromise=null;throw error;});vlmPromise||=lib.AutoModelForVision2Seq.from_pretrained('field/vlm',{device:'wasm',dtype:'q8',local_files_only:true}).catch(error=>{vlmPromise=null;throw error;});
  let inputs,output,generated;
  try{const [processor,model]=await Promise.all([processorPromise,vlmPromise]);processor.image_processor.do_image_splitting=false;processor.image_processor.size={longest_edge:512};
   const prompt='Describe this image. Focus on visible colors, spots, holes, leaf shape and any insects.';
   const messages=[{role:'user',content:[{type:'image'},{type:'text',text:prompt}]}],text=processor.apply_chat_template(messages,{add_generation_prompt:true}),image=await lib.RawImage.fromURL(dataURL);inputs=await processor(text,[image]);
   output=await model.generate({...inputs,max_new_tokens:64,do_sample:false,repetition_penalty:1.1});generated=output.slice(null,[inputs.input_ids.dims.at(-1),null]);const result=processor.batch_decode(generated,{skip_special_tokens:true})[0].trim();
   return {model:'SmolVLM-256M-q8',text:result};
  }catch(error){throw error;}
  finally{for(const value of Object.values(inputs||{}))if(value?.dispose)value.dispose();generated?.dispose();output?.dispose();}
 }
 async function embed(dataURL){
  const lib=await runtime();
  embeddingPromise||=lib.AutoModel.from_pretrained('field/retrieval',{device:'wasm',dtype:'q8',local_files_only:true}).catch(error=>{embeddingPromise=null;throw error;});
  const net=await embeddingPromise,{input}=await tensor(dataURL,{size:224,mean:[.485,.456,.406],std:[.229,.224,.225]});let output;
  try{
   output=await net({pixel_values:input});
   const features=output.pooler_output||output.last_hidden_state;
   if(!features||features.dims.at(-1)!==384)throw Error('图片特征模型输出结构不匹配');
   const vector=Array.from(features.data.slice(0,384));
   if(vector.some(x=>!Number.isFinite(x)))throw Error('图片特征含无效数值');
   const norm=Math.hypot(...vector);if(norm<1e-8)throw Error('图片特征为空');
   return {modelId:'dinov2-small-q8-cls224-v1',vector:vector.map(x=>x/norm)};
  }finally{input.dispose();for(const tensor of Object.values(output||{}))tensor?.dispose?.();}
 }
 return {bytes,packagedAsset,decodeAsset,runtime,pixels,classify,detect,describe,embed};
})();

 self.onmessage=async event=>{const message=event.data;if(message.type==='asset-result'||message.type==='pixels-result'){const job=assetJobs.get(message.id);if(job){assetJobs.delete(message.id);try{message.error?job.reject(Error(message.error)):job.resolve(message.encoded?await LocalVision.decodeAsset(message.encoded):message.data);}catch(error){job.reject(error);}}return;}
 queue=queue.then(async()=>{try{let result;if(message.type==='classify')result=await LocalVision.classify(message.dataURL,message.model,message.cropBox);else if(message.type==='detect')result=await LocalVision.detect(message.dataURL);else if(message.type==='describe')result=await LocalVision.describe(message.dataURL,message.crop);else if(message.type==='embed')result=await LocalVision.embed(message.dataURL);else throw Error('未知推理类型');self.postMessage({id:message.id,result});}catch(error){self.postMessage({id:message.id,error:error.message});}}).catch(()=>{ /* A transport failure must not poison later jobs. */ });};
 