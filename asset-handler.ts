
// import appStyles from "assets/obsidian-styles.txt.css";
// import webpageStyles from "assets/plugin-styles.txt.css";
// import { Path } from "scripts/utils/path.js";
// import { Downloadable } from "scripts/utils/downloadable.js";
// import { ExportSettings } from "scripts/export-settings.js";
// import { RenderLog } from "./render-log.js";
// import { Utils } from "scripts/utils/utils.js";

export class AssetHandler {
	private static vaultPluginsPath: Path;
	private static thisPluginPath: Path;

	// this path is used to generate the relative path to the images folder, likewise for the other paths
	public static readonly mediaFolderName: Path = new Path("lib/media");
	public static readonly jsFolderName: Path = new Path("lib/scripts");
	public static readonly cssFolderName: Path = new Path("lib/styles");

	public static appStyles = "";
	public static mathStyles = "";
	public static webpageStyles = "";
	public static themeStyles = "";
	public static snippetStyles = "";
	public static pluginStyles = "";

	private static lastEnabledPluginStyles = "";
	private static lastEnabledSnippets: string[] = [];
	private static lastEnabledTheme = "";
	private static lastMathjaxChanged = -1;
	private static mathjaxStylesheet: CSSStyleSheet | undefined = undefined;

	public static webpageJS = "";
	public static graphViewJS = "";
	public static graphWASMJS = "";
	public static graphWASM: Buffer;
	public static renderWorkerJS = "";
	public static tinyColorJS = "";

	public static async initialize(pluginID: string) {
		this.vaultPluginsPath = Path.vaultPath.joinString(app.vault.configDir, "plugins/").makeAbsolute();
		this.thisPluginPath = this.vaultPluginsPath.joinString(pluginID + "/").makeAbsolute();

		await this.loadAppStyles();
		this.webpageStyles = webpageStyles;
		this.webpageJS = webpageJS;
		this.graphViewJS = graphViewJS;
		this.graphWASMJS = graphWASMJS;
		this.renderWorkerJS = renderWorkerJS;
		// @ts-ignore
		this.tinyColorJS = tinyColorJS;
		this.graphWASM = Buffer.from(graphWASM);

		this.updateAssetCache();
	}

	public static async getDownloads(): Promise<Downloadable[]> {
		const toDownload: Downloadable[] = [];
		if (!ExportSettings.settings.inlineCSS) {
			let pluginCSS = this.webpageStyles;
			const thirdPartyPluginCSS = await this.getPluginStyles();
			pluginCSS += "\n" + thirdPartyPluginCSS + "\n";
			const appcssDownload = new Downloadable("obsidian-styles.css", this.appStyles, this.cssFolderName);
			const plugincssDownload = new Downloadable("plugin-styles.css", pluginCSS, this.cssFolderName);
			const themecssDownload = new Downloadable("theme.css", this.themeStyles, this.cssFolderName);
			const snippetsDownload = new Downloadable("snippets.css", this.snippetStyles, this.cssFolderName);
			toDownload.push(appcssDownload);
			toDownload.push(plugincssDownload);
			toDownload.push(themecssDownload);
			toDownload.push(snippetsDownload);
		}
		if (!ExportSettings.settings.inlineJS) {
			const webpagejsDownload = new Downloadable("webpage.js", this.webpageJS, this.jsFolderName);
			toDownload.push(webpagejsDownload);
		}
		if (ExportSettings.settings.includeGraphView) {
			const graphWASMDownload = new Downloadable("graph_wasm.wasm", this.graphWASM, this.jsFolderName); // MIGHT NEED TO SPECIFY ENCODING
			const renderWorkerJSDownload = new Downloadable(
				"graph-render-worker.js",
				this.renderWorkerJS,
				this.jsFolderName
			);
			const graphWASMJSDownload = new Downloadable("graph_wasm.js", this.graphWASMJS, this.jsFolderName);
			const graphViewJSDownload = new Downloadable("graph_view.js", this.graphViewJS, this.jsFolderName);
			const tinyColorJS = new Downloadable("tinycolor.js", this.tinyColorJS, this.jsFolderName);

			toDownload.push(renderWorkerJSDownload);
			toDownload.push(graphWASMDownload);
			toDownload.push(graphWASMJSDownload);
			toDownload.push(graphViewJSDownload);
			toDownload.push(tinyColorJS);
		}
		return toDownload;
	}

	public static async updateAssetCache() {
		const snippetsNames = this.getEnabledSnippets();
		const themeName = this.getCurrentThemeName();
		const enabledPluginStyles = ExportSettings.settings.includePluginCSS;
		if (snippetsNames != this.lastEnabledSnippets) {
			this.lastEnabledSnippets = snippetsNames;
			this.snippetStyles = await this.getSnippetsCSS(snippetsNames);
		}
		if (themeName != this.lastEnabledTheme) {
			this.lastEnabledTheme = themeName;
			this.themeStyles = await this.getThemeContent(themeName);
		}
		if (enabledPluginStyles != this.lastEnabledPluginStyles) {
			this.lastEnabledPluginStyles = enabledPluginStyles;
			this.pluginStyles = await this.getPluginStyles();
		}

		this.lastMathjaxChanged = -1;
	}

