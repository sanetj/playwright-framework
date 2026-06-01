export type ReplayRejectionCategory =
  | 'AUTH_EXPIRED'
  | 'CSRF_REJECTED'
  | 'REDIRECTED'
  | 'ANTI_AUTOMATION_BLOCK'
  | 'SESSION_INVALIDATED'
  | 'NETWORK_UNSTABLE'
  | 'ACCESS_DENIED'
  | 'UNKNOWN_REJECTION';

export interface ReplayRejectionSignal {
  category: ReplayRejectionCategory;
  statusCode: number;
  redirectDetected: boolean;
  normalizedLocation?: string;
  deterministicReason: string;
}

/**
 * Normalizes absolute or relative location redirect URLs stably.
 * Alphabetically sorts query parameters and strips transient dynamic ones.
 */
export function normalizeLocationUrl(urlStr: string): string {
  if (!urlStr) return '';
  
  let parsedUrl: URL;
  let isRelative = false;
  const dummyBase = 'http://relative.local';
  
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    try {
      parsedUrl = new URL(urlStr, dummyBase);
      isRelative = true;
    } catch {
      return urlStr;
    }
  }
  
  const searchParams = parsedUrl.searchParams;
  const keys: string[] = [];
  for (const key of searchParams.keys()) {
    keys.push(key);
  }
  keys.sort();
  
  const transientParams = ['ts', 'nonce', 'csrf', 't', '_', 'xsrf', 'csrftoken', 'xsrftoken', 'token'];
  const cleanParams = new URLSearchParams();
  
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    if (transientParams.includes(lowerKey)) {
      continue;
    }
    const values = searchParams.getAll(key);
    for (const val of values) {
      cleanParams.append(key, val);
    }
  }
  
  const sortedQueryString = cleanParams.toString();
  const suffix = sortedQueryString ? `?${sortedQueryString}` : '';
  
  if (isRelative) {
    return `${parsedUrl.pathname}${suffix}`;
  }
  return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${suffix}`;
}

/**
 * Classifies a HTTP response stably into replay rejection categories without AI or heuristics.
 */
export class ReplayRejectionClassifier {
  public classify(
    statusCode: number,
    headers: Array<{ name: string; value: string }>,
    bodyStr?: string
  ): ReplayRejectionSignal | undefined {
    const locationHeader = headers.find(h => h.name.toLowerCase() === 'location')?.value;
    const redirectStatusCodes = [301, 302, 303, 307, 308];
    const redirectDetected = redirectStatusCodes.includes(statusCode) || !!locationHeader;

    const isRejection = statusCode >= 400 || redirectDetected;
    if (!isRejection) {
      return undefined;
    }

    let category: ReplayRejectionCategory = 'UNKNOWN_REJECTION';
    let deterministicReason = `HTTP status code ${statusCode} detected.`;
    let normalizedLocation: string | undefined;

    if (redirectDetected) {
      category = 'REDIRECTED';
      if (locationHeader) {
        normalizedLocation = normalizeLocationUrl(locationHeader);
        deterministicReason = `Redirect detected to location '${normalizedLocation}' with status ${statusCode}.`;
      } else {
        deterministicReason = `Redirect detected with status ${statusCode} but no Location header present.`;
      }
      return {
        category,
        statusCode,
        redirectDetected: true,
        normalizedLocation,
        deterministicReason
      };
    }

    const lowerBody = bodyStr ? bodyStr.toLowerCase() : '';

    if (
      statusCode === 429 ||
      lowerBody.includes('captcha') ||
      lowerBody.includes('cloudflare') ||
      lowerBody.includes('recaptcha') ||
      lowerBody.includes('bot detected') ||
      lowerBody.includes('anti-bot') ||
      lowerBody.includes('automation') ||
      lowerBody.includes('distil')
    ) {
      category = 'ANTI_AUTOMATION_BLOCK';
      deterministicReason = `Anti-automation block detected on status ${statusCode}. Body matches typical automation block pattern.`;
    } else if (
      lowerBody.includes('csrf') ||
      lowerBody.includes('xsrf') ||
      lowerBody.includes('cross-site request forgery') ||
      lowerBody.includes('anti-forgery')
    ) {
      category = 'CSRF_REJECTED';
      deterministicReason = `CSRF rejection detected on status ${statusCode}. Body matches CSRF validation failure pattern.`;
    } else if (
      lowerBody.includes('expired') ||
      lowerBody.includes('session expired') ||
      lowerBody.includes('token expired') ||
      lowerBody.includes('jwt expired')
    ) {
      category = 'AUTH_EXPIRED';
      deterministicReason = `Authentication expired on status ${statusCode}. Body matches expired credential pattern.`;
    } else if (
      lowerBody.includes('invalid session') ||
      lowerBody.includes('session invalidated') ||
      lowerBody.includes('unauthorized session') ||
      lowerBody.includes('session not found')
    ) {
      category = 'SESSION_INVALIDATED';
      deterministicReason = `Session invalidated on status ${statusCode}. Body matches invalidated session token pattern.`;
    } else if (statusCode === 502 || statusCode === 503 || statusCode === 504 || statusCode === 0) {
      category = 'NETWORK_UNSTABLE';
      deterministicReason = `Network instability or gateway error on status ${statusCode}.`;
    } else if (statusCode === 401 || statusCode === 403) {
      category = 'ACCESS_DENIED';
      deterministicReason = `Access denied on status ${statusCode} (Unauthorized/Forbidden route).`;
    }

    return {
      category,
      statusCode,
      redirectDetected: false,
      deterministicReason
    };
  }
}
