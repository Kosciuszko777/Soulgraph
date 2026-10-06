/**
 * shareCard — render a privacy-respecting share image (1080×1350 PNG).
 *
 * The user chooses what to include; nothing is placed on the card without that
 * choice (default: the figure only). We build a self-contained SVG string with
 * concrete colours (no CSS variables, no external fonts beyond system serif/
 * mono fallbacks), then rasterize it to a PNG Blob via an offscreen canvas.
 *
 * Pure-ish: depends only on DOM APIs (Image, canvas, Blob). No React.
 */

import type { SoulGraph } from '@/core/graph/schema';
import { buildConstellation, NIGHT_THEME } from '@/components/graph/Constellation';
import { summarizeGraph } from '@/lib/graphSummary';

export type ShareInclude = 'figure' | 'figure_enneagram' | 'figure_code';

export interface ShareCardOptions {
  include: ShareInclude;
  /** Referral link (slot for Prompt 5). Rendered small at the base when present. */
  referralLink?: string;
  /** Localised wordmark tagline under the brand name. */
  tagline: string;
}

const W = 1080;
const H = 1350;
const CONSTELLATION_BOX = 760; // the figure draws in a 400 viewBox, scaled up

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build the full card as an SVG string. */
export function buildShareCardSvg(graph: SoulGraph, options: ShareCardOptions): string {
  const theme = NIGHT_THEME;
  const { stars, edges } = buildConstellation(graph);
  const summary = summarizeGraph(graph);

  // Position the 400-unit figure centred horizontally, upper portion vertically.
  const scale = CONSTELLATION_BOX / 400;
  const figX = (W - CONSTELLATION_BOX) / 2;
  const figY = 210;

  const edgeLines = edges
    .map(([a, b]) => {
      const p = stars[a];
      const q = stars[b];
      return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" />`;
    })
    .join('');

  const starCircles = stars
    .map((s) => {
      const fill = s.brightness > 0.75 ? theme.lit : theme.star;
      return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${fill}" opacity="${s.brightness.toFixed(
        2,
      )}" />`;
    })
    .join('');

  // Optional caption line.
  let caption = '';
  if (options.include === 'figure_code' && summary.jungCode) {
    caption = `<text x="${W / 2}" y="${figY + CONSTELLATION_BOX + 110}" text-anchor="middle"
      font-family="monospace" font-size="72" letter-spacing="24" fill="${theme.lit}">${escapeXml(
      summary.jungCode,
    )}</text>`;
  } else if (
    options.include === 'figure_enneagram' &&
    summary.enneagramDominant &&
    !summary.enneagramInconclusive
  ) {
    const code = `${summary.enneagramDominant}${summary.enneagramWing ? 'w' + summary.enneagramWing : ''}`;
    caption = `<text x="${W / 2}" y="${figY + CONSTELLATION_BOX + 110}" text-anchor="middle"
      font-family="monospace" font-size="72" fill="${theme.lit}">${escapeXml(code)}</text>`;
  }

  const referral = options.referralLink
    ? `<text x="${W / 2}" y="${H - 54}" text-anchor="middle" font-family="monospace"
        font-size="26" fill="rgba(222,232,248,0.45)">${escapeXml(options.referralLink)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="34%" r="60%">
      <stop offset="0%" stop-color="#16203a" />
      <stop offset="100%" stop-color="${theme.bg}" />
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)" />

  <!-- faint frame -->
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none"
    stroke="rgba(198,151,73,0.35)" stroke-width="2" rx="18" />

  <!-- wordmark -->
  <text x="${W / 2}" y="135" text-anchor="middle" font-family="serif" font-size="58"
    fill="#e6ecf6" letter-spacing="2">SoulGraph</text>
  <text x="${W / 2}" y="175" text-anchor="middle" font-family="monospace" font-size="22"
    letter-spacing="8" fill="rgba(222,232,248,0.55)">${escapeXml(options.tagline.toUpperCase())}</text>

  <!-- constellation -->
  <g transform="translate(${figX},${figY}) scale(${scale})">
    <g stroke="${theme.edge}" stroke-width="1.2" stroke-linecap="round">${edgeLines}</g>
    <g>${starCircles}</g>
  </g>

  ${caption}
  ${referral}
</svg>`;
}

/** Rasterize an SVG string to a PNG Blob at natural (1080×1350) resolution. */
export function svgToPngBlob(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context unavailable.'));
        return;
      }
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => {
        if (out) resolve(out);
        else reject(new Error('Failed to encode PNG.'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render share image.'));
    };
    img.src = url;
  });
}

/** Convenience: build + rasterize in one call. */
export async function renderShareCard(
  graph: SoulGraph,
  options: ShareCardOptions,
): Promise<Blob> {
  return svgToPngBlob(buildShareCardSvg(graph, options));
}

export const SHARE_CARD_SIZE = { width: W, height: H };
