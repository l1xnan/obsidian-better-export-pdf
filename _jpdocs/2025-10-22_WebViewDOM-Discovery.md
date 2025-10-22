# WebView DOM Ready Error Analysis

**Date:** October 22, 2025  
**Error Type:** Race Condition / Timing Issue  
**Severity:** High (Intermittent Plugin Failure)

---

## Error Details

```
Uncaught (in promise) Error: The WebView must be attached to the DOM and the dom-ready event emitted before this method can be called.
    at eval (plugin:better-export-pdf:25220:39)
    at Array.forEach (<anonymous>)
    at ExportConfigModal.calcWebviewSize (plugin:better-export-pdf:25218:19)
```

### Location in Code
- **File:** `src/modal.ts`
- **Method:** `calcWebviewSize()` at line 220
- **Problematic Code:**
```typescript
async calcWebviewSize() {
  await sleep(500);
  this.webviews.forEach(async (e, i) => {
    const [width, height] = await e.executeJavaScript("[document.body.offsetWidth, document.body.offsetHeight]");
    // ... size calculation logic
  });
}
```

---

## Root Cause Analysis

### The Problem

The error occurs when `executeJavaScript()` is called on a WebView element that is **not yet fully attached to the DOM** or has **not yet emitted the `dom-ready` event**. This is a classic race condition issue in Electron's WebView lifecycle.

### Current Implementation Issues

1. **Hard-coded Sleep is Unreliable**
   - The current code uses `await sleep(500)` to wait for WebViews to be ready
   - 500ms is arbitrary and may not be sufficient on slower systems or when multiple WebViews are being created
   - Faster systems may waste time waiting unnecessarily

2. **Async forEach Anti-pattern**
   - The code uses `this.webviews.forEach(async (e, i) => { ... })`
   - `forEach` doesn't wait for async callbacks, causing all WebViews to be queried simultaneously
   - If any WebView isn't ready, it throws the error

3. **Missing State Tracking**
   - No explicit tracking of whether each WebView has emitted `dom-ready`
   - The `this.completed` flag only tracks a single WebView's state, not all WebViews

4. **Race Condition in appendWebviews()**
   - `appendWebviews()` creates multiple WebViews via `Promise.all()` 
   - Then immediately calls `calcWebviewSize()` without waiting for `dom-ready` events
   - The 500ms sleep doesn't guarantee all WebViews will be ready

---

## Impact on User Experience

### Performance Issues
- **Unpredictable Failures:** Export fails intermittently, especially with multiple documents
- **User Frustration:** Users must retry exports multiple times
- **Inconsistent Behavior:** Works sometimes, fails other times without clear reason
- **System Dependent:** More likely to fail on slower machines or under heavy load

### Specific Scenarios
- ✅ **More likely to succeed:** Single document, fast system, light load
- ❌ **More likely to fail:** Multiple documents, slower system, heavy load, first export after plugin activation

---

## Potential Resolutions

### Solution 1: Explicit DOM-Ready Tracking ⭐ **RECOMMENDED**

**Implementation:**
```typescript
async appendWebview(e: HTMLDivElement, doc: Document) {
  const webview = createWebview(this.scale);
  const preview = e.appendChild(webview);
  this.webviews.push(preview);
  
  // Return a promise that resolves when dom-ready fires
  return new Promise<electron.WebviewTag>((resolve) => {
    preview.addEventListener("dom-ready", async (e) => {
      this.completed = true;
      getAllStyles().forEach(async (css) => {
        await preview.insertCSS(css);
      });
      // ... rest of initialization
      resolve(preview); // Resolve after initialization complete
    });
  });
}

async calcWebviewSize() {
  // No sleep needed - we know WebViews are ready
  await Promise.all(
    this.webviews.map(async (e, i) => {
      const [width, height] = await e.executeJavaScript(
        "[document.body.offsetWidth, document.body.offsetHeight]"
      );
      const sizeEl = e.parentNode?.querySelector(".print-size");
      if (sizeEl) {
        sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
      }
    })
  );
}
```

**Pros:**
- ✅ Eliminates race condition completely
- ✅ No arbitrary timeouts
- ✅ Optimal performance (executes as soon as ready)
- ✅ Type-safe and explicit
- ✅ Each WebView tracked individually

