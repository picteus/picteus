# Troubleshooting

When encountering an unexpected behavior, processing failure, or extension issue in Picteus, a structured diagnostic workflow enables you to rapidly isolate the root cause. This guide outlines the progressive diagnostic steps — starting with the high-level activity feed, moving to consolidated log files and Chromium Developer Tools, and ultimately reporting unresolvable issues to the project issue tracker.

---

## Progressive diagnostic workflow

Troubleshooting in Picteus follows a progressive inspection workflow:

1. **Inspect front-end activities in the UI**: check real-time milestone events and extension execution status ;
2. **Review application logs**: examine consolidated back-end, Electron, and extension log output on disk or in the CLI ;
3. **Inspect Developer Tools in the desktop application**: analyze client-side JavaScript runtime errors and network exchanges ;
4. **File an issue on the GitHub tracker**: if the issue is unresolvable or represents a bug, report it with supporting traces.

---

## 1. Inspecting front-end activities

The first step in diagnosing an issue is to consult the **"Activities"** feed directly in the user interface, accessible from the main navigation sidebar.

If a task failed or stalled, the activity entry often surfaces the high-level error message without requiring inspection of raw log files.

For complete details on the activity feed, refer to the [Activities](traces.md#activities) section in the Traces documentation.

---

## 2. Reviewing application logs

When the activity feed does not provide sufficient detail, consult the comprehensive application logs. Logs capture all low-level state transitions, service invocations, error stack traces, and extension outputs across all running processes.

- **Desktop application**: open the log directory using the **"Logs Folder"** entry in the main "Picteus" application menu ;
- **Command-line execution**: observe the color-coded unified log stream output directly to the terminal standard output.

Refer to the [Logs](traces.md#logs) section in the Traces documentation for directory paths on each operating system, log file breakdowns, log file rolling behavior, and [CLI launch options](start.md#cli).

---

## 3. Inspecting front-end logs via Developer Tools

If you experience user interface rendering issues, visual glitches, unresponsive buttons, or network disconnections within the desktop application, inspect the front-end runtime state using the embedded Chromium Developer Tools.

Open the Developer Tools panel to inspect client-side JavaScript console errors and network exchanges.

Refer to [Accessing front-end logs via Chromium Developer Tools](traces.md#accessing-front-end-logs-via-chromium-developer-tools) for platform shortcuts and details on diagnostic tabs.

---

## 4. Extension-specific troubleshooting

If the issue specifically relates to an extension failing to install, start, or respond to events:

- **Manifest validation**: ensure that `manifest.json` complies strictly with the [`manifest-v3.schema.json`](https://picteus.github.io/picteus/jsonschema/manifest-v3.schema.json) contract. Refer to [Manifest](../extensions/reference/manifest.md) for schema details ;
- **Troubleshooting checklist**: consult the [Extension troubleshooting checklist](../extensions/guide.md#troubleshooting-checklist) for common symptoms — such as missing command buttons or unhandled event hooks ;
- **Debugging unpacked extensions**: run the extension in debug mode from your IDE as an unpacked extension. Refer to [Unpacked extensions](../extensions/unpacked.md) for development workflows.

---

## 5. Filing an issue on GitHub

If you have followed the diagnostic steps above and identified a software bug, an unexpected crash, or an issue that cannot be resolved locally, submit a ticket to the project issue tracker.

### Issue tracker URL

Submit new bug reports on the official GitHub repository:

[https://github.com/picteus/picteus/issues](https://github.com/picteus/picteus/issues)

### Information to include in your ticket

To help maintainers reproduce and resolve the problem efficiently, please include:

1. **Environment details**:
   - operating system and version — e.g., macOS Sonoma 14.5, Windows 11 23H2, Ubuntu 24.04 ;
   - Picteus application version — visible in the "About Picteus" dialog or root package configuration ;
2. **Problem description**:
   - a clear and concise summary of the observed behavior ;
   - the expected behavior ;
3. **Step-by-step reproduction instructions**:
   - the exact sequence of actions taken before the issue occurred ;
   - sample images or file types involved — if applicable and non-confidential ;
4. **Relevant log excerpts**:
   - pertinent error lines and stack traces from `picteus-back-end.log` or `picteus-electron.log` ;
   - screenshots of relevant error messages or Developer Tools console errors ;
5. **Extension details** — if applicable:
   - name and version of any extension involved in the failure.
