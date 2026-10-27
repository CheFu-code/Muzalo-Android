const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../app.json").expo;
const {
  configureAudioPermissions,
} = require("../plugins/withAudioPermissions");

test("playback keeps audio permissions and blocks unused recording, overlay and visual access", () => {
  const required = config.android.permissions;
  assert.equal(new Set(required).size, required.length);
  assert.ok(required.includes("android.permission.READ_MEDIA_AUDIO"));
  assert.ok(
    required.includes("android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"),
  );
  for (const name of [
    "RECORD_AUDIO",
    "SYSTEM_ALERT_WINDOW",
    "VIBRATE",
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO",
    "READ_MEDIA_VISUAL_USER_SELECTED",
  ]) {
    assert.ok(!required.includes(`android.permission.${name}`));
    assert.ok(
      config.android.blockedPermissions.includes(`android.permission.${name}`),
    );
  }
  assert.equal(
    config.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-audio",
    )[1].microphonePermission,
    false,
  );
});

test("legacy storage permissions stop at Android 12 while modern audio access remains", () => {
  const manifest = {
    "uses-permission": [
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "READ_MEDIA_AUDIO",
    ].map((name) => ({ $: { "android:name": `android.permission.${name}` } })),
  };
  configureAudioPermissions(manifest);
  assert.equal(manifest["uses-permission"][0].$["android:maxSdkVersion"], "32");
  assert.equal(manifest["uses-permission"][1].$["android:maxSdkVersion"], "32");
  assert.equal(
    manifest["uses-permission"][2].$["android:maxSdkVersion"],
    undefined,
  );
});
