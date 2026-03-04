/**
 * Экспорты модуля мониторинга
 */
export { UserBot, getUserBot } from './userbot';
export { CHANNELS, getActiveChannels, getHighPriorityChannels, getPublicChannels, getChannelStats } from './channels';
export type { Channel } from './channels';
export { filterMessage, looksLikeCasting, extractCastingInfo } from './filter';
export type { FilterResult } from './filter';
export { rewriterService, buildPostLink, buildChannelLink } from './rewriter';
export type { RewriteResult } from './rewriter';
export { dedupStore } from './dedup-store';
export { ChannelMonitor, getChannelMonitor } from './monitor';
export type { MonitorStats } from './monitor';
