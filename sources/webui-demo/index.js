/**
 * WebUI 扩展演示 —— 展示本轮新增的三项能力：
 *
 *   1. `plugin_config_ui(ctx, ui)` —— 运行时动态调整配置表单
 *   2. `ctx.router.page(name, handler)` —— 自带 HTML 管理页
 *   3. `ctx.router.static(subdir)` —— 提供插件目录下的静态资源
 *   4. `ctx.plugins` —— 只读自省其他插件
 *
 * 访问方式（部署后）：
 *   http://<host>:5099/plugin/webui-demo/page/dashboard
 *   http://<host>:5099/plugin/webui-demo/static/index.html
 *   GET  /api/plugin/webui-demo/info          （鉴权）
 */

const startedAt = Date.now();

/** 记录访问次数，用来演示动态字段。 */
let pageHits = 0;

export function plugin_init(ctx) {
    ctx.logger.info('webui-demo ready');

    // 1) 动态配置 UI：按当前状态增删字段
    ctx.router.get('/bump', () => {
        pageHits += 1;
        return { pageHits };
    });

    // 2) 扩展页（浏览器直接访问，无需鉴权头）
    ctx.router.page('dashboard', () => {
        pageHits += 1;

        // 页面里直接渲染内省结果 —— 演示 ctx.plugins 在路由处理中的用法
        const loaded = ctx.plugins
            .list()
            .map((p) => `<li>${p.id} <code>v${p.version}</code> — ${p.status}</li>`)
            .join('');

        const failures = ctx.plugins.listFailures();
        const failureHtml = failures.length
            ? `<h2>加载失败</h2><ul>${failures
                  .map((p) => `<li>${p.id}: ${p.error ?? '未知原因'}</li>`)
                  .join('')}</ul>`
            : '';

        return `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <title>webui-demo</title>
  <link rel="stylesheet" href="/plugin/webui-demo/static/style.css">
</head>
<body>
  <h1>webui-demo</h1>
  <p>访问次数：<strong id="hits">${pageHits}</strong></p>
  <p>已运行：<span id="uptime">${Math.floor((Date.now() - startedAt) / 1000)}</span> 秒</p>

  <h2>已加载插件（ctx.plugins）</h2>
  <ul>${loaded}</ul>
  ${failureHtml}

  <h2>同目录静态资源</h2>
  <p><a href="/plugin/webui-demo/static/index.html">static/index.html</a></p>
  <script src="/plugin/webui-demo/static/app.js"></script>
</body>
</html>`;
    });

    // 3) 静态资源目录（插件目录下的 webui/）
    ctx.router.static('webui');

    // 4) 鉴权 API：内省其他插件
    ctx.router.get('/info', () => ({
        pageHits,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        loadedPlugins: ctx.plugins.list().map((p) => ({ id: p.id, version: p.version })),
        others: ctx.plugins
            .list()
            .filter((p) => p.id !== ctx.id)
            .map((p) => ({ id: p.id, status: p.status })),
    }));
}

/**
 * 动态配置 UI 钩子。
 *
 * 初始 schema 只有两个字段；根据当前值动态追加一个只读展示字段，
 * 演示「表单随状态变化」。
 */
export const plugin_config_schema = [];

export function plugin_config_ui(ctx, ui) {
    ui.updateSchema([
        {
            key: 'greeting',
            type: 'string',
            label: '问候语',
            default: '你好',
            reactive: true,
        },
        {
            key: 'showAdvanced',
            type: 'boolean',
            label: '显示高级选项',
            default: false,
            reactive: true,
        },
    ]);

    // 根据当前配置动态决定是否加字段
    const cfg = ctx.getConfig();

    if (cfg.showAdvanced) {
        ui.addField({
            key: 'advancedNote',
            type: 'text',
            label: '高级说明',
            default: '这些字段只在开启高级选项时出现',
        });
    } else {
        ui.removeField('advancedNote');
    }
}

export function plugin_on_config_change(ctx, key, value, config) {
    // 开关一变就重新计算 schema（演示响应式）
    if (key !== 'showAdvanced') {
        return;
    }

    ctx.logger.info('showAdvanced -> %s', String(value));
}
