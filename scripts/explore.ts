// Ad-hoc exploration helper: npx tsx scripts/explore.ts <cmd> <arg>
import { searchEntities, introspect, getEntity, knowledgeQuery, knowledgeSearch } from "../src/lib/cala";
const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(" ");
(async () => {
  let out: unknown;
  if (cmd === "search") out = await searchEntities(arg, { limit: 10 });
  else if (cmd === "intro") out = await introspect(arg);
  else if (cmd === "get") out = await getEntity(rest[0], rest[1] ? JSON.parse(rest[1]) : {});
  else if (cmd === "query") out = await knowledgeQuery(arg);
  else if (cmd === "ksearch") out = await knowledgeSearch(arg);
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
