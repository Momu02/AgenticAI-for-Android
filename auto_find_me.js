// auto_find_me.js - 优化启动版（解决su权限+多启动方案）
console.log("✅ 脚本已启动");

// ===================== 启动提示功能 =====================
function sendStartAlert() {
    try {
        toastLog("✅ 脚本启动成功！");
        console.log("📢 启动提示已显示");
    } catch (e) {
        console.log("✅ 脚本已启动（弹窗提示暂不可用，查看日志确认）");
    }
}
sendStartAlert();

// ===================== 读取等待时间 =====================
function getWaitTimeMsFromFile() {
    var paramPath = "/storage/emulated/0/脚本/ai主动对话/auto_param.txt";
    try {
        var content = files.read(paramPath);
        var seconds = parseInt(content.trim());
        if (!isNaN(seconds) && seconds >= 0) {
            console.log("✅ 从 auto_param.txt 读取到时间:", seconds, "秒 ->", seconds * 1000, "ms");
            return seconds * 1000;
        } else {
            console.error("❌ auto_param.txt 内容无效，必须是正整数");
            exit();
        }
    } catch (e) {
        console.error("❌ 无法读取 auto_param.txt 文件:", e.message);
        exit();
    }
}
var waitTimeMs = getWaitTimeMsFromFile();
console.log("⏳ 等待 " + (waitTimeMs / 1000) + " 秒...");

// ===================== 工具函数 =====================
function dynamicSleep(baseTime) {
    sleep(baseTime);
}

function isDeviceLocked() {
    try {
        return context.getSystemService(context.KEYGUARD_SERVICE)
            .inKeyguardRestrictedInputMode();
    } catch (e) {
        return false;
    }
}

function waitForUnlockResult(resultPath, timeoutMs) {
    var deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (files.exists(resultPath)) {
            try {
                var txt = files.read(resultPath);
                var obj = JSON.parse(txt);
                return obj;
            } catch (e) {}
        }
        sleep(300);
    }
    return { status: "TIMEOUT", message: "unlock result timeout" };
}

// ===================== 等待+解锁逻辑 =====================
dynamicSleep(waitTimeMs);
console.log("⏰ 时间到了！开始执行操作...");
//app.launch("org.autojs.autoxjs.v6");

if (!device.isScreenOn() || isDeviceLocked()) {
    var resultPath = "/storage/emulated/0/脚本/ai主动对话/unlock_result.json";
    if (files.exists(resultPath)) {
        try { files.remove(resultPath); } catch (e) {}
    }
    console.log("📱 需要解锁，调用解锁脚本...");
    engines.execScriptFile("/storage/emulated/0/脚本/子任务/屏幕解锁.js", {
        arguments: { resultPath: resultPath }
    });

    var res = waitForUnlockResult(resultPath, 20000);
    if (res.status === "SUCCESS") {
        console.log("✅ 屏幕已成功解锁");
    } else if (res.status === "FAILED") {
        console.log("❌ 解锁失败：" + (res.message || ""));
    } else {
        console.log("⚠️ 解锁结果超时，继续后续流程");
    }
    dynamicSleep(800);
}

// ===================== 优化后的多方式启动逻辑 =====================
const TARGET_PACKAGE = "com.ai.assistance.operit";
const CUSTOM_INTENT = "anywhere://open?sid=7293"; // Anywhere提供的Intent，用来打开Operit
console.log("🚀 开始尝试启动 Operit AI（最多4次）...");
let maxAttempts = 4;
let attempts = 0;
let isAppLaunched = false;

while (attempts < maxAttempts && !isAppLaunched) {
    attempts++;
    console.log(`🔄 尝试第 ${attempts}/${maxAttempts} 次启动...`);
    
    try {
        // 方案1：优先使用你提供的anywhere Intent
        console.log("🔹 尝试anywhere Intent启动...");
        app.startActivity({
            action: "android.intent.action.VIEW",
            data: CUSTOM_INTENT,
            package: TARGET_PACKAGE
        });
        dynamicSleep(2000);
        let foregroundPkg = currentPackage();
        if (foregroundPkg === TARGET_PACKAGE) {
            console.log("✅ anywhere Intent启动成功");
            isAppLaunched = true;
            break;
        }

        // 方案2：原生app.launch
        console.log("🔹 尝试原生app.launch启动...");
        app.launch(TARGET_PACKAGE);
        dynamicSleep(2000);
        foregroundPkg = currentPackage();
        if (foregroundPkg === TARGET_PACKAGE) {
            console.log("✅ 原生app.launch启动成功");
            isAppLaunched = true;
            break;
        }

        // 方案3：普通权限am命令（无su）
        console.log("🔹 尝试普通权限am命令启动...");
        let amCmd = `am start -n ${TARGET_PACKAGE}/.MainActivity`;
        let amResult = shell(amCmd, false); // 第二个参数false=不使用root
        console.log(`📝 am命令执行结果：${amResult}`);
        dynamicSleep(2000);
        foregroundPkg = currentPackage();
        if (foregroundPkg === TARGET_PACKAGE) {
            console.log("✅ am命令启动成功");
            isAppLaunched = true;
            break;
        }

        console.log(`❌ 第 ${attempts} 次启动失败，继续尝试...`);
    } catch (e) {
        console.error(`⚠️ 第 ${attempts} 次尝试异常：`, e.message);
        dynamicSleep(1000);
    }
}

// ===================== 后续操作 =====================
if (!isAppLaunched) {
    console.error("❌ 超过最大尝试次数（4次），启动失败");
    toastLog("❌ Operit AI 启动失败，请手动启动");
    exit();
}

console.log("📝 正在输入提醒消息...");
click(600, 2675);
dynamicSleep(1000);
setText("时间已到！你该来找我说话了（本消息为脚本自动发送，请你做该做的回答）");
dynamicSleep(500);

console.log("📤 正在点击发送按钮...");
click(1136, 1658);

console.log("🎉 脚本执行完成");
