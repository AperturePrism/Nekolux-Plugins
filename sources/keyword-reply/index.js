/**
 * 关键词自动回复插件 —— 验证 Nekolux 插件系统的真实可用性。
 *
 * 功能：
 *   - 群消息命中关键词 → 回复一句
 *   - 支持配置：关键词、回复文本、生效群号
 *   - `keyword_reply_stats` action 查看命中统计
 *   - WebUI `/api/plugin/keyword-reply/ping` 自检
 *
 * 关键点：插件通过 `ctx.callAction('send_group_msg', ...)` 发消息 ——
 * 这是插件与 QQ 交互的唯一通道。插件不直接持有协议能力，保持 OneBot 抽象。
 */

let hits = 0;
const recent = [];
/** 防刷屏：同一群同一关键词 N 秒内只回一次。 */
const COOLDOWN_MS = 5000;
const lastReply = new Map();

export function plugin_init(ctx) {
    ctx.logger.info('keyword-reply ready');

    ctx.actions.register('keyword_reply_stats', () => ({
        hits,
        recent: recent.slice(-10),
    }));

    ctx.router.get('/ping', () => ({ pong: true, plugin: ctx.id, hits }));
}

export async function plugin_onmessage(ctx, event) {
    if (event.message_type !== 'group') {
        return;
    }

    const cfg = ctx.getConfig();
    const keywords = cfg.keywords ?? ['你好', 'hello', '在吗'];
    const reply = cfg.reply ?? '收到～';
    const groups = cfg.groups ?? [];

    if (groups.length > 0 && !groups.includes(event.group_id)) {
        return;
    }

    const text = extractText(event.message);
    if (!text) {
        return;
    }

    const matched = keywords.find((k) => text.includes(k));
    if (!matched) {
        return;
    }

    // 防刷屏
    const key = `${event.group_id}:${matched}`;
    const now = Date.now();
    if (now - (lastReply.get(key) ?? 0) < COOLDOWN_MS) {
        return;
    }
    lastReply.set(key, now);

    hits += 1;
    recent.push({
        time: now,
        group_id: event.group_id,
        user_id: event.user_id,
        keyword: matched,
    });

    ctx.logger.info(
        'keyword hit: %s in group %s from %s',
        matched,
        event.group_id,
        event.user_id,
    );

    try {
        await ctx.callAction('send_group_msg', {
            group_id: event.group_id,
            message: [
                { type: 'reply', data: { id: String(event.message_id) } },
                { type: 'text', data: { text: reply } },
            ],
        });
    } catch (e) {
        ctx.logger.error('reply failed: %s', e.message);
    }
}

function extractText(message) {
    if (typeof message === 'string') {
        return message;
    }

    if (!Array.isArray(message)) {
        return '';
    }

    return message
        .filter((seg) => seg?.type === 'text')
        .map((seg) => seg?.data?.text ?? '')
        .join('');
}

export const plugin_config_schema = [
    {
        key: 'keywords',
        type: 'multi-select',
        label: '关键词',
        description: '命中任意一个就回复',
        default: ['你好', 'hello', '在吗'],
    },
    {
        key: 'reply',
        type: 'string',
        label: '回复内容',
        default: '收到～',
    },
    {
        key: 'groups',
        type: 'multi-select',
        label: '生效群号',
        description: '留空表示所有群',
        default: [],
    },
];
