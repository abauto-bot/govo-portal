// Customer presentation only. Preserve POST field names, values and endpoints.
const allowedAction = /^(?:\/order|\/support|\/service-request|\/track|\/shop\/[^/]+\/order|\/service\/[^/]+\/request)$/;
function enhanceCustomerForms(html) {
 let index=0;
 return String(html).replace(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi,(all,attrs,body)=>{
  const action=(attrs.match(/\baction="([^"]*)"/i)||[])[1];
  if(!allowedAction.test(action||''))return all;
  const prefix='govo-form-'+(++index)+'-';
  body=body.replace(/<label\b([^>]*)>([\s\S]*?)<\/label>(\s*)<(input|textarea|select)\b([^>]*)>/gi,(match,labelAttrs,label,gap,tag,fieldAttrs)=>{
   if(/\bfor\s*=/.test(labelAttrs))return match;
   const name=(fieldAttrs.match(/\bname="([^"]+)"/)||[])[1];
   if(!name||/type="(?:hidden|checkbox|radio)"/.test(fieldAttrs))return match;
   const id=(fieldAttrs.match(/\bid="([^"]+)"/)||[])[1]||prefix+name;
   if(!/\bid\s*=/.test(fieldAttrs))fieldAttrs+=' id="'+id+'"';
   const autocomplete={customer_name:'name',customer_phone:'tel',customer_address:'street-address',customer_area:'address-level2',phone:'tel'}[name];
   if(autocomplete&&!/\bautocomplete\s*=/.test(fieldAttrs))fieldAttrs+=' autocomplete="'+autocomplete+'"';
   if(tag.toLowerCase()==='input'&&['customer_phone','phone'].includes(name)){
    fieldAttrs=fieldAttrs.replace(/\s+type="[^"]*"/i,'');fieldAttrs+=' type="tel"';
    if(!/\binputmode\s*=/.test(fieldAttrs))fieldAttrs+=' inputmode="tel"';
   }
   if(name==='code'&&!/\bautocapitalize\s*=/.test(fieldAttrs))fieldAttrs+=' autocapitalize="characters" spellcheck="false"';
   return '<label'+labelAttrs+' for="'+id+'">'+label+'</label>'+gap+'<'+tag+fieldAttrs+'>';
  });
  if(/method="post"/i.test(attrs))attrs+=' data-govo-submit';
  return '<form'+attrs+'>'+body+'</form>';
 });
}
const FORM_SCRIPT=`<script>(function(){
 function copy(en,bn,banglish){var lang='en';try{lang=localStorage.getItem('govo_language')||'en';}catch(e){}return lang==='bn'?bn:lang==='banglish'?banglish:en;}
 function init(){document.querySelectorAll('form[data-govo-submit]').forEach(function(f){
  var buttons=Array.from(f.querySelectorAll('button[type="submit"],button:not([type]),input[type="submit"]'));
  var originals=buttons.map(function(b){return {b:b,text:b.textContent,value:b.value,disabled:b.disabled};});
  var status=document.createElement('p');status.className='govo-submit-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;f.appendChild(status);
  function reset(){f.removeAttribute('aria-busy');originals.forEach(function(x){x.b.disabled=x.disabled;x.b.textContent=x.text;x.b.value=x.value;});status.hidden=true;status.textContent='';}
  f.addEventListener('submit',function(e){
   if(e.defaultPrevented)return;
   if(f.getAttribute('aria-busy')==='true'){e.preventDefault();e.stopImmediatePropagation();return;}
   if(!f.checkValidity()){e.preventDefault();f.reportValidity();return;}
   f.setAttribute('aria-busy','true');status.hidden=false;status.textContent=copy('Sending your request. Please wait…','আপনার অনুরোধ পাঠানো হচ্ছে। অপেক্ষা করুন…','Request pathano hocche. Opekkha korun…');
   buttons.forEach(function(b){if(!b.name){b.disabled=true;if(b.tagName==='INPUT')b.value=copy('Sending…','পাঠানো হচ্ছে…','Pathano hocche…');else b.textContent=copy('Sending…','পাঠানো হচ্ছে…','Pathano hocche…');}});
  },true);
  addEventListener('pageshow',reset);
 });}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();</script>`;
function enhanceCustomerPage(html){return enhanceCustomerForms(html).replace(/<\/body>/i,FORM_SCRIPT+'</body>');}
module.exports={enhanceCustomerForms,enhanceCustomerPage,FORM_SCRIPT};