	public static loadMathjaxStyles() {
		// @ts-ignore
		if (this.mathjaxStylesheet == undefined)
			this.mathjaxStylesheet = Array.from(document.styleSheets).find(
				(sheet) => sheet.ownerNode.id == "MJX-CHTML-styles"
			);
		if (this.mathjaxStylesheet == undefined) return;

		// @ts-ignore
		const changed = this.mathjaxStylesheet?.ownerNode.getAttribute("data-change");
		if (changed != this.lastMathjaxChanged) {
			AssetHandler.mathStyles = "";
			for (let i = 0; i < this.mathjaxStylesheet.cssRules.length; i++) {
				AssetHandler.mathStyles += this.mathjaxStylesheet.cssRules[i].cssText + "\n";
			}

			AssetHandler.mathStyles.replaceAll("app://obsidian.md/", "https://publish.obsidian.md/").trim();
		} else {
			console.log(Utils.getActiveTextView()?.file.name + " does not have latex");
			AssetHandler.mathStyles = "";
		}

		this.lastMathjaxChanged = changed;
	}

	private static async loadAppStyles() {
		let appSheet = document.styleSheets[1];
		const stylesheets = document.styleSheets;
		for (let i = 0; i < stylesheets.length; i++) {
			if (stylesheets[i].href && stylesheets[i].href?.includes("app.css")) {
				appSheet = stylesheets[i];
				break;
			}
		}

		this.appStyles += appStyles;

		for (let i = 0; i < appSheet.cssRules.length; i++) {
			const rule = appSheet.cssRules[i];
			if (rule) {
				if (rule.cssText.startsWith("@font-face")) continue;
				if (rule.cssText.startsWith(".CodeMirror")) continue;
				if (rule.cssText.startsWith(".cm-")) continue;

				let cssText = rule.cssText + "\n";
				cssText = cssText.replaceAll("public/", "https://publish.obsidian.md/public/");
				cssText = cssText.replaceAll("lib/", "https://publish.obsidian.md/lib/");

				this.appStyles += cssText;
			}
		}

		for (let i = 1; i < stylesheets.length; i++) {
			// @ts-ignore
			const styleID = stylesheets[i].ownerNode?.id;
			if (
				(styleID.startsWith("svelte") && ExportSettings.settings.includeSvelteCSS) ||
				styleID == "ADMONITIONS_CUSTOM_STYLE_SHEET"
			) {
				const style = stylesheets[i].cssRules;

				for (const item in style) {
					if (style[item].cssText != undefined) {
						this.appStyles += "\n" + style[item].cssText;
					}
				}
			}
		}
	}

	private static async getPluginStyles(): Promise<string> {
		// load 3rd party plugin css
		let pluginCSS = "";
		const thirdPartyPluginStyleNames = ExportSettings.settings.includePluginCSS.split("\n");
		for (let i = 0; i < thirdPartyPluginStyleNames.length; i++) {
			if (
				!thirdPartyPluginStyleNames[i] ||
				(thirdPartyPluginStyleNames[i] && !/\S/.test(thirdPartyPluginStyleNames[i]))
			)
				continue;

			const path = this.vaultPluginsPath.joinString(thirdPartyPluginStyleNames[i].replace("\n", ""), "styles.css");
			if (!path.exists) continue;

			const style = await path.readFileString();
			if (style) {
				pluginCSS += style;
			}
		}
		return pluginCSS;
	}

	private static async getThemeContent(themeName: string): Promise<string> {
		if (themeName == "Default") return "/* Using default theme. */";
		// MIGHT NEED TO FORCE A RELATIVE PATH HERE IDKK
		const themePath = new Path(`.obsidian/themes/${themeName}/theme.css`).absolute();
		if (!themePath.exists) {
			RenderLog.warning("Warning: could not load theme.", "Cannot find theme at path: \n\n" + themePath);
			return "";
		}
		const themeContent = (await themePath.readFileString()) ?? "";
		return themeContent;
	}

	private static getCurrentThemeName(): string {
		/*@ts-ignore*/
		const themeName = app.vault.config?.cssTheme;
		return (themeName ?? "") == "" ? "Default" : themeName;
	}

	private static async getSnippetsCSS(snippetNames: string[]): Promise<string> {
		const snippetsList = await this.getStyleSnippetsContent();
		let snippets = "\n";
		for (let i = 0; i < snippetsList.length; i++) {
			snippets += `/* --- ${snippetNames[i]}.css --- */  \n ${snippetsList[i]}  \n\n\n`;
		}
		return snippets;
	}

	private static getEnabledSnippets(): string[] {
		/*@ts-ignore*/
		return app.vault.config?.enabledCssSnippets ?? [];
	}

	private static async getStyleSnippetsContent(): Promise<string[]> {
		const snippetContents: string[] = [];
		const enabledSnippets = this.getEnabledSnippets();
		for (let i = 0; i < enabledSnippets.length; i++) {
			const path = new Path(`.obsidian/snippets/${enabledSnippets[i]}.css`).absolute();
			if (path.exists) snippetContents.push((await path.readFileString()) ?? "\n");
		}
		return snippetContents;
	}
}