**Cons:**
- ⚠️ Requires refactoring `appendWebview()` and its callers
- ⚠️ Moderate code changes required

---

### Solution 2: Increase Sleep Duration (Quick Fix)

**Implementation:**
```typescript
async calcWebviewSize() {
  await sleep(2000); // Increase from 500ms to 2000ms
  this.webviews.forEach(async (e, i) => {
    // ... existing code
  });
}
```

**Pros:**
- ✅ Minimal code change
- ✅ Quick temporary fix
- ✅ May reduce error frequency

**Cons:**
- ❌ Still a race condition - doesn't eliminate the problem
- ❌ Wastes time on fast systems
- ❌ May still fail on slow systems
- ❌ Poor user experience (unnecessary delays)
- ❌ Band-aid solution, not a proper fix

---

### Solution 3: Retry with Exponential Backoff

**Implementation:**
```typescript
async calcWebviewSize(maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sleep(500 * (attempt + 1)); // Progressive backoff
      await Promise.all(
        this.webviews.map(async (e, i) => {
          const [width, height] = await e.executeJavaScript(
            "[document.body.offsetWidth, document.body.offsetHeight]"
          );
          const sizeEl = e.parentNode?.querySelector(".print-size");
          if (sizeEl) {
            sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
          }
        })
      );
      return; // Success
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      console.warn(`calcWebviewSize attempt ${attempt + 1} failed, retrying...`);
    }
  }
}
```

**Pros:**
- ✅ More resilient than simple sleep
- ✅ Handles transient failures
- ✅ Provides user feedback via console

**Cons:**
- ⚠️ Still uses arbitrary timeouts
- ⚠️ Can delay successful operations
- ⚠️ Doesn't address root cause
- ⚠️ More complex error handling

---

### Solution 4: WebView State Flag Array

**Implementation:**
```typescript
export class ExportConfigModal extends Modal {
  // ... existing properties
  webviews: electron.WebviewTag[];
  webviewsReady: boolean[]; // Track each WebView's readiness
  
  constructor(plugin: BetterExportPdfPlugin, file: TFile | TFolder, multiplePdf?: boolean) {
    // ... existing initialization
    this.webviews = [];
    this.webviewsReady = [];
  }
  
  async appendWebview(e: HTMLDivElement, doc: Document) {
    const index = this.webviews.length;
    const webview = createWebview(this.scale);
    const preview = e.appendChild(webview);
    this.webviews.push(preview);
    this.webviewsReady.push(false);
    
    preview.addEventListener("dom-ready", async (e) => {
      // ... existing initialization
      this.webviewsReady[index] = true;
    });
  }
  
  async calcWebviewSize() {
    // Wait for all WebViews to be ready
    while (!this.webviewsReady.every(ready => ready)) {
      await sleep(100);
    }
    
    await Promise.all(
      this.webviews.map(async (e, i) => {
        const [width, height] = await e.executeJavaScript(
          "[document.body.offsetWidth, document.body.offsetHeight]"
        );
        // ... rest of logic
      })
    );
  }
}
```

**Pros:**
- ✅ Clear state tracking
- ✅ Explicit readiness check
- ✅ Works with multiple WebViews

**Cons:**
- ⚠️ Still uses polling (sleep loop)
- ⚠️ Moderate code changes
- ⚠️ Less elegant than Promise-based approach

---

## Recommendation

**Implement Solution 1 (Explicit DOM-Ready Tracking)** as it:
1. Completely eliminates the race condition
2. Provides optimal performance
3. Makes the code more maintainable and explicit
4. Follows modern async/await best practices
5. Aligns with Electron's WebView lifecycle

### Implementation Priority
1. **High Priority:** Refactor `appendWebview()` to return a Promise that resolves on `dom-ready`
2. **High Priority:** Update `appendWebviews()` to properly await all WebView initialization
3. **High Priority:** Replace `forEach` with `Promise.all(map)` in `calcWebviewSize()`
4. **Medium Priority:** Add error handling for WebView initialization failures
5. **Low Priority:** Add timeout safeguards for WebView loading

