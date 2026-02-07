/**
 * Скрипт генерации постов на неделю
 * Запуск: npm run generate
 */

import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env ДО импорта модулей
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  // Динамический импорт ПОСЛЕ загрузки .env
  const { config, validateConfig } = await import('../config');
  const { postsStore } = await import('../data/posts-store');
  const { ClaudeService } = await import('../services/claude');

  type PostTopic = {
    topic: string;
    rubric: 'casting' | 'ai' | 'rights' | 'style' | 'industry' | 'fun';
  };

  // Темы на неделю
  const WEEKLY_TOPICS: PostTopic[] = [
    { topic: '5 вещей, которые бесят кастинг-директоров на пробах', rubric: 'casting' },
    { topic: 'Как использовать ChatGPT для разбора роли и выучивания текста', rubric: 'ai' },
    { topic: 'Что надеть на кастинг рекламы банка vs рекламы пива', rubric: 'style' },
    { topic: 'Байаут — что это такое и сколько за него просить', rubric: 'rights' },
    { topic: 'Кто все эти люди на площадке: гид по съёмочной группе', rubric: 'industry' },
    { topic: 'Ожидание обратной связи после кастинга — мем и реальность', rubric: 'fun' },
    { topic: 'Self-tape: 7 правил идеальной записи дома', rubric: 'casting' },
  ];

  console.log('🚀 Генерация постов на неделю\n');

  validateConfig();

  if (!config.anthropic.apiKey) {
    console.error('❌ ANTHROPIC_API_KEY не установлен в .env');
    process.exit(1);
  }

  console.log('✅ API ключ найден\n');

  // Создаём сервис ПОСЛЕ загрузки конфига
  const claudeService = new ClaudeService();

  const stats = postsStore.getStats();
  console.log(`📊 В очереди уже ${stats.pending} постов\n`);

  console.log('📝 Начинаю генерацию...\n');

  const generatedPosts: { content: string; rubric: string; topic: string }[] = [];

  for (const topic of WEEKLY_TOPICS) {
    try {
      console.log(`  → ${topic.topic}`);
      const content = await claudeService.generatePost(topic);
      generatedPosts.push({
        content,
        rubric: topic.rubric,
        topic: topic.topic,
      });
      console.log(`    ✅ Готово (${content.length} символов)\n`);
    } catch (error) {
      console.error(`    ❌ Ошибка: ${error}\n`);
    }
  }

  if (generatedPosts.length > 0) {
    postsStore.addBatch(generatedPosts);
    console.log(`\n✅ Добавлено ${generatedPosts.length} постов в очередь`);

    const newStats = postsStore.getStats();
    console.log(`📊 Всего в очереди: ${newStats.pending} постов`);
  }
}

main().catch(console.error);
