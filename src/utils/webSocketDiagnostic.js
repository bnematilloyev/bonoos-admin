/**
 * WebSocket URL ni konsolga chiqarish uchun (token yashirin).
 * @param {string} fullUrl
 */
export function sanitizeAdminChatWsUrl(fullUrl) {
  try {
    const u = new URL(fullUrl);
    if (u.searchParams.has('access_token')) {
      u.searchParams.set('access_token', '(redacted)');
    }
    return u.toString();
  } catch {
    return '(not a valid URL)';
  }
}

/**
 * Brauzer WebSocket yopilish kodlari bo‘yicha qisqa izoh (debug).
 * @param {number} code
 * @param {string} [rawReason]
 * @param {boolean} wasClean
 */
export function describeWebSocketClose(code, rawReason, wasClean) {
  const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
  const parts = [];

  let hint =
    'Agar sabab noaniq bo‘lsa, server/nginx access log va WebSocket endpoint konfiguratsiyasini tekshiring.';

  switch (code) {
    case 1000:
      hint = 'Normal yopilish (Normal Closure).';
      break;
    case 1001:
      hint = 'Going Away — endpoint yoki brauzer varaq yopilmoqda.';
      break;
    case 1002:
      hint = 'Protokol xatosi (Protocol error).';
      break;
    case 1003:
      hint = 'Qo‘llab-quvvatlanmaydigan maʼlumot turi.';
      break;
    case 1006:
      hint =
        'Abrupt uzilish (1006). Ko‘pincha: tarmoq/TLS uzilishi, yoki HTTP handshake 101 emas (masalan 401/403/404/502). ' +
        'Brauzer aniq HTTP status kodini ko‘rsatmaydi — backend va reverse-proxy loglarini tekshiring.';
      break;
    case 1007:
      hint = 'Maʼlumot formati mos emas.';
      break;
    case 1008:
      hint = 'Siyosat buzildi (Policy Violation) — token, UUID yoki ruxsat tekshiruvi muvaffaqiyatsiz bo‘lishi mumkin.';
      break;
    case 1009:
      hint = 'Xabar juda katta.';
      break;
    case 1010:
      hint = 'Kutilmagan shartnoma (extension / server talabi).';
      break;
    case 1011:
      hint = 'Server ichki xato (Internal Error).';
      break;
    case 1012:
      hint = 'Service Restart.';
      break;
    case 1013:
      hint = 'Try Again Later.';
      break;
    case 1014:
      hint = 'Bad Gateway — proxy orqali muammo.';
      break;
    case 1015:
      hint = 'TLS handshake muammosi (TLS handshake).';
      break;
    default:
      if (code >= 3000 && code <= 3999) {
        hint = 'Kutubxona / freymvork uchun ajratilgan kod oralig‘i.';
      } else if (code >= 4000 && code <= 4999) {
        hint = 'Ilova (backend) maxsus yopilish kodi — server hujjatiga qarang.';
      }
  }

  parts.push(`code=${code}`);
  if (reason) parts.push(`reason="${reason}"`);
  parts.push(`wasClean=${wasClean}`);

  const summary = `WebSocket yopildi: ${parts.join(', ')}`;
  const detailLines = [summary, hint];

  return {
    code,
    reason,
    wasClean,
    hint,
    summary,
    /** Konsol / UI uchun ko‘p qatorli matn */
    fullText: detailLines.join('\n'),
  };
}