### Testing Strategy
- Test with single document export
- Test with multiple document export (stress test with 5+ documents)
- Test on different system loads
- Test first export after plugin activation
- Add automated tests if possible

---

## Additional Notes

### Electron WebView Lifecycle
Understanding Electron's WebView lifecycle is crucial:

1. **Created:** `document.createElement("webview")`
2. **Attached:** Added to DOM via `appendChild()`
3. **Loading:** WebView begins loading content
4. **DOM Ready:** `dom-ready` event fires (earliest safe point for API calls)
5. **Did Finish Load:** `did-finish-load` event fires (content fully loaded)

The error occurs when trying to execute JavaScript at step 2 or 3, but `executeJavaScript()` requires step 4 minimum.

### Related Issues
- Consider checking if similar race conditions exist in:
  - `calcPageSize()` (line 206) - uses `this.webviews.forEach()`
  - PDF export logic that may also interact with WebViews

### Future Improvements
- Consider migrating from WebView to BrowserView (more modern Electron API)
- Add telemetry to track WebView initialization times
- Implement a WebView pool to reuse initialized instances

---

## Discovery

### Question 1: Does the "Refresh" button do anything related to this error?

**Answer: Yes, the Refresh button directly triggers the problematic code path.**

**Code Analysis:**
```typescript
// Line 397 in src/modal.ts
new Setting(contentEl).setHeading().addButton((button) => {
  button.setButtonText("Refresh").onClick(async () => {
    await this.appendWebviews(this.previewDiv);
  });
  fullWidthButton(button);
});
```

**What it does:**
1. When clicked, it calls `appendWebviews(this.previewDiv)`
2. This method creates new WebView elements and appends them to the DOM
3. At the end of `appendWebviews()`, it calls `await this.calcWebviewSize()`
4. This is **exactly where the error occurs**

**Impact:**
- Users clicking "Refresh" are **guaranteed to encounter this race condition**
- The Refresh button is intended to regenerate the preview with updated settings
- The CSS snippet dropdown also triggers this same code path when changed (line 615)

**Current Behavior:**
- When CSS snippet is changed: `await this.appendWebviews(this.previewDiv, false);`
- When Refresh is clicked: `await this.appendWebviews(this.previewDiv);`
- Both paths are vulnerable to the WebView race condition

---

### Question 2: Should we add a configurable delay setting instead of fixing the root cause?

**Answer: No. A configurable setting is a poor substitute for proper fix, but could be a temporary workaround.**

**Analysis:**

**Why a setting is NOT recommended:**
1. **Puts burden on users** - They shouldn't need to understand WebView timing internals
2. **Trial and error** - Users would need to experiment to find the "right" value for their system
3. **Masks the problem** - Doesn't solve the race condition, just makes it less likely
4. **System dependent** - What works on one machine may fail on another
5. **Future maintenance** - As systems get faster/slower, the value needs adjustment

**If implemented anyway:**

**Location:** Would fit naturally in the "Debug" section of settings (line 181-189 in `src/setting.ts`)

```typescript
new Setting(containerEl).setName("Debug").setHeading();

new Setting(containerEl)
  .setName("WebView initialization delay")
  .setDesc("Time to wait (in milliseconds) for WebViews to initialize before calculating sizes. Increase if you experience errors. Default: 500")
  .addText((cb) => {
    cb.setValue(this.plugin.settings.webviewDelay?.toString() || "500")
      .setPlaceholder("500")
      .onChange(async (value) => {
        const delay = parseInt(value) || 500;
        this.plugin.settings.webviewDelay = Math.max(0, Math.min(5000, delay)); // Clamp 0-5000
        await this.plugin.saveSettings();
      });
  });

new Setting(containerEl)
  .setName(this.i18n.settings.debugMode)
  // ... existing debug toggle
```

**Would it require Obsidian reload?**
- **No** - Settings changes are saved via `this.plugin.saveSettings()`
- The `calcWebviewSize()` method would read from `this.plugin.settings.webviewDelay`
- Changes take effect on next export/refresh action
- **However:** The proper fix (Solution 1) also requires no reload

**Better Approach:**
- Implement Solution 1 (Explicit DOM-Ready Tracking) which eliminates the need for any delay
- If conservative, implement both: proper fix + configurable delay as safety net
- This gives reliability without user configuration burden

