import { env } from 'cloudflare:workers';
const scenes=['交通事故','公共场所受伤','故意伤害','医疗损害','产品损害','动物致害','高空坠物','劳务受伤','校园伤害','工伤相关','其他'];
const statuses=['待处理','补充材料','起草中','待复核','已交付','已关闭'];
const channels=['微信','支付宝','银行转账','现金','其他'];
const PAGES_ORIGIN='https://tophung48162-cell.github.io';
function corsHeaders(req:Request):Record<string,string>{
 const origin=req.headers.get('origin');
 return origin===PAGES_ORIGIN?{'Access-Control-Allow-Origin':PAGES_ORIGIN,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{};
}
const responseFor=(req:Request)=>(x:unknown,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store',...corsHeaders(req)}});
export async function OPTIONS(req:Request){
 const allowed=req.headers.get('origin')===PAGES_ORIGIN;
 return new Response(null,{status:allowed?204:403,headers:corsHeaders(req)});
}
function str(v:unknown,max=200){if(typeof v!=='string'||v.length>max)throw Error('字段格式不正确');return v.trim();}
export async function GET(req:Request){
 const response=responseFor(req);
 if(!env.DB)return response({error:'数据库尚未连接'},503);
 const [c,l,a]=await Promise.all([env.DB.prepare('SELECT * FROM cases ORDER BY created_at DESC').all(),env.DB.prepare('SELECT * FROM ledger ORDER BY date DESC, created_at DESC').all(),env.DB.prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 100').all()]);
 return response({cases:c.results,ledger:l.results,audit:a.results});
}
export async function POST(req:Request){
 const response=responseFor(req);
 if(new URL(req.url).origin!==req.headers.get('origin')&&req.headers.get('origin')!==PAGES_ORIGIN)return response({error:'无效请求来源'},403);
 if(!env.DB)return response({error:'数据库尚未连接'},503);
 try{
 const b=await req.json() as Record<string,unknown>;const db=env.DB;const now=new Date().toISOString();const actor='公开访客';
 const id=str(b.id,80);if(!/^[a-zA-Z0-9_-]{8,80}$/.test(id))throw Error('无效请求编号');
 const log=(action:string,target:string,detail:string)=>db.prepare('INSERT INTO audit (id,action,target,actor,detail,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),action,target,actor,detail,now);
 if(b.action==='case'){
  if(await db.prepare('SELECT id FROM cases WHERE id=?').bind(id).first())return response({ok:true,id});
  const name=str(b.name,80),phone=str(b.phone??'',40),scene=str(b.scene,40),staff=str(b.staff,80),note=str(b.note??'',2000);
  if(!name||!staff||!scenes.includes(scene))throw Error('请填写客户姓名、经办人及受伤场景');
  await db.batch([db.prepare('INSERT INTO cases (id,name,phone,scene,staff,status,note,created_at,actor) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,name,phone,scene,staff,'待处理',note,now,actor),log('新建案件',id,name)]);return response({ok:true,id});
 }
 if(b.action==='status'){
  const status=str(b.status,40),caseId=str(b.caseId,80);if(!statuses.includes(status))throw Error('无效案件状态');
  if(!await db.prepare('SELECT id FROM cases WHERE id=?').bind(caseId).first())throw Error('案件不存在');
  await db.batch([db.prepare('UPDATE cases SET status=? WHERE id=?').bind(status,caseId),log('更新案件状态',caseId,status)]);return response({ok:true});
 }
 if(b.action!=='payment'&&b.action!=='refund')throw Error('不支持的操作');
 if(await db.prepare('SELECT id FROM ledger WHERE id=?').bind(id).first())return response({ok:true,id});
 const caseId=str(b.caseId,80),kind=b.action==='payment'?'收款':'退款',channel=str(b.channel,40),date=str(b.date,10),staff=str(b.staff,80),note=str(b.note??'',2000),reference=str(b.reference??'',120);
 const amount=str(b.amount,20);if(!/^\d{1,9}(\.\d{1,2})?$/.test(amount))throw Error('金额必须为正数，最多两位小数');
 const [yuan,fraction='']=amount.split('.');const cents=Number(yuan)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(cents)||cents<=0)throw Error('请输入大于零的金额');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('日期无效');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(date>today)throw Error('只能登记已发生的收退款');
 if(!channels.includes(channel)||!staff)throw Error('请填写渠道及经办人');
 if(!await db.prepare('SELECT id FROM cases WHERE id=?').bind(caseId).first())throw Error('案件不存在');
 const parentId=kind==='退款'?str(b.parentId,80):null;if(kind==='退款'&&!note)throw Error('请填写退款原因');
 let insert;
 if(kind==='退款')insert=db.prepare(`INSERT INTO ledger (id,case_id,kind,cents,date,channel,parent_id,reference,note,staff,actor,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM ledger p WHERE p.id=? AND p.case_id=? AND p.kind='收款' AND p.date<=? AND p.cents>=?+COALESCE((SELECT SUM(r.cents) FROM ledger r WHERE r.parent_id=p.id AND r.kind='退款'),0))`).bind(id,caseId,kind,cents,date,channel,parentId,reference,note,staff,actor,now,parentId,caseId,date,cents);
 else insert=db.prepare('INSERT INTO ledger (id,case_id,kind,cents,date,channel,parent_id,reference,note,staff,actor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,caseId,kind,cents,date,channel,null,reference,note,staff,actor,now);
 const auditInsert=db.prepare('INSERT INTO audit (id,action,target,actor,detail,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM ledger WHERE id=?)').bind(crypto.randomUUID(),kind+'登记',caseId,actor,`${id} / ${amount}元 / ${channel}`,now,id);
 const result=await db.batch([insert,auditInsert]);if(!result[0].meta.changes)throw Error('退款超过原收款可退余额，或原收款/日期无效');return response({ok:true,id});
 }catch(e){return response({error:e instanceof Error?e.message:'保存失败，请重试'},400);}
}
