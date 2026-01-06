/**
 * DateParser - 解析文字中的日期資訊
 * 支援多種中文和英文日期格式
 */

export interface ParsedDate {
  date: string; // ISO format (YYYY-MM-DD)
  confidence: number; // 0-1
  raw: string; // 原始匹配的文字
}

export class DateParser {
  /**
   * 從文字中提取日期
   * @param text - 輸入文字
   * @returns 解析出的日期（ISO 格式）或 undefined
   */
  static extractDate(text: string): ParsedDate | undefined {
    const patterns = [
      // 西元年格式: 2025/12/30, 2025-12-30, 2025.12.30
      {
        regex: /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
        parser: (match: RegExpMatchArray) => {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          const day = parseInt(match[3]);
          return this.buildDate(year, month, day, match[0], 0.95);
        }
      },
      // 民國年格式: 114/12/30, 114-12-30
      {
        regex: /(\d{2,3})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
        parser: (match: RegExpMatchArray) => {
          const rocYear = parseInt(match[1]);
          const year = rocYear + 1911; // 民國轉西元
          const month = parseInt(match[2]);
          const day = parseInt(match[3]);
          return this.buildDate(year, month, day, match[0], 0.9);
        }
      },
      // 中文格式: 12月30日, 12月30號
      {
        regex: /(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]/g,
        parser: (match: RegExpMatchArray) => {
          const now = new Date();
          const year = now.getFullYear();
          const month = parseInt(match[1]);
          const day = parseInt(match[2]);
          return this.buildDate(year, month, day, match[0], 0.85);
        }
      },
      // 相對日期: 明天, 後天, 下週
      {
        regex: /(明天|後天|大後天|下週一|下週二|下週三|下週四|下週五|下週六|下週日|下周一|下周二|下周三|下周四|下周五|下周六|下周日)/g,
        parser: (match: RegExpMatchArray) => {
          return this.parseRelativeDate(match[1], match[0]);
        }
      },
      // 英文月份: Dec 30, December 30, 30 Dec
      {
        regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/gi,
        parser: (match: RegExpMatchArray) => {
          const now = new Date();
          const year = now.getFullYear();
          const month = this.monthNameToNumber(match[1]);
          const day = parseInt(match[2]);
          return this.buildDate(year, month, day, match[0], 0.8);
        }
      },
      {
        regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/gi,
        parser: (match: RegExpMatchArray) => {
          const now = new Date();
          const year = now.getFullYear();
          const day = parseInt(match[1]);
          const month = this.monthNameToNumber(match[2]);
          return this.buildDate(year, month, day, match[0], 0.8);
        }
      }
    ];

    let bestMatch: ParsedDate | undefined;

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern.regex);
      for (const match of matches) {
        try {
          const parsed = pattern.parser(match);
          if (parsed && (!bestMatch || parsed.confidence > bestMatch.confidence)) {
            bestMatch = parsed;
          }
        } catch (e) {
          // 解析失敗，繼續嘗試下一個模式
          console.warn('Date parsing failed:', e);
        }
      }
    }

    return bestMatch;
  }

  /**
   * 建立日期物件
   */
  private static buildDate(
    year: number,
    month: number,
    day: number,
    raw: string,
    confidence: number
  ): ParsedDate | undefined {
    // 驗證日期合法性
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }

    // 特定月份的天數驗證
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      return undefined;
    }

    // 建立 ISO 格式日期字串
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return { date, confidence, raw };
  }

  /**
   * 解析相對日期（明天、下週等）
   */
  private static parseRelativeDate(keyword: string, raw: string): ParsedDate | undefined {
    const now = new Date();
    let targetDate = new Date(now);

    switch (keyword) {
      case '明天':
        targetDate.setDate(now.getDate() + 1);
        break;
      case '後天':
        targetDate.setDate(now.getDate() + 2);
        break;
      case '大後天':
        targetDate.setDate(now.getDate() + 3);
        break;
      case '下週一':
      case '下周一':
        targetDate = this.getNextWeekday(now, 1);
        break;
      case '下週二':
      case '下周二':
        targetDate = this.getNextWeekday(now, 2);
        break;
      case '下週三':
      case '下周三':
        targetDate = this.getNextWeekday(now, 3);
        break;
      case '下週四':
      case '下周四':
        targetDate = this.getNextWeekday(now, 4);
        break;
      case '下週五':
      case '下周五':
        targetDate = this.getNextWeekday(now, 5);
        break;
      case '下週六':
      case '下周六':
        targetDate = this.getNextWeekday(now, 6);
        break;
      case '下週日':
      case '下周日':
        targetDate = this.getNextWeekday(now, 0);
        break;
      default:
        return undefined;
    }

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return { date, confidence: 0.9, raw };
  }

  /**
   * 取得下一個指定星期幾的日期
   */
  private static getNextWeekday(from: Date, targetDay: number): Date {
    const result = new Date(from);
    const currentDay = from.getDay();
    let daysToAdd = targetDay - currentDay;

    if (daysToAdd <= 0) {
      daysToAdd += 7; // 如果目標日期在本週已過，則取下週的
    }

    result.setDate(from.getDate() + daysToAdd);
    return result;
  }

  /**
   * 英文月份名稱轉數字
   */
  private static monthNameToNumber(name: string): number {
    const months: { [key: string]: number } = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, september: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12
    };

    return months[name.toLowerCase()] || 1;
  }

  /**
   * 檢查日期是否在過去
   */
  static isPast(dateStr: string): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 重設到當天開始
    return date < now;
  }

  /**
   * 格式化日期為中文顯示
   */
  static formatChinese(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];

    return `${year}年${month}月${day}日 (週${weekday})`;
  }
}