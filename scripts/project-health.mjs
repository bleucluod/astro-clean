import { execFileSync } from "node:child_process";

function run(command, args = []) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const branch = run("git", ["branch", "--show-current"]);
const status = run("git", ["status", "--short"]);
const lastCommit = run("git", ["--no-pager", "log", "--oneline", "--decorate", "-1"]);

console.log("Astro Clean project health");
console.log("--------------------------");
console.log(`Branch: ${branch}`);
console.log(`Last commit: ${lastCommit}`);
console.log(status ? `Working tree changes:\n${status}` : "Working tree: clean");
