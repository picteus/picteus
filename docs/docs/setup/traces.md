# Traces

Picteus provides two complementary forms of traces that report on what the application is doing: **activities**, a user-friendly real-time feed exposed directly in the front-end interface, and **logs**, a comprehensive low-level record of all internal events produced by every process involved in the application's execution. Understanding both forms is valuable both for following the application's normal operation and for diagnosing unexpected behavior.

---

## Activities

The front-end application exposes a dedicated "Activities" section, accessible from the main navigation. It presents a chronological stream of notable events occurring within the application — such as a repository scan completing, an image being processed by an extension, or a capability run finishing.

Activities are intended to be legible at a glance:

- they are sorted in reverse chronological order, so the most recent events appear at the top ;
- each activity entry carries a timestamp, a short human-readable description, and a status indicator ;
- when an activity originates from an extension — such as a tagger, an embedding encoder, or an AI pipeline — the extension's identity is displayed alongside the entry, making it immediately clear which component produced it.

Extensions can emit activities programmatically via the SDK, allowing them to surface meaningful progress milestones and outcome summaries directly in the user interface without requiring the user to inspect raw logs.

---

## Logs

Logs provide the comprehensive counterpart to activities. Where activities surface curated, user-facing events, logs capture everything — all internal state transitions, service calls, error traces, timing information, and extension output — at the level of detail necessary for thorough investigation.

### Accessing logs from the CLI

When the application is launched from the command line, all log output is written directly to the terminal's standard output. This is the most immediate way to observe the application's behavior in real time. Log messages are color-coded by verbosity level:

- **DEBUG** — blue ;
- **INFO** — green ;
- **WARN** — orange ;
- **ERROR** — red.

The console output is a unified stream merging log messages from all processes involved in the application:

- the **Electron** wrapper application ;
- the **back-end** NestJS server ;
- the **front-end** React application — this source can be suppressed independently via a dedicated CLI flag on the `run` command ;
- all active **extensions**, so that their output appears alongside the rest without requiring separate inspection.

Refer to the [Start](start.md) documentation for the complete list of available `run` command options, including the flag to suppress front-end application logs.

### Accessing logs via the Electron menu

When the application is running as a desktop application — started from its icon rather than the terminal — log output is not visible in a console. In that case, logs are accessible through the **"Logs Folder"** entry in the main "Picteus" application menu. Selecting it opens the operating system's file explorer pointed at the directory where log files are written:

- **Windows**: `C:\Users\<user>\AppData\Roaming\Picteus\logs` ;
- **macOS**: `/Users/<user>/Library/Logs/Picteus` ;
- **Linux**: `/home/<user>/.config/Picteus/logs`.

where `<user>` is the user's login.

### Log files

Log messages are persisted on disk in two files within that directory:

- `picteus-electron.log` — logs produced by the Electron wrapper application ;
- `picteus-back-end.log` — logs produced by the back-end server and the front-end application, written together.

### Log file rolling

Log files are rolled based on their size: when a log file reaches 1 MB, it is archived under a new filename with an integer suffix (e.g., `picteus-back-end.1.log`) and a fresh file is opened. This prevents log files from growing unbounded over extended usage sessions.

---

## The role of traces in troubleshooting

Activities and logs together form a complete observability surface for the application. Activities provide immediate, readable feedback on what the application is processing and which extensions are active. Logs provide the low-level detail necessary to understand precisely what occurred, when, and in which component — including error messages, stack traces, and timing data that activities deliberately omit for readability.

When the application behaves unexpectedly — whether an image is not being indexed, an extension is not responding, or a search returns surprising results — consulting the logs is the most reliable first step. The unified log stream, which merges all processes into a single chronological sequence, makes it straightforward to correlate events across the back-end, extensions, and the Electron layer without switching between separate sources.
