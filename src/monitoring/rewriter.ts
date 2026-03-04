/**
 * Адаптация постов из каналов КД для канала "Киношная"
 *
 * Новая концепция — АГРЕГАТОР:
 * - Текст поста не меняется (только лицо: "я ищу" → "коллеги ищут")
 * - Добавляется ссылка на источник (канал + конкретный пост)
 * - Подписчики получают всю инфу в одном месте
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

// ============================================
// СИСТЕМНЫЙ ПРОМПТ — МИНИМАЛЬНАЯ АДАПТАЦИЯ
// ============================================
const ADAPT_SYSTEM_PROMPT = `Ты — редактор Telegram-канала "Киношная" для актёров.

Твоя задача: МИНИМАЛЬНО адаптировать пост из канала кастинг-директора.

## ПРАВИЛА:

1. **НЕ ПЕРЕПИСЫВАЙ** текст — сохрани максимально близко к оригиналу
2. **ИЗМЕНИ ТОЛЬКО ЛИЦО** — если автор пишет от первого лица ("я ищу", "мне нужен", "у меня"), замени на третье лицо ("коллеги ищут", "нужен", "идёт поиск")
3. **СОХРАНИ ВСЮ КОНКРЕТИКУ** — возраст, типаж, условия, даты, оплату
4. **УБЕРИ** только контактные данные (телефоны, email, @username для связи) — ссылка на источник будет добавлена автоматически
5. **НЕ ДОБАВЛЯЙ** от себя emoji, заголовки, призывы — только адаптация лица

## ФОРМАТ ВЫВОДА:

Просто адаптированный текст поста. Без заголовков, без подписей, без ссылок.

## ПРИМЕРЫ:

Оригинал: "Ищу парня 25-30 лет для съёмок в сериале. Пишите мне @director"
Результат: "Коллеги ищут парня 25-30 лет для съёмок в сериале."

Оригинал: "Срочно нужна девушка славянского типажа, 20-25 лет. Съёмки 15 марта, Москва. Гонорар 30 000₽."
Результат: "Срочно нужна девушка славянского типажа, 20-25 лет. Съёмки 15 марта, Москва. Гонорар 30 000₽."`;

export interface RewriteResult {
  content: string;
  rubric: string;
}

/**
 * Формирует ссылку на конкретный пост в канале
 * Формат: https://t.me/channelname/messageId
 */
export function buildPostLink(channelUsername: string, messageId?: number): string | null {
  if (!messageId) return null;

  // Убираем @ из начала
  const clean = channelUsername.replace(/^@/, '');

  // Private каналы (invite links) — не можем дать прямую ссылку на пост
  if (clean.startsWith('https://') || clean.startsWith('http://')) {
    return null;
  }

  return `https://t.me/${clean}/${messageId}`;
}

/**
 * Формирует ссылку на канал
 */
export function buildChannelLink(channelUsername: string): string {
  const clean = channelUsername.replace(/^@/, '');

  if (clean.startsWith('https://') || clean.startsWith('http://')) {
    return clean;
  }

  return `https://t.me/${clean}`;
}

class RewriterService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  /**
   * Адаптирует пост для канала "Киношная"
   * Минимальные изменения: только лицо (1-е → 3-е) и удаление контактов
   */
  async rewritePost(
    originalText: string,
    sourceChannel: string,
    category: 'casting' | 'insight' | 'news',
    options?: {
      channelName?: string;
      messageId?: number;
    }
  ): Promise<RewriteResult | null> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: ADAPT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Адаптируй этот пост (только смена лица, если нужно):\n\n${originalText}`,
          },
        ],
      });

      const content = response.content[0];

      if (content.type === 'text' && content.text) {
        const rubric = category === 'casting' ? 'casting' : 'industry';
        let adaptedText = content.text.trim();

        // Добавляем ссылку на источник
        const postLink = buildPostLink(sourceChannel, options?.messageId);
        const channelLink = buildChannelLink(sourceChannel);
        const channelName = options?.channelName || sourceChannel;

        if (postLink) {
          adaptedText += `\n\n📺 Источник: ${channelName}\n👉 ${postLink}`;
        } else {
          adaptedText += `\n\n📺 Источник: ${channelName}\n👉 ${channelLink}`;
        }

        return {
          content: adaptedText,
          rubric,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Ошибка адаптации через Claude:', error);
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
