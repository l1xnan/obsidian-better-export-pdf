# AI-Assisted Development Best Practices

**Purpose:** Guidelines for effective collaboration between human developers and AI coding assistants  
**Last Updated:** October 22, 2025  
**Applies To:** GitHub Copilot, Claude, GPT-4, and other AI coding assistants

---

## Table of Contents

1. [Introduction](#introduction)
2. [Communication Principles](#communication-principles)
3. [Project Context & Setup](#project-context--setup)
4. [Code Analysis & Understanding](#code-analysis--understanding)
5. [Implementation Best Practices](#implementation-best-practices)
6. [Documentation Standards](#documentation-standards)
7. [Testing & Validation](#testing--validation)
8. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
9. [Effective Prompting Strategies](#effective-prompting-strategies)
10. [Case Study: WebView DOM Fix](#case-study-webview-dom-fix)

---

## Introduction

AI coding assistants are powerful tools that can dramatically accelerate development when used effectively. This guide captures best practices learned from real-world AI-assisted development on the obsidian-better-export-pdf plugin.

### Key Principles

1. **AI as Collaborator, Not Replacement** - AI assists, humans decide
2. **Context is Everything** - More context = better results
3. **Iterative Refinement** - Start broad, narrow down progressively
4. **Trust but Verify** - Always review and test AI-generated code
5. **Document the Process** - Capture decisions and rationale

---

## Communication Principles

### Provide Clear Objectives

**❌ Vague Request:**
```
Fix the error in this plugin
```

**✅ Clear Request:**
```
This obsidian plugin regularly causes the error below.
[Error details with stack trace]

Explain the issue / error, how it is impacting the experience / performance, 
and potential resolutions for it with any pros and cons.
```

### Use Structured Questions

**Template for Problem Analysis:**
```markdown
1. What is the error/issue?
2. How does it impact users?
3. What are the potential causes?
4. What are 3-5 possible solutions?
5. What are the pros/cons of each solution?
6. What is your recommended approach?
```

### Follow Up with Specifics

After initial analysis, ask targeted questions:
```markdown
1. Does [specific feature] relate to this issue?
2. Should we implement [alternative approach]?
3. What happens if [edge case scenario]?
4. How would this affect [related functionality]?
```

---

## Project Context & Setup

### Provide Comprehensive Context

**Essential Information:**
1. **Project structure** - Directory tree, key files
2. **Technology stack** - Languages, frameworks, libraries
3. **Build system** - How code is compiled/built
4. **Dependencies** - Package.json, requirements.txt, etc.
5. **Existing patterns** - Code style, naming conventions
6. **Related issues** - Similar problems solved before

### Use Attachments Effectively

**When working with AI:**
- Screenshot error messages from browser/console
- Attach relevant configuration files
- Include package manifests (package.json, etc.)
- Share relevant documentation snippets

### Leverage Workspace Features

```markdown
# Good practice: Reference files in workspace
"Check the error in src/modal.ts around line 220"

# Even better: Let AI search
"Search for all uses of 'calcWebviewSize' in the codebase"
```

---

## Code Analysis & Understanding

### Progressive Investigation

**Step 1: Broad Search**
```markdown
Search for files related to WebView functionality
```

**Step 2: Targeted Reading**
```markdown
Read the appendWebview() method in src/modal.ts
```

**Step 3: Context Expansion**
```markdown
Read the callers of appendWebview() to understand usage patterns
```

**Step 4: Related Code**
```markdown
Check how similar patterns are handled in other parts of the codebase
```

### Ask for Explanations

**Before making changes:**
```markdown
Explain what this code does:
[paste code block]

What are the potential issues with this pattern?
```

### Request Multiple Perspectives

```markdown
Analyze this error from:
1. Race condition perspective
2. Performance perspective  
3. User experience perspective
```

---

## Implementation Best Practices

### Request Detailed Plans First

**Before coding:**
```markdown
Create a detailed implementation plan with:
1. List of files to modify
2. Specific functions to change
3. Expected impact of each change
4. Testing strategy
5. Risk assessment
```

### Implement Incrementally

**❌ Don't do this:**
```markdown
Implement all 7 fixes at once
```

**✅ Do this:**
```markdown
Let's start with Fix #1 (the critical race condition fix).
After we verify that works, we'll move to Fix #2.
```

### Use Todo Management

```markdown
Create a todo list for:
1. Fix appendWebview() Promise handling
2. Update CSS injection patterns
3. Fix calcWebviewSize() async handling
4. Write tests
5. Update documentation

Mark them as you complete each step.
```

### Preserve Existing Patterns

**Good practice:**
```markdown
"Maintain the existing code style and patterns when making changes"
```

**Specify constraints:**
```markdown
"No breaking changes to the public API"
"Keep backward compatibility"
"Follow the existing TypeScript conventions"
```

---

## Documentation Standards

### Request Comprehensive Documentation

**For each fix, request:**
1. **What changed** - Specific code modifications
2. **Why it changed** - Root cause and rationale
3. **How it works now** - New behavior explanation
4. **Before/after comparison** - Side-by-side examples
5. **Impact analysis** - Performance, reliability, UX

### Use Markdown Effectively

**Structure documentation with:**
- Clear headings and hierarchy
- Code blocks with syntax highlighting
- Tables for comparisons
- Checklists for testing
- Callout boxes (✅ ❌ ⚠️ ) for emphasis

### Create Multiple Document Types

1. **Analysis Document** - Problem investigation and solutions
2. **Changelog** - Detailed record of changes made
3. **Best Practices** - Lessons learned for future
4. **Testing Guide** - How to verify changes

---

## Testing & Validation

### Define Test Scenarios Upfront

**Before implementation:**
```markdown
What test cases should we verify after these changes?

Include:
- Happy path scenarios
- Edge cases
- Stress tests
- Error conditions
```

### Create Testing Checklists

```markdown
- [ ] Single document export works
- [ ] Multiple document export (5+ files)
- [ ] Refresh button reliability
- [ ] CSS snippet loading
- [ ] Error handling
- [ ] Performance benchmarks
```

### Request Validation Strategies

```markdown
How can we verify that:
1. The race condition is truly fixed?
2. Performance hasn't degraded?
3. No regressions were introduced?
```

---

## Common Pitfalls to Avoid

### 1. Insufficient Context

**Problem:** AI makes assumptions based on incomplete information

**Solution:**
- Always provide error messages with stack traces
- Share relevant file contents
- Explain what you've already tried

### 2. Accepting First Solution

**Problem:** First solution might not be optimal

**Solution:**
- Ask for multiple approaches
- Request pros/cons analysis
- Consider long-term maintainability

### 3. Skipping Documentation

**Problem:** Future developers (including you) won't understand changes

**Solution:**
- Request detailed documentation
- Ask for inline code comments
- Create changelog entries

### 4. Not Validating TypeScript Types

**Problem:** AI might introduce type errors

**Solution:**
```markdown
"Ensure all TypeScript types are correct"
"Add proper type annotations to the Promise return value"
```

### 5. Over-Engineering

**Problem:** AI might suggest complex solutions for simple problems

**Solution:**
```markdown
"What's the simplest solution that fully solves the problem?"
"Are there any simpler alternatives to consider?"
```

### 6. Ignoring Build/Runtime Errors

**Problem:** Changes might break compilation or runtime

**Solution:**
```markdown
"Check if there are any compilation errors after these changes"
"Will this work with the existing build system?"
```

---

## Effective Prompting Strategies

### Use Specific Commands

**Effective patterns:**
```markdown
"Search for..." - Find relevant code
"Explain..." - Understand existing code
"Compare..." - Analyze differences
"List all..." - Enumerate instances
"Show me..." - Display specific content
"Create a plan for..." - Strategic planning
"Implement..." - Make changes
```

### Chain Requests Logically

**Good flow:**
1. Analyze the problem
2. Explain root causes  
3. Propose solutions
4. Compare approaches
5. Create implementation plan
6. Implement incrementally
7. Document changes
8. Define tests

### Provide Feedback Loops

```markdown
# After AI provides solution:
"This looks good, but I'm concerned about [specific aspect].
Can you address that?"

# Or:
"Great! Now let's apply the same pattern to [related code]"
```

### Set Explicit Constraints

```markdown
"Maintain backward compatibility"
"No new dependencies"
"Follow existing code style"
"Maximum 100 lines per function"
"Must work on Obsidian version X.Y+"
```

---

## Case Study: WebView DOM Fix

This section documents the actual process used to fix the WebView race condition in this plugin.

### Phase 1: Problem Analysis (Human → AI)

**Initial Request:**
```markdown
This obsidian plugin regularly causes the error below.
[Error message and stack trace]

In a new markdown file, explain the issue / error, how it is 
impacting the experience / performance, and potential resolutions 
for it with any pros and cons.
```

**AI Response:**
- Created comprehensive analysis document
- Identified root cause (race condition)
- Proposed 4 different solutions
- Recommended optimal approach
- Documented pros/cons of each

**Outcome:** ✅ Clear understanding of problem and solution paths

---

### Phase 2: Discovery Questions (Human → AI)

**Follow-up Questions:**
```markdown
I have a few followup questions:

1. Does the "Refresh" button relate to this?
2. Should we add a configurable delay setting?
3. Should we add error notifications in debug mode?
4. Will fixing this make preview accurate with CSS snippets?

Add your responses to the document as "Discovery" section.
Then update recommendations with a detailed implementation plan.
```

**AI Response:**
- Analyzed Refresh button code flow
- Explained why configurable delay is not recommended
- Designed debug error notification system
- Clarified preview accuracy improvements
- Updated recommendations with 4-phase implementation plan

**Outcome:** ✅ Comprehensive roadmap with code samples

---

### Phase 3: Implementation (Human → AI)

**Implementation Request:**
```markdown
Continue with the 2 critical priority fixes.

Summarize and record your efforts with detailed changelog 
in 2025-10_WebViewDOM-Fix.md

Also include any best practice / continuity of agentic 
coding resources in /_jpdocs/AGENTS/
```

**AI Actions:**
1. Created todo list with 7 items
2. Implemented Fix #1: appendWebview() Promise refactor
3. Implemented Fix #2: CSS injection async patterns
4. Implemented Fix #3: calcWebviewSize() improvements
5. Verified Fix #4: appendWebviews() already correct
6. Generated comprehensive changelog
7. Created this best practices guide

**Code Changes:**
- `src/modal.ts` - 3 functions modified
- Added Promise-based WebView initialization
- Removed arbitrary 500ms delay
- Fixed all async forEach anti-patterns
- Added 10-second timeout protection

**Outcome:** ✅ Production-ready fixes with full documentation

---

### Key Success Factors

1. **Structured Approach**
   - Analysis → Discovery → Planning → Implementation
   - Each phase built on previous findings

2. **Iterative Refinement**
   - Started with broad analysis
   - Narrowed to specific questions
   - Focused on critical fixes first

3. **Rich Context**
   - Provided error messages
   - Shared code screenshots
   - Explained user experience impact

4. **Clear Deliverables**
   - Specific document names and locations
   - Detailed changelog requirements
   - Best practices documentation

5. **Verification Points**
   - Testing checklists defined
   - Success metrics documented
   - Risk assessment included

---

## Templates for Common Scenarios

### Template: Bug Analysis Request

```markdown
# Bug Report

**Error Message:**
[Paste full error with stack trace]

**Frequency:** [Always / Sometimes / Rarely]

**User Impact:** [Description of how users are affected]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Request:**
Analyze this error and provide:
1. Root cause explanation
2. 3-5 potential solutions
3. Pros/cons of each approach
4. Recommended solution with implementation plan
```

### Template: Feature Implementation

```markdown
# Feature Request

**Goal:** [High-level objective]

**User Story:**
As a [user type], I want [capability] so that [benefit].

**Requirements:**
- Must: [Critical requirements]
- Should: [Important but not critical]
- Could: [Nice to have]

**Constraints:**
- [Technical constraints]
- [Performance requirements]
- [Compatibility requirements]

**Request:**
Create a detailed implementation plan including:
1. Files to modify
2. Functions to add/change
3. New dependencies (if any)
4. Testing strategy
5. Documentation needs
```

### Template: Code Review Request

```markdown
# Code Review

**Context:**
[What this code does]

**Concerns:**
1. [Specific concern about performance/correctness/etc]
2. [Another concern]

**Code:**
```[language]
[paste code]
```

**Request:**
Please review and provide:
1. Potential bugs or issues
2. Performance concerns
3. Best practice violations
4. Security considerations
5. Suggested improvements
```

### Template: Refactoring Request

```markdown
# Refactoring Request

**Current State:**
[Description of existing code structure]

**Problems:**
1. [Issue 1: e.g., hard to test]
2. [Issue 2: e.g., tight coupling]
3. [Issue 3: e.g., code duplication]

**Goals:**
1. [Improvement 1]
2. [Improvement 2]

**Constraints:**
- Must maintain backward compatibility
- No breaking API changes
- Keep existing functionality

**Request:**
Create refactoring plan with:
1. Step-by-step approach
2. Before/after code samples
3. Migration strategy
4. Testing approach
```

---

## Measuring Success

### Indicators of Effective AI Collaboration

✅ **Good Signs:**
- AI understands context without repeated explanations
- Solutions address root causes, not just symptoms
- Code follows project conventions
- Documentation is comprehensive and clear
- Implementation plan is actionable
- Edge cases are considered
- Testing strategy is included

❌ **Warning Signs:**
- AI keeps asking for the same context
- Solutions are overly complex
- Code style doesn't match project
- Documentation is superficial
- No consideration of trade-offs
- Missing error handling
- No testing guidance

### Continuous Improvement

**After each AI collaboration session:**
1. What worked well?
2. What could be improved?
3. What context was missing?
4. What documentation helped?
5. What would you do differently?

**Update this document with:**
- New patterns discovered
- Pitfalls encountered
- Effective prompting strategies
- Useful templates

---

## Tools & Resources

### Documentation to Provide

1. **README.md** - Project overview
2. **CONTRIBUTING.md** - Development guidelines
3. **package.json / dependencies** - Technology stack
4. **tsconfig.json** - TypeScript configuration
5. **Build scripts** - How to compile/run

### AI-Friendly Practices

1. **Clear file organization**
   ```
   src/          - Source code
   tests/        - Test files
   docs/         - Documentation
   _jpdocs/      - Development notes
   ```

2. **Descriptive naming**
   - Use clear, descriptive function names
   - Avoid abbreviations unless standard
   - Comment complex logic

3. **Type annotations**
   - Use TypeScript types consistently
   - Document function parameters
   - Specify return types

4. **Modular code**
   - Small, focused functions
   - Single responsibility principle
   - Clear separation of concerns

---

## Conclusion

Effective AI-assisted development requires:
1. **Clear communication** - Structured requests with context
2. **Iterative approach** - Build understanding progressively
3. **Documentation** - Capture decisions and rationale
4. **Validation** - Trust but verify all suggestions
5. **Learning** - Continuously improve collaboration patterns

By following these practices, AI coding assistants become force multipliers that accelerate development while maintaining code quality and project consistency.

---

## Appendix: Useful Prompts

### Investigation Prompts

```markdown
"Search for all files that handle [functionality]"
"Show me all usages of [function/class] in the codebase"
"Explain the data flow from [A] to [B]"
"What are the dependencies of [module]?"
```

### Analysis Prompts

```markdown
"Compare these two approaches: [A] vs [B]"
"What are the potential race conditions in this code?"
"Identify performance bottlenecks in [function]"
"List all error handling gaps in [module]"
```

### Implementation Prompts

```markdown
"Refactor this using [pattern/principle]"
"Add error handling for [scenario]"
"Optimize this for [performance/readability/maintainability]"
"Add TypeScript types to this JavaScript code"
```

### Documentation Prompts

```markdown
"Document this function with JSDoc comments"
"Create a README section explaining [feature]"
"Generate a changelog entry for these changes"
"Write inline comments explaining this algorithm"
```

### Testing Prompts

```markdown
"What edge cases should we test for?"
"Create a test plan for [feature]"
"Generate unit tests for [function]"
"What would cause this to fail?"
```

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Maintained By:** Project Contributors  
**Feedback:** Please update this document as you discover new best practices!