---

### Question 3: Should we add error notification in Debug mode?

**Answer: Yes, this would be very helpful for troubleshooting and user awareness.**

**Current Error Handling:**
- Errors are only visible in Developer Console
- Users see export fail but don't understand why
- CSS snippet errors are caught but only `console.warn()` (line 288)
- No user-facing error messages

**Proposed Implementation:**

**Location:** Add error notification component at top of modal

```typescript
export class ExportConfigModal extends Modal {
  // ... existing properties
  errorNoticeEl?: HTMLDivElement;

  displayError(error: Error | string, details?: string) {
    if (!this.plugin.settings.debug) return;
    
    if (!this.errorNoticeEl) {
      this.errorNoticeEl = this.contentEl.createDiv({
        cls: "better-export-pdf-error-notice",
        attr: {
          style: `
            background-color: var(--background-modifier-error);
            border: 1px solid var(--background-modifier-error-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          `
        }
      });
    }
    
    this.errorNoticeEl.empty();
    
    const errorText = error instanceof Error ? error.message : error;
    const header = this.errorNoticeEl.createDiv({
      cls: "error-header",
      attr: { style: "display: flex; justify-content: space-between; align-items: center;" }
    });
    
    header.createEl("strong", { 
      text: "⚠️ Error: " + errorText,
      attr: { style: "color: var(--text-error);" }
    });
    
    const dismissBtn = header.createEl("button", { 
      text: "×",
      attr: { style: "background: none; border: none; font-size: 20px; cursor: pointer;" }
    });
    dismissBtn.onclick = () => {
      this.errorNoticeEl?.remove();
      this.errorNoticeEl = undefined;
    };
    
    if (details) {
      const detailsToggle = this.errorNoticeEl.createEl("details", {
        attr: { style: "cursor: pointer; margin-top: 4px;" }
      });
      detailsToggle.createEl("summary", { 
        text: "View more details",
        attr: { style: "color: var(--text-muted); font-size: 0.9em;" }
      });
      detailsToggle.createEl("pre", { 
        text: details,
        attr: { 
          style: `
            margin-top: 8px;
            padding: 8px;
            background: var(--background-primary-alt);
            border-radius: 4px;
            font-size: 0.85em;
            overflow-x: auto;
            white-space: pre-wrap;
          `
        }
      });
    }
    
    this.errorNoticeEl.style.display = "block";
  }
  
  clearError() {
    if (this.errorNoticeEl) {
      this.errorNoticeEl.remove();
      this.errorNoticeEl = undefined;
    }
  }

  async calcWebviewSize() {
    try {
      this.clearError(); // Clear previous errors
      await sleep(500);
      await Promise.all(
        this.webviews.map(async (e, i) => {
          const [width, height] = await e.executeJavaScript(
            "[document.body.offsetWidth, document.body.offsetHeight]"
          );
          const sizeEl = e.parentNode?.querySelector(".print-size");
          if (sizeEl) {
            sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
          }
        })
      );
    } catch (error) {
      const errorDetails = error instanceof Error 
        ? `${error.name}: ${error.message}\n\nStack trace:\n${error.stack}`
        : String(error);
      this.displayError(
        "WebView not ready. Try clicking Refresh again or increase delay in settings.",
        errorDetails
      );
      throw error; // Re-throw to maintain existing behavior
    }
  }
}
```

**Benefits:**
1. ✅ Users immediately see what went wrong
2. ✅ Technical details available without opening DevTools
3. ✅ Only shown when Debug mode enabled
4. ✅ Dismissible to not clutter UI
5. ✅ Helps users report bugs with actual error messages
6. ✅ Can be reused for other error scenarios

**CSS Snippet Error Enhancement:**
```typescript
// Line 280-289 in appendWebview()
if (this.config.cssSnippet && this.config.cssSnippet != "0") {
  try {
    const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
    const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
    await preview.insertCSS(printCss);
    await preview.insertCSS(cssSnippet);
  } catch (error) {
    console.warn(error);
    this.displayError("Failed to load CSS snippet", error.message); // Add user notification
  }
}
```

---

### Question 4: Will fixing this make the preview accurately represent the output, especially with CSS snippets?

**Answer: Yes, fixing the race condition is necessary but not sufficient for perfect accuracy.**

**Current Preview Behavior:**

**What Works:**
1. ✅ CSS snippet IS applied to preview (line 280-286)
2. ✅ Preview uses same rendering engine as export
3. ✅ Same CSS injection process for preview and export
4. ✅ CSS changes trigger preview refresh (line 615)

**The Code Flow:**
```typescript
// When CSS snippet is changed (line 614)
this.config["cssSnippet"] = value;
await this.appendWebviews(this.previewDiv, false); // Re-renders with new CSS

// In appendWebview() - Same CSS applied to preview (line 280-286)
if (this.config.cssSnippet && this.config.cssSnippet != "0") {
  const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
  const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
  await preview.insertCSS(printCss);      // Apply without @media print wrapper
  await preview.insertCSS(cssSnippet);    // Apply original (with @media print)
}
```

**What Could Cause Preview ≠ Output:**

1. **Race Condition (This Issue)**
   - If WebView not ready, CSS may not be fully applied
   - Preview might render before CSS injection completes
   - **Fix:** Solution 1 ensures CSS is applied before rendering

2. **Timing Issues**
   - Current code uses `forEach(async ...)` for CSS injection (lines 277-278, 290-292)
   - Multiple async operations without proper awaiting
   - **Fix:** Change to `Promise.all()` pattern

3. **Scale/Zoom Differences**
   - Preview uses `this.scale` transformation (line 271, 206-216)
   - Could affect CSS pixel calculations
   - Usually not significant for content, more for sizing

4. **Print-specific CSS**
   - `@media print` rules are extracted and applied separately (line 284)
   - Preview shows both print and screen styles
   - Actual PDF only uses print context

**Accuracy After Fixes:**

| Aspect | Current | After Race Fix | Notes |
|--------|---------|----------------|-------|
| CSS Snippet Applied | ⚠️ Sometimes | ✅ Always | Race condition fixed |
| CSS Fully Loaded | ⚠️ Sometimes | ✅ Always | Proper async handling |
| Layout Accuracy | ✅ Good | ✅ Good | Same rendering engine |
| @media print Rules | ⚠️ Approximate | ⚠️ Approximate | Preview can't fully emulate print media |
| Page Breaks | ❌ Not shown | ❌ Not shown | Preview is continuous, PDF is paginated |
| Header/Footer | ❌ Not shown | ❌ Not shown | Only in PDF output |

**Recommendations for Better Preview Accuracy:**

1. **Essential (Fixes race condition):**
   ```typescript
   preview.addEventListener("dom-ready", async (e) => {
     this.completed = true;
     
     // Wait for all CSS to load
     await Promise.all(
       getAllStyles().map(css => preview.insertCSS(css))
     );
     
     if (this.config.cssSnippet && this.config.cssSnippet != "0") {
       try {
         const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
         const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
         await preview.insertCSS(printCss);
         await preview.insertCSS(cssSnippet);
       } catch (error) {
         console.warn(error);
         this.displayError("Failed to load CSS snippet", error.message);
       }
     }
     
     await preview.executeJavaScript(this.makeWebviewJs(doc));
     
     await Promise.all(
       getPatchStyle().map(css => preview.insertCSS(css))
     );
   });
   ```

2. **Nice to have:**
   - Add "Preview Loading..." indicator
   - Show warning: "Preview is approximate - headers/footers only in PDF"
   - Add page break visualization option

**Conclusion:** Fixing the race condition will make the preview **much more reliable and accurate** for CSS snippet rendering, but perfect 1:1 accuracy with PDF output is impossible due to fundamental differences between continuous preview and paginated print output.

---

## Updated Recommendations

Based on the discovery findings, here's the revised implementation approach:

### Critical Priority (Must Fix)
1. **Implement Solution 1: Explicit DOM-Ready Tracking**
   - Completely eliminates race condition
   - Makes Refresh button reliable
   - Ensures CSS snippets always load correctly
   - **Impact:** Fixes core user pain point

2. **Fix Async CSS Injection**
   - Change all `forEach(async ...)` to `Promise.all(map(...))`
   - Ensures all CSS loads before proceeding
   - **Impact:** Better preview accuracy

### High Priority (User Experience)
3. **Add Debug Error Notifications**
   - Implement error display component at top of modal
   - Only shown when Debug mode enabled
   - Dismissible and expandable for details
   - **Impact:** Users can self-diagnose and report issues

4. **Add Loading State Indicators**
   - Show "Loading preview..." while WebViews initialize
   - Disable controls until ready
   - **Impact:** Clear user feedback

### Medium Priority (Safety Net)
5. **Add Timeout Protection**
   - Prevent infinite waits if WebView fails to initialize
   - Fallback behavior after timeout
   - **Impact:** Graceful degradation

### Low Priority (Nice to Have)
6. **Add Preview Accuracy Warning**
   - Small notice: "Preview may differ from PDF (headers/footers not shown)"
   - Help users understand limitations
   - **Impact:** Sets correct expectations

7. **Optional Delay Setting (NOT RECOMMENDED)**
   - Only if other fixes prove insufficient
   - Would go in Debug section
   - **Impact:** Band-aid for edge cases

---

## Detailed Implementation Plan

### Phase 1: Core Race Condition Fix (2-3 hours)

**Step 1.1: Refactor `appendWebview()` to return Promise**
- **File:** `src/modal.ts`
- **Lines:** 270-295
- **Changes:**
  ```typescript
  async appendWebview(e: HTMLDivElement, doc: Document): Promise<electron.WebviewTag> {
    const webview = createWebview(this.scale);
    const preview = e.appendChild(webview);
    this.webviews.push(preview);
    this.preview = preview;
    
    return new Promise<electron.WebviewTag>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebView initialization timeout after 10 seconds"));
      }, 10000);
      
      preview.addEventListener("dom-ready", async (e) => {
        try {
          clearTimeout(timeout);
          this.completed = true;
          
          // Wait for all CSS to load sequentially
          await Promise.all(
            getAllStyles().map(css => preview.insertCSS(css))
          );
          
          if (this.config.cssSnippet && this.config.cssSnippet != "0") {
            try {
              const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
              const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
              await preview.insertCSS(printCss);
              await preview.insertCSS(cssSnippet);
            } catch (error) {
              console.warn(error);
              // Error notification added in Phase 2
            }
          }
          
          await preview.executeJavaScript(this.makeWebviewJs(doc));
          
          await Promise.all(
            getPatchStyle().map(css => preview.insertCSS(css))
          );
          
          resolve(preview);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }
  ```
- **Testing:** Create single webview, verify it resolves after dom-ready

**Step 1.2: Update `appendWebviews()` to wait for all WebViews**
- **File:** `src/modal.ts`
- **Lines:** 297-327
- **Changes:**
  ```typescript
  async appendWebviews(el: HTMLDivElement, render = true) {
    el.empty();
    if (render) {
      // @ts-ignore
      this.svelte = mount(Progress, {
        target: el,
        props: {
          startCount: 5,
        },
      });
      const { data, docs } = await this.getAllFiles();
      this.svelte.initRenderStates(data);
      await this.renderFiles(data, docs, this.svelte.updateRenderStates);
    }
    el.empty();
    
    // Create all webviews and wait for them to be ready
    await Promise.all(
      this.docs?.map(async ({ doc }, i) => {
        if (this.multiplePdf) {
          el.createDiv({
            text: `${i + 1}-${doc.title}`,
            attr: { class: "filename" },
          });
        }
        const div = el.createDiv({ attr: { class: "webview-wrapper" } });
        div.createDiv({ attr: { class: "print-size" } });
        await this.appendWebview(div, doc); // Now properly waits for dom-ready
      }),
    );
    
    // Now safe to calculate sizes - all WebViews are initialized
    await this.calcWebviewSize();
  }
  ```
- **Testing:** Export multiple documents, verify no errors

**Step 1.3: Fix `calcWebviewSize()` async handling**
- **File:** `src/modal.ts`
- **Lines:** 220-229
- **Changes:**
  ```typescript
  async calcWebviewSize() {
    // No sleep needed - WebViews are guaranteed ready by caller
    await Promise.all(
      this.webviews.map(async (e, i) => {
        const [width, height] = await e.executeJavaScript(
          "[document.body.offsetWidth, document.body.offsetHeight]"
        );
        const sizeEl = e.parentNode?.querySelector(".print-size");
        if (sizeEl) {
          sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
        }
      })
    );
  }
  ```
- **Testing:** Click Refresh button multiple times, verify no errors

**Step 1.4: Add TypeScript types**
- **File:** `src/type.d.ts`
- **Changes:** Ensure WebviewTag type is properly imported
- **Testing:** TypeScript compilation succeeds

**Testing Checklist for Phase 1:**
- [ ] Single document export works
- [ ] Multiple document export works (test with 5+ documents)
- [ ] Refresh button works reliably
- [ ] CSS snippet changes update preview
- [ ] No console errors about WebView not ready
- [ ] Test on slower machine/high CPU load
- [ ] Test first export after plugin activation

---

### Phase 2: User-Facing Error Handling (1-2 hours)

**Step 2.1: Add error notification component**
- **File:** `src/modal.ts`
- **Lines:** Add to class properties (~line 65)
- **Changes:**
  ```typescript
  export class ExportConfigModal extends Modal {
    // ... existing properties
    errorNoticeEl?: HTMLDivElement;
  ```
- **Testing:** TypeScript compilation

**Step 2.2: Implement `displayError()` method**
- **File:** `src/modal.ts`
- **Location:** After `togglePrintSize()` method (~line 240)
- **Changes:** (Full implementation from Q3 above)
- **Testing:** Manually call to verify UI appearance

**Step 2.3: Integrate error handling in `calcWebviewSize()`**
- **File:** `src/modal.ts`
- **Lines:** 220-229 (already modified in Phase 1)
- **Changes:**
  ```typescript
  async calcWebviewSize() {
    try {
      this.clearError(); // Clear any previous errors
      await Promise.all(
        this.webviews.map(async (e, i) => {
          const [width, height] = await e.executeJavaScript(
            "[document.body.offsetWidth, document.body.offsetHeight]"
          );
          const sizeEl = e.parentNode?.querySelector(".print-size");
          if (sizeEl) {
            sizeEl.innerHTML = `${width}×${height}px\n${px2mm(width)}×${px2mm(height)}mm`;
          }
        })
      );
    } catch (error) {
      if (this.plugin.settings.debug) {
        const errorDetails = error instanceof Error 
          ? `${error.name}: ${error.message}\n\nStack trace:\n${error.stack}`
          : String(error);
        this.displayError(
          "Failed to calculate WebView sizes",
          errorDetails
        );
      }
      throw error; // Re-throw to maintain existing behavior
    }
  }
  ```
- **Testing:** Force error, verify notification appears in debug mode

**Step 2.4: Add error handling to CSS snippet loading**
- **File:** `src/modal.ts`
- **Location:** In `appendWebview()` method (~line 280)
- **Changes:**
  ```typescript
  if (this.config.cssSnippet && this.config.cssSnippet != "0") {
    try {
      const cssSnippet = await fs.readFile(this.config.cssSnippet, { encoding: "utf8" });
      const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
      await preview.insertCSS(printCss);
      await preview.insertCSS(cssSnippet);
    } catch (error) {
      console.warn(error);
      if (this.plugin.settings.debug) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.displayError("Failed to load CSS snippet", errorMsg);
      }
    }
  }
  ```
- **Testing:** Select non-existent CSS file, verify error shown

**Step 2.5: Clear errors on successful operations**
- **File:** `src/modal.ts`
- **Changes:** Call `this.clearError()` at start of successful operations
- **Testing:** Trigger error, then successful operation, verify error clears

**Testing Checklist for Phase 2:**
- [ ] Error notification appears when Debug mode ON
- [ ] Error notification hidden when Debug mode OFF
- [ ] Error can be dismissed
- [ ] Details can be expanded/collapsed
- [ ] Error clears on successful retry
- [ ] CSS loading errors are caught and displayed
- [ ] WebView timeout errors are caught and displayed

---

### Phase 3: Loading State & UX Improvements (1 hour)

**Step 3.1: Add loading indicator property**
- **File:** `src/modal.ts`
- **Lines:** Class properties (~line 65)
- **Changes:**
  ```typescript
  export class ExportConfigModal extends Modal {
    // ... existing properties
    loadingIndicatorEl?: HTMLDivElement;
    isLoading: boolean;
  ```

**Step 3.2: Create loading indicator UI**
- **File:** `src/modal.ts`
- **Location:** New method after `displayError()`
- **Changes:**
  ```typescript
  showLoadingIndicator(message = "Loading preview...") {
    if (!this.loadingIndicatorEl) {
      this.loadingIndicatorEl = this.previewDiv.createDiv({
        cls: "better-export-pdf-loading",
        attr: {
          style: `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-primary);
            padding: 20px 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
          `
        }
      });
    }
    this.loadingIndicatorEl.setText(message);
    this.loadingIndicatorEl.style.display = "block";
    this.isLoading = true;
  }
  
  hideLoadingIndicator() {
    if (this.loadingIndicatorEl) {
      this.loadingIndicatorEl.style.display = "none";
    }
    this.isLoading = false;
  }
  ```

