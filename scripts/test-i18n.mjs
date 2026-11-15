import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { compile } from "svelte/compiler";
import * as runtime from "svelte/internal/client";
import ts from "typescript";

function evaluate(source, imports = {}) {
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(id) {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return module.exports;
}

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const en = evaluate(read("src/i18n/en.ts")).default;
const zh = evaluate(read("src/i18n/zh.ts")).default;
const source = read("src/components/ExportSettings.svelte");

test("full component compiles without captured reactive-state warnings", () => {
  const { warnings } = compile(source, { filename: "ExportSettings.svelte", generate: "client" });
  assert.deepEqual(warnings.filter(warning => warning.code === "state_referenced_locally"), []);
});

test("changing plugin props refreshes labels while preserving option values and config", () => {
  // Compile the real component script with a test-only accessor. This exercises
  // Svelte's generated derived signals without requiring an Obsidian DOM.
  const script = source.split("</script>")[0];
  const { js } = compile(
    `${script}\nexport function options() { return { pageSizeOptions, marginOptions, showCustomSize, showCustomMargin }; }\n</script>`,
    { filename: "ExportSettings.svelte", generate: "client" },
  );
  const Component = evaluate(js.code, {
    "svelte/internal/client": runtime,
    "svelte/internal/disclose-version": {},
    "../actions": {},
  }).default;
  const plugin = runtime.mutable_source({ i18n: en });
  const config = { pageSize: "Custom", marginType: "3", pageWidth: "210", pageHeight: "297" };
  let component;
  const cleanup = runtime.effect_root(() => {
    component = Component(null, {
      get plugin() { return runtime.get(plugin); },
      config,
      modal: { cssSnippets: () => ({}) },
    });
  });
  try {
    const english = component.options();
    assert.equal(english.pageSizeOptions.Custom, "Custom");
    assert.deepEqual(Object.keys(english.marginOptions), ["0", "1", "2", "3"]);
    assert.deepEqual(Object.values(english.marginOptions), ["None", "Default", "Small", "Custom"]);
    runtime.set(plugin, { i18n: zh });
    const chinese = component.options();
    assert.equal(chinese.pageSizeOptions.Custom, "自定义");
    assert.deepEqual(Object.values(chinese.marginOptions), ["无", "默认", "小", "自定义"]);
    assert.deepEqual(Object.keys(chinese.pageSizeOptions), Object.keys(english.pageSizeOptions));
    for (const [value, label] of Object.entries(chinese.pageSizeOptions)) {
      if (value !== "Custom") assert.equal(label, value);
    }
    assert.equal(chinese.showCustomSize, true);
    assert.equal(chinese.showCustomMargin, true);
    runtime.set(plugin, { i18n: en });
    assert.equal(component.options().pageSizeOptions.Custom, "Custom");
    assert.deepEqual(config, { pageSize: "Custom", marginType: "3", pageWidth: "210", pageHeight: "297" });
  } finally {
    cleanup();
  }
});

test("dropdown action applies new labels, selected value, description and callback", () => {
  const instances = [];
  class Setting {
    constructor() {
      this.settingEl = { classList: [], firstChild: null, remove() {} };
      instances.push(this);
    }
    setName(value) { this.name = value; return this; }
    setDesc(value) { this.desc = value; return this; }
    addDropdown(callback) {
      const dropdown = this.dropdown = {
        options: {},
        selectEl: { empty() { dropdown.options = {}; } },
        addOptions(options) { Object.assign(this.options, options); return this; },
        setValue(value) { this.value = value; return this; },
        onChange(callback) { this.callback = callback; return this; },
      };
      callback(dropdown);
      return this;
    }
  }
  const { settingDropdown } = evaluate(read("src/actions/index.ts"), {
    obsidian: { Setting },
  });
  for (const [value, english, chinese] of [
    ["Custom", { Custom: "Custom", A4: "A4" }, { Custom: "自定义", A4: "A4" }],
    ["3", { "0": "None", "1": "Default", "2": "Small", "3": "Custom" }, { "0": "无", "1": "默认", "2": "小", "3": "自定义" }],
  ]) {
    let changes = 0;
    let cleared = false;
    const node = { classList: { add() {} }, empty() { cleared = true; } };
    const action = settingDropdown(node, {
      name: "English", desc: "Old description", options: english, value,
      onChange() { changes += 1; },
    });
    action.update({
      name: "中文", options: chinese, value,
      onChange(selected) { assert.equal(selected, value); changes += 10; },
    });
    const setting = instances.at(-1);
    assert.equal(setting.name, "中文");
    assert.equal(setting.desc, "");
    assert.equal(setting.dropdown.value, value);
    assert.deepEqual(setting.dropdown.options, chinese);
    assert.equal(changes, 0, "Updating labels must not persist settings");
    setting.dropdown.callback(value);
    assert.equal(changes, 10);
    action.destroy();
    assert.equal(cleared, true);
  }
});

test("English defaults and technical paths remain unchanged", () => {
  assert.equal(en.exportDialog.headerTooltip, "Display header");
  assert.equal(en.exportDialog.customPageSize, "Custom");
  assert.equal(en.menu.generateToc, "Generate TOC.md file");
  assert.equal(zh.menu.generateToc, "生成 TOC.md 文件");
  assert.ok(en.settings.headerTemplateDescription.includes('<span class="title"></span>'));
  assert.ok(zh.settings.headerTemplateDescription.includes('<span class="title"></span>'));
});
