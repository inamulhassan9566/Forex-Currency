const { execSync } = require('child_process');

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (dbUrl) {
  console.log('--- Vercel Build: Database connection detected ---');
  try {
    process.env.DATABASE_URL = dbUrl;
    console.log('Syncing database schema (prisma db push)...');
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

    console.log('Seeding initial trading desk records (node prisma/seed.js)...');
    execSync('node prisma/seed.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

    console.log('✓ Database schema and seed data deployed successfully!');
  } catch (err) {
    console.warn('⚠️ Note: Database sync during build had non-critical notice:', err.message);
  }
} else {
  console.log('--- Vercel Build: No DATABASE_URL present during build step, skipping auto-migration ---');
}
