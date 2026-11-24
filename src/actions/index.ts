import { setIcon, Setting, debounce, type DropdownComponent } from "obsidian";
import type { Action } from "svelte/action";
import type { DocType } from "../modal";

function setInputWidth(inputEl: HTMLInputElement) {
  inputEl.classList.add("bep-input-narrow");
}

function fullWidthButton(buttonEl: HTMLElement) {
  buttonEl.classList.add("bep-button-full");
}

/**
 * 将 Setting 对象的内部结构提升到 Svelte 节点上，
 * 从而消除额外的层级，使 Svelte 节点本身成为 .setting-item
 */
function promote(node: HTMLElement, setting: Setting) {
  const el = setting.settingEl;
  // 复制 class
  node.classList.add(...Array.from(el.classList));
  // 搬运子节点 (infoEl, controlEl 等)
  while (el.firstChild) {
    node.appendChild(el.firstChild);
  }
  // 移除原本的空壳
  el.remove();
}

// 通用配置项的类型定义
interface BaseSetting {
  name: string;
  desc?: string;
  tooltip?: string;
}

type SettingBuilder = (setting: Setting) => void;

// Svelte Action：use:obsidianSetting={builder}
export const obsidianSetting: Action<HTMLElement, SettingBuilder> = (node, builder) => {
  let setting = new Setting(node);
  builder(setting);

  return {
    // builder 函数变化时重建
    update(newBuilder) {
      node.empty();
      setting = new Setting(node);
      newBuilder(setting);
    },
    // 组件卸载时清理
    destroy() {
      setting.settingEl.remove();
    },
  };
};

// Toggle Action
export const settingToggle: Action<HTMLElement, BaseSetting & { value: boolean; onChange: (v: boolean) => void }> = (
  node,
  params,
) => {
  const setting = new Setting(node).setName(params.name);
  if (params.desc) setting.setDesc(params.desc);

  setting.addToggle((toggle) => {
    if (params.tooltip) toggle.setTooltip(params.tooltip);
    toggle.setValue(params.value).onChange(params.onChange);
  });

  promote(node, setting);
  return {
    destroy() {
      node.empty();
    },
  };
};

// Dropdown Action
function pinOptionValues(selectEl: HTMLSelectElement, options: Record<string, string>) {
  const keys = Object.keys(options);
  for (let i = 0; i < selectEl.options.length && i < keys.length; i++) {
    selectEl.options[i].value = keys[i];
  }
}

export const settingDropdown: Action<
  HTMLElement,
  BaseSetting & { options: Record<string, string>; value: string; onChange: (v: string) => void }
> = (node, params) => {
  let current = params;
  const setting = new Setting(node).setName(params.name);
  if (params.desc) setting.setDesc(params.desc);

  let dropdown!: DropdownComponent;
  setting.addDropdown((component) => {
    dropdown = component;
    component.addOptions(current.options);
    pinOptionValues(component.selectEl, current.options);
    component.setValue(String(current.value ?? "")).onChange((value) => current.onChange(value));
  });

  promote(node, setting);
  return {
    update(next) {
      current = next;
      pinOptionValues(dropdown.selectEl, next.options);
      dropdown.setValue(String(next.value ?? ""));
    },
    destroy() {
      node.empty();
    },
  };
};

// Slider Action
export const settingSlider: Action<
  HTMLElement,
  BaseSetting & { limits: [number, number, number]; value: number; onChange: (v: number) => void }
> = (node, params) => {
  const setting = new Setting(node).setName(params.name).addSlider((slider) => {
    slider
      .setLimits(params.limits[0], params.limits[1], params.limits[2])
      .setValue(params.value)
      .onChange((v) => {
        params.onChange(v);
        slider.showTooltip();
      });
  });

  promote(node, setting);
  return {
    destroy() {
      node.empty();
    },
  };
};

// Button Action
export const settingButton: Action<
  HTMLElement,
  { text: string; cta?: boolean; hidden?: boolean; onClick: () => void }
> = (node, params) => {
  const setting = new Setting(node).setHeading().addButton((button) => {
    button.setButtonText(params.text).onClick(params.onClick);
    if (params.cta) button.setCta();
    fullWidthButton(button.buttonEl);
  });

  if (params.hidden) node.hidden = true;
  promote(node, setting);
  return {
    destroy() {
      node.empty();
    },
  };
};

// 双输入框 Action (针对 Width/Height 或 Left/Right)
export const settingDoubleText: Action<
  HTMLElement,
  BaseSetting & {
    input1: { placeholder: string; value: string; isDebounce?: boolean; onChange: (v: string) => void };
    input2: { placeholder: string; value: string; isDebounce?: boolean; onChange: (v: string) => void };
  }
> = (node, params) => {
  const setting = new Setting(node)
    .setName(params.name)
    .addText((text) => {
      setInputWidth(text.inputEl);
      text.setPlaceholder(params.input1.placeholder).setValue(params.input1.value);
      const handler = params.input1.isDebounce ? debounce(params.input1.onChange, 500, true) : params.input1.onChange;
      text.onChange(handler);
    })
    .addText((text) => {
      setInputWidth(text.inputEl);
      text.setPlaceholder(params.input2.placeholder).setValue(params.input2.value);
      const handler = params.input2.isDebounce ? debounce(params.input2.onChange, 500, true) : params.input2.onChange;
      text.onChange(handler);
    });

  promote(node, setting);
  return {
    destroy() {
      node.empty();
    },
  };
};

export const icon: Action<HTMLElement, string> = (node, iconId) => {
  if (iconId) {
    setIcon(node, iconId);
  }
  return {
    update(newIconId) {
      node.empty();
      setIcon(node, newIconId);
    },
  };
};

export function mountNodes(node: HTMLElement, docs: DocType[]) {
  const update = (newDocs: DocType[]) => {
    node.empty();
    newDocs.forEach((item) => node.appendChild(item.doc.cloneNode(true)));
  };

  update(docs);

  return {
    update,
    destroy() {
      node.empty();
    },
  };
}

export function mountNode(node: HTMLElement, doc: any) {
  const update = (newDoc: any) => {
    node.empty();

    const child = newDoc.cloneNode(true);
    child.removeClass("theme-light");
    child.classList.add("bep-mount-visible");
    node.appendChild(child);
  };

  update(doc);

  return {
    update,
    destroy() {
      node.empty();
    },
  };
}

export function mountCanvas(container: HTMLElement, canvas: HTMLCanvasElement) {
  const update = (newCanvas: HTMLCanvasElement) => {
    container.empty();
    if (newCanvas) {
      newCanvas.classList.add("bep-preview-canvas");
      container.appendChild(newCanvas);
    }
  };
  update(canvas);
  return {
    update,
  };
}
