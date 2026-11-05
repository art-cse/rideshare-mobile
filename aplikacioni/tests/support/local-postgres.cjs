// Test-process preload only. The application never imports this file.
// Adapt Neon's HTTP transport to an isolated local PostgreSQL connection so
// browser tests exercise the real server actions, SQL, and NextAuth JWT decoder.
if (process.env.RIDESHARE_LOCAL_POSTGRES !== '1' || process.env.VERCEL) {
  throw new Error('Local PostgreSQL preload requires explicit local test opt-in');
}
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node --require preloads CommonJS before Next.js starts.
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://rideshare_test:local-test-only@127.0.0.1:55432/rideshare_test' });
process.env.DATABASE_URL = 'postgresql://rideshare_test:local-test-only@db.rideshare.test/rideshare_test';
process.env.NEXTAUTH_SECRET = 'local-request-workflow-test-only-not-for-deployment';
process.env.NEXTAUTH_URL = 'http://localhost:3002';
process.env.GITHUB_ID = '';
process.env.GITHUB_SECRET = '';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? input);
  if (url.hostname !== 'api.rideshare.test') return originalFetch(input, options);
  try {
    const { query, params } = JSON.parse(options.body);
    const result = await pool.query({ text: query, values: params, rowMode: 'array', types: { getTypeParser: () => value => value } });
    return Response.json({ ...result, rowAsArray: true });
  } catch (error) {
    return Response.json({ message: error.message, code: error.code, severity: error.severity }, { status: 400 });
  }
};
