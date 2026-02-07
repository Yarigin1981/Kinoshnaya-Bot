import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env с override чтобы перезаписать системные переменные
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@kinoshnaya3000',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  admin: {
    userId: process.env.ADMIN_USER_ID || '',
  },
  // Расписание публикаций (MSK)
  schedule: {
    // Посты публикуются в эти часы
    postTimes: ['10:00', '19:00'],
    timezone: 'Europe/Moscow',
  },
  // Userbot для мониторинга каналов КД
  userbot: {
    apiId: parseInt(process.env.TG_API_ID || '0'),
    apiHash: process.env.TG_API_HASH || '',
    session: process.env.TG_SESSION || '',
    phone: process.env.TG_PHONE || '',
  },
  // Настройки мониторинга
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    intervalMinutes: parseInt(process.env.MONITORING_INTERVAL || '15'),
    maxPostsPerRun: parseInt(process.env.MONITORING_MAX_POSTS || '5'),
  },
};

export function validateConfig() {
  if (!config.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
}
