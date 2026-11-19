import { beforeAll, beforeEach, afterAll, test, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({session:vi.fn(),sql:vi.fn()}));
vi.mock("server-only",()=>({}));vi.mock("next-auth",()=>({getServerSession:mocks.session}));
vi.mock("../src/lib/auth",()=>({authOptions:{}}));vi.mock("../src/lib/db",()=>({getSql:()=>mocks.sql}));
import { lexoGjendjen } from "../src/lib/gjendja";
import { GET } from "../src/app/api/gjendja/route";
const db=new PGlite();
const login=(id:string|null)=>mocks.session.mockResolvedValue(id?{user:{id,name:'Test'}}:null);
beforeAll(async()=>{
  for(const file of ['schema.sql','schema-java05.sql','migrations/001-seat-requests.sql','migrations/002-request-location.sql','migrations/003-accounts-trips-favorites.sql'])await db.exec(readFileSync(file,'utf8'));
},30000);
beforeEach(async()=>{
  mocks.sql.mockReset().mockImplementation(async(strings:TemplateStringsArray,...values:unknown[])=>(await db.query(strings.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values)).rows);
  await db.exec("TRUNCATE kerkesat RESTART IDENTITY; INSERT INTO profilet(github_id,emri,roli) VALUES('100','Driver','shofer'),('200','Other Driver','shofer'),('300','Passenger','udhetar'),('400','Other Passenger','udhetar') ON CONFLICT DO NOTHING; UPDATE udhetimet SET shofer_id='100',vende=2 WHERE id='1'; UPDATE udhetimet SET shofer_id='200' WHERE id='2'; SELECT rideshare_request_action('300','create','1',NULL,1); SELECT rideshare_request_action('400','create','2',NULL,1);");
  login('300');
});
afterAll(async()=>{await db.close();});
test('snapshot scopes passenger and driver data and returns persisted seats/status',async()=>{
  const state=await lexoGjendjen();expect(state?.kerkesat).toHaveLength(1);expect(state?.kerkesat[0]).toMatchObject({udhetimi_id:'1',statusi:'pending',vende_lira:2});
  login('100');expect((await lexoGjendjen())?.kerkesat.map(k=>k.udhetimi_id)).toEqual(['1']);
  expect((await lexoGjendjen('2'))?.udhetimet).toEqual([]);
  await db.exec("SELECT rideshare_request_action('100','accept',NULL,1,NULL)");
  login('300');const accepted=await lexoGjendjen();expect(accepted?.kerkesat[0]).toMatchObject({statusi:'accepted',vende_lira:1});expect(accepted?.udhetimet[0].vende).toBe(1);
  login('400');expect((await lexoGjendjen('1'))?.kerkesat).toEqual([]);
});
test('API ignores supplied identity and disables caching on successful, unauthorized and failed reads',async()=>{
  const request=new NextRequest('http://localhost/api/gjendja?actor=400');
  let response=await GET(request);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('private, no-store');expect(response.headers.get('vary')).toBe('Cookie');
  expect((await response.json()).profil.id).toBe('300');
  login(null);response=await GET(request);expect(response.status).toBe(401);expect(response.headers.get('cache-control')).toContain('no-store');
  login('300');mocks.sql.mockRejectedValue(new Error('database failure'));response=await GET(request);expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toContain('no-store');expect(await response.json()).not.toHaveProperty('kerkesat');
});
test('trip filtering and invalid input never expand private data',async()=>{
  expect((await lexoGjendjen('2'))?.kerkesat).toEqual([]);
  expect((await GET(new NextRequest('http://localhost/api/gjendja?udhetimi='))).status).toBe(400);
  expect((await lexoGjendjen("1' OR '1'='1"))?.kerkesat).toEqual([]);
});
