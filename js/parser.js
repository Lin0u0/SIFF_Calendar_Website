import { state } from './state.js';

// Parse CSV text into moviesData
export function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV文件格式不正确');

    const headers = parseCSVLine(lines[0]);
    state.moviesData = [];
    state.dataSource = 'siff';

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const movie = {};
            headers.forEach((header, idx) => {
                movie[header.trim()] = values[idx].trim();
            });
            movie.id = `movie_${i}_${Date.now()}`;
            state.moviesData.push(movie);
        }
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Parse XLSX ArrayBuffer into moviesData
export function parseXLSX(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Find header row
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let headerRow = -1;
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        if (cell && String(cell.v).trim() === '单元') {
            headerRow = r;
            break;
        }
    }
    if (headerRow === -1) throw new Error('未找到表头行（需包含"单元"列）');

    // Read headers
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
        headers.push(cell ? String(cell.v).trim() : '');
    }

    // Read data rows
    const rawRows = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const row = {};
        let hasData = false;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            row[headers[c]] = cell != null ? cell.v : '';
            if (cell != null) hasData = true;
        }
        if (hasData && row['单元']) rawRows.push(row);
    }

    normalizeData(rawRows, headers);
}

function normalizeData(rows, headers) {
    const isBJIFF = headers.includes('影片中文名');

    if (isBJIFF) {
        state.dataSource = 'bjiff';
        state.moviesData = rows.map((row, i) => {
            let dateStr = '', timeStr = '';
            const rawTime = row['放映时间'];

            if (rawTime instanceof Date) {
                dateStr = `${rawTime.getMonth() + 1}月${rawTime.getDate()}日`;
                timeStr = `${String(rawTime.getHours()).padStart(2, '0')}:${String(rawTime.getMinutes()).padStart(2, '0')}`;
            } else if (typeof rawTime === 'string') {
                dateStr = rawTime;
            }

            const durationRaw = row['片长(分钟)'] || row['片长（分钟）'] || '';
            const durationStr = typeof durationRaw === 'number' ? `${durationRaw}分钟` : String(durationRaw);
            const activity = String(row['活动信息'] || '').trim();

            return {
                id: `movie_${i}_${Date.now()}`,
                '单元': String(row['单元'] || '').trim(),
                '中文片名': String(row['影片中文名'] || '').trim(),
                '英文片名': String(row['影片英文名'] || '').trim(),
                '导演': '',
                '制片国/地区': '',
                '时长': durationStr,
                '日期': dateStr,
                '放映时间': timeStr,
                '影院': String(row['影院'] || '').trim(),
                '影厅': String(row['影厅'] || '').trim(),
                '影院地址': '',
                '见面会': activity ? '★' : '',
                '票价': row['票价(元)'] || row['票价（元）'] || '',
                '年份': row['年份'] || '',
                '活动信息': activity,
            };
        });
    } else {
        state.dataSource = 'siff';
        state.moviesData = rows.map((row, i) => {
            row.id = `movie_${i}_${Date.now()}`;
            return row;
        });
    }
}
