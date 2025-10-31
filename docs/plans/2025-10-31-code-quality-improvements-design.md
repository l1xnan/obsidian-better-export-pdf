# Code Quality Improvements Design

**Date:** 2025-10-31
**Goal:** Enable strict TypeScript checking, add linting/formatting, and update dependencies to catch bugs early

## Objectives

1. Enable strictest TypeScript settings to prevent runtime errors
2. Update all dependencies to latest versions
3. Add ESLint with strict TypeScript rules
4. Add Prettier for consistent code formatting
5. Add pre-commit hooks to enforce quality checks
6. Fix all TypeScript errors in the codebase

## Approach: Phased Milestones

Work in 4 sequential phases, committing after each successful phase. This provides:
- Validation that each step works before moving forward
- Clear rollback points if issues arise
- Incremental progress tracking
- Maintained working codebase between phases

## Phase 1: Dependency Updates

### Actions
1. Run `npm outdated` to identify update candidates
2. Update dependencies strategically:
   - **Major version updates**: typescript, eslint, esbuild, svelte (check breaking changes)
   - **Minor/patch updates**: update everything else
   - **Obsidian compatibility**: verify against Obsidian API requirements
3. Execute updates:
   - `npm update` for safe semver updates
   - Manual package.json edits for major versions
4. Validate:
   - Run `npm run build`
   - Test plugin in Obsidian (load, basic export)

### Success Criteria
- Build completes successfully
- Plugin loads in Obsidian without errors
- Basic export functionality works (single file export test)

### Expected Commit
```
chore: Update dependencies to latest versions

- Updated TypeScript from 5.8.3 to [latest]
- Updated ESLint from 8.57.0 to [latest]
- Updated esbuild from 0.25.2 to [latest]
- Updated Svelte from 5.26.1 to [latest]
- Updated all other dependencies
- Verified build passes and plugin loads
```

## Phase 2: Tooling Setup

### ESLint Configuration

**File:** `eslint.config.js` (ESLint 9+ flat config)

**Configuration:**
- TypeScript ESLint recommended rules
- Key rules:
  - `@typescript-eslint/no-unused-vars`: error
  - `@typescript-eslint/no-explicit-any`: warn
  - `@typescript-eslint/explicit-function-return-type`: warn
  - `@typescript-eslint/no-non-null-assertion`: warn

**NPM Scripts:**
```json
"lint": "eslint src/**/*.ts",
"lint:fix": "eslint src/**/*.ts --fix"
```

### Prettier Configuration

**File:** `.prettierrc.json`

**Configuration:**
```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 120,
  "arrowParens": "always"
}
```

**NPM Scripts:**
```json
"format": "prettier --write src/**/*.{ts,svelte}",
"format:check": "prettier --check src/**/*.{ts,svelte}"
```

**Packages:**
- `prettier`
- `eslint-config-prettier` (prevents ESLint/Prettier conflicts)

### Pre-commit Hooks

**Packages:**
- `husky` - Git hooks manager
- `lint-staged` - Run linters on staged files only

**Configuration `.husky/pre-commit`:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

**Configuration `package.json`:**
```json
{
  "lint-staged": {
    "src/**/*.{ts,svelte}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

### Success Criteria
- `npm run lint` identifies code issues
- `npm run format` reformats code consistently
- Pre-commit hook prevents commits with linting errors
- ESLint and Prettier don't conflict

### Expected Commit
```
chore: Add ESLint, Prettier, and pre-commit hooks

- Configured ESLint with TypeScript recommended rules
- Added Prettier with consistent code style
- Set up husky pre-commit hooks with lint-staged
- Added npm scripts for lint and format commands
```

## Phase 3: Enable TypeScript Strict Mode

### Actions

Update `tsconfig.json` with strict compiler options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    // ... existing options
  }
}
```

**What `"strict": true` enables:**
- `strictNullChecks` - null and undefined must be handled explicitly
- `strictFunctionTypes` - function types checked contravariantly
- `strictBindCallApply` - strict checking of bind/call/apply
- `strictPropertyInitialization` - class properties must be initialized
- `noImplicitThis` - error on implied 'any' for 'this'
- `alwaysStrict` - parse in strict mode, emit "use strict"

### Success Criteria
- tsconfig.json updated with strict settings
- TypeScript errors will appear (expected, will fix in Phase 4)
- Build configuration validates (even with errors present)

### Expected Commit
```
chore: Enable strict TypeScript compiler options

- Enabled "strict": true in tsconfig.json
- Added noUnusedLocals, noUnusedParameters, noImplicitReturns
- This will reveal type errors to fix in next phase
```

## Phase 4: Error Resolution

### Strategy

Fix files in priority order to resolve dependency chains:

**Order:**
1. **Type definitions** - `src/type.d.ts`
2. **Utilities** - `src/utils.ts`, `src/constant.ts`
3. **Core logic** - `src/render.ts`, `src/pdf.ts`
4. **UI/Integration** - `src/modal.ts`, `src/main.ts`, `src/setting.ts`
5. **i18n** - `src/i18n/*.ts`
6. **Svelte components** - `src/*.svelte`

### Common Fixes Required

**Function Parameter Types:**
```typescript
// Before
function foo(callback) { }

// After
function foo(callback: (value: string) => void) { }
```

**Null/Undefined Handling:**
```typescript
// Before
const value = obj.property;

// After
const value = obj?.property ?? defaultValue;
```

**Fix `any` Types:**
```typescript
// Before
const data: any = fetchData();

// After
interface DataResponse {
  items: Item[];
  total: number;
}
const data: DataResponse = fetchData();
```

**Add Return Types:**
```typescript
// Before
function calculate(a: number, b: number) {
  return a + b;
}

// After
function calculate(a: number, b: number): number {
  return a + b;
}
```

**Handle Callbacks:**
```typescript
// Before
.forEach((item) => { })

// After
.forEach((item: Type) => { })
```

### Testing Strategy

After each file is fixed:
1. Run `npm run build` to verify no new errors introduced
2. Test affected functionality in Obsidian
3. Commit individual files or small groups

### Success Criteria
- `npm run build` completes with **zero TypeScript errors**
- `npm run lint` passes with no errors
- All plugin functionality works in Obsidian
- Pre-commit hooks pass

### Expected Commit Pattern
```
fix: Resolve TypeScript errors in [filename]

- Added explicit types to function parameters
- Fixed null/undefined handling with optional chaining
- Replaced any types with proper interfaces
- Added function return types
```

## Final Validation

After all phases complete:

1. **Build Check:** `npm run build` - must succeed with zero errors
2. **Lint Check:** `npm run lint` - must pass
3. **Format Check:** `npm run format:check` - must pass
4. **Functional Test:** Test all major plugin features in Obsidian:
   - Single file export
   - Multi-file export (TOC mode)
   - Batch folder export
   - Block reference links
   - Custom headers/footers
5. **Commit Hook Test:** Make a small change and commit - pre-commit hook must run

## Rollback Plan

If any phase fails critically:
1. Identify the last successful commit from previous phase
2. Run `git reset --hard [commit-hash]`
3. Analyze what went wrong
4. Adjust approach and retry

## Benefits

**After completion:**
- Catch type errors at compile time instead of runtime
- Consistent code style across entire codebase
- Automated quality checks prevent regressions
- Up-to-date dependencies with security fixes
- Better IDE autocomplete and refactoring support
- Easier onboarding for contributors

## Maintenance

**Going forward:**
- Pre-commit hooks enforce quality on every commit
- Update dependencies monthly with `npm outdated`
- TypeScript strict mode catches bugs in new code
- ESLint/Prettier maintain consistency automatically
