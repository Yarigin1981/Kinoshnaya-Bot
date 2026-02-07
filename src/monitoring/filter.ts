/**
 * Фильтрация контента из каналов КД
 *
 * Определяет, стоит ли пересказывать сообщение для Киношной
 */

export interface FilterResult {
  isRelevant: boolean;
  reason: string;
  category?: 'casting' | 'insight' | 'news';
  priority?: number; // 1-10, чем выше — тем интереснее
}

// ============================================
// ПОЗИТИВНЫЕ СИГНАЛЫ (повышают релевантность)
// ============================================
const POSITIVE_KEYWORDS = [
  // Типы ролей
  'главная роль',
  'главную роль',
  'эпизод',
  'эпизодическая роль',
  'второй план',
  'второго плана',
  'роль',

  // Типы проектов
  'сериал',
  'полный метр',
  'полнометражный',
  'короткометражка',
  'короткий метр',
  'клип',
  'музыкальный клип',
  'федеральный канал',
  'реклама федеральная',

  // Процесс кастинга
  'пробы',
  'очные пробы',
  'видеопробы',
  'селфтейп',
  'self-tape',
  'кастинг',

  // Финансы
  'гонорар',
  'ставка',
  'оплата от',
  'buyout',
  'байаут',
  'оплачиваемый',

  // Съёмки
  'съёмки',
  'съёмочный',
  'съёмочные дни',

  // Инсайты и советы
  'лайфхак',
  'совет',
  'важно знать',
  'опыт',
  'история',
  'расскажу',
  'поделюсь',
];

// ============================================
// НЕГАТИВНЫЕ СИГНАЛЫ (снижают релевантность)
// ============================================
const NEGATIVE_KEYWORDS = [
  // Массовка
  'массовка',
  'массовая сцена',
  'фоновый актёр',
  'групповка',
  'массов',

  // Бесплатные проекты
  'без оплаты',
  'tfp',
  'тфп',
  'для портфолио',
  'бесплатно',
  'на взаимных',
  'безоплатно',

  // Спам и реклама
  'конкурс репостов',
  'розыгрыш',
  'реклама канала',
  'подписывайтесь',
  'переходите по ссылке',

  // Неактуально
  'закрыт',
  'отмена',
  'набор закончен',
  'кастинг закрыт',
  'неактуально',
  'отменён',

  // Студенческие проекты низкого качества
  'курсовая работа',
  'дипломная работа',
  'учебный проект',
];

// ============================================
// ВЫСОКИЙ ПРИОРИТЕТ (особо интересные кастинги)
// ============================================
const HIGH_PRIORITY_KEYWORDS = [
  'срочно',
  'срочный кастинг',
  'горящий проект',
  'топовый проект',
  'известный режиссёр',
  'крупный проект',
  'гонорар от 50',
  'гонорар от 100',
  'федеральный',
];

/**
 * Фильтрует сообщение и определяет его релевантность
 */
export function filterMessage(text: string): FilterResult {
  const lowerText = text.toLowerCase();

  // === Проверка негативных сигналов ===
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return {
        isRelevant: false,
        reason: `Содержит негативный сигнал: "${keyword}"`,
      };
    }
  }

  // === Слишком короткое сообщение ===
  if (text.length < 80) {
    return {
      isRelevant: false,
      reason: `Слишком короткое (${text.length} символов)`,
    };
  }

  // === Подсчет позитивных сигналов ===
  let score = 0;
  const matchedKeywords: string[] = [];

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 1;
      matchedKeywords.push(keyword);
    }
  }

  // Бонус за высокий приоритет
  for (const keyword of HIGH_PRIORITY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 2;
      matchedKeywords.push(`⭐${keyword}`);
    }
  }

  // === Определение категории ===
  const category = detectCategory(lowerText);

  // === Минимум 2 позитивных сигнала для релевантности ===
  if (score >= 2) {
    return {
      isRelevant: true,
      reason: `Найдено: ${matchedKeywords.slice(0, 5).join(', ')}`,
      category,
      priority: Math.min(score, 10),
    };
  }

  return {
    isRelevant: false,
    reason: `Недостаточно релевантных сигналов (score: ${score})`,
  };
}

/**
 * Определяет категорию сообщения
 */
function detectCategory(text: string): FilterResult['category'] {
  // Кастинг / поиск актёров
  if (
    text.includes('ищем') ||
    text.includes('ищу') ||
    text.includes('требуется') ||
    text.includes('нужен') ||
    text.includes('нужна') ||
    text.includes('кастинг') ||
    text.includes('пробы')
  ) {
    return 'casting';
  }

  // Инсайт / совет
  if (
    text.includes('совет') ||
    text.includes('опыт') ||
    text.includes('лайфхак') ||
    text.includes('история') ||
    text.includes('расскажу') ||
    text.includes('поделюсь')
  ) {
    return 'insight';
  }

  // По умолчанию — новость
  return 'news';
}

/**
 * Быстрая проверка: содержит ли текст признаки кастинга
 */
export function looksLikeCasting(text: string): boolean {
  const lowerText = text.toLowerCase();
  const castingIndicators = [
    'ищем',
    'ищу',
    'требуется',
    'нужен',
    'нужна',
    'типаж',
    'возраст',
    'съёмки',
  ];

  return castingIndicators.some((indicator) => lowerText.includes(indicator));
}

/**
 * Извлекает ключевую информацию из кастинга
 */
export function extractCastingInfo(text: string): {
  hasAge?: boolean;
  hasGender?: boolean;
  hasPayment?: boolean;
  hasLocation?: boolean;
  hasDates?: boolean;
} {
  const lowerText = text.toLowerCase();

  return {
    hasAge:
      /\d{2}[-–]\d{2}/.test(text) ||
      lowerText.includes('лет') ||
      lowerText.includes('возраст'),
    hasGender:
      lowerText.includes('мужчин') ||
      lowerText.includes('женщин') ||
      lowerText.includes('м/ж') ||
      lowerText.includes('парень') ||
      lowerText.includes('девушка'),
    hasPayment:
      lowerText.includes('гонорар') ||
      lowerText.includes('оплата') ||
      lowerText.includes('ставка') ||
      /\d+\s*(₽|руб|тыс)/.test(text),
    hasLocation:
      lowerText.includes('москва') ||
      lowerText.includes('мск') ||
      lowerText.includes('спб') ||
      lowerText.includes('питер') ||
      lowerText.includes('санкт-петербург'),
    hasDates:
      /\d{1,2}\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/.test(
        lowerText
      ) || /\d{1,2}\.\d{2}/.test(text),
  };
}
