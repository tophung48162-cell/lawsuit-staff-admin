/// <reference types="vite/client" />
const base=import.meta.env.VITE_OFFICE_API_BASE||'';
export async function fetchOffice(init?:RequestInit){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const res=await fetch(base+'/api/office',{...init,credentials:'omit',signal:controller.signal});
  if(!(res.headers.get('content-type')||'').includes('application/json'))throw Error('云端接口未返回数据，可能受到浏览器或网络访问限制。');
  return res;
 }catch(e){throw Error(e instanceof Error&&e.message.includes('云端')?e.message:'无法连接云端台账，请检查网络或在系统浏览器中打开后重试。未连接时不会保存记录。');}
 finally{clearTimeout(timeout);}
}
