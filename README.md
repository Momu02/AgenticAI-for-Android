# AgenticAI-for-Android
本仓库尝试利用LLM大模型+Autojs，在安卓手机上实现主动式对话AI(Agentic AI)。

思路很简单，就是让AI调用自动化程序，再让自动化程序反调用AI，变相实现AI“主动”来找你的效果。

| 应用 | 是否需要 | 说明 |
|------|------|------|
| Operit AI | ✅ | 对接大模型API，用于对话交互，执行脚本 |
| Autojs | ✅ | 用于设置自动化任务 |
| Shizuku | ✅（有root用户不需要） | 提供权限 |
| 其他 | 可选 | 拓展实现更多操作 |

## 详细教程步骤：
### 1.下载并配置Operit AI（或其他对接API且大模型有手机管理权限的应用）
>简单来说，Operit AI软件可以利用Shizuku、root等权限让AI执行shell命令和操控终端等。这也是要实现主动式AI必须的条件。

下载及配置Operit AI的基本方法请自行查看文档:
https://github.com/AAswordman/Operit

以上弄好后，在设置-提示词编辑-标签-新建标签，输入以下提示词：
```
主动提醒功能执行
规则：当用户说明需要你提醒的时候，必须禁用daily life、sleep等工具包，优先考虑使用本主动提醒功能，不得违反本规则。

将下面的代码一次同时执行。
settings get secure enabled_accessibility_services | grep -q "org.autojs.autoxjs.v6/com.stardust.autojs.core.accessibility.AccessibilityService" || (settings put secure enabled_accessibility_services "org.autojs.autoxjs.v6/com.stardust.autojs.core.accessibility.AccessibilityService" && settings put secure accessibility_enabled 1); echo 4 > /storage/emulated/0/脚本/ai主动对话/auto_param.txt && am start -n org.autojs.autoxjs.v6/org.autojs.autojs.external.shortcut.ShortcutActivity --es path "/storage/emulated/0/脚本/ai主动对话/auto_find_me.js"

关键说明
- 必须通过 super_admin:shell 工具执行
- 脚本路径固定不可修改
- 等待时间由 auto_param.txt 文件内容决定（只可写入数字秒数）
- 需提前授予 super_admin 包权限
```


### 2.下载Autojs软件
略。

### 3.下载仓库里的脚本。
待补充。
