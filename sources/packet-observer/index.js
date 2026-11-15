/**
 * 封包观察插件 —— 演示 `ctx.packets` 原始包 API。
 *
 * 用途：统计某条 SSO 命令的收发情况，供 `/api/plugin/packet-observer/stats` 查看。
 * 这是 OneBot 事件层拿不到的信息（比如撤回请求、心跳、内部服务调用）。
 *
 * 同时演示两种接入方式：
 *   - `ctx.packets.on({ cmd })` —— 精确订阅，走框架索引，开销最低
 *   - `plugin_onpacket(ctx, packet)` —— 全局钩子（本插件不用，见注释）
 */

/** cmd → { send, recv } 计数 */
const counts = new Map();
/** 最近若干次匹配，供 WebUI 展示 */
const recent = [];
const RECENT_MAX = 30;

/** 默认观察这些命令（可在配置里改）。 */
const DEFAULT_CMDS = [
    'trpc.msg.msg_svc.MsgService.SsoGroupRecallMsg',
    'trpc.msg.msg_svc.MsgService.SsoFriendRecallMsg',
];

let watched = [];

function ensureBucket(cmd) {
    let bucket = counts.get(cmd);

    if (!bucket) {
        bucket = { send: 0, recv: 0 };
        counts.set(cmd, bucket);
    }

    return bucket;
}

export function plugin_init(ctx) {
    const cfg = ctx.getConfig();
    watched = Array.isArray(cfg.commands) && cfg.commands.length > 0 ? cfg.commands : DEFAULT_CMDS;

    for (const cmd of watched) {
        ensureBucket(cmd);

        // 精确命令订阅：框架侧有命令索引，非目标命令不会进这个回调
        ctx.packets.on({ cmd }, (packet) => {
            const bucket = ensureBucket(packet.cmd);

            if (packet.type === 0) {
                bucket.send += 1;
            } else {
                bucket.recv += 1;
            }

            recent.push({
                cmd: packet.cmd,
                type: packet.type === 0 ? 'send' : 'recv',
                seq: packet.seq,
                bytes: packet.body.byteLength,
                uin: packet.uin,
                time: packet.time,
            });

            if (recent.length > RECENT_MAX) {
                recent.shift();
            }
        });
    }

    ctx.actions.register('packet_observer_stats', () => ({
        watched,
        counts: Object.fromEntries(counts),
        recent: recent.slice(-10),
    }));

    ctx.router.get('/stats', () => ({
        watched,
        counts: Object.fromEntries(counts),
        subscriptions: watched.length,
    }));

    ctx.logger.info('packet-observer watching %d command(s)', watched.length);
}

// 备注：如果确实需要「所有包」，用下面的全局钩子（本插件不需要，故不导出）：
//
//   export function plugin_onpacket(ctx, packet) {
//       // 一次都别在这里做重活 —— 它跑在包处理路径上
//   }
