/**
 * End-to-end test against a running server (npm run build && npm start > /tmp/app.log).
 * Uses a fresh database with ADMIN_EMAILS=founder@portfoliohub.test.
 *   node tests/e2e.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const BASE = 'http://localhost:3000';
const OUT = require('path').join(__dirname, 'out') + '/'; require('fs').mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('•', ...a);

function totp(secretB32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secretB32.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac('sha1', bytes).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
async function verifyLink(email) {
  for (let i = 0; i < 20; i++) {
    const logTxt = fs.readFileSync(process.env.APP_LOG || '/tmp/app.log', 'utf8');
    const re = new RegExp(`To: ${email.replace('.', '\\.')}\\nSubject: Verify[^\\n]*\\n[^\\n]*?(http\\S+)`, 'g');
    const m = [...logTxt.matchAll(re)].pop();
    if (m) return m[1];
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('no verification link for ' + email);
}

(async () => {
  // test images
  await sharp({ create: { width: 900, height: 900, channels: 3, background: '#d9b99b' } }).composite([{ input: Buffer.from('<svg width="900" height="900"><circle cx="450" cy="360" r="170" fill="#7a5c45"/><rect x="200" y="560" width="500" height="400" rx="200" fill="#3d5a80"/></svg>') }]).jpeg().toFile(OUT + 'avatar.jpg');
  await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#0f172a' } }).composite([{ input: Buffer.from('<svg width="1600" height="1000"><rect x="80" y="80" width="1440" height="90" rx="12" fill="#1e293b"/><rect x="80" y="220" width="460" height="700" rx="16" fill="#38bdf8"/><rect x="580" y="220" width="940" height="330" rx="16" fill="#a3e635"/><rect x="580" y="590" width="940" height="330" rx="16" fill="#f472b6"/></svg>') }]).png().toFile(OUT + 'shot.png');
  fs.writeFileSync(OUT + 'fake.png', 'this is not an image <script>alert(1)</script>');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log('PAGE ERROR', e.message));

  // 1. landing
  await page.goto(BASE + '/');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + '01-landing.png' });
  await page.screenshot({ path: OUT + '01-landing-full.png', fullPage: true });
  log('landing ok');

  // 2. sign up founder
  const email = 'founder@portfoliohub.test';
  await page.goto(BASE + '/sign-up');
  await page.fill('#name', 'Viren Kapoor');
  await page.fill('#email', email);
  await page.fill('#password', 'correct-horse-battery');
  await page.click('button:has-text("Create account")');
  await page.waitForURL('**/dashboard/profile**', { timeout: 15000 });
  log('signup ok ->', page.url());

  // 3. profile
  await page.fill('input[name="personal.headline"]', 'CS student building fast, friendly web apps');
  await page.fill('input[name="personal.contactEmail"]', 'viren@example.com');
  await page.fill('input[name="personal.location"]', 'New Delhi, India');
  await page.fill('input[name="personal.githubUrl"]', 'github.com/viren-example');
  await page.fill('input[name="personal.linkedinUrl"]', 'linkedin.com/in/viren-example');
  await page.fill('textarea[name="personal.about"]', 'Third-year Computer Science student. I like building things end to end, from database schemas to the last pixel.\n\nCurrently working on a C++ tensor library and a portfolio generator.');
  // avatar upload
  const avatarInput = page.locator('input[type=file][accept^="image/jpeg,image/png,image/webp,image/avif"]').first();
  await avatarInput.setInputFiles(OUT + 'avatar.jpg');
  await page.waitForSelector('button[aria-label="Upload Profile photo"] img', { timeout: 15000 });
  log('avatar uploaded');
  // fake image must be rejected
  await avatarInput.setInputFiles(OUT + 'fake.png');
  await page.waitForTimeout(1500);
  const uploadErr = await page.locator('#personal p.text-bad').first().textContent().catch(() => '');
  log('fake upload message:', uploadErr);

  // project
  await page.click('button:has-text("Add a project")');
  await page.fill('input[name="projects.0.name"]', 'Tensorly');
  await page.fill('input[name="projects.0.category"]', 'Systems');
  await page.fill('input[name="projects.0.summary"]', 'An N-dimensional tensor library in modern C++ templates');
  await page.fill('input[name="projects.0.technologies"]', 'C++20, CMake, Google Test');
  await page.fill('textarea[name="projects.0.features"]', 'Compile-time shapes\nBroadcasting\nZero-copy views');
  await page.fill('input[name="projects.0.repoUrl"]', 'github.com/viren-example/tensorly');
  await page.locator('#projects input[type=file]').first().setInputFiles(OUT + 'shot.png');
  await page.waitForSelector('button[aria-label="Upload Thumbnail"] img', { timeout: 15000 });
  await page.click('button:has-text("Add a project")');
  await page.fill('input[name="projects.1.name"]', 'Campus Events');
  await page.fill('input[name="projects.1.summary"]', 'RSVPs and reminders for 12 college clubs');
  await page.fill('input[name="projects.1.liveUrl"]', 'https://events.example.com');
  // education
  await page.click('button:has-text("Add a qualification")');
  await page.fill('input[name="education.0.institution"]', 'IIIT Delhi');
  await page.fill('input[name="education.0.degree"]', 'B.Tech');
  await page.fill('input[name="education.0.major"]', 'Computer Science and Applied Mathematics');
  await page.fill('input[name="education.0.startYear"]', '2024');
  await page.fill('input[name="education.0.endYear"]', '2028');
  // skills
  await page.click('button:has-text("+ Programming languages")');
  await page.fill('input[name="skills.0.items"]', 'C++, Python, TypeScript, SQL');
  await page.click('button:has-text("+ Frameworks")');
  await page.fill('input[name="skills.1.items"]', 'Next.js, React, Node.js');
  // position of responsibility
  await page.click('button:has-text("Add position")');
  await page.fill('input[name="extras.0.title"]', 'PR & Curations Lead');
  await page.fill('input[name="extras.0.subtitle"]', 'E-Summit, IIIT Delhi');
  // preview panel
  await page.click('button:has-text("Show live preview")');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '02-profile-editor.png' });
  await page.click('button:has-text("Save")');
  await page.waitForSelector('text=Saved. Republish', { timeout: 10000 });
  log('profile saved');

  // 4. verify email via link from server log
  const link = await verifyLink(email);
  await page.goto(link);
  await page.waitForTimeout(1500);
  log('email verified ->', page.url());

  // 5. create portfolio
  await page.goto(BASE + '/dashboard/portfolios/new');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + '03-new-portfolio.png' });
  await page.click('button[role=radio]:has-text("Modern Developer")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Create & customize")');
  await page.waitForURL('**/dashboard/portfolios/**', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '04-studio.png' });
  // customize: pick a swatch and lively animation, then publish
  await page.click('button[aria-label="Use #0EA5E9"]');
  await page.waitForTimeout(800);
  await page.click('button:has-text("Publish")');
  await page.waitForSelector('text=Live at', { timeout: 30000 });
  const liveText = await page.locator('[role=status]:has-text("Live at")').textContent();
  const liveUrl = liveText.replace('Live at ', '').trim();
  log('published ->', liveUrl);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: OUT + '05-studio-live.png' });

  // 6. visit live site
  const site = await ctx.newPage();
  const resp = await site.goto(liveUrl);
  log('live status', resp.status(), 'csp:', !!resp.headers()['content-security-policy']);
  await site.waitForTimeout(1500);
  await site.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
  await site.waitForTimeout(900);
  await site.screenshot({ path: OUT + '06-live-site.png', fullPage: true });
  const siteHtml = await site.content();
  log('site has name/project/edu:', siteHtml.includes('Viren Kapoor'), siteHtml.includes('Tensorly'), siteHtml.includes('IIIT Delhi'), 'no undefined:', !/\bundefined\b/.test(siteHtml.replace(/<script[\s\S]*?<\/script>/g, '')));
  const og = await site.request.get(liveUrl + 'og.png'); log('og.png', og.status(), og.headers()['content-type']);
  const js = await site.request.get(liveUrl + 'site.js'); log('site.js', js.status());
  // mobile view
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const mp = await mob.newPage(); await mp.goto(liveUrl); await mp.waitForTimeout(800);
  await mp.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'))); await mp.waitForTimeout(700);
  await mp.screenshot({ path: OUT + '07-live-mobile.png' });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  log('mobile horizontal overflow:', overflow);

  // dashboard
  await page.goto(BASE + '/dashboard'); await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '08-dashboard.png' });

  // 7. a second, normal user: must not reach admin or the founder's portfolio
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/sign-up');
  await p2.fill('#name', 'Mallory Test'); await p2.fill('#email', 'mallory@example.com'); await p2.fill('#password', 'another-long-password');
  await p2.click('button:has-text("Create account")'); await p2.waitForURL('**/dashboard/profile**');
  const adminResp = await p2.goto(BASE + '/admin'); log('normal user /admin status:', adminResp.status());
  const studioUrl = page.url();
  const founderPortfolio = (await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.href).find(h => /\/dashboard\/portfolios\/[a-z0-9]{20,}/.test(h))));
  const stealResp = await p2.goto(founderPortfolio); log('other user opening founder portfolio:', stealResp.status());
  // server action abuse: try to call admin server action endpoint path directly is not possible without action id; check API preview of templates unauth
  const unauthPreview = await (await browser.newContext()).request.post(BASE + '/api/preview', { data: { templateSlug: 'minimal' } }); log('unauth preview status:', unauthPreview.status());
  const unauthUpload = await (await browser.newContext()).request.post(BASE + '/api/uploads', { multipart: { kind: 'AVATAR', file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync(OUT + 'avatar.jpg') } } }); log('unauth upload status:', unauthUpload.status());

  // 8. founder becomes admin (CLI) -> needs 2FA -> enable via UI -> admin console
  require('child_process').execSync('npm run -s admin:grant -- founder@portfoliohub.test', { stdio: 'inherit' });
  await page.goto(BASE + '/admin'); await page.waitForTimeout(800);
  log('admin without 2FA ->', page.url());
  await page.click('button:has-text("Set up")');
  await page.fill('input[name=password]', 'correct-horse-battery');
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('img[alt^="QR code"]', { timeout: 10000 });
  await page.click('summary:has-text("Can")');
  const uri = await page.locator('details code').textContent();
  const secret = new URL(uri).searchParams.get('secret');
  await page.fill('input[name=code]', totp(secret));
  await page.click('button:has-text("Verify")');
  await page.waitForSelector('text=Two-step verification is on', { timeout: 10000 });
  log('2FA enabled');
  // sign out and back in to exercise the 2FA challenge
  await page.goto(BASE + '/dashboard'); await page.click('button:has-text("Sign out")'); await page.waitForURL(BASE + '/');
  await page.goto(BASE + '/sign-in');
  await page.fill('#email', email); await page.fill('#password', 'correct-horse-battery'); await page.click('button:has-text("Sign in")');
  await page.waitForURL('**/two-factor', { timeout: 10000 });
  await page.fill('input[name=code]', totp(secret)); await page.click('button:has-text("Verify")');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  log('signed in with 2FA');
  await page.goto(BASE + '/admin'); await page.waitForTimeout(1000);
  log('admin page ->', page.url());
  await page.screenshot({ path: OUT + '09-admin.png' });
  await page.goto(BASE + '/admin/users'); await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '10-admin-users.png' });
  // suspend mallory
  page.once('dialog', (d) => d.accept('Spam test'));
  await page.locator('tr:has-text("mallory@example.com") button:has-text("Suspend")').click();
  await page.waitForTimeout(1500);
  const malloryRow = await page.locator('tr:has-text("mallory@example.com")').textContent();
  log('mallory row after suspend:', malloryRow.includes('Suspended'));
  const after = await p2.goto(BASE + '/dashboard'); log('suspended user dashboard ->', p2.url());
  await page.goto(BASE + '/admin/templates'); await page.waitForTimeout(500); await page.screenshot({ path: OUT + '11-admin-templates.png' });
  await page.goto(BASE + '/admin/audit'); await page.waitForTimeout(500); await page.screenshot({ path: OUT + '12-admin-audit.png' });

  // 9. republish + rollback
  await page.goto(founderPortfolio); await page.waitForTimeout(1500);
  await page.click('button:has-text("Republish")'); await page.waitForSelector('text=Live at', { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Restore")').first().click(); await page.waitForSelector('text=Restored that version', { timeout: 10000 });
  log('rollback ok');
  await browser.close();
})().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });
