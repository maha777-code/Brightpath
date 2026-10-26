import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
  COMPARISON_ROWS,
  FAQ_ITEMS,
  INSTAGRAM_URL,
  OFFICE_ADDRESS,
  PUBLIC_PAGES,
  SITE_URL,
  SUPPORT_EMAIL,
  TEACHER_TOOL_NAMES,
  TRUST_FACTS,
  type PublicPage,
} from '../content/marketing';
import { PRICING_PLANS, type PricingPlan } from '../pages/pricingData';

/** Shell served for every non-public route (dashboards, tools) so they don't carry landing-page content. */
export const SPA_FALLBACK_FILE = 'app.html';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageFile(page: PublicPage): string {
  return page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
}

function pageUrl(page: PublicPage): string {
  return page.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${page.path}`;
}

function price(value: number | string, symbol: string): string {
  if (typeof value === 'string') return value;
  if (value === 0) return 'Free';
  return symbol === '₹' ? `₹${value.toLocaleString('en-IN')}` : `US$${value}`;
}

function planHtml(plan: PricingPlan): string {
  const inr = price(plan.priceINR.annualMonthly, '₹');
  const usd = price(plan.priceUSD.annualMonthly, '$');
  const monthly = price(plan.priceINR.monthly, '₹');
  const priceLine =
    typeof plan.priceINR.annualMonthly === 'string'
      ? 'Custom quote'
      : plan.priceINR.annualMonthly === 0
        ? 'Free'
        : `${inr}/month billed yearly (${usd}/month) · ${monthly}/month billed monthly`;
  return `<article><h3>${esc(plan.title)} — ${esc(plan.roleCategory)}</h3><p><strong>${esc(priceLine)}</strong></p><p>${esc(
    plan.description,
  )}</p><ul>${plan.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></article>`;
}

function faqHtml(): string {
  return FAQ_ITEMS.map((item) => `<h2>${esc(item.question)}</h2><p>${esc(item.answer)}</p>`).join('');
}

function trustHtml(): string {
  return `<section><h2>Built for school data from day one</h2><ul>${TRUST_FACTS.map(
    (fact) => `<li><strong>${esc(fact.title)}:</strong> ${esc(fact.detail)}</li>`,
  ).join('')}</ul><p><a href="/security">Security Overview</a> · <a href="/privacy">Privacy Policy</a></p></section>`;
}

function comparisonHtml(): string {
  return `<table><thead><tr><th>What matters in a classroom</th><th>MindVault</th><th>Generic AI chatbot</th></tr></thead><tbody>${COMPARISON_ROWS.map(
    (row) => `<tr><th>${esc(row.feature)}</th><td>${esc(row.mindvault)}</td><td>${esc(row.generic)}</td></tr>`,
  ).join('')}</tbody></table>`;
}

const NAV_HTML =
  '<nav><a href="/">MindVault</a> · <a href="/pricing">Pricing</a> · <a href="/#for-schools">For Schools</a> · <a href="/compare">Compare</a> · <a href="/faq">FAQs</a> · <a href="/contact">Contact</a> · <a href="/login">Log in</a> · <a href="/register">Start free</a></nav>';

function bodyFor(page: PublicPage): string {
  const previewIds = ['teacher-free', 'teacher-pro', 'tutor-center', 'school'];
  switch (page.path) {
    case '/':
      return `<h1>The AI teaching assistant for teachers, schools, students and parents</h1>
<p>Save time, teach from your own textbook, and support every student with safe, syllabus-aligned AI.</p>
<p><a href="/register">Start free</a> · <a href="/pricing">See pricing</a> · <a href="/contact">Book a school walkthrough</a></p>
<section><h2>11 AI tools for teachers</h2><ul>${TEACHER_TOOL_NAMES.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<p>New in beta: upload a PDF and get a gamified video or class activity.</p></section>
<section id="for-schools"><h2>For schools and academies</h2><p>One platform for teachers, students and parents, aligned to your own textbooks: admin dashboard and analytics, role-based access with invite codes, your school’s name and branding, and a staff walkthrough on rollout. School campus plans start at ₹11,999/month billed yearly.</p><p><a href="/contact">Book a school walkthrough</a></p></section>
<section id="for-teachers"><h2>For teachers</h2><p>Lesson plans, quizzes and worksheets; questions written from your own PDFs; songs and podcasts with real audio; and Sharada, your AI assistant. Free to start; Teacher Pro is ₹499/month billed yearly.</p><p><a href="/register">Start free as a teacher</a></p></section>
<section id="for-students"><h2>For students and parents</h2><p>An AI tutor for any subject, videos, quizzes and activities, and progress tracking for parents, in English, Hindi and Arabic. Student Basic and Parent Basic are free; Student Pro is ₹149/month billed yearly.</p><p><a href="/register">Start learning free</a></p></section>
<section id="pricing"><h2>Simple, published pricing</h2>${PRICING_PLANS.filter((p) => previewIds.includes(p.id)).map(planHtml).join('')}<p><a href="/pricing">See every plan</a></p></section>
${trustHtml()}
<p><a href="/faq">Frequently asked questions</a></p>`;
    case '/faq':
      return `<h1>Frequently asked questions</h1><p>Straight answers on privacy, accuracy, cheating and cost.</p>${faqHtml()}<p>Still have a question? <a href="/contact">Contact us</a>.</p>`;
    case '/pricing':
      return `<h1>A plan for every role</h1><p>Every MindVault plan and price, in INR and USD. All AI tools are free to start; only the Curriculum & Textbook Studio needs Pro.</p>${PRICING_PLANS.map(planHtml).join('')}<p>Questions about a school rollout? <a href="/contact">Contact us</a>.</p>`;
    case '/compare':
      return `<h1>MindVault vs generic AI chatbots</h1><p>General-purpose AI chat tools start from a blank prompt every time and know nothing about your class. MindVault is built around the textbook and syllabus you actually teach.</p>${comparisonHtml()}<p><a href="/register">Start free</a> · <a href="/pricing">See pricing</a></p>`;
    case '/contact':
      return `<h1>Contact MindVault</h1><p>Book a walkthrough for your school or academy, or get help with your account.</p><p>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p><p>Office: ${esc(OFFICE_ADDRESS)}</p><p>Instagram: <a href="${esc(INSTAGRAM_URL)}">@mindvault.academy</a></p>`;
    case '/security':
      return `<h1>Security overview</h1>${trustHtml()}<p>Security inquiries: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`;
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
  const offers = PRICING_PLANS.filter((p) => typeof p.priceINR.annualMonthly === 'number').map((p) => ({
    '@type': 'Offer',
    name: p.title,
    price: String(p.priceINR.annualMonthly),
    priceCurrency: 'INR',
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

function renderPage(shell: string, page: PublicPage): string {
  const url = pageUrl(page);
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="MindVault" />',
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}/assets/brand/mindvault-icon-512.png" />`,
    '<meta name="twitter:card" content="summary" />',
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
      `<div id="root"><div class="mv-prerender">${NAV_HTML}<main>${bodyFor(page)}</main><footer><p>MindVault · ${esc(
        OFFICE_ADDRESS,
      )} · <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p></footer></div></div>`,
    );
}

function sitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PUBLIC_PAGES.map(
    (page) =>
      `  <url><loc>${pageUrl(page)}</loc><lastmod>${today}</lastmod><priority>${page.path === '/' ? '1.0' : '0.7'}</priority></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const ROBOTS = `User-agent: *
Allow: /
Disallow: /teacher/
Disallow: /student/
Disallow: /parent/
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function prerenderPublicPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'mindvault-prerender-public-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const shellPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(shellPath)) return;
      const shell = fs.readFileSync(shellPath, 'utf8');
      if (shell.includes('class="mv-prerender"')) return;

      fs.writeFileSync(path.join(outDir, SPA_FALLBACK_FILE), shell);
      for (const page of PUBLIC_PAGES) {
        fs.writeFileSync(path.join(outDir, pageFile(page)), renderPage(shell, page));
      }
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap());
      fs.writeFileSync(path.join(outDir, 'robots.txt'), ROBOTS);
    },
  };
}
