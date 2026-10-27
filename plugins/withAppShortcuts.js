const { withDangerousMod } = require("@expo/config-plugins");
const withQuickActions = require("expo-quick-actions/app.plugin");
const fs = require("node:fs/promises");
const path = require("node:path");
const shortcuts = require("../constants/appShortcuts.json");

const paths = {
  muzalo_shortcut_play: "M8,5v14l11,-7z",
  muzalo_shortcut_heart: "M12,21l-1.45,-1.32C5.4,15.01 2,11.92 2,8.13 2,5.04 4.42,2.62 7.5,2.62c1.74,0 3.41,0.81 4.5,2.09 1.09,-1.28 2.76,-2.09 4.5,-2.09C19.58,2.62 22,5.04 22,8.13c0,3.79 -3.4,6.88 -8.55,11.56z",
  muzalo_shortcut_search: "M9.5,3a6.5,6.5 0,1 0,4.03 11.6L19.93,21 21,19.93l-6.4,-6.4A6.5,6.5 0,0 0,9.5 3zM9.5,5a4.5,4.5 0,1 1,0 9,4.5 4.5,0 0,1 0,-9z",
};

async function writeShortcutIcons(projectRoot) {
  const directory = path.join(projectRoot, "app/src/main/res/drawable");
  await fs.mkdir(directory, { recursive: true });
  await Promise.all(Object.entries(paths).map(([name, data]) =>
    fs.writeFile(path.join(directory, `${name}.xml`),
      `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFF" android:pathData="${data}" /></vector>\n`)
  ));
}

module.exports = (config) => {
  config = withQuickActions(config, {
    iosActions: shortcuts.map(({ id, title, iosIcon }) => ({ id, title, icon: iosIcon })),
  });
  return withDangerousMod(config, ["android", async (mod) => {
    await writeShortcutIcons(mod.modRequest.platformProjectRoot);
    return mod;
  }]);
};
module.exports.writeShortcutIcons = writeShortcutIcons;
