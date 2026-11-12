// Explicit one-time provisioning for the requested existing trips. No passwords in source or logs.
import { Client } from "pg";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const target = new URL(process.env.DATABASE_URL ?? "");
if (process.env.RIDESHARE_PROVISION !== "existing-trips" || !target.hostname.endsWith(".neon.tech")) throw new Error("Explicit Neon provisioning flag required");
const output = new URL("../../.env.local-accounts.txt", import.meta.url);
if (existsSync(output)) throw new Error("Private account file already exists; refusing to replace accounts");
target.hostname = target.hostname.replace("-pooler.", ".");
target.searchParams.set("sslmode", "verify-full");
const client = new Client({connectionString: target.toString(), connectionTimeoutMillis:15000});
const accounts = [
  { username:"dreni", name:"Dren Gashi", role:"shofer", trips:["1","3"] },
  { username:"lira", name:"Lira Krasniqi", role:"shofer", trips:["2"] },
  { username:"arta", name:"Arta Berisha", role:"udhetar", trips:[] },
].map(a => ({...a,id:`local:${randomUUID()}`,password:`${a.username}-${randomBytes(9).toString("base64url")}`}));
await client.connect();
try {
  await client.query(readFileSync(new URL("../migrations/003-accounts-trips-favorites.sql",import.meta.url),"utf8"));
  await client.query("BEGIN");
  const trips = (await client.query("SELECT id,shofer_id FROM udhetimet WHERE id IN ('1','2','3') ORDER BY id FOR UPDATE")).rows;
  if(trips.length!==3 || trips.some(t=>t.shofer_id!==null && t.shofer_id!=="DEMO-SHOFER-2")) throw new Error("Trip ownership changed; refusing reassignment");
  if(Number((await client.query("SELECT count(*) FROM kerkesat WHERE udhetimi_id IN ('1','2','3')")).rows[0].count)!==0) throw new Error("Trips have requests; review ownership first");
  for(const account of accounts) {
    const salt=randomBytes(16).toString("hex");
    const hash=`${salt}:${scryptSync(account.password,salt,64).toString("hex")}`;
    await client.query("INSERT INTO profilet(github_id,emri,roli) VALUES($1,$2,$3)",[account.id,account.name,account.role]);
    await client.query("INSERT INTO local_accounts(profile_id,username,password_hash) VALUES($1,$2,$3)",[account.id,account.username,hash]);
    for(const trip of account.trips) await client.query("UPDATE udhetimet SET shofer_id=$1 WHERE id=$2",[account.id,trip]);
  }
  // Save before COMMIT so a filesystem failure rolls back the account creation.
  writeFileSync(output, "Private RideShare accounts — do not commit/share publicly\nhttps://rideshare-mobile-five.vercel.app/panel\n\n" +
    accounts.map(a=>`Username: ${a.username}\nPassword: ${a.password}\nRole: ${a.role}\nTrips: ${a.trips.join(", ") || "passenger"}\n`).join("\n"),{flag:"wx",mode:0o600});
  await client.query("COMMIT");
  console.log(JSON.stringify({created:accounts.map(a=>({username:a.username,role:a.role,trips:a.trips})),passwords:"Saved in ignored .env.local-accounts.txt"}));
} catch(error) { await client.query("ROLLBACK"); throw error; }
finally { await client.end(); }
