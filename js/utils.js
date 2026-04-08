function pad2(value) {
    return String(value).padStart(2, '0');
}

export function normalizeDateTimeParts(dateStr, timeStr = '') {
    const rawDate = String(dateStr || '').trim();
    const rawTime = String(timeStr || '').trim();

    if (!rawDate && !rawTime) {
        return { date: '', time: '' };
    }

    const fullMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})(?:[ T]+(\d{1,2}:\d{2}))?$/);
    if (fullMatch) {
        return {
            date: fullMatch[1],
            time: rawTime || (fullMatch[2] ? fullMatch[2].padStart(5, '0') : ''),
        };
    }

    const monthDayMatch = rawDate.match(/^(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}:\d{2}))?$/);
    if (monthDayMatch) {
        return {
            date: `${parseInt(monthDayMatch[1], 10)}月${parseInt(monthDayMatch[2], 10)}日`,
            time: rawTime || (monthDayMatch[3] ? monthDayMatch[3].padStart(5, '0') : ''),
        };
    }

    return { date: rawDate, time: rawTime };
}

export function getMovieDate(movie) {
    return normalizeDateTimeParts(movie?.['日期'], movie?.['放映时间']).date;
}

export function getMovieTime(movie) {
    return normalizeDateTimeParts(movie?.['日期'], movie?.['放映时间']).time;
}

// Parse "6月13日" + "13:00" or "2026-04-23 18:30" → Date
export function parseDateTime(dateStr, timeStr) {
    const { date, time } = normalizeDateTimeParts(dateStr, timeStr);
    const normalizedTime = time || '00:00';
    const [hours, minutes] = normalizedTime.split(':').map(Number);

    const monthDayMatch = date.match(/^(\d{1,2})月(\d{1,2})日$/);
    if (monthDayMatch) {
        const year = new Date().getFullYear();
        return new Date(year, parseInt(monthDayMatch[1], 10) - 1, parseInt(monthDayMatch[2], 10), hours, minutes);
    }

    const isoDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
        return new Date(
            parseInt(isoDateMatch[1], 10),
            parseInt(isoDateMatch[2], 10) - 1,
            parseInt(isoDateMatch[3], 10),
            hours,
            minutes
        );
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
