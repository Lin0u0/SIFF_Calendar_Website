import { state } from './state.js';
import { normalizeDateTimeParts } from './utils.js';

const HEADER_SCAN_ROW_LIMIT = 30;

const FIELD_ALIASES = {
    unit: ['单元', '展映单元', '影片单元'],
    chineseTitle: ['中文片名', '影片中文名', '影片名称', '片名', '中文名'],
    englishTitle: ['英文片名', '影片英文名', '英文名'],
    director: ['导演', '导演/编导', '编导'],
    country: ['制片国/地区', '国家/地区', '国家地区', '制片国家/地区', '国家'],
    duration: ['时长', '片长', '片长(分钟)', '片长（分钟）'],
    date: ['日期', '放映日期', '上映日期'],
    time: ['放映时间', '时间', '场次时间'],
    cinema: ['影院', '放映影院', '影城'],
    hall: ['影厅', '厅', '放映厅'],
    address: ['影院地址', '地址'],
    meet: ['见面会', '映后', '映后活动'],
    price: ['票价', '票价(元)', '票价（元）'],
    year: ['年份', '年代'],
    activity: ['活动信息', '活动', '活动内容'],
};

// Parse CSV text into moviesData
export function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV文件格式不正确');

    const headers = parseCSVLine(lines[0]).map(cleanHeader);
    state.moviesData = [];
    state.dataSource = 'siff';

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const movie = {};
            headers.forEach((header, idx) => {
                movie[header] = cleanCellValue(values[idx]);
            });
            state.moviesData.push(normalizeSiffRow(movie, i));
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
    if (!sheet || !sheet['!ref']) throw new Error('未找到可读取的工作表');

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const header = findHeaderRow(sheet, range);
    if (!header) throw new Error('未找到表头行（需包含"单元"和片名列）');

    const rawRows = [];
    for (let r = header.row + 1; r <= range.e.r; r++) {
        const row = {};
        let hasData = false;

        header.columns.forEach(({ c, name }) => {
            const value = getSheetCellValue(sheet, r, c);
            row[name] = value;
            if (isPresent(value)) hasData = true;
        });

        if (hasData) {
            rawRows.push(row);
        }
    }

    normalizeData(rawRows, header.names);
}

function normalizeData(rows, headers) {
    const isBJIFF = headers.some(header => FIELD_ALIASES.chineseTitle.slice(1).includes(header));

    if (isBJIFF) {
        state.dataSource = 'bjiff';
        state.moviesData = rows
            .filter(isValidBjiffRow)
            .map((row, i) => {
                const rawTime = getField(row, FIELD_ALIASES.time);
                const { date, time } = normalizeScreeningDateTime(rawTime, '');
                const durationStr = normalizeDuration(getField(row, FIELD_ALIASES.duration));
                const activity = cleanCellValue(getField(row, FIELD_ALIASES.activity));
                const meet = normalizeMeetMark(getField(row, FIELD_ALIASES.meet), activity);

                return {
                    id: `movie_${i}_${Date.now()}`,
                    '单元': cleanCellValue(getField(row, FIELD_ALIASES.unit)),
                    '中文片名': cleanCellValue(getField(row, FIELD_ALIASES.chineseTitle)),
                    '英文片名': cleanCellValue(getField(row, FIELD_ALIASES.englishTitle)),
                    '导演': '',
                    '制片国/地区': '',
                    '时长': durationStr,
                    '日期': date,
                    '放映时间': time,
                    '影院': cleanCellValue(getField(row, FIELD_ALIASES.cinema)),
                    '影厅': cleanCellValue(getField(row, FIELD_ALIASES.hall)),
                    '影院地址': '',
                    '见面会': meet,
                    '票价': cleanCellValue(getField(row, FIELD_ALIASES.price)),
                    '年份': cleanCellValue(getField(row, FIELD_ALIASES.year)),
                    '活动信息': activity,
                };
            });
    } else {
        state.dataSource = 'siff';
        state.moviesData = rows
            .map((row, i) => normalizeSiffRow(row, i))
            .filter(isValidSiffRow);
    }
}

function normalizeSiffRow(row, index) {
    const { date, time } = normalizeScreeningDateTime(
        getField(row, FIELD_ALIASES.date),
        getField(row, FIELD_ALIASES.time)
    );
    const activity = cleanCellValue(getField(row, FIELD_ALIASES.activity));
    const meet = normalizeMeetMark(getField(row, FIELD_ALIASES.meet), activity);

    return {
        id: `movie_${index}_${Date.now()}`,
        '单元': cleanCellValue(getField(row, FIELD_ALIASES.unit)),
        '中文片名': cleanCellValue(getField(row, FIELD_ALIASES.chineseTitle)),
        '英文片名': cleanCellValue(getField(row, FIELD_ALIASES.englishTitle)),
        '导演': cleanCellValue(getField(row, FIELD_ALIASES.director)),
        '制片国/地区': cleanCellValue(getField(row, FIELD_ALIASES.country)),
        '时长': normalizeDuration(getField(row, FIELD_ALIASES.duration)),
        '日期': date,
        '放映时间': time,
        '影院': cleanCellValue(getField(row, FIELD_ALIASES.cinema)),
        '影厅': cleanCellValue(getField(row, FIELD_ALIASES.hall)),
        '影院地址': cleanCellValue(getField(row, FIELD_ALIASES.address)),
        '见面会': meet,
        '票价': cleanCellValue(getField(row, FIELD_ALIASES.price)),
        '年份': cleanCellValue(getField(row, FIELD_ALIASES.year)),
        '活动信息': activity,
    };
}

function findHeaderRow(sheet, range) {
    const maxRow = Math.min(range.e.r, range.s.r + HEADER_SCAN_ROW_LIMIT - 1);

    for (let r = range.s.r; r <= maxRow; r++) {
        const columns = [];
        const names = [];

        for (let c = range.s.c; c <= range.e.c; c++) {
            const name = cleanHeader(getSheetCellValue(sheet, r, c));
            if (!name) continue;

            columns.push({ c, name });
            names.push(name);
        }

        if (looksLikeHeader(names)) {
            return { row: r, columns, names };
        }
    }

    return null;
}

function looksLikeHeader(headers) {
    const hasUnit = hasAnyHeader(headers, FIELD_ALIASES.unit);
    const hasTitle = hasAnyHeader(headers, FIELD_ALIASES.chineseTitle);
    const hasCinema = hasAnyHeader(headers, FIELD_ALIASES.cinema);
    const hasDateOrTime = hasAnyHeader(headers, FIELD_ALIASES.date) || hasAnyHeader(headers, FIELD_ALIASES.time);

    return hasUnit && hasTitle && hasCinema && hasDateOrTime;
}

function hasAnyHeader(headers, aliases) {
    return aliases.some(alias => headers.includes(alias));
}

function getSheetCellValue(sheet, row, col) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return '';
    if (cell.v instanceof Date) return cell.v;
    if (typeof cell.v === 'number' && typeof cell.w === 'string' && cell.w.trim()) return cleanCellValue(cell.w);
    return cleanCellValue(cell.v);
}

function getField(row, aliases) {
    for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(row, alias) && isPresent(row[alias])) return row[alias];
    }
    return '';
}

function cleanHeader(value) {
    return cleanCellValue(value).replace(/^\uFEFF/, '');
}

function cleanCellValue(value) {
    if (value == null) return '';
    if (value instanceof Date) return value;
    return String(value)
        .replace(/\r?\n+/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

function isPresent(value) {
    return value instanceof Date || cleanCellValue(value) !== '';
}

function normalizeScreeningDateTime(dateValue, timeValue) {
    const time = timeValue instanceof Date ? formatTimeFromDate(timeValue) : cleanCellValue(timeValue);
    const parts = normalizeDateTimeParts(
        dateValue instanceof Date ? dateValue : cleanCellValue(dateValue),
        time
    );

    return { date: parts.date, time: parts.time };
}

function formatTimeFromDate(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizeDuration(value) {
    if (typeof value === 'number') return `${value}分钟`;

    const text = cleanCellValue(value);
    if (!text) return '';
    if (/^\d+$/.test(text)) return `${text}分钟`;
    return text;
}

function normalizeMeetMark(value, activity = '') {
    const text = cleanCellValue(value);
    const activityText = cleanCellValue(activity);
    const combined = `${text} ${activityText}`.trim();
    if (!combined || /^(无|否|no|none)$/i.test(combined)) return '';
    return '★';
}

function isValidSiffRow(row) {
    if (!row['中文片名'] || !row['影院']) return false;
    return Boolean(row['单元'] || row['日期'] || row['放映时间']);
}

function isValidBjiffRow(row) {
    const unit = cleanCellValue(getField(row, FIELD_ALIASES.unit));
    const title = cleanCellValue(getField(row, FIELD_ALIASES.chineseTitle));
    const englishTitle = cleanCellValue(getField(row, FIELD_ALIASES.englishTitle));
    const cinema = cleanCellValue(getField(row, FIELD_ALIASES.cinema));
    const hall = cleanCellValue(getField(row, FIELD_ALIASES.hall));
    const screeningTime = getField(row, FIELD_ALIASES.time);
    const searchableText = [unit, title, englishTitle, cinema, hall, String(screeningTime || '').trim()]
        .join(' ')
        .toLowerCase();

    if (!unit) return false;
    if (unit.includes('无界')) return false;
    if (searchableText.includes('温馨提示')) return false;
    if (searchableText.includes('sheet2')) return false;
    if (searchableText.includes('排片情况请参考')) return false;
    if (!title || !cinema) return false;

    return screeningTime instanceof Date || /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(String(screeningTime || '').trim());
}
