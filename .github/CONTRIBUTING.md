# Contributing to Picteus

Contributions to Picteus are welcome. Whether you are fixing bugs, implementing new features, enhancing documentation, or building extensions, your involvement helps improve the platform.

---

## Types of contributions

### Bug fixes
Pull Requests addressing bugs or defects are welcome. When submitting a fix:
- describe the bug and its root cause clearly in the Pull Request description ;
- include reproduction steps or test cases validating that the bug is fixed and that regressions are avoided.

If you discover a bug but, if possible, do not plan to submit a fix immediately, please file an issue using the [bug report template](https://github.com/picteus/picteus/issues/new/choose).

### New features
Pull Requests (PR) introducing new features — whether in the front-end user interface, the back-end server, or the desktop Electron layer — are welcome. Ensure that new features align with the overall project architecture and maintain codebase consistency.

### Extensions
Developing and contributing new extensions is especially encouraged:
- **Built-in inclusion**: extensions that are useful, robust, and well-designed may be integrated directly into the core repository as built-in extensions — located in `extensions/instances/` ;
- **Extensions marketplace**: an extensions marketplace is planned for future releases, which will provide a centralized repository for developers to publish and share their extensions with Picteus users.

Consult the [Picteus extension developer guide](https://picteus.github.io/picteus/docs/extensions/guide) for complete scaffolding and integration instructions.

## Pull Request workflow

To submit a contribution:

1. **Fork the repository**: create a personal fork of `picteus/picteus` on GitHub ;
2. **Clone your fork**: clone the repository locally on your machine ;
3. **Branch from `develop`**: create a dedicated topic branch branching from the `develop` branch:
   ```bash
   git checkout -b feature/my-feature develop
   ```
   or for a bug fix:
   ```bash
   git checkout -b fix/my-bug-fix develop
   ```
4. **Implement changes**: make your changes while adhering to the coding and documentation standards ;
5. **Verify locally**: ensure the application builds without errors and that existing automated tests pass ;
6. **Commit changes**: author clear, meaningful commit messages describing the intent of each change ;
7. **Submit a Pull Request**: push your branch to your fork and open a Pull Request targeting the **`develop`** branch of `picteus/picteus` ;
8. **Provide a descriptive summary**: detail what the Pull Request changes, why the change is necessary, and how it was verified.

## Coding standards & conventions

All contributions should follow the repository's coding guidelines — if not, a preliminary clean up will be performed before merging your PR — :

- **Allman-style braces**: opening curly braces `{` must always be placed on a new line for functions, classes, methods, and control flow blocks ;
- **Indentation**: use 2-space indentation throughout ;
- **Semicolons**: statements must terminate with a mandatory semicolon `;` ;
- **Quotes**: use double quotes `"` for strings, imports, and configuration files ;
- **No trailing commas**: trailing commas must not be used on object literals, arrays, or parameter lists ;
- **No single-letter or abbreviated identifiers**: never use `i`, `j`, `e`, `err`, `req`, `res`, `param`, or similar abbreviations. Always useful, descriptive domain identifiers such as `index`, `error`, `request`, `response`, or `parameter` ;
- **Explicit types**: declare explicit return types and parameter types on all TypeScript functions and methods ;
- **Documentation style**: documentation and comments must follow the guidelines in [`.agents/rules/doc-rules.md`](../.agents/rules/doc-rules.md) — sentence case headings, sparse capitalization, and em-dashes `—` for parenthetical thoughts.

## Open-source rules & etiquette

To ensure a smooth collaboration:

- **Focused Pull Requests**: keep Pull Requests atomic and focused on a single logical change or feature. Avoid bundling unrelated refactorings, formatting changes, or features into a single submission ;
- **Documentation**: update or add relevant documentation when altering existing behavior, adding settings, or introducing new APIs ;
- **Respectful communication**: participate in code review discussions respectfully, constructively, and professionally ;
- **Licensing compatibility**: ensure third-party libraries or dependencies introduced are compatible with the project license.

## Licensing

Picteus is licensed under the **GNU Affero General Public License v3 (AGPLv3)**. By contributing code, documentation, or other assets to Picteus, you agree that your contributions are licensed under the terms of the AGPLv3.
