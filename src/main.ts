import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	MarkdownRenderer,
} from "obsidian";

import { ipcRenderer } from "electron";
import { once } from "events";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon("dice", "Sample Plugin", (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice("This is a notice!");
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));

		// Register the Export As HTML button in the file menu
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item
						.setTitle("Export to PDF")
						.setIcon("download")
						.setSection("export")
						.onClick(async () => {
							// TODO

							await this.exportToPDF(file as TFile);
						});
				});
			}),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async exportToPDF(file: TFile) {
		console.log("click better export to pdf");
		// const markdown = getCurrentMarkdownContent();

		const workspace = this.app.workspace;
		console.log("workspace:", workspace);

		// const leaf = workspace.getLeaf("window");
		// console.log("leaf:", leaf);
		// await leaf.openFile(file, { active: false });

		// const view = leaf.view as MarkdownView;
		// console.log("view:", view);
		// console.log("data:", view.data);

		// // waitUntil(() => leaf != undefined && leaf.view?.previewMode, 2000, 10);
		// const previewMode = view.previewMode;

		// console.log("previewMode:", previewMode);

		// previewMode.set("preview", true);

		const elem = document.createElement("div");

		// let content = await MarkdownRenderer.render(this.app, file, elem, file);

		ipcRenderer.once("print-to-pdf", (e, ...args) => {
			console.log("======");
			console.log(e, args);
			console.log("------");
		});

		ipcRenderer.send("print-to-pdf", {
			filepath: "C:\\Users\\Administrator\\Desktop\\Obsidian 配置1.pdf",
			includeName: true,
			landscape: false,
			marginsType: 0,
			open: true,
			pageSize: "A4",
			scale: 1,
			scaleFactor: 100,
		});
	}

	getCurrentMarkdownContent() {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (activeLeaf) {
			const activeView = activeLeaf.view;
			if (activeView && activeView.getMode().type === "markdown") {
				const editor = activeView.editor;
				const markdownContent = editor.getValue();
				return markdownContent;
			}
		}
		return "";
	}

	demo1() {
		const theme = "obsidian" === this.app.vault?.getConfig("theme");
		if (theme) {
			document.body.addClass("theme-light");
			document.body.removeClass("theme-dark");
		}
		document.body.removeClass("theme-dark");
		const node = document.body.createDiv("print");

		const reset = function () {
			node.detach();
			if (theme) {
				document.body.removeClass("theme-light");
				document.body.addClass("theme-dark");
			}
			// t.hide();
		};
		node.addEventListener("click", reset);
	}

	demo2() {
		const el = document.body.createDiv("print");

		const el2 = el.createDiv("markdown-preview-view markdown-rendered");

		el2.toggleClass("rtl", this.app.vault.getConfig("rightToLeft"));
		el2.toggleClass("show-frontmatter", this.app.vault.getConfig("showFrontmatter"));

		el2.createEl("h1", {
			text: "xxxxx", // a.basename
		});

		const renderText = ""; // MarkdownRenderer.render();

		// renderText = sanitize(renderText)
		const node = document.importNode(renderText, true);

		el2.appendChild(node);

		// el2.addClasses(tw(c)),

		wP.postProcess(o, {
			docId: wt(16),
			sourcePath: a.path,
			frontmatter: c,
			promises: p,
			addChild: function (e) {
				return t.addChild(e);
			},
			getSectionInfo: function () {
				return null;
			},
			containerEl: i,
			el: i,
			displayMode: !0,
		});
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

function getCurrentMarkdownContent() {
	const activeFile = this.app.workspace.getActiveFile();
	if (activeFile) {
		const markdownContent = getMarkdownSourceForActiveFile(activeFile);
		return markdownContent;
	}
	return "";
}

function getRenderedHTML(markdownText) {
	const markdownRenderer = new MarkdownRenderer();
	const html = markdownRenderer.render(markdownText);
	return html;
}

// function getLeaf(navType: PaneType | boolean, splitDirection: SplitDirection = "vertical"): WorkspaceLeaf {
// 	let leaf = navType === "split" ? app.workspace.getLeaf(navType, splitDirection) : app.workspace.getLeaf(navType);
// 	return leaf;
// }

// export async function openFileInNewTab(
// 	file: TFile,
// 	navType: PaneType | boolean,
// 	splitDirection: SplitDirection = "vertical"
// ): Promise<WorkspaceLeaf> {
// 	let leaf = getLeaf(navType, splitDirection);

// 	try {
// 		await leaf.openFile(file, undefined).catch((reason) => {
// 			console.log(reason);
// 		});
// 	} catch (error) {
// 		console.log(error);
// 	}

// 	return leaf;
// }

// export function openNewTab(navType: PaneType | boolean, splitDirection: SplitDirection = "vertical"): WorkspaceLeaf {
// 	return getLeaf(navType, splitDirection);
// }

async function waitUntil(condition: () => boolean, timeout = 1000, interval = 100): Promise<boolean> {
	return new Promise((resolve, reject) => {
		let timer = 0;
		const intervalId = setInterval(() => {
			if (condition()) {
				clearInterval(intervalId);
				resolve(true);
			} else {
				timer += interval;
				if (timer >= timeout) {
					clearInterval(intervalId);
					resolve(false);
				}
			}
		}, interval);
	});
}
