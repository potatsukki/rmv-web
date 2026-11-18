import {request} from 'playwright';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
const root='https://rmvfabrication.app/api/v1';
const media=fs.readFileSync('C:/Users/Acer/Downloads/f3322047-28ed-4ac1-81d2-0a37a3a25959.png');
const pass=fs.readFileSync('C:/Users/Acer/Documents/Desktop Docs/Kay Codex.txt','utf8').match(/"([^"]+)"/)[1];
async function session(email){
 const ctx=await request.newContext();let token;
 async function post(path,data){
 const csrf=(await (await ctx.get(root+'/csrf-token')).json()).data.csrfToken;
 const resp=await ctx.post(root+path,{data,headers:{Origin:'https://rmvfabrication.app','X-CSRF-Token':csrf,'Idempotency-Key':randomUUID(),...(token?{Authorization:'Bearer '+token}:{})}});
 const json=await resp.json();if(!resp.ok())throw Error(resp.status()+' '+(json.error?.message||json.message||'Request failed'));return json.data;}
 const login=await post('/auth/login',{email,password:pass});token=login.accessToken;if(!token)throw Error('Login needs verification');return {post,id:login.user.id||login.user._id,get:async path=>(await (await ctx.get(root+path,{headers:{Authorization:'Bearer '+token}})).json())};}
const customer=await session('customer02@example.com'),sales=await session('salesstaff01@example.com');
if(!customer.id)throw Error('Missing test customer');
async function upload(folder){const file=await sales.post('/uploads/signed-upload-url',{folder,filename:'QA-placeholder.png',contentType:'image/png'});const res=await fetch(file.uploadUrl,{method:'PUT',body:media,headers:{'Content-Type':'image/png'}});if(!res.ok)throw Error('Media upload '+res.status);return file.key;}
if(process.argv.includes('--inspect')){const j=await customer.get('/appointments?limit=100');const rows=Array.isArray(j.data)?j.data:j.data.appointments||j.data.items||[];console.log(rows.map(r=>[r.appointmentNumber,r.type,r.date,r.slotCode,r.status]));process.exit(0);}
if(process.argv.includes('--reverse')){const date='2026-11-24',slotCode='10:00';const pj=await sales.post('/projects/6afa8410b8957df9f925b0a5/schedule-ocular',{date,slotCode,salesStaffId:sales.id,customerLocation:{lat:14.55,lng:121.02},formattedAddress:'Makati City, Metro Manila (QA test site)'});console.log('OCULAR',pj.projectNumber,pj.ocularAppointmentId);try{const c=await customer.post('/appointments',{date,slotCode,type:'office',purpose:'QA overlap test',serviceTypes:['railings']});console.log('ACCEPTED',c.appointmentNumber);}catch(e){console.log('RESPONSE',e.message);}process.exit(0);}
const contract=await upload('contracts'),photo=await upload('visit-reports');
const project=await sales.post('/projects',{customerId:customer.id,title:'QA TEST - Consultation and ocular overlap',description:'Scheduling test only. Both media attachments are sample artwork.',serviceType:'railings',contractFileKey:contract,contractFileName:'QA-placeholder.png',contractContentType:'image/png',photoKeys:[photo]});
console.log('PROJECT',project.projectNumber,project._id);
const date='2026-11-24',slotCode='10:00';
const booking=await customer.post('/appointments',{date,slotCode,type:'office',purpose:'QA scheduling overlap test',serviceTypes:['railings']});console.log('BOOKING',booking.appointmentNumber,booking.status);
try{const ocular=await sales.post('/projects/'+project._id+'/schedule-ocular',{date,slotCode,salesStaffId:sales.id,customerLocation:{lat:14.55,lng:121.02},formattedAddress:'Makati City, Metro Manila (QA test site)'});console.log('OCULAR ACCEPTED',ocular.projectNumber||ocular.status);}catch(e){console.log('OCULAR RESPONSE',e.message);}
