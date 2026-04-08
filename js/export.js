import { state } from './state.js';
import { parseDateTime, parseDuration, formatDateToICS, formatDateForFilename, escapeICSText } from './utils.js';

export function exportSelection() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }

    const sorted = Array.from(state.selectedMovies.values()).sort((a, b) =>
        parseDateTime(a['日期'], a['放映时间']) - parseDateTime(b['日期'], b['放映时间'])
    );

    let text = '=== 我的观影计划 ===\n\n';
    text += `共选择 ${state.selectedMovies.size} 场电影\n`;

    let currentDate = '';
    sorted.forEach((movie, i) => {
        if (movie['日期'] !== currentDate) {
            currentDate = movie['日期'];
            text += `\n【${currentDate}】\n`;
        }
        text += `\n${i + 1}. ${movie['中文片名']}\n`;
        text += `   时间：${movie['放映时间']}\n`;
        text += `   影院：${movie['影院']}${movie['影厅'] ? ' - ' + movie['影厅'] : ''}\n`;
        if (movie['影院地址']) text += `   地址：${movie['影院地址']}\n`;
        if (movie['导演']) text += `   导演：${movie['导演']}\n`;
        if (movie['时长']) text += `   时长：${movie['时长']}\n`;
        if (movie['票价']) text += `   票价：${movie['票价']}元\n`;
        if (movie['见面会'] === '★') text += `   ★ ${movie['活动信息'] || '有见面会'}\n`;
    });

    const body = document.getElementById('exportModalBody');
    body.innerHTML = `
        <div class="export-content">
            <textarea class="export-textarea" readonly>${text}</textarea>
            <div class="export-actions">
                <button class="btn btn-primary" onclick="window._app.copyToClipboard()">复制到剪贴板</button>
                <button class="btn btn-outline" onclick="window._app.downloadAsText()">下载 .txt</button>
                <button class="btn btn-outline" onclick="window._app.exportSelectionAsJSON()">下载 .json</button>
                <button class="btn btn-accent" onclick="window._app.exportToICS()">下载 .ics 日历</button>
            </div>
        </div>`;
    document.getElementById('exportModal').classList.add('show');
    window._exportedText = text;
}

export function closeExportModal() {
    document.getElementById('exportModal').classList.remove('show');
}

export function copyToClipboard() {
    const ta = document.querySelector('.export-modal.show .export-textarea');
    if (ta) {
        navigator.clipboard.writeText(ta.value).then(() => alert('已复制到剪贴板'));
    }
}

export function downloadAsText() {
    const blob = new Blob([window._exportedText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '观影计划.txt';
    a.click();
    URL.revokeObjectURL(a.href);
}

export function exportSelectionAsJSON() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        movieCount: state.selectedMovies.size,
        movies: Array.from(state.selectedMovies.values()).map(m => ({
            title: m['中文片名'], englishTitle: m['英文片名'],
            date: m['日期'], time: m['放映时间'],
            cinema: m['影院'], hall: m['影厅'],
            director: m['导演'], duration: m['时长'], unit: m['单元'],
        })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `观影计划_${formatDateForFilename(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}

export function exportToICS() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }

    let ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0',
        'PRODID:-//FilmFest//排片系统//CN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'X-WR-CALNAME:观影计划', 'X-WR-TIMEZONE:Asia/Shanghai',
        'BEGIN:VTIMEZONE', 'TZID:Asia/Shanghai',
        'BEGIN:STANDARD', 'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0800', 'TZOFFSETTO:+0800',
        'END:STANDARD', 'END:VTIMEZONE',
    ].join('\r\n');

    for (const [id, movie] of state.selectedMovies) {
        const start = parseDateTime(movie['日期'], movie['放映时间']);
        const end = new Date(start.getTime() + parseDuration(movie['时长']));
        const uid = `filmfest-${id}-${Date.now()}@filmfest`;

        const descParts = [
            movie['英文片名'] ? `英文片名：${movie['英文片名']}` : '',
            movie['导演'] ? `导演：${movie['导演']}` : '',
            movie['制片国/地区'] ? `制片国/地区：${movie['制片国/地区']}` : '',
            movie['时长'] ? `时长：${movie['时长']}` : '',
            `单元：${movie['单元']}`,
            movie['影厅'] ? `影厅：${movie['影厅']}` : '',
            movie['票价'] ? `票价：${movie['票价']}元` : '',
            movie['见面会'] === '★' ? `★ ${movie['活动信息'] || '有见面会'}` : '',
        ].filter(Boolean);

        ics += '\r\n' + [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART;TZID=Asia/Shanghai:${formatDateToICS(start)}`,
            `DTEND;TZID=Asia/Shanghai:${formatDateToICS(end)}`,
            `SUMMARY:${escapeICSText(movie['中文片名'])}`,
            `DESCRIPTION:${escapeICSText(descParts.join(' | '))}`,
            `LOCATION:${escapeICSText(movie['影院'] + (movie['影院地址'] ? ' - ' + movie['影院地址'] : ''))}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
        ].join('\r\n');
    }

    ics += '\r\nEND:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `观影计划_${formatDateForFilename(new Date())}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Import functions
export function showImportOptions() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'importModal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="modal-box" style="max-width:500px">
            <div class="modal-header">
                <h2>导入观影计划</h2>
                <button class="btn-close" onclick="document.getElementById('importModal').remove()">&times;</button>
            </div>
            <div class="import-options">
                <button class="import-option" onclick="window._app.importSelection(); document.getElementById('importModal').remove();">
                    <span class="import-icon">TXT</span>
                    <div><strong>导入文本文件</strong><p>导入之前导出的 .txt 文件</p></div>
                </button>
                <button class="import-option" onclick="window._app.importSelectionFromJSON(); document.getElementById('importModal').remove();">
                    <span class="import-icon">JSON</span>
                    <div><strong>导入 JSON 文件</strong><p>导入之前导出的 .json 文件（更精确）</p></div>
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

export function importSelection() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try { parseAndImportSelection(ev.target.result); }
            catch (err) { alert('导入失败：' + err.message); }
        };
        reader.readAsText(file, 'UTF-8');
    };
    input.click();
}

