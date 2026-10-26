import urllib.request,urllib.parse,json,uuid,urllib.error,http.cookiejar
base='http://127.0.0.1:5173'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.open(base+'/signin-with-chatgpt?return_to=/').read()
def get(path):return opener.open(base+path).read().decode()
def post(b):
 r=urllib.request.Request(base+'/api/office',data=json.dumps(b).encode(),headers={'Content-Type':'application/json','Origin':base},method='POST')
 try:
  with opener.open(r) as f:return f.status,json.load(f)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
cid=str(uuid.uuid4()); assert post({'id':cid,'action':'case','name':'自动化测试案件','phone':'','scene':'交通事故','staff':'测试经办人'})[0]==200
pid=str(uuid.uuid4());rid=str(uuid.uuid4())
b={'action':'payment','id':pid,'caseId':cid,'amount':'100.01','date':'2026-10-25','channel':'微信','staff':'测试经办人'}
assert post(b)[0]==200
assert post(b)[0]==200
r={**b,'action':'refund','id':rid,'amount':'30.01','parentId':pid,'note':'本地退款验证'}
assert post(r)[0]==200
bad=post({**r,'id':str(uuid.uuid4()),'amount':'70.01'});assert bad[0]==400,bad
assert post({**b,'id':str(uuid.uuid4()),'amount':'0'})[0]==400
assert post({**b,'id':str(uuid.uuid4()),'amount':'1.001'})[0]==400
assert post({**b,'id':str(uuid.uuid4()),'date':'2026-02-30'})[0]==400
rows=[x for x in json.loads(get('/api/office'))['ledger'] if x['case_id']==cid];assert len(rows)==2,rows
assert sum(l['cents']*(1 if l['kind']=='收款' else -1) for l in rows)==7000
report=get('/api/dify?q='+urllib.parse.quote('本月统计'));assert '100.01' in report and '30.01' in report and '70.00' in report
print('PASS: persisted case, 100.01 payment, duplicate submission, 30.01 refund, over-refund rejected, zero/precision/date rejected, net 70.00, Dify report matches.')