**Step 3.3: Integrate loading states**
- **File:** `src/modal.ts`
- **Location:** `appendWebviews()` method
- **Changes:**
  ```typescript
  async appendWebviews(el: HTMLDivElement, render = true) {
    this.showLoadingIndicator("Initializing preview...");
    try {
      el.empty();
      // ... existing code ...
      await this.calcWebviewSize();
    } finally {
      this.hideLoadingIndicator();
    }
  }
  ```

**Step 3.4: Disable controls during loading**
- **File:** `src/modal.ts`
- **Location:** Button handlers
- **Changes:** Check `this.isLoading` before allowing actions

**Step 3.5: Add preview accuracy disclaimer**
- **File:** `src/modal.ts`
- **Location:** In `onOpen()` or similar
- **Changes:**
  ```typescript
  const disclaimer = contentEl.createDiv({
    cls: "preview-disclaimer",
    attr: {
      style: `
        font-size: 0.85em;
        color: var(--text-muted);
        padding: 8px;
        background: var(--background-secondary);
        border-radius: 4px;
        margin-bottom: 12px;
      `
    }
  });
  disclaimer.setText("ℹ️ Preview is approximate - headers, footers, and page breaks only appear in PDF output");
  ```

**Testing Checklist for Phase 3:**
- [ ] Loading indicator appears during webview initialization
- [ ] Loading indicator hides when complete
- [ ] Controls disabled during loading
- [ ] Preview disclaimer visible and styled correctly
- [ ] Good user experience during slow operations

