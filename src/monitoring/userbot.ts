/**
 * GramJS Userbot клиент для чтения каналов КД
 */
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { config } from '../config';

export class UserBot {
  private client: TelegramClient | null = null;
  private session: StringSession;
  private connected = false;

  constructor() {
    this.session = new StringSession(config.userbot.session || '');
  }

  /**
   * Проверяет, настроен ли userbot
   */
  isConfigured(): boolean {
    return !!(
      config.userbot.apiId &&
      config.userbot.apiHash &&
      config.userbot.session
    );
  }

  /**
   * Подключается к Telegram
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    if (!this.isConfigured()) {
      throw new Error(
        'UserBot не настроен. Запустите npm run auth:userbot для авторизации.'
      );
    }

    this.client = new TelegramClient(
      this.session,
      config.userbot.apiId,
      config.userbot.apiHash,
      {
        connectionRetries: 5,
        retryDelay: 1000,
      }
    );

    await this.client.connect();
    this.connected = true;
    console.log('🔗 UserBot подключен');
  }

  /**
   * Получает сообщения из канала
   *
   * @param channelUsername - @username или invite link канала
   * @param limit - количество сообщений
   * @param minId - получить сообщения только новее этого ID
   */
  async getChannelMessages(
    channelUsername: string,
    limit: number = 20,
    minId?: number
  ): Promise<Api.Message[]> {
    if (!this.client || !this.connected) {
      throw new Error('UserBot не подключен');
    }

    try {
      // Получаем entity канала
      const channel = await this.client.getEntity(channelUsername);

      // Получаем сообщения
      const messages = await this.client.getMessages(channel, {
        limit,
        minId,
      });

      // Фильтруем только реальные сообщения (не служебные)
      return messages.filter(
        (m): m is Api.Message =>
          m instanceof Api.Message && Boolean(m.message) && m.message.length > 0
      );
    } catch (error) {
      // Если канал недоступен, возвращаем пустой массив
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (
        errorMsg.includes('Could not find') ||
        errorMsg.includes('CHANNEL_PRIVATE') ||
        errorMsg.includes('INVITE_HASH_INVALID')
      ) {
        console.warn(`⚠️ Канал ${channelUsername} недоступен: ${errorMsg}`);
        return [];
      }

      throw error;
    }
  }

  /**
   * Получает информацию о канале
   */
  async getChannelInfo(
    channelUsername: string
  ): Promise<{ title: string; username: string; id: string } | null> {
    if (!this.client || !this.connected) {
      throw new Error('UserBot не подключен');
    }

    try {
      const entity = await this.client.getEntity(channelUsername);

      if (entity instanceof Api.Channel) {
        return {
          title: entity.title,
          username: entity.username || '',
          id: String(entity.id),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Возвращает строку сессии (для сохранения)
   */
  getSession(): string {
    return this.session.save();
  }

  /**
   * Отключается от Telegram
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.disconnect();
      this.connected = false;
      console.log('🔌 UserBot отключен');
    }
  }
}

// Singleton instance
let userbotInstance: UserBot | null = null;

export function getUserBot(): UserBot {
  if (!userbotInstance) {
    userbotInstance = new UserBot();
  }
  return userbotInstance;
}
