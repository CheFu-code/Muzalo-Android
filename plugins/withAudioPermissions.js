const { withAndroidManifest } = require("@expo/config-plugins");

// MediaLibrary 17 uses the legacy storage permissions below Android 13.
// Modern Android builds use READ_MEDIA_AUDIO instead.
function configureAudioPermissions(manifest) {
  for (const permission of manifest["uses-permission"] || []) {
    const attributes = permission.$;
    if (
      [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ].includes(attributes["android:name"])
    ) {
      attributes["android:maxSdkVersion"] = "32";
    }
  }
  return manifest;
}

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    mod.modResults = configureAudioPermissions(mod.modResults);
    return mod;
  });
module.exports.configureAudioPermissions = configureAudioPermissions;
