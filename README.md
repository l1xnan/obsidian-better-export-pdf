# Obsidian Sample Plugin

This is a sample plugin for Obsidian (https://obsidian.md).

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

**Note:** The Obsidian API is still in early alpha and is subject to change at any time!

This sample plugin demonstrates some of the basic functionality the plugin API can do.
- Adds a ribbon icon, which shows a Notice when clicked.
- Adds a command "Open Sample Modal" which opens a Modal.
- Adds a plugin setting tab to the settings page.
- Registers a global click event and output 'click' to the console.
- Registers a global interval which logs 'setInterval' to the console.

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api




```js
return s = g.sent(),
            l = jb(s),  // markdown 语法树
            c = Yb(l),
            u = Xb(l),  // markdown 渲染后的 html
            h = OM(u),
            i.appendChild(h),
            i.addClasses(tw(c)),
            p = [],
            wP.postProcess(o, {  // o 为 app
                docId: wt(16),
                sourcePath: a.path,
                frontmatter: c,
                promises: p,
                addChild: function(e) {
                    return t.addChild(e)
                },
                getSectionInfo: function() {
                    return null
                },
                containerEl: i,
                el: i,
                displayMode: !0
            }),
            p.length > 0 ? [4, Promise.all(p)] : [3, 3];
```



```js
t.postProcess = function(e, t) {
    for (var n = t.sourcePath, i = t.promises, r = t.el, o = t.displayMode, a = 0, s = r.findAll("code.language-query"); a < s.length; a++) {
        var l = s[a]
          , c = ZA(l).trim()
          , u = l.parentElement;
        t.addChild(yP(e, c, u, n))
    }
    for (var h = 0, p = GA.postProcessors; h < p.length; h++) {
        var d = (0,
        p[h])(r, t);
        d && d.then && i.push(d)
    }
    var f = _O(t.containerEl)
      , m = r.findAll(".internal-embed:not(.is-loaded)");
    if (m.length > 0)
        for (var g = 0, v = m; g < v.length; g++) {
            var y = v[g]
              , b = y.getAttribute("src")  // 处理内嵌元素: 图片/文件等
              , w = $O.load({
                app: e,
                linktext: b,
                sourcePath: n,
                containerEl: y,
                displayMode: o,
                showInline: !0,
                depth: f
            });
            w && (t.addChild(w),
            i.push(w.loadFile()))
        }
    return t
}
```


## Development

```bash
set ELECTRON_SKIP_BINARY_DOWNLOAD=1 && pnpm i
```

```
https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.min.js
```
