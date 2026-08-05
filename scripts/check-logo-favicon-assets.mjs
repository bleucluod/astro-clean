import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const bytes = (path) => readFileSync(join(root, path));

function mustContain(label, text, token) {
  if (!text.includes(token)) throw new Error(`${label} missing required token: ${token}`);
}

function mustNotContain(label, text, token) {
  if (text.includes(token)) throw new Error(`${label} must not contain legacy token: ${token}`);
}

function assertFile(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath) || !statSync(fullPath).isFile() || statSync(fullPath).size < 100) {
    throw new Error(`Missing or invalid final brand asset: ${path}`);
  }
}

function assertPng(path, width, height, colorType) {
  const data = bytes(path);
  if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${path} is not a PNG`);
  }
  if (data.readUInt32BE(16) !== width || data.readUInt32BE(20) !== height) {
    throw new Error(`${path} must be ${width}x${height}`);
  }
  if (data[25] !== colorType) {
    throw new Error(`${path} has unexpected PNG color type ${data[25]}`);
  }
}

function assertIco(path) {
  const data = bytes(path);
  if (data.subarray(0, 4).toString("hex") !== "00000100" || data.readUInt16LE(4) < 1) {
    throw new Error(`${path} is not a valid ICO`);
  }
}

function assertHash(path, expected) {
  const actual = createHash("sha256").update(bytes(path)).digest("hex").toUpperCase();
  if (actual !== expected) throw new Error(`${path} does not match the approved final package`);
}

const pngAssets = [
  ["public/halleus-logo/emblem-transparent.png", 1400, 1400, 6, "750B7C051EF34E2DB15009E5BB4EA2CBF2D5B5BD967004BD183F0B2C6AA0626E"],
  ["public/halleus-logo/full-logo-transparent.png", 1500, 2200, 6, "D10CF9A14924F22874413FDDE18E537A48E7D14F0999810DEF2F3977EE48F830"],
  ["public/halleus-logo/wordmark-persian-transparent.png", 1900, 700, 6, "F9C519705F64621FA8611E40F7FCDBEEC6628CF4E58D312890A2BAF0454AC289"],
  ["public/halleus-logo/logo-horizontal-bilingual-final-20260804.png", 1805, 624, 6, "B9C41C5563C1CC5F0B28A05EEB6DAF2013DB5071147D9BDC5E53909C2CD3A001"],
  ["public/halleus-logo/symbol-dark-final-20260804.png", 695, 702, 6, "22BEE90291788F023A56E9D8055379A9DC0BFB3E13C3BD66BC00296EA9DE5601"],
  ["public/halleus-logo/symbol-transparent-white.png", 1400, 1400, 6, "EBAAC5E9EEBADF5490D8F63930C748EC367F526ECB6E1CF4374BAC7F6C7F8D1D"],
  ["public/halleus-logo/symbol-transparent-black.png", 1400, 1400, 6, "750B7C051EF34E2DB15009E5BB4EA2CBF2D5B5BD967004BD183F0B2C6AA0626E"],
  ["public/halleus-logo/wordmark-bilingual-transparent-white.png", 1900, 950, 6, "6ABACC86FE815239255DEA207255D564A22C08B9A8664EBC1A957C562A8D2B04"],
  ["public/halleus-logo/wordmark-bilingual-transparent-black.png", 1900, 950, 6, "36501400793983181E9B18222FF28951D6ECEA3BCE75756062FAD75CE6BDF2F5"],
  ["public/halleus-logo/favicon-32x32.png", 32, 32, 2, "351B0E8836ACD9DAC182E315D48109D0D5D627EB493EC79ED3D1A43185CDDC50"],
  ["public/halleus-logo/favicon-192x192.png", 192, 192, 2, "DD6918CB55984D98E7676DB9F268A76265B4D344E0F39683AB52530DF11DCA05"],
  ["public/halleus-logo/favicon-512x512.png", 512, 512, 2, "9C98DC3B7F188E815A3742A5ABCC93A8A127407A27FAF6554AB094EC506C6F5C"],
  ["public/halleus-logo/social-share-light-1200x630.png", 1200, 630, 2, "EA1AFB3BDB7B9B80B86626B11B1A49C1468E3E7BF547C7480AC9C48B18819E27"],
  ["public/halleus-logo/social-share-dark-1200x630.png", 1200, 630, 2, "FF32368AF782E02D924D57F8CF1E412B58BD361E971AB7D7FE06DDA363A11379"],
  ["public/apple-touch-icon.png", 180, 180, 2, "D2E4AB146FC09411034D09AAF59FECF62185F1B17EB5F83F57DD7A220152F173"],
  ["app/apple-icon.png", 180, 180, 2, "D2E4AB146FC09411034D09AAF59FECF62185F1B17EB5F83F57DD7A220152F173"],
  ["public/icon.png", 512, 512, 2, "9C98DC3B7F188E815A3742A5ABCC93A8A127407A27FAF6554AB094EC506C6F5C"],
  ["app/icon.png", 512, 512, 2, "9C98DC3B7F188E815A3742A5ABCC93A8A127407A27FAF6554AB094EC506C6F5C"],
];

for (const [path, width, height, colorType, hash] of pngAssets) {
  assertFile(path);
  assertPng(path, width, height, colorType);
  assertHash(path, hash);
}

for (const path of ["public/favicon.ico", "app/favicon.ico"]) {
  assertFile(path);
  assertIco(path);
  assertHash(path, "452AC3D48C3EBC956ECB7EAA86C6BD9F8AB4CAD416B1506A6F302BE8A9C9F160");
}

const header = read("components/SiteHeader.tsx");
const shell = read("components/AppShell.tsx");
const styles = read("components/app-shell.module.css");
const layout = read("app/layout.tsx");
const manifest = read("app/manifest.ts");

for (const source of [header, shell]) {
  mustContain("dark site chrome", source, "/halleus-logo/symbol-transparent-white.png");
  mustContain("dark site chrome", source, "/halleus-logo/wordmark-bilingual-transparent-white.png");
  mustNotContain("dark site chrome", source, "data-logo-variant=\"dark\"");
}

mustContain("responsive brand styles", styles, ".brandLogo");
mustContain("responsive brand styles", styles, ".brandLogoMobile");
mustContain("responsive brand styles", styles, ".footerLogo");
mustContain("responsive brand styles", styles, ".brandSymbolAccent");
mustContain("responsive brand styles", styles, ".footerSymbol");

for (const token of [
  'sizes: "180x180"',
  "/halleus-logo/social-share-light-1200x630.png",
  'card: "summary_large_image"',
]) mustContain("root metadata", layout, token);

for (const token of [
  'name: "هالیوس | آسترولوژی فارسی"',
  'display: "standalone"',
  "/halleus-logo/favicon-192x192.png",
  "/halleus-logo/favicon-512x512.png",
]) mustContain("web app manifest", manifest, token);

console.log("Final Halleus brand asset check passed.");
console.log("- dark header and footer use transparent white symbol and bilingual wordmark assets");
console.log("- matching transparent black variants remain available for light surfaces");
console.log("- favicon, app, Apple, transparent, and social assets match approved package hashes");
console.log("- PNG dimensions, alpha expectations, manifest, and social metadata are verified");
