# Qwen MT 网页翻译插件（Chrome MV3）

一个专门适配 **Qwen MT** 大模型的浏览器网页翻译插件，参考主流翻译插件（沉浸式翻译、DeepL 扩展、Google 翻译扩展）的核心体验：

- 整页文本翻译（尽量覆盖页面主要可见区域）
- 快捷键一键开关翻译 / 重新翻译
- “始终翻译某语言”自动策略
- 清晰易用的菜单（Popup + Options）
- Qwen MT 模型切换（Turbo / Plus / Max）

## 功能总览

1. **翻译网页所有区域（主要文本区域）**
   - 自动遍历页面文本节点，分批调用 Qwen MT 接口翻译。
2. **快捷键启用/关闭翻译**
   - `Ctrl/Command + Shift + Y`: 开关翻译。
   - `Ctrl/Command + Shift + U`: 重新翻译。
3. **总是翻译某语言**
   - Popup 一键将当前页面语言加入“始终翻译”。
   - 页面加载完成后自动检查并触发翻译。
4. **优秀菜单**
   - Popup：翻译操作、目标语言、模型切换、自动翻译。
   - Options：API Key、端点、超时、语言策略。
5. **模型切换**
   - 可在 `qwen-mt-turbo / qwen-mt-plus / qwen-mt-max` 间切换。

## 安装方式

1. 打开 Chrome 扩展管理页：`chrome://extensions`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择当前项目根目录 `/workspace/Qwen-MT`

## 使用说明

1. 打开插件 Popup
2. 进入“高级设置”填写：
   - API Endpoint（默认 DashScope OpenAI 兼容端点）
   - API Key
3. 选择目标语言与模型
4. 在网页点击“翻译当前页面”或使用快捷键

## 目录结构

```text
manifest.json
src/
  background.js
  content.js
  lib/constants.js
  popup/
    popup.html
    popup.css
    popup.js
  options/
    options.html
    options.css
    options.js
```

## 注意事项

- 本插件通过兼容 OpenAI Chat Completions 的接口调用 Qwen MT。
- 若模型返回格式不标准，插件会自动做容错解析。
- 出于性能考虑，当前是纯文本节点翻译，不翻译图片内文字与画布文本。
