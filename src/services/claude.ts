import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

const SYSTEM_PROMPT = `Ты — контент-менеджер Telegram-канала "Киношная" для актёров.

Канал про:
- Кастинги и пробы
- AI-инструменты для актёров
- Права артистов (байауты, договоры)
- Стиль и внешний вид на кастингах
- Закулисье киноиндустрии

Стиль:
- Дружелюбный эксперт, без снобизма
- Короткие абзацы (1-3 предложения)
- Используй emoji, но не перебарщивай
- Практичность: давай конкретные советы
- Длина поста: 500-1500 символов

Формат:
- Заголовок с emoji
- Основной текст
- Призыв к действию или вопрос в конце (для вовлечения)

НЕ используй:
- Хештеги
- "Подписывайтесь на канал"
- Рекламные призывы
`;

export interface PostTopic {
  topic: string;
  rubric: 'casting' | 'ai' | 'rights' | 'style' | 'industry' | 'fun';
}

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  async generatePost(topic: PostTopic): Promise<string> {
    const rubricPrompts: Record<PostTopic['rubric'], string> = {
      casting: 'Напиши пост с практическими советами по кастингам и пробам.',
      ai: 'Напиши пост о том, как AI/нейросети помогают актёрам.',
      rights: 'Напиши пост о правах артистов, договорах, байаутах.',
      style: 'Напиши пост о стиле, внешнем виде, дресс-коде для актёров.',
      industry: 'Напиши пост о закулисье киноиндустрии, съёмочном процессе.',
      fun: 'Напиши развлекательный пост, мем или забавную историю из индустрии.',
    };

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${rubricPrompts[topic.rubric]}

Тема: ${topic.topic}

Напиши готовый пост для Telegram.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    throw new Error('Unexpected response format');
  }

  async generateWeeklyPosts(topics: PostTopic[]): Promise<string[]> {
    const posts: string[] = [];

    for (const topic of topics) {
      console.log(`📝 Генерирую пост: ${topic.topic}`);
      const post = await this.generatePost(topic);
      posts.push(post);
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return posts;
  }
}

export const claudeService = new ClaudeService();
