const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BR",
  "CODE",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "HR",
  "I",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SPAN",
  "STRONG",
  "U",
  "UL",
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel", "title"]),
};

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:"];

export function sanitizeUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^[a-z0-9+.-]*[/?#]/i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, window.location.href);
    return SAFE_URL_SCHEMES.includes(url.protocol) ? trimmed : "";
  } catch {
    return "";
  }
}

/**
 * Strips every tag, attribute and URL scheme that is not explicitly allowed,
 * so untrusted note HTML can be rendered without executing script.
 */
export function sanitizeHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  sanitizeNode(parsed.body);
  return parsed.body.innerHTML;
}

function sanitizeNode(node: Element): void {
  for (const child of Array.from(node.children)) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }

    const allowedAttributes = ALLOWED_ATTRIBUTES[child.tagName] ?? new Set();

    for (const attribute of Array.from(child.attributes)) {
      if (!allowedAttributes.has(attribute.name.toLowerCase())) {
        child.removeAttribute(attribute.name);
      }
    }

    if (child.tagName === "A") {
      const href = sanitizeUrl(child.getAttribute("href") ?? "");

      if (href) {
        child.setAttribute("href", href);
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noreferrer noopener");
      } else {
        child.removeAttribute("href");
      }
    }

    sanitizeNode(child);
  }
}
