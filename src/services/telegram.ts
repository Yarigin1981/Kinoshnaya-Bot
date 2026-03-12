import { Telegraf } from 'telegraf';
import { config } from '../config';

export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(config.telegram.botToken);
  }

  /**
   * Отправить текст во все настроенные каналы
   */
  async sendToChannel(text: string, options?: { parseMode?: 'HTML' | 'Markdown' }) {
    const channels = config.telegram.channelIds;
    const results = [];

    for (const channelId of channels) {
      try {
        const result = await this.bot.telegram.sendMessage(
          channelId,
          text,
          {
            parse_mode: options?.parseMode || 'HTML',
          }
        );
        console.log(`✅ Пост опубликован в ${channelId}: ${result.message_id}`);
        results.push(result);
      } catch (error) {
        console.error(`❌ Ошибка публикации в ${channelId}:`, error);
        // Продолжаем отправку в остальные каналы
      }
    }

    if (results.length === 0) {
      throw new Error('Не удалось опубликовать ни в один канал');
    }

    return results[0]; // Возвращаем результат первого канала для совместимости
  }

  /**
   * Отправить фото во все настроенные каналы
   */
  async sendPhoto(photoUrl: string, caption: string) {
    const channels = config.telegram.channelIds;
    const results = [];

    for (const channelId of channels) {
      try {
        const result = await this.bot.telegram.sendPhoto(
          channelId,
          photoUrl,
          {
            caption,
            parse_mode: 'HTML',
          }
        );
        console.log(`✅ Фото опубликовано в ${channelId}: ${result.message_id}`);
        results.push(result);
      } catch (error) {
        console.error(`❌ Ошибка публикации фото в ${channelId}:`, error);
      }
    }

    if (results.length === 0) {
      throw new Error('Не удалось опубликовать фото ни в один канал');
    }

    return results[0];
  }

  getBotInstance() {
    return this.bot;
  }

  async launch() {
    await this.bot.launch();
    console.log('🤖 Бот запущен');
  }

  stop() {
    this.bot.stop();
    console.log('🛑 Бот остановлен');
  }
}

export const telegramService = new TelegramService();
