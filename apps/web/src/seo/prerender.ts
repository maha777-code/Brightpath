import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
  AI_TOOLS,
  AI_TOOL_COUNT,
  COMPARISON_ROWS,
  FAQ_ITEMS,
  FREE_TOOL_COUNT,
  FOUNDER_EMAIL,
  INSTAGRAM_URL,
  OFFICE_ADDRESS,
  PUBLIC_PAGES,
  SITE_URL,
  SUPPORT_EMAIL,
  TEACHER_TOOL_NAMES,
  TESTIMONIALS,
  TRUST_FACTS,
  type PublicPage,
} from '../content/marketing';
import { KHDA_DISCLAIMER, KHDA_PILLARS } from '../../../../packages/shared/src/khdaAlignment';
import { PRICING_PLANS, formatPlanAmount, planPrice, type PricingPlan } from '../pages/pricingData';

/** Shell served for every non-public route (dashboards, tools) so they don't carry landing-page content. */
export const SPA_FALLBACK_FILE = 'app.html';

/** Vercel serves this with a 404 status for any path that matches neither a file nor a rewrite. */
const NOT_FOUND_FILE = '404.html';

const NOINDEX_META = '<meta name="robots" content="noindex" />';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageFile(page: PublicPage): string {
  return page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
}

function pageUrl(page: PublicPage): string {
  return page.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${page.path}`;
}

function aedYearly(planId: string): string {
  const plan = PRICING_PLANS.find((p) => p.id === planId);
  return plan ? formatPlanAmount(planPrice(plan, 'AED').annualMonthly, 'AED') : '';
}

function planHtml(plan: PricingPlan): string {
  const aedPrice = planPrice(plan, 'AED');
  const aed = formatPlanAmount(aedPrice.annualMonthly, 'AED');
  const usd = formatPlanAmount(plan.priceUSD.annualMonthly, 'USD');
  const inr = formatPlanAmount(plan.priceINR.annualMonthly, 'INR');
  const monthly = formatPlanAmount(aedPrice.monthly, 'AED');
  const priceLine =
    typeof aedPrice.annualMonthly === 'string'
      ? 'Custom quote'
      : aedPrice.annualMonthly === 0
        ? 'Free'
        : `${aed}/month billed yearly (${usd} · ${inr}/month) · ${monthly}/month billed monthly`;
  return `<article><h3>${esc(plan.title)} — ${esc(plan.roleCategory)}</h3><p><strong>${esc(priceLine)}</strong></p><p>${esc(
    plan.description,
  )}</p><ul>${plan.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></article>`;
}

function faqHtml(): string {
  return FAQ_ITEMS.map((item) => `<h2>${esc(item.question)}</h2><p>${esc(item.answer)}</p>`).join('');
}

function trustHtml(): string {
  const testimonials =
    TESTIMONIALS.length === 0
      ? ''
      : `<section><h2>What schools, tutors and parents say</h2>${TESTIMONIALS.map(
          (item) =>
            `<figure><blockquote>${esc(item.quote)}</blockquote><figcaption>${esc(item.author)} — ${esc(item.role)}${
              item.organization ? `, ${esc(item.organization)}` : ''
            }</figcaption></figure>`,
        ).join('')}</section>`;
  return `<section><h2>Built for school data from day one</h2><ul>${TRUST_FACTS.map(
    (fact) => `<li><strong>${esc(fact.title)}:</strong> ${esc(fact.detail)}</li>`,
  ).join('')}</ul><p><a href="/security">Security Overview</a> · <a href="/privacy">Privacy Policy</a></p></section>${testimonials}`;
}

function comparisonHtml(): string {
  return `<table><thead><tr><th>What matters in a classroom</th><th>MindVault</th><th>Generic AI chatbot</th></tr></thead><tbody>${COMPARISON_ROWS.map(
    (row) => `<tr><th>${esc(row.feature)}</th><td>${esc(row.mindvault)}</td><td>${esc(row.generic)}</td></tr>`,
  ).join('')}</tbody></table>`;
}

function aiToolsHtml(): string {
  return AI_TOOLS.map(
    (tool) =>
      `<article><h2>${esc(tool.title)}</h2><p>${esc(tool.description)}</p><p>${esc(tool.focus)} · Available on: ${esc(
        tool.availability,
      )}</p></article>`,
  ).join('');
}

const NAV_HTML =
  '<nav><a href="/">MindVault</a> · <a href="/ai-tools">AI tools</a> · <a href="/pricing">Pricing</a> · <a href="/#for-schools">For Schools</a> · <a href="/compare">Compare</a> · <a href="/faq">FAQs</a> · <a href="/contact">Contact</a> · <a href="/login">Log in</a> · <a href="/register">Start free</a></nav>';

const FOOTER_LINKS_HTML = `<nav aria-label="Site">${PUBLIC_PAGES.map(
  (page) => `<a href="${page.path}">${esc(page.title.split(' — ')[0])}</a>`,
).join(' · ')}</nav>`;

function bodyFor(page: PublicPage): string {
  const previewIds = ['teacher-free', 'teacher-pro', 'tutor-center', 'school'];
  switch (page.path) {
    case '/':
      return `<h1>The AI teaching assistant for teachers, schools, students and parents</h1>
<p>Save time, teach from your own textbook, and support every student with safe, syllabus-aligned AI.</p>
<p><a href="/register">Start free</a> · <a href="/pricing">See pricing</a> · <a href="/contact">Book a school walkthrough</a></p>
<section><h2>${AI_TOOL_COUNT} AI tools, ${FREE_TOOL_COUNT} free to start</h2><ul>${TEACHER_TOOL_NAMES.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<p>New in beta: upload a PDF and get a gamified video or class activity.</p><p><a href="/ai-tools">What each AI tool does</a></p></section>
<section id="for-schools"><h2>For schools and academies</h2><p>One platform for teachers, students and parents, aligned to your own textbooks: admin dashboard and analytics, role-based access with invite codes, your school’s name and branding, and a staff walkthrough on rollout. School campus plans start at ${aedYearly('school')}/month billed yearly.</p><p><a href="/contact">Book a school walkthrough</a></p></section>
<section id="for-teachers"><h2>For teachers</h2><p>Lesson plans, quizzes and worksheets; questions written from your own PDFs; songs and podcasts with real audio; and Sharada, your AI assistant. Free to start; Teacher Pro is ${aedYearly('teacher-pro')}/month billed yearly.</p><p><a href="/register">Start free as a teacher</a></p></section>
<section id="for-students"><h2>For students and parents</h2><p>An AI tutor for any subject, videos, quizzes and activities, and progress tracking for parents, in English, Hindi and Arabic. Student Basic and Parent Basic are free; Student Pro is ${aedYearly('student-pro')}/month billed yearly.</p><p><a href="/register">Start learning free</a></p></section>
<section id="pricing"><h2>Simple, published pricing</h2>${PRICING_PLANS.filter((p) => previewIds.includes(p.id)).map(planHtml).join('')}<p><a href="/pricing">See every plan</a></p></section>
${trustHtml()}
<p><a href="/faq">Frequently asked questions</a></p>`;
    case '/faq':
      return `<h1>Frequently asked questions</h1><p>Straight answers on privacy, accuracy, cheating and cost.</p>${faqHtml()}<p>Still have a question? <a href="/contact">Contact us</a>.</p>`;
    case '/pricing':
      return `<h1>A plan for every role</h1><p>Every MindVault plan and price, in AED, USD and INR. ${FREE_TOOL_COUNT} of the ${AI_TOOL_COUNT} AI tools are free to start; the Curriculum &amp; Textbook Studio needs Pro, and Classroom comes with school and academy accounts.</p>${PRICING_PLANS.map(planHtml).join('')}<p>Questions about a school rollout? <a href="/contact">Contact us</a>.</p>`;
    case '/ai-tools':
      return `<h1>MindVault AI tools</h1><p>${AI_TOOL_COUNT} AI tools for teachers, students, parents and schools. ${FREE_TOOL_COUNT} are free to start; the Curriculum &amp; Textbook Studio needs Pro, and Classroom comes with school and academy accounts.</p>${aiToolsHtml()}<p><a href="/register">Start free</a> · <a href="/pricing">See pricing</a></p>`;
    case '/compare':
      return `<h1>MindVault vs generic AI chatbots</h1><p>General-purpose AI chat tools start from a blank prompt every time and know nothing about your class. MindVault is built around the textbook and syllabus you actually teach.</p>${comparisonHtml()}<p><a href="/register">Start free</a> · <a href="/pricing">See pricing</a></p>`;
    case '/contact':
      return `<h1>Contact MindVault</h1><p>Book a walkthrough for your school or academy, or get help with your account.</p><p>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p><p>Founder: <a href="mailto:${FOUNDER_EMAIL}">${FOUNDER_EMAIL}</a></p><p>Office: ${esc(OFFICE_ADDRESS)}</p><p>Instagram: <a href="${esc(INSTAGRAM_URL)}">@mindvault.academy</a></p>`;
    case '/security':
      return `<h1>Security overview</h1>${trustHtml()}<p>Security inquiries: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`;
    case '/khda':
      return `<h1>KHDA alignment</h1><p>${esc(KHDA_DISCLAIMER)}</p>${KHDA_PILLARS.map(
        (pillar) =>
          `<section><h2>${esc(pillar.title)}</h2><p>${esc(pillar.framework)}</p><h3>What MindVault supports</h3><ul>${pillar.supports
            .map((item) => `<li>${esc(item)}</li>`)
            .join('')}</ul><h3>What the school still owns</h3><ul>${pillar.schoolOwns
            .map((item) => `<li>${esc(item)}</li>`)
            .join('')}</ul></section>`,
      ).join('')}<p><a href="/security">Security Overview</a></p>`;
    default:
      return `<h1>${esc(page.title)}</h1><p>${esc(page.description)}</p>`;
  }
}

function structuredData(page: PublicPage): object[] {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MindVault',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/brand/mindvault-icon-512.png`,
    email: SUPPORT_EMAIL,
    sameAs: [INSTAGRAM_URL],
    address: { '@type': 'PostalAddress', streetAddress: OFFICE_ADDRESS, addressLocality: 'Bangalore', addressCountry: 'IN' },
  };
  const offers = PRICING_PLANS.filter((p) => typeof p.priceUSD.annualMonthly === 'number').map((p) => ({
    '@type': 'Offer',
    name: p.title,
    price: String(planPrice(p, 'AED').annualMonthly),
    priceCurrency: 'AED',
    description: p.description,
  }));
  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MindVault',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: PUBLIC_PAGES[0].description,
    offers,
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  if (page.path === '/') return [organization, app];
  if (page.path === '/faq') return [organization, faq];
  if (page.path === '/pricing') return [organization, app];
  return [organization];
}

const PRERENDER_STYLE = `<style>
.mv-js .mv-prerender{position:absolute;inset:0 auto auto 0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}
.mv-prerender{max-width:960px;margin:0 auto;padding:32px 20px;font-size:16px;line-height:1.6}
.mv-prerender a{color:#22d3ee}.mv-prerender table{border-collapse:collapse}.mv-prerender th,.mv-prerender td{border:1px solid #334155;padding:6px 10px;text-align:left}
</style>`;

/**
 * Search-console ownership tags, read from the build environment (set them in Vercel → Project → Settings →
 * Environment Variables). Values are the `content` attribute only, never the whole tag.
 */
function verificationMeta(): string[] {
  const tags: string[] = [];
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  if (google) tags.push(`<meta name="google-site-verification" content="${esc(google)}" />`);
  if (bing) tags.push(`<meta name="msvalidate.01" content="${esc(bing)}" />`);
  return tags;
}

const SHARE_IMAGE = `${SITE_URL}/assets/brand/mindvault-icon-512.png`;

function renderPage(shell: string, page: PublicPage): string {
  const url = pageUrl(page);
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...verificationMeta(),
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="MindVault" />',
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SHARE_IMAGE}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${SHARE_IMAGE}" />`,
    '<script>document.documentElement.classList.add("mv-js")</script>',
    PRERENDER_STYLE,
    ...structuredData(page).map(
      (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
    ),
  ].join('\n    ');

  return shell
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><div class="mv-prerender">${NAV_HTML}<main>${bodyFor(page)}</main>${footerHtml()}</div></div>`,
    );
}

function footerHtml(): string {
  return `<footer>${FOOTER_LINKS_HTML}<p>MindVault · ${esc(OFFICE_ADDRESS)} · <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p></footer>`;
}

/** Non-public routes share this shell; they should never be indexed. */
function renderAppShell(shell: string): string {
  return shell
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(PUBLIC_PAGES[0].description)}" />`)
    .replace('</head>', `    ${NOINDEX_META}\n  </head>`);
}

