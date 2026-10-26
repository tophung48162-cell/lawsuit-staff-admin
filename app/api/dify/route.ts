import {env} from 'cloudflare:workers';
export async function GET(req:Request){
 // Public statistics endpoint. The owner explicitly enabled anonymous access to the shared backend.
 if(!env.DB)return new Response('后台数据库尚未连接，请稍后重试。',{status:503});
 const origin=new URL(req.url).origin;
 const q=new URL(req.url).searchParams.get('q')?.trim()??'';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let from='',to=today,label='累计';
 if(/今天|今日/.test(q)){from=today;label='今日';}else if(/本月|这个月/.test(q)){from=today.slice(0,7)+'-01';label='本月';}
 else {const dates=q.match(/\d{4}-\d{2}-\d{2}/g);if(dates?.length){if(dates.length!==2||dates.some(d=>!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)||dates[0]>dates[1])return new Response('日期格式有误。请输入：统计 2026-10-01 至 2026-10-25');from=dates[0];to=dates[1];label=from+' 至 '+to;}else if(!/统计|收款|退款|概览|后台|帮助|全部|累计/.test(q)&&q)return new Response(`请在工作人员网页办理建案、收款和退款登记。\n\n支持的统计指令：今日统计、本月统计、累计统计、统计 YYYY-MM-DD 至 YYYY-MM-DD。\n\n后台：${origin}`);}
 const result=await env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN kind='收款' THEN cents ELSE 0 END),0) received,COALESCE(SUM(CASE WHEN kind='退款' THEN cents ELSE 0 END),0) refunded,SUM(CASE WHEN kind='收款' THEN 1 ELSE 0 END) payments,SUM(CASE WHEN kind='退款' THEN 1 ELSE 0 END) refunds FROM ledger WHERE date>=? AND date<=?").bind(from,to).first<{received:number;refunded:number;payments:number;refunds:number}>();
 const count=await env.DB.prepare('SELECT COUNT(*) count FROM cases').first<{count:number}>();
 const r=result!;const money=(n:number)=>(n/100).toFixed(2);
 return new Response(`## ${label}收退款统计\n\n| 指标 | 数值 |\n| --- | ---: |\n| 收款总额 | ¥${money(r.received)} |\n| 退款总额 | ¥${money(r.refunded)} |\n| 净收款 | ¥${money(r.received-r.refunded)} |\n| 收款笔数 | ${r.payments??0} 笔 |\n| 退款笔数 | ${r.refunds??0} 笔 |\n\n案件累计：${count?.count??0} 件。\n\n统计依据：共享台账实际流水，按北京时间与收付发生日期计算。\n\n[打开工作人员后台](${origin}) 登记收退款、查看明细。\n\n支持：今日统计 / 本月统计 / 累计统计 / 统计 YYYY-MM-DD 至 YYYY-MM-DD。`,{headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'}});
}
