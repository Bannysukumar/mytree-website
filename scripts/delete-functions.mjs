/**
 * Deletes every Cloud Function (1st and 2nd gen) in the project.
 */
import { GoogleAuth } from "google-auth-library";

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const project = process.env.FIREBASE_PROJECT_ID || "uwgea32";
const auth = new GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const client = await auth.getClient();

async function listAll(base) {
  const found = [];
  let pageToken = "";
  do {
    const url = new URL(base);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await client.request({ url: url.toString() });
    found.push(...(res.data.functions || []));
    pageToken = res.data.nextPageToken || "";
  } while (pageToken);
  return found;
}

const v1 = await listAll(`https://cloudfunctions.googleapis.com/v1/projects/${project}/locations/-/functions`);
const v2 = await listAll(`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions`);
const names = [...new Set([...v1, ...v2].map((fn) => fn.name))];
console.log(names.length ? names.join("\n") : "No Cloud Functions found.");

for (const name of names) {
  const version = name.includes("/functions/") && name.split("/locations/")[0].includes("projects") ? "v2" : "v1";
  const api = name.startsWith("projects/") ? (v2.some((fn) => fn.name === name) ? "v2" : "v1") : "v1";
  const url = `https://cloudfunctions.googleapis.com/${api}/${name}`;
  console.log(`Deleting ${name}`);
  const res = await client.request({ url, method: "DELETE" });
  console.log(res.data?.name || res.status || "delete requested");
  void version;
}
