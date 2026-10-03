import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import { runCases } from './real-cases.mjs'

const root = process.cwd()
const output = path.resolve('artifacts/final-02-postgres-2026-10-03')
const require = createRequire(path.join(root, 'api/package.json'))
const postgres = require('postgres')
const { drizzle } = require('drizzle-orm/postgres-js')
const { migrate } = require('drizzle-orm/postgres-js/migrator')
const { hash } = require('bcryptjs')
const runtime = JSON.parse((await fs.readFile(path.join(output,'runtime.json'),'utf8')).replace(/^\uFEFF/,''))
const ownedRoot = path.resolve(runtime.runtimeRoot)
assert.equal(path.dirname(ownedRoot).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase())
assert.match(path.basename(ownedRoot), /^ltvn-final02-[a-f0-9]{32}$/)
const data = path.join(ownedRoot,'data')
await assert.rejects(fs.stat(data), { code: 'ENOENT' })
const dbName = 'ltvn_final02_test', dbUser = 'ltvn_final02', host = '127.0.0.1'
assert.match(dbName, /test/)
const password = randomBytes(32).toString('hex')
const adminPassword = randomBytes(24).toString('base64url')
const jwtSecret = randomBytes(48).toString('base64url')
const secrets = [password,adminPassword,jwtSecret]
const redact = text => secrets.reduce((value, secret) => value.replaceAll(secret,'***'), String(text))
const clean = value => JSON.parse(JSON.stringify(value, (key, item) => /password|accessToken|authorization|jwtSecret/i.test(key) ? '[REDACTED]' : item))
const save = async (name,value) => fs.writeFile(path.join(output,name),typeof value === 'string' ? redact(value) : JSON.stringify(clean(value),null,2))
const results = [], evidence = {}
let pg, apiProcess, sql, maintenance, pgLog='', apiLog='', clusterStarted=false, testCreated=false, apiStopped=false
let port, apiPort
const env = { ...process.env }
for (const key of Object.keys(env)) if (/^(PG|DATABASE_URL$|JWT_|PORT$|NODE_OPTIONS$|DOTENV_)/i.test(key)) delete env[key]
async function freePort() {
  const server=net.createServer()
  await new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(0,host,resolve) })
  const selected=server.address().port
  await new Promise(resolve=>server.close(resolve))
  return selected
}
async function command(executable,args,name) {
  const child=spawn(executable,args,{cwd:ownedRoot,env,windowsHide:true})
  let log=''
  child.stdout.on('data',buffer=>log+=buffer.toString())
  child.stderr.on('data',buffer=>log+=buffer.toString())
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)})
  await save(name,log)
  assert.equal(code,0,`${name}: command failed; see sanitized log`)
}
const executable = name => path.join(runtime.bin,name+'.exe')
const connect = database => {
  assert.equal(host,'127.0.0.1'); assert.ok(Number.isInteger(port) && port>1024)
  assert.ok(['postgres',dbName].includes(database))
  return postgres({ host,port,database,username:dbUser,password,max:1,connect_timeout:3,
    connection:{application_name:'ltvn_final02_verifier'},onnotice:()=>{} })
}
async function identity(client,database) {
  const [row]=await client`select current_database() as database, current_user as username, inet_server_addr()::text as address, inet_server_port() as port, current_setting('data_directory') as data_directory, version() as version`
  assert.equal(row.database,database); assert.equal(row.username,dbUser)
  assert.equal(row.address,host); assert.equal(row.port,port)
  assert.equal(path.resolve(row.data_directory).toLowerCase(),data.toLowerCase())
  return row
}
async function test(id,name,fn) {
  try { const proof=await fn(); results.push({id,name,type:'REAL POSTGRESQL',result:'PASS',proof}); console.log(`PASS ${id}: ${name}`) }
  catch(error) { results.push({id,name,type:'REAL POSTGRESQL',result:'FAIL',error:redact(error.stack||error.message)}); console.error(`FAIL ${id}: ${redact(error.message)}`) }
  await save('integration-results.json',{results,evidence})
}
async function stopApi() {
  if (!apiProcess || apiStopped) return
  if (apiProcess.exitCode!==null) { apiStopped=true;return }
  const closed=new Promise(resolve=>apiProcess.once('close',resolve))
  if (apiProcess.exitCode===null) apiProcess.kill()
  await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(new Error('FINAL02 API stop timeout')),10000))])
  apiStopped=true
}
try {
  port=await freePort(); apiPort=await freePort()
  await save('connection-target.json',{host,port,database:dbName,user:dbUser,isolation:'fresh native disposable cluster',runtimeRoot:ownedRoot,
    redactedUrl:`postgresql://${dbUser}:***@${host}:${port}/${dbName}`,existingProjectDatabaseUrlUsed:false})
  console.log(`TARGET: postgresql://${dbUser}:***@${host}:${port}/${dbName}; fresh disposable cluster`)
  const pwfile=path.join(ownedRoot,'initdb-password.tmp')
  await fs.writeFile(pwfile,password,{mode:0o600})
  try { await command(executable('initdb'),['-D',data,'--username='+dbUser,'--pwfile='+pwfile,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C'],'initdb.log') }
  finally { await fs.rm(pwfile,{force:true}) }
  pg=spawn(executable('postgres'),['-D',data,'-h',host,'-p',String(port),'-c','log_statement=all','-c','log_connections=on',
    '-c','log_parameter_max_length=0','-c','log_parameter_max_length_on_error=0','-c','log_error_verbosity=verbose'],{cwd:ownedRoot,env,windowsHide:true})
  pg.stdout.on('data',buffer=>pgLog+=buffer.toString())
  pg.stderr.on('data',buffer=>pgLog+=buffer.toString())
  pg.on('error',error=>pgLog+=redact(error.message))
  clusterStarted=true
  let pidFile
  for(let attempt=0;attempt<100;attempt++) {
    try { pidFile=(await fs.readFile(path.join(data,'postmaster.pid'),'utf8')).split(/\r?\n/); if(pidFile[7]?.trim()==='ready') break } catch{}
    if(pg.exitCode!==null) throw new Error('Fresh PostgreSQL process exited before ready')
    await new Promise(resolve=>setTimeout(resolve,100))
  }
  assert.equal(Number(pidFile?.[0]),pg.pid,'Must own this postmaster before any connection')
  assert.equal(Number(pidFile?.[3]),port); assert.equal(pidFile?.[5]?.trim(),host)
  assert.equal(path.resolve(pidFile?.[1]).toLowerCase(),data.toLowerCase())
  maintenance=connect('postgres')
  evidence.clusterIdentity=await identity(maintenance,'postgres')
  await maintenance.unsafe(`CREATE DATABASE "${dbName}"`)
  testCreated=true
  await maintenance.end(); maintenance=null
  sql=connect(dbName)
  evidence.databaseIdentity=await identity(sql,dbName)
  await save('database-identity.json',{...evidence.databaseIdentity,postmasterPid:pg.pid,postmasterPidFileMatches:true})
  const tables=()=>sql`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name`
  evidence.emptyTables=await tables(); assert.equal(evidence.emptyTables.length,0)
  console.log('IDENTITY PASS; public tables before migration=0')

  const journal=JSON.parse(await fs.readFile('api/drizzle/meta/_journal.json','utf8'))
  assert.deepEqual(journal.entries.map(entry=>entry.tag),['0000_known_stryfe','0001_add_news_event_translations'])
  const phaseA=path.join(output,'migration-phase-a'),phaseB=path.join(output,'migration-phase-b')
  await fs.cp('api/drizzle',phaseA,{recursive:true});await fs.cp('api/drizzle',phaseB,{recursive:true})
  await fs.writeFile(path.join(phaseA,'meta/_journal.json'),JSON.stringify({...journal,entries:[journal.entries[0]]},null,2))
  evidence.migrationHashes=[]
  for(const entry of journal.entries) {
    const original=await fs.readFile(`api/drizzle/${entry.tag}.sql`)
    for(const folder of [phaseA,phaseB]) assert.deepEqual(await fs.readFile(path.join(folder,entry.tag+'.sql')),original)
    evidence.migrationHashes.push({tag:entry.tag,sha256:createHash('sha256').update(original).digest('hex')})
  }
  await migrate(drizzle(sql),{migrationsFolder:phaseA})
  evidence.phaseATables=await tables();assert.equal(evidence.phaseATables.length,11)
  assert.equal(evidence.phaseATables.some(row=>row.table_name==='news_event_translations'),false)
  evidence.phaseAJournal=await sql`select * from drizzle.__drizzle_migrations order by id`
  assert.equal(evidence.phaseAJournal.length,1)
  evidence.legacyColumns=await sql`select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='news_events' order by ordinal_position`
  const content={version:1,blocks:[{type:'paragraph',data:{text:'FINAL02 Legacy Vietnamese content'}}]}
  const [legacy]=await sql`insert into news_events (type,title,slug,short_description,content,location,status,created_at,updated_at)
    values ('news','FINAL02 Legacy Vietnamese Article','final02-legacy-vi','FINAL02 Legacy excerpt',${sql.json(content)},'FINAL02 Legacy Location','published','2026-10-01T08:00:00Z','2026-10-02T08:30:00Z') returning *`
  assert.equal((await sql`select count(*)::int as count from news_events`)[0].count,1)
  evidence.pre0001Legacy=legacy
  await migrate(drizzle(sql),{migrationsFolder:phaseB})
  evidence.phaseBTables=await tables();assert.equal(evidence.phaseBTables.length,12)
  evidence.phaseBJournal=await sql`select * from drizzle.__drizzle_migrations order by id`
  assert.equal(evidence.phaseBJournal.length,2)
  evidence.phaseBJournal.forEach((row,index)=>assert.equal(row.hash,evidence.migrationHashes[index].sha256))
  const columnsAfter=await sql`select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='news_events' order by ordinal_position`
  assert.deepEqual(columnsAfter,evidence.legacyColumns)
  const [parent]=await sql`select * from news_events where id=${legacy.id}`
  const translations=await sql`select * from news_event_translations`
  assert.equal(translations.length,1)
  const translation=translations[0]
  assert.equal(translation.news_event_id,parent.id);assert.equal(translation.locale,'vi')
  const copiedFields=['title','slug','short_description','content','location','created_at','updated_at']
  for(const field of copiedFields) assert.deepEqual(translation[field],parent[field],`Backfill exact ${field}`)
  assert.deepEqual(parent,legacy)
  evidence.backfill={parent,translation,copiedFields,exactEquality:true,enCount:(await sql`select count(*)::int as count from news_event_translations where locale='en'`)[0].count}
  assert.equal(evidence.backfill.enCount,0)
  await save('migration-evidence.json',evidence)
  console.log('MIGRATION 0000/0001 PASS; 11 -> 12 tables; exact VI backfill; EN count=0; journal applied once each')

  const adminHash=await hash(adminPassword,10)
  const [admin]=await sql`insert into users (email,password_hash,full_name,role,status) values ('final02-admin@example.invalid',${adminHash},'FINAL02 Test Admin','admin','active') returning id,email,full_name`
  const apiCwd=path.join(ownedRoot,'api-cwd');await fs.mkdir(apiCwd)
  const databaseUrl=`postgresql://${dbUser}:${password}@${host}:${port}/${dbName}`
  secrets.push(databaseUrl)
  apiLog+=`[FINAL02] Isolated env override: postgresql://${dbUser}:***@${host}:${port}/${dbName}; no .env files in process cwd\n`
  apiProcess=spawn(process.execPath,[path.join(root,'api/dist/main.js')],{cwd:apiCwd,env:{...env,DATABASE_URL:databaseUrl,JWT_SECRET:jwtSecret,JWT_TTL_SECONDS:'3600',PORT:String(apiPort),NODE_ENV:'test',PGAPPNAME:'ltvn_final02_api'},windowsHide:true})
  apiProcess.stdout.on('data',buffer=>apiLog+=buffer.toString())
  apiProcess.stderr.on('data',buffer=>apiLog+=buffer.toString())
  apiProcess.on('error',error=>apiLog+=redact(error.message))
  const origin=`http://${host}:${apiPort}`
  let ready=false
  for(let attempt=0;attempt<100;attempt++) {
    try { ready=(await fetch(origin+'/api',{signal:AbortSignal.timeout(1000)})).status===200; if(ready) break } catch{}
    if(apiProcess.exitCode!==null) throw new Error('FINAL02 Nest API exited before ready')
    await new Promise(resolve=>setTimeout(resolve,100))
  }
  assert.equal(ready,true)
  let token
  const httpEvidence=[]
  async function http(method,url,body,authorized=true,expected=200) {
    assert.ok(url.startsWith('/api/'));assert.equal(new URL(origin).hostname,host)
    const response=await fetch(origin+url,{method,headers:{'Content-Type':'application/json',...(authorized&&token?{Authorization:`Bearer ${token}`}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)})
    const text=await response.text();let value;try{value=JSON.parse(text)}catch{value=text}
    if(url==='/api/auth/login'&&value?.accessToken) secrets.push(value.accessToken)
    assert.equal(/"passwordHash"|"password_hash"/.test(JSON.stringify(value)),false,'HTTP response must not expose password hash')
    httpEvidence.push({method,url,status:response.status,response:clean(value)})
    assert.ok((Array.isArray(expected)?expected:[expected]).includes(response.status),`${method} ${url}: ${response.status}, expected ${JSON.stringify(expected)}; ${redact(text).slice(0,250)}`)
    return value
  }
  await test('AUTH','Real bcrypt login, JWT/me, protected access and anonymous rejection',async()=>{
    await http('GET','/api/users',undefined,false,401)
    const login=await http('POST','/api/auth/login',{email:admin.email,password:adminPassword},false,200)
    assert.ok(login.accessToken?.split('.').length===3);token=login.accessToken
    const me=await http('GET','/api/auth/me');assert.equal(me.id,admin.id)
    await http('GET','/api/users')
    const sessions=await sql`select datname,usename,client_addr::text as client_addr,application_name from pg_stat_activity where application_name='ltvn_final02_api'`
    assert.ok(sessions.length>0);for(const session of sessions){assert.equal(session.datname,dbName);assert.equal(session.usename,dbUser);assert.equal(session.client_addr,host)}
    apiLog+=`[FINAL02] Actual API pg_stat_activity identity verified: database=${dbName}, user=${dbUser}, client=${host}\n`
    evidence.apiIdentity={pid:apiProcess.pid,cwd:apiCwd,databaseEnvOverridden:true,sessions}
    return {login:clean(login),me,sessions,unauthenticatedStatus:401}
  })
  assert.ok(token,'Real authentication required; no bypass/mocks allowed')
  await runCases({sql,http,test,evidence,save,legacy,admin,origin,output,pgLog:()=>pgLog})
  await save('http-evidence.json',httpEvidence)
  await save('integration-results.json',{results,evidence,passed:results.filter(row=>row.result==='PASS').length,total:results.length,
    persistence:'REAL PostgreSQL 18.6; no Drizzle/repository/SQL/HTTP mocks',sourceChanges:'NONE'})
} catch(error) {
  results.push({id:'GATE',type:'REAL POSTGRESQL',result:'FAIL',error:redact(error.stack||error.message)})
  console.error(redact(error.stack||error.message))
  await save('integration-results.json',{results,evidence,passed:results.filter(row=>row.result==='PASS').length,total:results.length})
} finally {
  const cleanup={apiStopped:false,testDatabaseDropped:false,postgresStopped:false,runtimeRemoved:false,target:{host,port,database:dbName,user:dbUser}}
  try {
    await stopApi();cleanup.apiStopped=apiStopped||!apiProcess
    if(sql){await sql.end();sql=null}
    if(maintenance){await maintenance.end();maintenance=null}
    if(testCreated){
      maintenance=connect('postgres');await identity(maintenance,'postgres')
      await maintenance.unsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`)
      assert.equal((await maintenance`select count(*)::int as count from pg_database where datname=${dbName}`)[0].count,0)
      cleanup.testDatabaseDropped=true;await maintenance.end();maintenance=null
    }
    if(clusterStarted&&pg?.exitCode===null){await command(executable('pg_ctl'),['stop','-D',data,'-m','fast','-w'],'postgres-stop.log')}
    if(pg?.exitCode===null) await new Promise(resolve=>pg.once('close',resolve))
    cleanup.postgresStopped=!clusterStarted||pg.exitCode!==null
    if(clusterStarted) {
      const refused=await new Promise(resolve=>{const socket=net.connect({host,port});socket.once('error',error=>resolve(error.code==='ECONNREFUSED'));socket.once('connect',()=>{socket.destroy();resolve(false)})})
      assert.equal(refused,true,'Dedicated PostgreSQL port must no longer accept connections')
      cleanup.portClosed=true
    }
    assert.equal(path.dirname(ownedRoot).toLowerCase(),path.resolve(os.tmpdir()).toLowerCase())
    assert.match(path.basename(ownedRoot),/^ltvn-final02-[a-f0-9]{32}$/)
    assert.equal(cleanup.postgresStopped,true)
    await fs.rm(ownedRoot,{recursive:true,force:true})
    await assert.rejects(fs.stat(ownedRoot),{code:'ENOENT'})
    cleanup.runtimeRemoved=true
    cleanup.testOnlyTriggers='NONE CREATED'
  } catch(error) { cleanup.error=redact(error.stack||error.message);results.push({id:'CLEANUP',result:'FAIL',error:cleanup.error});console.error('CLEANUP FAIL: '+redact(error.message)) }
  await save('postgres-server.log',pgLog)
  await save('nest-api.log',apiLog)
  await save('cleanup.json',cleanup)
  console.log(`CLEANUP: API stopped=${cleanup.apiStopped}; test DB dropped=${cleanup.testDatabaseDropped}; PostgreSQL stopped=${cleanup.postgresStopped}; runtime removed=${cleanup.runtimeRemoved}`)
}
console.log(`FINAL02 REAL DB: ${results.filter(row=>row.result==='PASS').length}/${results.length} PASS`)
process.exitCode=results.some(row=>row.result!=='PASS')?1:0
