


```js
return s = g.sent(),
            l = jb(s),  // markdown 语法树
            c = Yb(l), // 解析 frontmatter
            u = Xb(l),  // markdown 渲染后的 html
            h = OM(u),
            i.appendChild(h),
            i.addClasses(tw(c)),
            p = [],
            wP.postProcess(o, {  // o 为 this.app
                docId: wt(16), // 随机生成的16位编码
                sourcePath: a.path,
                frontmatter: c,
                promises: p,
                addChild: function(e) {
                    return t.addChild(e)
                },
                getSectionInfo: function() {
                    return null
                },
                // <div class="markdown-preview-view
                containerEl: i,
                el: i,
                displayMode: true
            }),
            p.length > 0 ? [4, Promise.all(p)] : [3, 3];
```


https://github.com/Pr0dt0s/obsidian-html-server

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