---

### Phase 4: Final Testing & Documentation (1 hour)

**Step 4.1: Comprehensive testing**
- [ ] Test single document export
- [ ] Test multiple document export (10+ documents)
- [ ] Test Refresh button repeatedly
- [ ] Test CSS snippet changes
- [ ] Test with Debug mode ON and OFF
- [ ] Test on slow system or under load
- [ ] Test error scenarios
- [ ] Test timeout scenarios

**Step 4.2: Update README**
- **File:** `README.md`
- **Changes:** 
  - Add note about improved stability
  - Document debug error notifications
  - Remove any mentions of WebView timing issues

**Step 4.3: Update changelog/version**
- **File:** `versions.json` or `CHANGELOG.md`
- **Changes:** Document fixes

**Step 4.4: Code review checklist**
- [ ] All `forEach(async ...)` replaced with `Promise.all(map(...))`
- [ ] All WebView operations wait for dom-ready
- [ ] Proper error handling throughout
- [ ] TypeScript types correct
- [ ] No console errors
- [ ] Performance acceptable

---

## Success Metrics

### Before Implementation
- ❌ Intermittent errors on Refresh
- ❌ CSS snippets sometimes don't apply
- ❌ Silent failures
- ❌ User confusion
- ⚠️ Hard-coded 500ms delay

### After Implementation
- ✅ Refresh button always works
- ✅ CSS snippets reliably apply
- ✅ Clear error messages (debug mode)
- ✅ User-friendly loading states
- ✅ No arbitrary delays
- ✅ Proper async/await patterns
- ✅ 10-second timeout protection
- ✅ Graceful degradation

**Estimated Total Time:** 5-7 hours
**Risk Level:** Low (well-contained changes)
**Breaking Changes:** None (backward compatible)
