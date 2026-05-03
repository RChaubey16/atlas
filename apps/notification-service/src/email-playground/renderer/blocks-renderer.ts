export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

function escapeHtml(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url: unknown): string {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^\//.test(trimmed)) return trimmed;
  return '#';
}

function safeColor(color: unknown): string {
  if (typeof color !== 'string') return '#000000';
  const t = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
  if (/^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/.test(t)) return t;
  return '#000000';
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const val = vars[key.trim()];
    return val !== undefined ? escapeHtml(val) : escapeHtml(`{{${key}}}`);
  });
}

function wrap(inner: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">\n<tr><td>${inner}</td></tr>\n</table>`;
}

function renderHeading(p: Record<string, unknown>, vars: Record<string, string>): string {
  const level = Math.min(Math.max(num(p.level, 2), 1), 6);
  const text = substituteVars(escapeHtml(str(p.text, 'Heading')), vars);
  const align = str(p.align, 'center');
  const color = safeColor(p.color ?? '#111827');
  const size = num(p.fontSize, 28);
  return wrap(
    `<td align="${align}" style="padding:16px 24px;">` +
    `<h${level} style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:${size}px;color:${color};line-height:1.3;font-weight:700;">${text}</h${level}>` +
    `</td>`,
  );
}

function renderParagraph(p: Record<string, unknown>, vars: Record<string, string>): string {
  const text = substituteVars(escapeHtml(str(p.text, '')), vars);
  const align = str(p.align, 'left');
  const color = safeColor(p.color ?? '#374151');
  const size = num(p.fontSize, 16);
  return wrap(
    `<td align="${align}" style="padding:8px 24px;">` +
    `<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:${size}px;color:${color};line-height:1.6;">${text}</p>` +
    `</td>`,
  );
}

function renderImage(p: Record<string, unknown>): string {
  const src = safeUrl(p.url);
  const alt = escapeHtml(str(p.alt, ''));
  const width = num(p.width, 600);
  const align = str(p.align, 'center');
  const link = safeUrl(p.link);
  const imgTag = `<img src="${src}" alt="${alt}" width="${width}" style="max-width:100%;height:auto;display:block;${align === 'center' ? 'margin:0 auto;' : ''}">`;
  const inner = link && link !== '#'
    ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${imgTag}</a>`
    : imgTag;
  return wrap(`<td align="${align}" style="padding:16px 24px;">${inner}</td>`);
}

function renderButton(p: Record<string, unknown>, vars: Record<string, string>): string {
  const text = substituteVars(escapeHtml(str(p.text, 'Click Here')), vars);
  const href = safeUrl(p.url);
  const bg = safeColor(p.backgroundColor ?? '#6366f1');
  const fg = safeColor(p.textColor ?? '#ffffff');
  const radius = num(p.borderRadius, 6);
  const align = str(p.align, 'center');
  const size = num(p.fontSize, 16);
  return wrap(
    `<td align="${align}" style="padding:16px 24px;">` +
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${bg};color:${fg};padding:12px 28px;border-radius:${radius}px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:${size}px;font-weight:600;">${text}</a>` +
    `</td>`,
  );
}

function renderDivider(p: Record<string, unknown>): string {
  const color = safeColor(p.color ?? '#e5e7eb');
  const thickness = num(p.thickness, 1);
  return wrap(
    `<td style="padding:8px 24px;"><hr style="border:none;border-top:${thickness}px solid ${color};margin:0;"></td>`,
  );
}

function renderSpacer(p: Record<string, unknown>): string {
  const height = num(p.height, 24);
  return wrap(`<td style="height:${height}px;line-height:${height}px;font-size:0;">&nbsp;</td>`);
}

