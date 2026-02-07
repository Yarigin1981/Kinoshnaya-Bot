/**
 * Пересказ сообщений "своими словами" через Claude
 *
 * Преобразует кастинги и инсайты из каналов КД
 * в формат канала "Киношная"
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

// ============================================
// СИСТЕМНЫЙ ПРОМПТ ДЛЯ ПЕРЕСКАЗА
// ============================================
const REWRITE_SYSTEM_PROMPT = `Ты — автор Telegram-канала "Киношная" для актёров.

Твоя задача: переписать пост из канала кастинг-директора в формате канала "Киношная".

## ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:

1. **НЕ КОПИРУЙ** — перескажи своими словами
2. **ИНОСКАЗАТЕЛЬНАЯ ФОРМА** — используй обороты:
   - "коллеги ищут" вместо имени КД
   - "появился интересный проект" вместо названия продакшена
   - "федеральный канал" вместо конкретного канала
   - "в столице" вместо "в Москве"
3. **НЕ УКАЗЫВАЙ** источник, имя КД или название их канала
4. **ДОБАВЬ EMOJI** в начале (👀, 🎬, 📢, ✨, 🔥, 💰)
5. **ДЛИНА** — 200-400 символов
6. **ПРИЗЫВ** в конце — но БЕЗ ссылок

## ЗАПРЕЩЕНО:

- Контактные данные (телефоны, email, telegram)
- Точные адреса кастингов
- Названия конкретных продакшенов (кроме общеизвестных как "Централ Партнершип")
- Имена кастинг-директоров
- Ссылки на оригинал

## ФОРМАТ ВЫВОДА:

[emoji] Короткий заголовок

Основной текст — пересказ сути. Что ищут, какой проект, примерные условия.

Призыв: "Актуально для тех, кто..." / "Следите за каналами КД сегодня!"

## СТИЛЬ:

- Дружелюбный, но профессиональный
- Короткие предложения
- Без воды и общих фраз
- Полезная конкретика`;

// ============================================
// ПОДСКАЗКИ ДЛЯ РАЗНЫХ КАТЕГОРИЙ
// ============================================
const CATEGORY_HINTS: Record<string, string> = {
  casting: `Это КАСТИНГ. Сфокусируйся на:
- Типаж (возраст, пол, внешность) — обобщённо
- Тип проекта (сериал, реклама, клип)
- Примерные условия (если есть оплата)
- Когда актуально (сроки в общих чертах)`,

  insight: `Это ИНСАЙТ или СОВЕТ от КД. Сфокусируйся на:
- Главная мысль — что полезного
- Почему это важно для актёров
- Можно добавить свой комментарий`,

  news: `Это НОВОСТЬ из индустрии. Сфокусируйся на:
- Суть новости — кратко
- Почему это интересно актёрам
- Без лишних деталей`,
};

export interface RewriteResult {
  content: string;
  rubric: string;
}

class RewriterService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  /**
   * Пересказывает пост для канала "Киношная"
   */
  async rewritePost(
    originalText: string,
    sourceChannel: string,
    category: 'casting' | 'insight' | 'news'
  ): Promise<RewriteResult | null> {
    const categoryHint = CATEGORY_HINTS[category] || '';

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: REWRITE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${categoryHint}

---

ОРИГИНАЛЬНЫЙ ПОСТ:
${originalText}

---

Перепиши для канала "Киношная":`,
          },
        ],
      });

      const content = response.content[0];

      if (content.type === 'text' && content.text) {
        // Определяем рубрику для posts-store
        const rubric = category === 'casting' ? 'casting' : 'industry';

        return {
          content: content.text.trim(),
          rubric,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Ошибка пересказа через Claude:', error);
      return null;
    }
  }

  /**
   * Проверяет, настроен ли Claude API
   */
  isConfigured(): boolean {
    return !!config.anthropic.apiKey;
  }
}

// Singleton
export const rewriterService = new RewriterService();