function parseAndImportSelection(content) {
    if (!state.moviesData.length) { alert('请先加载电影数据'); return; }
    state.selectedMovies.clear();

    const lines = content.split('\n');
    let currentDate = '', currentMovie = null, imported = 0, notFound = [];
    const patterns = {
        title: /^\d+\.\s*(.+)$/,
        time: /时间：(\d+:\d+)/,
        date: /【(.+?)】/,
        cinema: /影院：(.+?)\s*-\s*(.+)/,
    };

    function trySelect(info) {
        for (const m of state.moviesData) {
            if (m['中文片名'] === info.title && m['日期'] === info.date && m['放映时间'] === info.time) {
                state.selectedMovies.set(m.id, m); return true;
            }
        }
        for (const m of state.moviesData) {
            if (m['中文片名'] === info.title && m['日期'] === info.date) {
                state.selectedMovies.set(m.id, m); return true;
            }
        }
        for (const m of state.moviesData) {
            if (m['中文片名'] === info.title) {
                state.selectedMovies.set(m.id, m); return true;
            }
        }
        return false;
    }

    for (const line of lines) {
        const dateMatch = line.match(patterns.date);
        if (dateMatch) { currentDate = dateMatch[1]; continue; }
        const titleMatch = line.match(patterns.title);
        if (titleMatch) {
            if (currentMovie) { if (trySelect(currentMovie)) imported++; else notFound.push(currentMovie.title); }
            currentMovie = { title: titleMatch[1].trim(), date: currentDate };
            continue;
        }
        if (currentMovie) {
            const tm = line.match(patterns.time);
            if (tm) currentMovie.time = tm[1];
        }
    }
    if (currentMovie) { if (trySelect(currentMovie)) imported++; else notFound.push(currentMovie.title); }

    import('./selection.js').then(m => m.updateSelectionPanel());
    import('./display.js').then(m => m.displayMovies());

    let msg = `成功导入 ${imported} 部电影`;
    if (notFound.length) msg += `\n\n未找到：\n${notFound.join('\n')}`;
    alert(msg);
}

export function importSelectionFromJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                importFromJSON(data);
            } catch { alert('导入失败：JSON 格式错误'); }
        };
        reader.readAsText(file, 'UTF-8');
    };
    input.click();
}

function importFromJSON(data) {
    if (!state.moviesData.length) { alert('请先加载电影数据'); return; }
    state.selectedMovies.clear();
    let imported = 0, notFound = [];

    for (const info of data.movies) {
        let found = false;
        for (const m of state.moviesData) {
            if (m['中文片名'] === info.title && m['日期'] === info.date &&
                m['放映时间'] === info.time && m['影院'] === info.cinema) {
                state.selectedMovies.set(m.id, m);
                found = true; imported++;
                break;
            }
        }
        if (!found) notFound.push(`${info.title} - ${info.date} ${info.time}`);
    }

    // Dynamic imports to avoid circular deps
    import('./selection.js').then(sel => sel.updateSelectionPanel());
    import('./display.js').then(disp => disp.displayMovies());

    let msg = `成功导入 ${imported}/${data.movies.length} 部电影`;
    if (notFound.length) {
        msg += `\n\n未找到：\n${notFound.slice(0, 5).join('\n')}`;
        if (notFound.length > 5) msg += `\n... 还有 ${notFound.length - 5} 个`;
    }
    alert(msg);
}
