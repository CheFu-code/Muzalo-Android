const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Exercise the app's TypeScript without importing native modules into Node.
module.exports = function loadTypeScript(filename, mocks = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loaded = new Module(absolute, module);
    cache.set(absolute, loaded);
    loaded.filename = absolute;
    loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
    const originalRequire = loaded.require.bind(loaded);
    loaded.require = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith(".")) {
        const source = path.resolve(path.dirname(absolute), `${name}.ts`);
        if (fs.existsSync(source)) return load(source);
      }
      return originalRequire(name);
    };
    const result = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    });
    loaded._compile(result.outputText, absolute);
    return loaded.exports;
  }
  return load(filename);
};
