/** Shared seasonal invoice styles (screen + isolated print iframe). */
export const INVOICE_SEASON_CSS = `
.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__header {
  position: relative;
  overflow: hidden;
  background: var(--inv-header-bg);
  color: var(--inv-header-fg, #fff);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__header::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--inv-header-motif);
  background-position: right -8px top -12px;
  background-size: 148px 148px;
  background-repeat: no-repeat;
  opacity: var(--inv-motif-opacity, 0.42);
  pointer-events: none;
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__header > * {
  position: relative;
  z-index: 1;
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__eyebrow {
  color: var(--inv-eyebrow);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__meta {
  color: var(--inv-meta);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__number-box {
  color: var(--inv-number-muted);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__number-box strong {
  color: var(--inv-header-fg, #fff);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__parties {
  border-bottom-color: var(--inv-border-accent);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__label {
  color: var(--inv-label);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__table th {
  color: var(--inv-label);
  border-bottom-color: var(--inv-border-accent);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__table td {
  border-bottom-color: color-mix(in srgb, var(--inv-border-accent) 55%, #fff);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__total-row strong {
  color: var(--inv-total);
}

.issued-invoice-sheet[data-invoice-season] .issued-invoice-sheet__brand {
  color: var(--inv-brand);
}

/* Spring — Mar–May: sage, cream, soft blossom */
.issued-invoice-sheet[data-invoice-season="spring"] {
  --inv-header-bg: linear-gradient(135deg, #5f6f52 0%, #8a7b5e 52%, #a67f6a 100%);
  --inv-header-fg: #fffaf5;
  --inv-eyebrow: #f5e6c8;
  --inv-meta: #ebe3d6;
  --inv-number-muted: #e8dfd0;
  --inv-border-accent: #d4c4a8;
  --inv-label: #6b5d4a;
  --inv-total: #5c4f3d;
  --inv-brand: #8a6b4a;
  --inv-motif-opacity: 0.38;
  --inv-header-motif: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none'%3E%3Cellipse cx='78' cy='32' rx='9' ry='6' fill='%23fffaf5' opacity='.55' transform='rotate(-25 78 32)'/%3E%3Cellipse cx='92' cy='48' rx='7' ry='5' fill='%23fffaf5' opacity='.4' transform='rotate(15 92 48)'/%3E%3Cellipse cx='68' cy='52' rx='6' ry='4' fill='%23fffaf5' opacity='.35' transform='rotate(-40 68 52)'/%3E%3Ccircle cx='86' cy='28' r='3' fill='%23f5e6c8' opacity='.7'/%3E%3Ccircle cx='72' cy='40' r='2.5' fill='%23f5e6c8' opacity='.55'/%3E%3Cpath d='M58 68c8-2 14 4 12 12-6 1-12-4-12-12z' fill='%23fffaf5' opacity='.25'/%3E%3C/svg%3E");
}

/* Summer — Jun–Aug: warm gold, honey sun */
.issued-invoice-sheet[data-invoice-season="summer"] {
  --inv-header-bg: linear-gradient(135deg, #a16207 0%, #ca8a04 45%, #d97706 100%);
  --inv-header-fg: #fffbeb;
  --inv-eyebrow: #fef3c7;
  --inv-meta: #fde68a;
  --inv-number-muted: #fef9c3;
  --inv-border-accent: #e9c46a;
  --inv-label: #92400e;
  --inv-total: #78350f;
  --inv-brand: #b45309;
  --inv-motif-opacity: 0.36;
  --inv-header-motif: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none'%3E%3Ccircle cx='82' cy='38' r='18' stroke='%23fffbeb' stroke-width='1.5' opacity='.5'/%3E%3Ccircle cx='82' cy='38' r='11' stroke='%23fef3c7' stroke-width='1.2' opacity='.45'/%3E%3Ccircle cx='82' cy='38' r='5' fill='%23fef3c7' opacity='.55'/%3E%3Cpath d='M82 14v8M82 54v8M58 38h8M98 38h8M64.5 20.5l5.5 5.5M94 50l5.5 5.5M64.5 55.5l5.5-5.5M94 26l5.5-5.5' stroke='%23fffbeb' stroke-width='1.5' stroke-linecap='round' opacity='.4'/%3E%3C/svg%3E");
}

/* Autumn — Sep–Nov: amber, rust, leaf */
.issued-invoice-sheet[data-invoice-season="autumn"] {
  --inv-header-bg: linear-gradient(135deg, #7c2d12 0%, #9a3412 48%, #b45309 100%);
  --inv-header-fg: #fff7ed;
  --inv-eyebrow: #fed7aa;
  --inv-meta: #fdba74;
  --inv-number-muted: #ffedd5;
  --inv-border-accent: #d6a06a;
  --inv-label: #7c2d12;
  --inv-total: #6b2a0f;
  --inv-brand: #c2410c;
  --inv-motif-opacity: 0.4;
  --inv-header-motif: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none'%3E%3Cpath d='M72 24c14 6 22 20 18 36-4 14-18 22-32 18-6-2-10-6-12-10 8-4 14-10 18-18 4-10 4-18 8-26z' fill='%23fff7ed' opacity='.45'/%3E%3Cpath d='M78 58c-2 8-8 14-16 16' stroke='%23fed7aa' stroke-width='1.5' stroke-linecap='round' opacity='.5'/%3E%3Cpath d='M70 42c-4 6-6 12-6 18' stroke='%23fdba74' stroke-width='1.2' stroke-linecap='round' opacity='.4'/%3E%3C/svg%3E");
}

/* Winter — Dec–Feb: warm stone, soft snow */
.issued-invoice-sheet[data-invoice-season="winter"] {
  --inv-header-bg: linear-gradient(135deg, #57534e 0%, #6b6560 50%, #78716c 100%);
  --inv-header-fg: #fafaf9;
  --inv-eyebrow: #e7e5e4;
  --inv-meta: #d6d3d1;
  --inv-number-muted: #e7e5e4;
  --inv-border-accent: #c8c0b8;
  --inv-label: #57534e;
  --inv-total: #44403c;
  --inv-brand: #78716c;
  --inv-motif-opacity: 0.38;
  --inv-header-motif: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none'%3E%3Cg stroke='%23fafaf9' stroke-width='1.2' stroke-linecap='round' opacity='.45'%3E%3Cpath d='M88 28v20M78 38h20'/%3E%3Cpath d='M81 31l14 14M95 31l-14 14'/%3E%3C/g%3E%3Cg stroke='%23e7e5e4' stroke-width='1' stroke-linecap='round' opacity='.35'%3E%3Cpath d='M72 52v14M65 59h14'/%3E%3Cpath d='M67 54l10 10M77 54l-10 10'/%3E%3C/g%3E%3Ccircle cx='96' cy='56' r='2' fill='%23fafaf9' opacity='.4'/%3E%3Ccircle cx='68' cy='34' r='1.5' fill='%23e7e5e4' opacity='.35'/%3E%3C/svg%3E");
}
`;
