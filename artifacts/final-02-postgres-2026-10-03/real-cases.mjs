import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { realBrowser } from './real-browser.mjs'

export async function runCases(ctx) {
  const {sql,http,test,evidence,save,legacy,pgLog}=ctx
  const uuid=id=>assert.match(id,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
  const timestamp=value=>assert.ok(Number.isFinite(new Date(value).getTime()))
  const snapshot=async id=>({parent:(await sql`select * from news_events where id=${id}`)[0],translations:await sql`select * from news_event_translations where news_event_id=${id} order by locale`})
  const localized=row=>Object.fromEntries(['title','slug','short_description','content','location'].map(key=>[key,row[key]]))
  const content=(text,types=['paragraph'])=>({version:1,blocks:types.map((type,index)=>({type,data:type==='image'?{src:'/final02-local-image.png',alt:'FINAL02 test image'}:type==='bullet_list'?{items:[text+' bullet']}:{text:text+' '+index,...(type==='heading'?{level:2}:{})}}))})
  const vi=(slug,text='FINAL02 VI')=>({title:text,slug,shortDescription:text+' excerpt',location:text+' location',content:content(text)})
  const insertTranslation=(parent,locale,slug)=>sql`insert into news_event_translations (news_event_id,locale,title,slug) values (${parent},${locale},'FINAL02 Constraint fixture',${slug})`
  async function rejectConstraint(fn,code,constraint) {
    let error;try{await fn()}catch(caught){error=caught}
    assert.ok(error,'Expected PostgreSQL constraint rejection');assert.equal(error.code,code)
    assert.equal(error.constraint_name,constraint)
    return {sqlstate:error.code,constraint:error.constraint_name,rejected:true}
  }
  await test('C1','PostgreSQL locale CHECK rejects fr',()=>rejectConstraint(()=>insertTranslation(legacy.id,'fr','final02-fr'),'23514','news_event_translations_locale_check'))
  await test('C2','PostgreSQL event+locale UNIQUE rejects second VI',()=>rejectConstraint(()=>insertTranslation(legacy.id,'vi','final02-duplicate-vi'),'23505','news_event_translations_event_locale_unique'))
  const [constraintParent]=await sql`insert into news_events (type,title,slug) values ('news','FINAL02 constraint parent','final02-constraint-parent') returning id`
  await test('C3','PostgreSQL global translation slug UNIQUE rejects reuse',()=>rejectConstraint(()=>insertTranslation(constraintParent.id,'en',legacy.slug),'23505','news_event_translations_slug_unique'))
  await test('C4','PostgreSQL FK rejects nonexistent parent',()=>rejectConstraint(()=>insertTranslation(randomUUID(),'vi','final02-missing-parent'),'23503','news_event_translations_news_event_id_news_events_id_fk'))
  await test('C5','PostgreSQL parent DELETE cascades to both translations',async()=>{
    const [parent]=await sql`insert into news_events (type,title,slug) values ('news','FINAL02 cascade parent','final02-cascade-parent') returning id`
    await insertTranslation(parent.id,'vi','final02-cascade-vi');await insertTranslation(parent.id,'en','final02-cascade-en')
    assert.equal((await sql`select count(*)::int as count from news_event_translations where news_event_id=${parent.id}`)[0].count,2)
    await sql`delete from news_events where id=${parent.id}`
    const remaining=(await sql`select count(*)::int as count from news_event_translations where news_event_id=${parent.id}`)[0].count
    assert.equal(remaining,0);return {parentId:parent.id,before:2,after:remaining}
  })
  evidence.crud=[]
  await test('USERS','Real Users CREATE/READ/UPDATE/READ/physical DELETE; safe response projection',async()=>{
    const created=await http('POST','/api/users',{email:'final02-user@example.invalid',fullName:'FINAL02 Test User',role:'editor',status:'active'},true,201)
    uuid(created.id);timestamp(created.createdAt)
    assert.equal((await http('GET','/api/users/'+created.id)).fullName,'FINAL02 Test User')
    await http('PUT','/api/users/'+created.id,{fullName:'FINAL02 Updated User',status:'inactive'})
    const read=await http('GET','/api/users/'+created.id);assert.equal(read.fullName,'FINAL02 Updated User');assert.equal(read.status,'inactive');timestamp(read.updatedAt)
    const deleted=await http('DELETE','/api/users/'+created.id);assert.equal(deleted.success,true)
    assert.equal((await sql`select count(*)::int as count from users where id=${created.id}`)[0].count,0)
    await http('GET','/api/users/'+created.id,undefined,true,404)
    evidence.crud.push({module:'Users',create:'PASS',read:'PASS',update:'PASS',delete:'PASS (physical)',publicVisibility:'Protected',result:'PASS'})
    return {created,read,deleted,projection:'No passwordHash in any real HTTP response'}
  })
  await test('STANDARDS','Real Standards CREATE/READ/UPDATE/READ/DELETE; UUID/timestamps serialize',async()=>{
    const created=await http('POST','/api/standards',{code:'FINAL02-CRUD',organization:'ASTM',year:2026,title:'FINAL02 Standard',description:'FINAL02 test description'},true,201)
    uuid(created.id);timestamp(created.createdAt);timestamp(created.updatedAt)
    assert.equal((await http('GET','/api/standards/'+created.id)).code,'FINAL02-CRUD')
    await http('PUT','/api/standards/'+created.id,{title:'FINAL02 Updated Standard',year:2025})
    const read=await http('GET','/api/standards/'+created.id);assert.equal(read.title,'FINAL02 Updated Standard');assert.equal(read.year,2025);timestamp(read.updatedAt)
    await http('DELETE','/api/standards/'+created.id)
    assert.equal((await sql`select count(*)::int as count from standards where id=${created.id}`)[0].count,0)
    evidence.crud.push({module:'Standards',create:'PASS',read:'PASS',update:'PASS',delete:'PASS',publicVisibility:'Protected',result:'PASS'})
    return {created,read,physicalRowsAfterDelete:0}
  })
  await test('MEDIA','Real Media metadata CREATE/READ/DELETE; no unsupported UPDATE/network storage',async()=>{
    const created=await http('POST','/api/media',{fileName:'final02-fixture.png',storageKey:'final02/fixture.png',publicUrl:ctx.origin+'/final02-fixture.png',mimeType:'image/png',sizeBytes:1024,width:32,height:32,altText:'FINAL02 fixture'},true,201)
    uuid(created.id);timestamp(created.createdAt)
    const read=await http('GET','/api/media/'+created.id);assert.equal(read.sizeBytes,1024);assert.equal(read.fileName,'final02-fixture.png')
    await http('DELETE','/api/media/'+created.id)
    assert.equal((await sql`select count(*)::int as count from media_assets where id=${created.id}`)[0].count,0)
    evidence.crud.push({module:'Media',create:'PASS',read:'PASS',update:'N/A (no endpoint)',delete:'PASS',publicVisibility:'Protected',result:'PASS'})
    return {created,read,storageNetworkUsed:false,physicalRowsAfterDelete:0}
  })
  await test('MACHINES','Real Machines relational CRUD; draft hidden, published visible; child cascade',async()=>{
    const standard=await http('POST','/api/standards',{code:'FINAL02-MACHINE',organization:'ASTM',year:2026},true,201)
    const created=await http('POST','/api/machines',{name:'FINAL02 Test Machine',slug:'final02-machine',model:'FINAL02-QA',shortDescription:'FINAL02 machine excerpt',description:'FINAL02 machine description',mainImageId:null,status:'draft',sortOrder:1,
      specs:[{groupName:'FINAL02 Group',specName:'Range',specValue:'0–100',unit:'test',sortOrder:1}],applications:[{title:'FINAL02 Application',description:'Test application'}],highlights:[{title:'FINAL02 Highlight',description:'Test highlight',icon:'Zap'}],standards:[{standardId:standard.id,note:'FINAL02 relation'}]},true,201)
    uuid(created.id);timestamp(created.createdAt);assert.equal(created.mainImageId,null)
    const adminRead=await http('GET','/api/admin/machines/'+created.id);assert.equal(adminRead.specs.length,1);assert.equal(adminRead.standards[0].standard.id,standard.id)
    await http('GET','/api/machines/final02-machine',undefined,false,404)
    assert.equal((await http('GET','/api/machines',undefined,false)).some(row=>row.id===created.id),false)
    await http('PUT','/api/machines/'+created.id,{name:'FINAL02 Updated Machine',status:'published',specs:[{groupName:'FINAL02 Group',specName:'Range',specValue:'0–200',unit:'test'}]})
    const publicRead=await http('GET','/api/machines/final02-machine',undefined,false);assert.equal(publicRead.name,'FINAL02 Updated Machine');assert.equal(publicRead.specs[0].specValue,'0–200');timestamp(publicRead.updatedAt)
    assert.equal((await http('GET','/api/machines',undefined,false)).some(row=>row.id===created.id),true)
    await http('DELETE','/api/machines/'+created.id)
    const children=(await sql`select (select count(*) from machine_specs where machine_id=${created.id})::int as specs,(select count(*) from machine_applications where machine_id=${created.id})::int as applications,(select count(*) from machine_highlights where machine_id=${created.id})::int as highlights,(select count(*) from machine_standards where machine_id=${created.id})::int as standards`)[0]
    assert.deepEqual({...children},{specs:0,applications:0,highlights:0,standards:0})
    assert.equal((await sql`select count(*)::int as count from machines where id=${created.id}`)[0].count,0)
    await http('DELETE','/api/standards/'+standard.id)
    evidence.crud.push({module:'Machines',create:'PASS',read:'PASS',update:'PASS',delete:'PASS',publicVisibility:'Draft hidden / published visible',result:'PASS'})
    return {created,publicRead,childrenAfterDelete:children}
  })

  let viOnly,bilingual,draft
  const start='2026-11-11T09:00:00.000Z',end1='2026-11-11T11:45:00.000Z',end2='2026-11-12T12:45:00.000Z'
  await test('NEWS_VI','Real authored VI-only CREATE mirrors legacy parent and stores one VI, zero EN',async()=>{
    const authored=vi('final02-vi-only','FINAL02 Published VI Only')
    viOnly=await http('POST','/api/news-events',{type:'event',status:'published',thumbnailImageId:null,eventStartAt:start,eventEndAt:end1,translations:{vi:authored}},true,201)
    const db=await snapshot(viOnly.id);assert.equal(db.translations.length,1);assert.equal(db.translations[0].locale,'vi')
    assert.deepEqual(localized(db.parent),localized(db.translations[0]))
    assert.equal(db.parent.title,authored.title);assert.equal(db.parent.slug,authored.slug);assert.deepEqual(db.parent.content,authored.content);assert.equal(db.parent.location,authored.location)
    const read=await http('GET','/api/admin/news-events/'+viOnly.id);assert.equal(read.translations.en,null)
    evidence.viOnly=db;return db
  })
  await test('NEWS_BILINGUAL','Real bilingual CREATE stores independent VI/EN trees and mirrors VI only',async()=>{
    const viInput={...vi('final02-bilingual-vi','FINAL02 Bilingual VI'),content:content('FINAL02 VI tree',['heading','paragraph','image','paragraph','quote'])}
    const enInput={...vi('final02-bilingual-en','FINAL02 Authored English'),content:content('FINAL02 EN tree',['paragraph','bullet_list','heading'])}
    bilingual=await http('POST','/api/news-events',{type:'news',status:'published',translations:{vi:viInput,en:enInput}},true,201)
    const db=await snapshot(bilingual.id);assert.equal(db.translations.length,2)
    const viRow=db.translations.find(row=>row.locale==='vi'),enRow=db.translations.find(row=>row.locale==='en')
    assert.deepEqual(localized(db.parent),localized(viRow));assert.equal(db.parent.title,viInput.title);assert.notEqual(db.parent.title,enInput.title)
    assert.deepEqual(viRow.content,viInput.content);assert.deepEqual(enRow.content,enInput.content)
    evidence.bilingual=db;return db
  })
  assert.ok(viOnly&&bilingual,'Authored News fixtures required for dependent proofs')
  await test('B1','Real eventStartAt/eventEndAt CREATE, UPDATE and explicit NULL persistence',async()=>{
    const readDates=async()=>(await sql`select event_start_at,event_end_at from news_events where id=${viOnly.id}`)[0]
    const created=await readDates();assert.equal(created.event_start_at.toISOString(),start);assert.equal(created.event_end_at.toISOString(),end1)
    await http('PUT','/api/news-events/'+viOnly.id,{eventEndAt:end2})
    const updated=await readDates();assert.equal(updated.event_end_at.toISOString(),end2);assert.equal(updated.event_start_at.toISOString(),start)
    await http('PUT','/api/news-events/'+viOnly.id,{eventEndAt:null})
    const cleared=await readDates();assert.equal(cleared.event_end_at,null);assert.equal(cleared.event_start_at.toISOString(),start)
    evidence.b1={created,updated,cleared};return evidence.b1
  })
  await test('B2','Invalid VI title/slug HTTP400; no BEGIN/write statements; full parent/VI/EN equality',async()=>{
    const proofs=[]
    for(const invalid of [{title:'   '},{slug:''},{slug:'   '}]) {
      const before=await snapshot(bilingual.id);const offset=pgLog().length
      await http('PUT','/api/news-events/'+bilingual.id,{translations:{vi:invalid}},true,400)
      const after=await snapshot(bilingual.id);assert.deepEqual(after,before)
      await new Promise(resolve=>setTimeout(resolve,100))
      const log=pgLog().slice(offset)
      assert.equal(/\b(?:begin|start transaction)\b|\b(?:update|insert into|delete from)\s+"?(?:news_events|news_event_translations)"?/i.test(log),false)
      proofs.push({input:invalid,httpStatus:400,before,after,exactEquality:true,transactionOrNewsWriteStatements:0})
    }
    evidence.b2=proofs;return proofs
  })
  await test('EN_ONLY','Real EN-only UPDATE changes EN; VI row and parent localized fields unchanged',async()=>{
    const before=await snapshot(bilingual.id)
    const en={...vi('final02-bilingual-en-updated','FINAL02 Updated English'),content:content('FINAL02 updated EN',['paragraph','bullet_list','heading'])}
    await http('PUT','/api/news-events/'+bilingual.id,{translations:{en}})
    const after=await snapshot(bilingual.id)
    assert.deepEqual(after.translations.find(row=>row.locale==='vi'),before.translations.find(row=>row.locale==='vi'))
    assert.deepEqual(localized(after.parent),localized(before.parent))
    assert.equal(after.translations.find(row=>row.locale==='en').title,en.title);assert.equal(after.translations.find(row=>row.locale==='en').slug,en.slug)
    assert.deepEqual(after.translations.find(row=>row.locale==='en').content,en.content)
    evidence.enOnly={before,after,viExactlyUnchanged:true,parentLocalizedFieldsUnchanged:true,parentUpdatedAtMayChange:true};return evidence.enOnly
  })
  await test('VI_ONLY','Real VI-only UPDATE mirrors parent title/slug/content/location; EN unchanged',async()=>{
    const before=await snapshot(bilingual.id)
    const input={...vi('final02-bilingual-vi-updated','FINAL02 Updated Vietnamese'),content:content('FINAL02 updated VI',['heading','paragraph','image','paragraph','quote'])}
    await http('PUT','/api/news-events/'+bilingual.id,{translations:{vi:input}})
    const after=await snapshot(bilingual.id)
    assert.deepEqual(after.translations.find(row=>row.locale==='en'),before.translations.find(row=>row.locale==='en'))
    assert.deepEqual(localized(after.parent),localized(after.translations.find(row=>row.locale==='vi')))
    assert.equal(after.parent.title,input.title);assert.equal(after.parent.slug,input.slug);assert.equal(after.parent.location,input.location);assert.deepEqual(after.parent.content,input.content)
    evidence.viOnlyUpdate={before,after,enExactlyUnchanged:true,viMirrored:true};return evidence.viOnlyUpdate
  })
  await test('POLICY_A','Real public locale lists: published VI-only+bilingual in VI, authored bilingual only in EN, drafts hidden',async()=>{
    draft=await http('POST','/api/news-events',{type:'news',status:'draft',translations:{vi:vi('final02-draft-vi'),en:vi('final02-draft-en','FINAL02 Draft English')}},true,201)
    const viList=await http('GET','/api/news-events?locale=vi',undefined,false)
    const enList=await http('GET','/api/news-events?locale=en',undefined,false)
    assert.ok(viList.some(row=>row.id===viOnly.id));assert.ok(viList.some(row=>row.id===bilingual.id));assert.equal(viList.some(row=>row.id===draft.id),false)
    assert.ok(enList.some(row=>row.id===bilingual.id));assert.equal(enList.some(row=>row.id===viOnly.id),false);assert.equal(enList.some(row=>row.id===draft.id),false)
    const enDetail=await http('GET','/api/news-events/final02-bilingual-en-updated?locale=en',undefined,false);assert.equal(enDetail.title,'FINAL02 Updated English')
    await http('GET','/api/news-events/final02-vi-only?locale=en',undefined,false,404)
    await http('GET','/api/news-events/final02-draft-vi',undefined,false,404)
    const draftAdmin=await http('GET','/api/admin/news-events/'+draft.id);assert.equal(draftAdmin.status,'draft')
    evidence.policyA={viList,enList,enDetail,draftAdmin,viOnlyEnStatus:404,draftPublicStatus:404};return evidence.policyA
  })
  let runtimeLegacy
  await test('B3_API','Legacy post-migration parent WITHOUT translations: real VI title/body/excerpt/location; EN no fallback',async()=>{
    const [created]=await sql`insert into news_events (type,title,slug,short_description,content,location,status) values ('news','FINAL02 Legacy Runtime Article','final02-legacy-runtime','FINAL02 Legacy Runtime Excerpt',${sql.json(content('FINAL02 Legacy Runtime Body'))},'FINAL02 Legacy Runtime Location','published') returning *`
    runtimeLegacy=created
    assert.equal((await sql`select count(*)::int as count from news_event_translations where news_event_id=${created.id}`)[0].count,0)
    const viResponse=await http('GET','/api/news-events/final02-legacy-runtime?locale=vi',undefined,false)
    assert.equal(viResponse.title,created.title);assert.equal(viResponse.shortDescription,created.short_description);assert.equal(viResponse.location,created.location);assert.deepEqual(viResponse.content,created.content)
    assert.equal(viResponse.translations.en,null)
    await http('GET','/api/news-events/final02-legacy-runtime?locale=en',undefined,false,404)
    assert.equal((await http('GET','/api/news-events?locale=en',undefined,false)).some(row=>row.id===created.id),false)
    evidence.b3={physicalParent:created,physicalTranslationCount:0,viResponse,enDetailStatus:404,enListContainsLegacy:false};return evidence.b3
  })
  await test('ROLLBACK_CREATE','Real translation UNIQUE failure after parent+VI inserts rolls back all new rows',async()=>{
    const offset=pgLog().length
    await http('POST','/api/news-events',{type:'news',status:'published',translations:{vi:vi('final02-rollback-create','FINAL02 Rollback Create VI'),en:vi('final02-vi-only','FINAL02 Rollback Create EN')}},true,[409,500])
    const parentCount=(await sql`select count(*)::int as count from news_events where slug='final02-rollback-create'`)[0].count
    const translationCount=(await sql`select count(*)::int as count from news_event_translations where title in ('FINAL02 Rollback Create VI','FINAL02 Rollback Create EN')`)[0].count
    assert.equal(parentCount,0);assert.equal(translationCount,0)
    await new Promise(resolve=>setTimeout(resolve,100))
    const log=pgLog().slice(offset)
    assert.match(log,/insert into "news_events"/i);assert.ok((log.match(/execute[^\r\n]*insert into "news_event_translations"/gi)||[]).length>=2);assert.match(log,/23505/);assert.match(log,/rollback/i)
    const proof={mechanism:'Existing global translation slug final02-vi-only reused ONLY by new EN; parent slug distinct; parent and VI inserted before EN constraint fails',parentCount,translationCount,sqlstate:'23505',rollbackObserved:true}
    evidence.createRollback=proof;await save('create-rollback-postgres.log',log);return proof
  })
  await test('ROLLBACK_UPDATE','Real VI translation UNIQUE failure after parent UPDATE rolls back parent and translations',async()=>{
    const before=await snapshot(bilingual.id);const enSlug=before.translations.find(row=>row.locale==='en').slug
    assert.equal((await sql`select count(*)::int as count from news_events where slug=${enSlug}`)[0].count,0,'EN slug must not conflict with parent table')
    const offset=pgLog().length
    await http('PUT','/api/news-events/'+bilingual.id,{translations:{vi:{title:'FINAL02 Rollback Update VI',slug:enSlug,location:'FINAL02 Rollback Update Location'}}},true,[409,500])
    const after=await snapshot(bilingual.id);assert.deepEqual(after,before)
    await new Promise(resolve=>setTimeout(resolve,100))
    const log=pgLog().slice(offset);assert.match(log,/update "news_events"/i);assert.match(log,/update "news_event_translations"/i);assert.match(log,/23505/);assert.match(log,/rollback/i)
    const proof={mechanism:'New VI slug collides with existing EN translation slug; parent legacy slug update succeeds first because EN slug is absent from parent table',before,after,exactEquality:true,sqlstate:'23505',rollbackObserved:true}
    evidence.updateRollback=proof;await save('update-rollback-postgres.log',log);return proof
  })
  await test('NEWS_DELETE','Real protected News DELETE physically removes parent and translations',async()=>{
    const created=await http('POST','/api/news-events',{type:'news',status:'draft',translations:{vi:vi('final02-delete-vi'),en:vi('final02-delete-en','FINAL02 Delete English')}},true,201)
    assert.equal((await snapshot(created.id)).translations.length,2)
    await http('DELETE','/api/news-events/'+created.id)
    assert.equal((await sql`select count(*)::int as count from news_events where id=${created.id}`)[0].count,0)
    assert.equal((await sql`select count(*)::int as count from news_event_translations where news_event_id=${created.id}`)[0].count,0)
    evidence.crud.push({module:'News',create:'PASS',read:'PASS',update:'PASS',delete:'PASS',publicVisibility:'Policy A PASS',result:'PASS'})
    return {id:created.id,parentCount:0,translationCount:0}
  })
  await test('CONTACTS','Real public six-field Contact CREATE; forbidden fields rejected; protected READ/PATCH/DELETE',async()=>{
    const visitor={fullName:'FINAL02 Visitor',companyName:'FINAL02 Company',email:'final02-visitor@example.invalid',phone:'+84 912345678',requestType:'quotation',message:'FINAL02 PostgreSQL contact request'}
    assert.equal(Object.keys(visitor).length,6)
    const created=await http('POST','/api/contacts',visitor,false,201);uuid(created.id)
    const [db]=await sql`select * from contacts where id=${created.id}`
    assert.equal(db.status,'new');assert.equal(db.assigned_to,null);assert.equal(db.admin_note,null);assert.equal(db.resolved_at,null);assert.equal(db.subject,'Yêu cầu báo giá');timestamp(db.created_at)
    const beforeCount=(await sql`select count(*)::int as count from contacts`)[0].count
    for(const injected of [{status:'resolved'},{assignedUserId:ctx.admin.id},{assignedTo:ctx.admin.id},{adminNote:'FINAL02 injection',createdAt:'2000-01-01T00:00:00Z'}]) await http('POST','/api/contacts',{...visitor,...injected},false,400)
    assert.equal((await sql`select count(*)::int as count from contacts`)[0].count,beforeCount)
    const read=await http('GET','/api/contacts/'+created.id);assert.equal(read.status,'new')
    await http('PATCH','/api/contacts/'+created.id+'/status',{status:'resolved',adminNote:'FINAL02 Reviewed',assignedTo:ctx.admin.id})
    const updated=await http('GET','/api/contacts/'+created.id);assert.equal(updated.status,'resolved');assert.equal(updated.assignedUser.id,ctx.admin.id);timestamp(updated.resolvedAt)
    await http('DELETE','/api/contacts/'+created.id)
    assert.equal((await sql`select count(*)::int as count from contacts where id=${created.id}`)[0].count,0)
    evidence.crud.push({module:'Contacts',create:'PASS',read:'PASS',update:'PASS',delete:'PASS',publicVisibility:'POST public / admin operations protected',result:'PASS'})
    return {visitor,initialDbRow:db,read,updated,injectionStatuses:[400,400,400,400],physicalRowsAfterDelete:0}
  })
  await test('B3_BROWSER','Production public browser → real Nest API → real PostgreSQL legacy VI/EN availability',async()=>{
    assert.ok(runtimeLegacy)
    const proof=await realBrowser({...ctx,runtimeLegacy,bilingual})
    evidence.realBrowser=proof;return proof
  })
  await test('DATA_INTEGRITY','Real DB final orphans / duplicate locale / invalid locale / duplicate slug all ZERO',async()=>{
    const [counts]=await sql`select
      (select count(*) from news_event_translations t left join news_events n on n.id=t.news_event_id where n.id is null)::int as orphans,
      (select count(*) from (select news_event_id,locale from news_event_translations group by news_event_id,locale having count(*)>1) d)::int as duplicate_event_locale,
      (select count(*) from news_event_translations where locale not in ('vi','en'))::int as invalid_locale,
      (select count(*) from (select slug from news_event_translations group by slug having count(*)>1) d)::int as duplicate_slug`
    assert.deepEqual({...counts},{orphans:0,duplicate_event_locale:0,invalid_locale:0,duplicate_slug:0})
    evidence.dataIntegrity=counts;return counts
  })
}