function renderHero(p: Record<string, unknown>, vars: Record<string, string>): string {
  const title = substituteVars(escapeHtml(str(p.title, 'Welcome')), vars);
  const subtitle = substituteVars(escapeHtml(str(p.subtitle, '')), vars);
  const bg = safeColor(p.backgroundColor ?? '#6366f1');
  const fg = safeColor(p.textColor ?? '#ffffff');
  const btnText = str(p.buttonText, '');
  const btnUrl = safeUrl(p.buttonUrl);
  const btnBg = safeColor(p.buttonColor ?? '#ffffff');
  const btnFg = safeColor(p.buttonTextColor ?? '#6366f1');
  const btnHtml = btnText
    ? `<a href="${btnUrl}" target="_blank" style="display:inline-block;background-color:${btnBg};color:${btnFg};padding:14px 32px;border-radius:6px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;font-weight:600;">${escapeHtml(btnText)}</a>`
    : '';
  return wrap(
    `<td align="center" style="padding:48px 24px;background-color:${bg};">` +
    `<h1 style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:36px;color:${fg};line-height:1.2;">${title}</h1>` +
    (subtitle ? `<p style="margin:0 0 ${btnText ? '24px' : '0'};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;color:${fg};opacity:0.85;">${subtitle}</p>` : '') +
    btnHtml +
    `</td>`,
  );
}

function renderLogo(p: Record<string, unknown>): string {
  const src = safeUrl(p.url);
  const alt = escapeHtml(str(p.alt, 'Logo'));
  const width = num(p.width, 150);
  const align = str(p.align, 'center');
  const link = safeUrl(p.link);
  const imgTag = `<img src="${src}" alt="${alt}" width="${width}" style="max-width:100%;height:auto;display:block;${align === 'center' ? 'margin:0 auto;' : ''}">`;
  const inner = link && link !== '#'
    ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${imgTag}</a>`
    : imgTag;
  return wrap(`<td align="${align}" style="padding:24px;">${inner}</td>`);
}

function renderFooter(p: Record<string, unknown>, vars: Record<string, string>): string {
  const text = substituteVars(escapeHtml(str(p.text, '')), vars);
  const color = safeColor(p.color ?? '#9ca3af');
  const size = num(p.fontSize, 12);
  const align = str(p.align, 'center');
  return wrap(
    `<td align="${align}" style="padding:16px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">` +
    `<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:${size}px;color:${color};line-height:1.5;">${text}</p>` +
    `</td>`,
  );
}

interface SocialLink {
  platform?: string;
  url?: string;
  label?: string;
}

function renderSocial(p: Record<string, unknown>): string {
  const links = Array.isArray(p.links) ? (p.links as SocialLink[]) : [];
  const align = str(p.align, 'center');
  const cells = links
    .map(
      (l) =>
        `<td style="padding:0 8px;"><a href="${safeUrl(l.url)}" target="_blank" rel="noopener noreferrer" style="color:#6366f1;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">${escapeHtml(l.label ?? l.platform ?? '')}</a></td>`,
    )
    .join('');
  return wrap(
    `<td align="${align}" style="padding:16px 24px;">` +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" ${align === 'center' ? 'align="center"' : ''}><tr>${cells}</tr></table>` +
    `</td>`,
  );
}

function renderBlock(block: Block, vars: Record<string, string>): string {
  switch (block.type) {
    case 'heading': return renderHeading(block.props, vars);
    case 'paragraph': return renderParagraph(block.props, vars);
    case 'image': return renderImage(block.props);
    case 'button': return renderButton(block.props, vars);
    case 'divider': return renderDivider(block.props);
    case 'spacer': return renderSpacer(block.props);
    case 'hero': return renderHero(block.props, vars);
    case 'logo': return renderLogo(block.props);
    case 'footer': return renderFooter(block.props, vars);
    case 'social': return renderSocial(block.props);
    default: return '';
  }
}

export function renderBlocksToHtml(
  blocks: Block[],
  variables: Record<string, string> = {},
): string {
  const inner = blocks.map((b) => renderBlock(b, variables)).join('\n');
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
body,html{margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#f3f4f6;}
img{border:0;max-width:100%;}
a{color:#6366f1;}
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:20px 0;">
<table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td>
${inner}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
