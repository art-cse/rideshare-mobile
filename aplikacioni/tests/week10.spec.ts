import { test, expect as baseExpect, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
const expect = baseExpect.configure({timeout:15000});
test.describe("Week 10 — two isolated sessions and PostgreSQL",()=>{
  test.skip(process.env.RIDESHARE_LOCAL_POSTGRES!=="1","Requires isolated local PostgreSQL");
  test.describe.configure({mode:"serial",timeout:60000});
  let pool:Pool;
  test.beforeAll(async({baseURL})=>{
    if(baseURL!=="http://localhost:3002")throw new Error("Local target only");
    pool=new Pool({connectionString:"postgresql://rideshare_test:local-test-only@127.0.0.1:55432/rideshare_test"});
    for(const file of ['schema.sql','schema-java05.sql','migrations/001-seat-requests.sql','migrations/002-request-location.sql','migrations/003-accounts-trips-favorites.sql'])await pool.query(readFileSync(file,'utf8'));
  });
  test.beforeEach(async()=>{
    await pool.query("TRUNCATE kerkesat RESTART IDENTITY; INSERT INTO profilet(github_id,emri,roli) VALUES('100','Driver Week10','shofer'),('200','Other Driver','shofer'),('300','Passenger Week10','udhetar'),('400','Other Passenger','udhetar') ON CONFLICT(github_id) DO UPDATE SET roli=EXCLUDED.roli; INSERT INTO udhetimet(id,nisja,destinacioni,ora,vendtakimi,vende,shofer_id) VALUES('w10-a','Qyteti A','AAB','08:00','Stacioni A',2,'100'),('w10-b','Qyteti B','AAB','09:00','Stacioni B',2,'100') ON CONFLICT(id) DO UPDATE SET vende=2,aktiv=true,shofer_id='100';");
  });
  test.afterAll(async()=>{
    if(pool){await pool.query("DELETE FROM kerkesat WHERE udhetimi_id IN ('w10-a','w10-b'); DELETE FROM udhetimet WHERE id IN ('w10-a','w10-b');");await pool.end();}
  });
  async function login(context:BrowserContext,id:string){
    await context.clearCookies();const token=await encode({secret:"local-request-workflow-test-only-not-for-deployment",token:{sub:id,name:`Test ${id}`},maxAge:3600});
    await context.addCookies([{name:"next-auth.session-token",value:token,url:"http://localhost:3002",httpOnly:true,sameSite:"Lax"}]);
  }
  test("1 and 2: request arrives without refresh, acceptance updates both screens and persists",async({browser,baseURL},info)=>{
    const passenger=await browser.newContext({baseURL,viewport:{width:Number(info.project.name.split("-")[1]),height:844}}),driver=await browser.newContext({baseURL,viewport:{width:Number(info.project.name.split("-")[1]),height:844}});
    try{
      await login(passenger,'300');await login(driver,'100');const p=await passenger.newPage(),d=await driver.newPage();
      await d.goto('/shofer');await expect(d.locator('[data-request-id]')).toHaveCount(0);
      await p.goto('/udhetimi/w10-a/kerko');await expect(p.getByTestId('trip-seats')).toHaveText('2');
      await p.getByRole('button',{name:'Dërgo kërkesën reale'}).click();await expect(p).toHaveURL(/m=derguar/);
      await expect(d.locator('[data-request-id="1"]')).toContainText('Në pritje');
      await expect(p.locator('[data-request-id="1"]')).toContainText('Në pritje');
      for(const page of [p,d])await expect(page.locator('[data-request-id="1"]').getByTestId('remaining-seats')).toHaveText('2');
      expect((await pool.query("SELECT statusi,vende FROM kerkesat WHERE id=1")).rows[0]).toEqual({statusi:'pending',vende:1});
      await d.getByRole('button',{name:'Prano kërkesën'}).click();
      await expect(p.locator('[data-request-id="1"]')).toContainText('U pranua');
      await expect(d.locator('[data-request-id="1"]')).toContainText('U pranua');
      for(const page of [p,d])await expect(page.locator('[data-request-id="1"]').getByTestId('remaining-seats')).toHaveText('1');
      expect((await pool.query("SELECT rideshare_request_action('100','accept',NULL,1,NULL) AS result")).rows[0].result).toBe('perfunduar');
      expect((await pool.query("SELECT vende FROM udhetimet WHERE id='w10-a'")).rows[0].vende).toBe(1);
      await p.screenshot({path:info.outputPath('passenger-accepted.png'),fullPage:true});
      await d.screenshot({path:info.outputPath('driver-accepted.png'),fullPage:true});
    }finally{await passenger.close();await driver.close();}
  });
  test("3: offline passenger retains 2/pending; reconnect receives 1/accepted without refresh",async({browser,baseURL},info)=>{
    const passenger=await browser.newContext({baseURL,viewport:{width:Number(info.project.name.split("-")[1]),height:844}}),driver=await browser.newContext({baseURL,viewport:{width:Number(info.project.name.split("-")[1]),height:844}});
    try{
      await login(passenger,'300');await login(driver,'100');const p=await passenger.newPage(),d=await driver.newPage();
      await p.goto('/udhetimi/w10-b/kerko');await d.goto('/shofer');
      await p.getByRole('button',{name:'Dërgo kërkesën reale'}).click();await expect(p).toHaveURL(/m=derguar/);
      await expect(d.locator('[data-request-id="1"]')).toContainText('Në pritje');
      await passenger.setOffline(true);await expect(p.locator('main [role="alert"]')).toContainText('Po rilidhemi');
      await expect(p.getByRole('button',{name:'Anulo kërkesën'})).toBeDisabled();
      await d.getByRole('button',{name:'Prano kërkesën'}).click();
      await expect(d.locator('[data-request-id="1"]').getByTestId('remaining-seats')).toHaveText('1');
      await expect(p.locator('[data-request-id="1"]')).toContainText('Në pritje');
      await expect(p.locator('[data-request-id="1"]').getByTestId('remaining-seats')).toHaveText('2');
      await p.screenshot({path:info.outputPath('passenger-offline.png'),fullPage:true});
      await passenger.setOffline(false);
      await expect(p.locator('[data-request-id="1"]')).toContainText('U pranua');
      await expect(p.locator('[data-request-id="1"]').getByTestId('remaining-seats')).toHaveText('1');
      await expect(p.locator('main [role="alert"]')).toHaveCount(0);
    }finally{await passenger.close();await driver.close();}
  });
  test("server errors preserve data; private response and account changes cannot leak requests",async({page,context})=>{
    await login(context,'300');await pool.query("SELECT rideshare_request_action('300','create','w10-a',NULL,1)");
    await page.goto('/kerkesat');await expect(page.locator('[data-request-id="1"]')).toBeVisible();
    const response=await context.request.get('/api/gjendja?actor=400');
    expect(response.headers()['cache-control']).toContain('private, no-store');expect(response.headers().vary.split(',').map(v=>v.trim())).toContain('Cookie');
    expect((await response.json()).profil.id).toBe('300');
    await page.route('**/api/gjendja',route=>route.fulfill({status:503,json:{error:'local test'}}));
    await expect(page.locator('main [role="alert"]')).toContainText('Po rilidhemi');
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.getByTestId('remaining-seats')).toHaveText('2');
    await page.unroute('**/api/gjendja');await expect(page.locator('main [role="alert"]')).toHaveCount(0);
    await login(context,'400');
    await expect(page.getByText('Sesioni ndryshoi ose përfundoi.',{exact:false})).toBeVisible();
    await expect(page.locator('[data-request-id]')).toHaveCount(0);
    expect((await (await context.request.get('/api/gjendja')).json()).kerkesat).toEqual([]);
    await context.clearCookies();expect((await context.request.get('/api/gjendja')).status()).toBe(401);
  });
  test("slow polling never overlaps, navigation cancels old trip reads",async({page,context})=>{
    await login(context,'300');let active=0,max=0;let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/api/gjendja?udhetimi=w10-a',async route=>{
      active++;max=Math.max(max,active);await gate;active--;await route.continue().catch(()=>{});
    });
    await page.goto('/udhetimi/w10-a/kerko');
    await expect.poll(()=>active).toBe(1);
    await page.waitForTimeout(6000);expect(max).toBe(1);
    await page.goto('/udhetimi/w10-b/kerko');release();
    await expect(page.getByRole('heading',{name:'Qyteti B – AAB'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Qyteti A – AAB'})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
});
