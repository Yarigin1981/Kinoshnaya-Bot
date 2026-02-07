import { Telegraf } from 'telegraf';
import { config } from '../config';

export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(config.telegram.botToken);
  }

  async sendToChannel(text: string, options?: { parseMode?: 'HTML' | 'Markdown' }) {
    try {
      const result = await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        text,
        {
          parse_mode: options?.parseMode || 'HTML',
        }
      );
      console.log(`✅ Пост опубликован: ${result.message_id}`);
      return result;
    } catch (error) {
      console.error('❌ Ошибка публикации:', error);
      throw error;
    }
  }

  async sendPhoto(photoUrl: string, caption: string) {
    try {
      const result = await this.bot.telegram.sendPhoto(
        config.telegram.channelId,
        photoUrl,
        {
          caption,
          parse_mode: 'HTML',
        }
      );
      console.log(`✅ Фото опубликовано: ${result.message_id}`);
      return result;
    } catch (error) {
      console.error('❌ Ошибка публикации фото:', error);
      throw error;
    }
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