/** Static page without the SPA bundle, so the router can't redirect away from the 404. */
function renderNotFound(shell: string): string {
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Page not found — MindVault</title>')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
    .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
    .replace('</head>', `    ${NOINDEX_META}\n    ${PRERENDER_STYLE}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><div class="mv-prerender">${NAV_HTML}<main><h1>Page not found</h1><p>This page does not exist or has moved.</p><p><a href="/">Go to the MindVault home page</a></p></main>${footerHtml()}</div></div>`,
    );
}

/** Fails the build when a public page has no matching Vercel rewrite (the reason /khda served the app shell). */
function assertVercelRewrites(root: string): void {
  const configPath = [path.resolve(root, 'vercel.json'), path.resolve(root, '../../vercel.json')].find((p) =>
    fs.existsSync(p),
  );
  if (!configPath) return;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
    rewrites?: { source: string; destination: string }[];
  };
  const rewrites = config.rewrites ?? [];
  const missing = PUBLIC_PAGES.filter(
    (page) =>
      page.path !== '/' &&
      !rewrites.some((r) => r.source === page.path && r.destination === `/${pageFile(page)}`),
  ).map((page) => `{ "source": "${page.path}", "destination": "/${pageFile(page)}" }`);
  if (missing.length) {
    throw new Error(`${configPath} is missing rewrites for prerendered public pages:\n  ${missing.join('\n  ')}`);
  }
}

function sitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PUBLIC_PAGES.map(
    (page) =>
      `  <url><loc>${pageUrl(page)}</loc><lastmod>${today}</lastmod><priority>${page.path === '/' ? '1.0' : '0.7'}</priority></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Signed-in app areas and auth flows. Public pages are the ones in PUBLIC_PAGES. */
const DISALLOWED_PATHS = [
  '/home',
  '/teacher/',
  '/tools/',
  '/student/',
  '/parent',
  '/admin/',
  '/academy',
  '/tutor-center',
  '/classes',
  '/sharada-oversight',
  '/chat/',
  '/play/',
  '/dashboard',
  '/chapter/',
  '/lesson/',
  '/learn/',
  '/progress',
  '/onboarding',
  '/billing/',
  '/join/',
  '/invite/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/app.html',
];

const ROBOTS = `User-agent: *
Allow: /
${DISALLOWED_PATHS.map((p) => `Disallow: ${p}`).join('\n')}

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function prerenderPublicPages(): Plugin {
  let outDir = 'dist';
  let root = '.';
  return {
    name: 'mindvault-prerender-public-pages',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const shellPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(shellPath)) return;
      const shell = fs.readFileSync(shellPath, 'utf8');
      if (shell.includes('class="mv-prerender"')) return;
      assertVercelRewrites(root);

      fs.writeFileSync(path.join(outDir, SPA_FALLBACK_FILE), renderAppShell(shell));
      fs.writeFileSync(path.join(outDir, NOT_FOUND_FILE), renderNotFound(shell));
      for (const page of PUBLIC_PAGES) {
        fs.writeFileSync(path.join(outDir, pageFile(page)), renderPage(shell, page));
      }
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap());
      fs.writeFileSync(path.join(outDir, 'robots.txt'), ROBOTS);
    },
  };
}
