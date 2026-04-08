function pad2(value) {
    return String(value).padStart(2, '0');
}

function normalizeTimeString(timeStr = '') {
    const raw = String(timeStr || '').trim();
    if (!raw) return '';

    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return raw;

    return `${pad2(match[1])}:${pad2(match[2])}`;
}

function buildNormalizedDateParts(year, month, day, time = '') {
    const normalizedTime = normalizeTimeString(time);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const safeYear = year != null ? parseInt(year, 10) : new Date().getFullYear();

    return {
        date: `${monthNum}月${dayNum}日`,
        time: normalizedTime,
        year: safeYear,
        month: monthNum,
        day: dayNum,
        canonicalDate: `${safeYear}-${pad2(monthNum)}-${pad2(dayNum)}`,
    };
}

export function normalizeDateTimeParts(dateStr, timeStr = '') {
    if (dateStr instanceof Date) {
        return buildNormalizedDateParts(
            dateStr.getFullYear(),
            dateStr.getMonth() + 1,
            dateStr.getDate(),
            timeStr || `${dateStr.getHours()}:${dateStr.getMinutes()}`
        );
    }

    const rawDate = String(dateStr || '').trim();
    const rawTime = normalizeTimeString(timeStr);

    if (!rawDate && !rawTime) {
        return { date: '', time: '', year: null, month: null, day: null, canonicalDate: '' };
    }

    const fullMatch = rawDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T]+(\d{1,2}:\d{1,2}))?$/);
    if (fullMatch) {
        return buildNormalizedDateParts(
            fullMatch[1],
            fullMatch[2],
            fullMatch[3],
            rawTime || fullMatch[4] || ''
        );
    }

    const monthDayMatch = rawDate.match(/^(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}:\d{2}))?$/);
    if (monthDayMatch) {
        return buildNormalizedDateParts(
            null,
            monthDayMatch[1],
            monthDayMatch[2],
            rawTime || monthDayMatch[3] || ''
        );
    }

    return {
        date: rawDate,
        time: rawTime,
        year: null,
        month: null,
        day: null,
        canonicalDate: '',
    };
}

export function getMovieDate(movie) {
    return normalizeDateTimeParts(movie?.['日期'], movie?.['放映时间']).date;
}

export function getMovieTime(movie) {
    return normalizeDateTimeParts(movie?.['日期'], movie?.['放映时间']).time;
}

// Parse "6月13日" + "13:00" or "2026-04-23 18:30" → Date
export function parseDateTime(dateStr, timeStr) {
    const { canonicalDate, date, time, year, month, day } = normalizeDateTimeParts(dateStr, timeStr);
    const normalizedTime = time || '00:00';
    const [hours, minutes] = normalizedTime.split(':').map(Number);

    if (canonicalDate) {
        const [fullYear, fullMonth, fullDay] = canonicalDate.split('-').map(Number);
        return new Date(fullYear, fullMonth - 1, fullDay, hours, minutes);
    }

    if (month != null && day != null) {
        return new Date(year ?? new Date().getFullYear(), month - 1, day, hours, minutes);
    }

    const isoDateMatch = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoDateMatch) {
        return new Date(parseInt(isoDateMatch[1], 10), parseInt(isoDateMatch[2], 10) - 1, parseInt(isoDateMatch[3], 10), hours, minutes);
    }

    return new Date();
}

// Parse duration string or number → milliseconds
export function parseDuration(duration) {
    if (typeof duration === 'number') return duration * 60 * 1000;

    const str = String(duration);
    if (/^\d+$/.test(str.trim())) return parseInt(str.trim()) * 60 * 1000;

    let totalMinutes = 0;
    const hourMatch = str.match(/(\d+)\s*小时/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    const minuteMatch = str.match(/(\d+)\s*分钟/);
    if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);
    if (totalMinutes === 0) totalMinutes = 120;

    return totalMinutes * 60 * 1000;
}

// Calculate end time string from start + duration
export function calculateEndTime(startHour, startMin, durationMs) {
    const totalMinutes = startHour * 60 + startMin + Math.ceil(durationMs / (60 * 1000));
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMin = totalMinutes % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
}

// Format date for ICS: 20260417T130000
export function formatDateToICS(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}T${h}${min}00`;
}

// Format date for filenames: 20260417_1300
export function formatDateForFilename(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
}

// Escape text for ICS format
export function escapeICSText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, ' ');
}

// Draw rounded rectangle on canvas
export function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
