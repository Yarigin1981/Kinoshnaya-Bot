/**
 * Список Telegram-каналов кастинг-директоров для мониторинга
 *
 * Источник: docs/SocialMedia/CASTING_DIRECTORS_CHANNELS.md
 */

export interface Channel {
  username: string; // @username или invite link
  name: string; // Имя КД
  type: 'public' | 'private';
  priority: 'high' | 'normal' | 'low';
  active?: boolean; // false = деактивирован (переименован, удалён, invite истёк)
  specialization?: string;
  region?: string;
}

/**
 * Все каналы КД для мониторинга
 */
export const CHANNELS: Channel[] = [
  // ============================================
  // ВЫСОКИЙ ПРИОРИТЕТ (активные, популярные КД)
  // ============================================
  {
    username: '@primepeople',
    name: 'Дарья Аврутова',
    type: 'public',
    priority: 'high',
    specialization: 'реклама, реалити',
  },
  {
    username: '@justcasting',
    name: 'Аня Енжаева, Таня Посашкова',
    type: 'public',
    priority: 'high',
  },
  {
    username: '@castday',
    name: 'Анастасия Киселёва, Наталья Корсукова',
    type: 'public',
    priority: 'high',
  },
  {
    username: '@boom_casting',
    name: 'Катя Исакова, Вика Хрусталёва',
    type: 'public',
    priority: 'high',
  },
  {
    username: '@kinozovet',
    name: 'Алла Бахтадзе, Жанна Семёнова',
    type: 'public',
    priority: 'high',
  },

  // ============================================
  // НОРМАЛЬНЫЙ ПРИОРИТЕТ (остальные публичные)
  // ============================================
  {
    username: '@DenisovaAristovaCasting',
    name: 'Ася Аристова, Анна Денисова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@barbaracasting',
    name: 'Варвара Бабиева',
    type: 'public',
    priority: 'normal',
    specialization: 'реклама',
  },
  {
    username: '@bazhinacasting',
    name: 'Анастасия Бажина',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@barinovakssting',
    name: 'Виолетта Баринова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@KatyaLetoKastDir',
    name: 'Катерина Бирюкова-Басова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@borisovacast',
    name: 'Кристина Борисова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@vihryankino',
    name: 'Наталья Вихрян',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@CastByMasha',
    name: 'Мария Галактионова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@filmlanguagevalery',
    name: 'Валерия Ганкина',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@gogotovacasting',
    name: 'Мария Гоготова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@gorsharcast',
    name: 'Ирина Горщар',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ndidevich',
    name: 'Наталья Дидевич',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ershova_casting',
    name: 'Светлана Ершова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@n_zaiceva',
    name: 'Анастасия Зайцева',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@tatazalinyan_cast',
    name: 'Татевик Залинян',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ZAHAROVA_KASTA',
    name: 'Татьяна Захарова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@Kamochkinacasting',
    name: 'Елена Камочкина',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@agencyN1',
    name: 'Анна Кеворкова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@negildiakasting',
    name: 'Наталья КМ',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@kondrcast',
    name: 'Марина Кондр',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@korneeva_kino',
    name: 'Елена Корнеева',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@alekc_korytov',
    name: 'Александр Корытов',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@sashalarinacast',
    name: 'Александра Ларина',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ledovskayashooting',
    name: 'Светлана Ледовская',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@lelyukh_cast',
    name: 'Роман Лелюх',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@lenskikhfilm',
    name: 'Рита Ленских',
    type: 'public',
    priority: 'normal',
    active: false, // username не найден (переименован/удалён)
  },
  {
    username: '@may_casting',
    name: 'Вика Май',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@makarovacasting',
    name: 'Ксения Макарова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@videoactors',
    name: 'Мария Максимова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@am_malah_casting',
    name: 'Анастасия Малахова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@castingkarinamorozova',
    name: 'Карина Морозова',
    type: 'public',
    priority: 'normal',
    specialization: 'реклама',
  },
  {
    username: '@nazmetova_kino',
    name: 'Юлия Назметова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@irinanashutinskaya_casting',
    name: 'Ирина Нашутинская',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@nightofearth',
    name: 'Георгий Нерсисян',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@Onestervacast',
    name: 'Ольга Нестерова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@sevenfilmsactors',
    name: 'Наталья Николаева',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@NosulAnnaCasting',
    name: 'Анна Носуль',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@APTUCTbI',
    name: 'Ирина Осипова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@castPartseva',
    name: 'Анна Парцева',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@TALOCHKiNAvera',
    name: 'Вера Пеплова-Талочкина',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@castingDAr',
    name: 'Дарья Петунина, Александра Строганова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@raeva_cast',
    name: 'Мария Раева',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@okkay_otzyv',
    name: 'Анна Рахматова-Павлова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@Casting_by_magic_bear',
    name: 'Борис Ржезак',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@rjurickcasting1',
    name: 'Светлана Рюрикова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@yasozdall',
    name: 'Сергей Рыбачок',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@castingspb_actually',
    name: 'Настя Самсонова',
    type: 'public',
    priority: 'normal',
    region: 'СПб',
  },
  {
    username: '@artdashikopashiko',
    name: 'Дарья Свириденко',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@filmcastanna',
    name: 'Анна Селиванова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@casting_serzhantova',
    name: 'Арина Сержантова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@SudnitsynaM',
    name: 'Мария Судницына',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@novacasting137',
    name: 'Анна Теленова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@che_agent',
    name: 'Катя Третьяк',
    type: 'public',
    priority: 'normal',
    specialization: 'КД + агент',
  },
  {
    username: '@usova_cast',
    name: 'Анастасия Усова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@elzafilm',
    name: 'Эльза Хасбиева',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@zvetnovacast',
    name: 'Ксения Цветнова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ekatziner',
    name: 'Катя Цыганенко',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@kanaliacast',
    name: 'Светлана Ширинская',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@liza_shmakova_casting',
    name: 'Лиза Шмакова',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@casting_daria_shubenok',
    name: 'Дарья Шубенок',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ninaunew',
    name: 'Нина Ю',
    type: 'public',
    priority: 'normal',
    specialization: 'ВГИК 2025',
  },
  {
    username: '@arosha544',
    name: 'Анна Юрченко',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@Nataly_castdir',
    name: 'Натали Юсеф',
    type: 'public',
    priority: 'normal',
    specialization: 'ВГИК 2025',
  },

  {
    username: '@casting_chef',
    name: 'Casting Chef',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@ekleryacast',
    name: 'Ekleryacast',
    type: 'public',
    priority: 'normal',
  },

  // ============================================
  // ЗАКРЫТЫЕ КАНАЛЫ (требуют вступления вручную)
  // ============================================
  {
    username: 'https://t.me/+R3WoGekvpIIzMzli',
    name: 'Ольга Квашенникова',
    type: 'private',
    priority: 'normal',
    active: false, // invite link истёк
  },
  {
    username: 'https://t.me/+8krJ2S9xjukxNzEy',
    name: 'Наталья Овсянникова',
    type: 'private',
    priority: 'normal',
    active: false, // invite link истёк
  },
  {
    username: 'https://t.me/+vixqhX2cE6RhZGVi',
    name: 'Лена Субботина',
    type: 'private',
    priority: 'normal',
    active: false, // invite link истёк
  },

  // ============================================
  // СООБЩЕСТВА (низкий приоритет)
  // ============================================
  {
    username: '@intellectualcast',
    name: 'Выпускники ВГИК КД 2025',
    type: 'public',
    priority: 'low',
  },
  {
    username: '@gcd_russ',
    name: 'Гильдия кастинг-директоров',
    type: 'public',
    priority: 'low',
  },
  {
    username: '@castgcd',
    name: 'Кастинги Гильдии КД',
    type: 'public',
    priority: 'normal',
  },
  {
    username: '@actorshat',
    name: 'Актёрская шапка',
    type: 'public',
    priority: 'low',
  },
  {
    username: '@filmres',
    name: 'Новости кинопроизводства',
    type: 'public',
    priority: 'low',
  },
];

/**
 * Возвращает активные каналы для мониторинга
 * (исключает low priority и деактивированные)
 */
export function getActiveChannels(): Channel[] {
  return CHANNELS.filter((c) => c.priority !== 'low' && c.active !== false);
}

/**
 * Возвращает каналы высокого приоритета
 */
export function getHighPriorityChannels(): Channel[] {
  return CHANNELS.filter((c) => c.priority === 'high');
}

/**
 * Возвращает только публичные каналы
 */
export function getPublicChannels(): Channel[] {
  return CHANNELS.filter((c) => c.type === 'public');
}

/**
 * Возвращает статистику по каналам
 */
export function getChannelStats(): {
  total: number;
  public: number;
  private: number;
  high: number;
  normal: number;
  low: number;
} {
  return {
    total: CHANNELS.length,
    public: CHANNELS.filter((c) => c.type === 'public').length,
    private: CHANNELS.filter((c) => c.type === 'private').length,
    high: CHANNELS.filter((c) => c.priority === 'high').length,
    normal: CHANNELS.filter((c) => c.priority === 'normal').length,
    low: CHANNELS.filter((c) => c.priority === 'low').length,
  };
}
