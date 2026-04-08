// Parse "6月13日" + "13:00" → Date
export function parseDateTime(dateStr, timeStr) {
    const year = new Date().getFullYear();
    const monthMatch = dateStr.match(/(\d+)月/);
    const dayMatch = dateStr.match(/(\d+)日/);
    const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);

    if (monthMatch && dayMatch) {
        return new Date(year, parseInt(monthMatch[1]) - 1, parseInt(dayMatch[1]), hours, minutes);
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
