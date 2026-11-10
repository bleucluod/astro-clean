'use strict';
// S1 backup gate. Read the real database URL from the running Halleus process;
// never expose it in argv, logs, temporary files or GitHub.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

function majorOf(output) {
  const match = String(output).match(/\bPostgreSQL\)?\s+(\d+)(?:\.\d+)?/i);
  return match ? Number(match[1]) : null;
}
function chooseClient(serverMajor, candidates) {
  const compatible = candidates.filter(x => Number.isInteger(x.major) && x.major >= serverMajor
    && typeof x.dump === 'string' && typeof x.restore === 'string')
    .sort((a, b) => a.major - b.major || a.dump.localeCompare(b.dump));
  return compatible[0] || null;
}
function classify(error) {
  const message = String(error || '').toLowerCase();
  if (/server version mismatch|aborting because of server version mismatch|server version:.*pg_dump version/.test(message)) return 'client_server_version_mismatch';
  if (/password authentication failed|no password supplied/.test(message)) return 'database_authentication';
  if (/permission denied|must be superuser|insufficient privilege/.test(message)) return 'database_permissions';
  if (/could not connect|connection refused|timeout expired|could not translate host name|no route to host/.test(message)) return 'database_connectivity';
  if (/certificate|ssl|tls/.test(message)) return 'ssl_connection';
  if (/no space left on device|disk full/.test(message)) return 'backup_storage';
  if (/unrecognized option|unrecognized configuration parameter|invalid connection option/.test(message)) return 'connection_options';
  if (/could not open output file|could not write to output/.test(message)) return 'backup_file_access';
  return 'pg_dump_query_or_connection_failed';
}
function connectionEnv(rawUrl, currentEnv = {}) {
  const uri = new URL(rawUrl);
  if (!['postgres:', 'postgresql:'].includes(uri.protocol) || !uri.hostname || !uri.username || !uri.pathname || uri.pathname === '/') {
    throw new Error('invalid_runtime_connection_uri');
  }
  const options = Object.create(null);
  const supported = {
    sslmode: 'PGSSLMODE', sslrootcert: 'PGSSLROOTCERT', sslcert: 'PGSSLCERT',
    sslkey: 'PGSSLKEY', channel_binding: 'PGCHANNELBINDING',
    target_session_attrs: 'PGTARGETSESSIONATTRS', gssencmode: 'PGGSSENCMODE',
    application_name: 'PGAPPNAME', connect_timeout: 'PGCONNECT_TIMEOUT',
    options: 'PGOPTIONS', sslcrl: 'PGSSLCRL', sslcrldir: 'PGSSLCRLDIR',
  };
  for (const [name, value] of uri.searchParams) {
    const key = supported[name];
    if (!key) throw new Error('unsupported_runtime_connection_option');
    options[key] = value;
  }
  const env = {
    PATH: currentEnv.PATH || '/usr/bin:/bin', HOME: '/root',
    PGHOST: uri.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: uri.port || '5432',
    PGUSER: decodeURIComponent(uri.username),
    PGPASSWORD: decodeURIComponent(uri.password),
    PGDATABASE: decodeURIComponent(uri.pathname.slice(1)),
    PGCONNECT_TIMEOUT: '10',
    ...options,
  };
  if (!env.PGDATABASE || !env.PGUSER) throw new Error('incomplete_runtime_connection_uri');
  return env;
}
function existingClients() {
  const bins = [];
  try {
    for (const version of fs.readdirSync('/usr/lib/postgresql')) {
      if (!/^\d+$/.test(version)) continue;
      const base = path.join('/usr/lib/postgresql', version, 'bin');
      bins.push({ dump: path.join(base, 'pg_dump'), restore: path.join(base, 'pg_restore') });
    }
  } catch { /* No versioned binaries installed. */ }
  bins.push({ dump: '/usr/bin/pg_dump', restore: '/usr/bin/pg_restore' });
  const available = [];
  for (const entry of bins) {
    try {
      fs.accessSync(entry.dump, fs.constants.X_OK);
      fs.accessSync(entry.restore, fs.constants.X_OK);
    } catch { continue; }
    const check = spawnSync(entry.dump, ['--version'], { encoding: 'utf8', timeout: 5000 });
    const major = check.status === 0 ? majorOf(check.stdout) : null;
    if (major) available.push({ ...entry, major });
  }
  return available;
}
async function main(pid, outputFile) {
  if (!/^\d+$/.test(pid || '') || !outputFile || !outputFile.startsWith('/root/halleus-bitpay-preflight/')) {
    throw new Error('invalid_backup_arguments');
  }
  let url = '';
  try {
    url = fs.readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0')
      .find(value => value.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length) || '';
  } catch { throw new Error('runtime_db_environment_unavailable'); }
  if (!url) throw new Error('runtime_database_url_missing');
  const postgres = createRequire('/srv/halleus/current/package.json')('postgres');
  const sql = postgres(url, { max: 1, connect_timeout: 8, idle_timeout: 2, prepare: false });
  let serverMajor;
  try {
    const [facts] = await sql`
      select current_setting('server_version_num')::integer as version,
        to_regclass('halleus_private.shop_orders') is not null as orders,
        to_regclass('halleus_private.shop_order_events') is not null as events
    `;
    if (!facts?.orders || !facts?.events) throw new Error('base_shop_schema_missing');
    serverMajor = Math.floor(Number(facts.version) / 10000);
    if (!Number.isInteger(serverMajor) || serverMajor < 12 || serverMajor > 30) throw new Error('server_major_invalid');
  } finally { await sql.end({ timeout: 2 }); }
  console.log(`BITPAY_BACKUP: server_major=${serverMajor}`);
  const candidates = existingClients();
  const chosen = chooseClient(serverMajor, candidates);
  if (!chosen) {
    console.error(`BITPAY_RELEASE_HOLD: matching pg_dump/pg_restore not installed for server PostgreSQL ${serverMajor}+`);
    console.error(`BITPAY_BACKUP: available_pg_dump_majors=${candidates.map(x => x.major).join(',') || 'none'}`);
    console.error('BITPAY_BACKUP: install a compatible PostgreSQL client first; no deployment, migration or activation attempted');
    process.exitCode = 8;
    return;
  }
  console.log(`BITPAY_BACKUP: selected_client_major=${chosen.major}`);
  let environment;
  try { environment = connectionEnv(url, process.env); }
  catch (e) { throw new Error(`database_url_mapping_failed:${e.message}`); }
  url = '';
  const dump = spawnSync(chosen.dump, ['--format=custom', '--no-owner', '--no-password', '--file', outputFile], {
    env: environment, encoding: 'utf8', timeout: 240000, maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  environment.PGPASSWORD = '';
  if (dump.status !== 0) {
    console.error(`BITPAY_RELEASE_HOLD: pg_dump=${classify(dump.stderr)} exit=${dump.status === null ? 'signal_or_timeout' : dump.status}`);
    if (dump.error?.code) console.error(`BITPAY_BACKUP: child_error=${dump.error.code}`);
    process.exitCode = 9;
    return;
  }
  if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size < 100) throw new Error('backup_archive_empty');
  const checked = spawnSync(chosen.restore, ['--list', outputFile], {
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: '/root' },
    encoding: 'utf8', timeout: 30000, maxBuffer: 4096 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (checked.status !== 0 || !checked.stdout?.includes('TOC Entries')) {
    throw new Error('backup_archive_validation_failed');
  }
  console.log('BITPAY_RELEASE: production_database_backup=PASS');
  console.log('BITPAY_RELEASE: backup_archive_readable=PASS');
}
module.exports = { majorOf, chooseClient, classify, connectionEnv };
if (require.main === module || (process.argv[1] === '-' && __filename === '[stdin]')) {
  main(process.argv[2], process.argv[3]).catch(e => {
    // Never print raw database errors, as these can embed connection secrets.
    const safe = /^[a-z0-9_:]+$/.test(e.message || '') ? e.message : 'backup_preflight_failed';
    console.error('BITPAY_RELEASE_HOLD: ' + safe);
    process.exitCode = 10;
  });
}
