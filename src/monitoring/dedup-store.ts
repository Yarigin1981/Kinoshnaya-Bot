/**
 * Хранилище для дедупликации сообщений
 *
 * Отслеживает уже обработанные сообщения,
 * чтобы не создавать дубликаты постов
 */
import fs from 'fs';
import path from 'path';

interface SeenMessage {
  channelId: string;
  messageId: number;
  seenAt: string;
  processed: boolean;
  postId?: string; // ID созданного поста в Киношной
}

interface SeenData {
  messages: Record<string, SeenMessage>;
  lastCleanup: string;
}

// Railway Volume или локальная папка
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'data')
  : path.join(__dirname, '../data');
const SEEN_FILE = path.join(DATA_DIR, 'seen-messages.json');

// Хранить записи не дольше 30 дней
const RETENTION_DAYS = 30;

class DedupStore {
  private data: SeenData;

  constructor() {
    this.data = this.load();
  }

  /**
   * Генерирует уникальный ключ для сообщения
   */
  private getKey(channelId: string, messageId: number): string {
    // Убираем @ из начала channelId для консистентности
    const normalizedChannel = channelId.replace(/^@/, '').toLowerCase();
    return `${normalizedChannel}:${messageId}`;
  }

  /**
   * Проверяет, видели ли мы это сообщение
   */
  has(channelId: string, messageId: number): boolean {
    const key = this.getKey(channelId, messageId);
    return key in this.data.messages;
  }

  /**
   * Добавляет сообщение в список обработанных
   */
  add(channelId: string, messageId: number, postId?: string): void {
    const key = this.getKey(channelId, messageId);
    this.data.messages[key] = {
      channelId,
      messageId,
      seenAt: new Date().toISOString(),
      processed: true,
      postId,
    };
    this.save();
  }

  /**
   * Помечает сообщение как обработанное без создания поста
   * (например, если оно не прошло фильтр)
   */
  markSeen(channelId: string, messageId: number): void {
    const key = this.getKey(channelId, messageId);
    if (!this.has(channelId, messageId)) {
      this.data.messages[key] = {
        channelId,
        messageId,
        seenAt: new Date().toISOString(),
        processed: false,
      };
      this.save();
    }
  }

  /**
   * Получает информацию о сообщении
   */
  get(channelId: string, messageId: number): SeenMessage | null {
    const key = this.getKey(channelId, messageId);
    return this.data.messages[key] || null;
  }

  /**
   * Возвращает статистику
   */
  getStats(): { total: number; processed: number; withPosts: number } {
    const messages = Object.values(this.data.messages);
    return {
      total: messages.length,
      processed: messages.filter((m) => m.processed).length,
      withPosts: messages.filter((m) => m.postId).length,
    };
  }

  /**
   * Очищает старые записи (старше RETENTION_DAYS дней)
   */
  cleanup(): number {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [key, value] of Object.entries(this.data.messages)) {
      if (new Date(value.seenAt).getTime() < cutoff) {
        delete this.data.messages[key];
        removed++;
      }
    }

    if (removed > 0) {
      this.data.lastCleanup = new Date().toISOString();
      this.save();
    }

    return removed;
  }

  /**
   * Полностью очищает хранилище
   */
  clear(): void {
    this.data = {
      messages: {},
      lastCleanup: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * Загружает данные из файла
   */
  private load(): SeenData {
    try {
      // Создаём директорию data если её нет
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(SEEN_FILE)) {
        const content = fs.readFileSync(SEEN_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('⚠️ Ошибка загрузки seen-messages.json:', error);
    }

    return {
      messages: {},
      lastCleanup: new Date().toISOString(),
    };
  }

  /**
   * Сохраняет данные в файл
   */
  private save(): void {
    try {
      // Создаём директорию data если её нет
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      fs.writeFileSync(SEEN_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ Ошибка сохранения seen-messages.json:', error);
    }
  }
}

// Singleton instance
export const dedupStore = new DedupStore();
