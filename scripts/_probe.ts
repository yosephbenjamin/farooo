import { calaRequest, calaStats } from "../src/lib/cala";
(async () => {
  const id = "88917971-7acd-5977-b108-0ef6fa5ce36e";
  const mid = process.argv[2];
  for (const body of [
    { properties: ["name"], numerical_observations: { ObservableProperty: [mid] } },
    { properties: ["name"], numerical_observations: [mid] },
  ]) {
    const r: any = await calaRequest("POST", `/v1/entities/${id}`, body).catch((e) => ({ err: String(e).slice(0, 300) }));
    console.log(JSON.stringify(body).slice(0, 120), "=>", JSON.stringify(r).slice(0, 900));
    if (!r.err && JSON.stringify(r).includes("observ")) break;
  }
  console.log(JSON.stringify(calaStats));
})();
