# Architecture

This document specifies what are the components of the application.

## Components

The application is made of six components:
1. "shared": a compound component which exposes modules used across different parts of the application:
   - a "core" TypeScript module which is injected as a dependency to the "back-end", "front-end" and "electron" components ;
   - a "back-end" Node.js module which is injected as a dependency to both the "back-end" and "electron" components ;
   - a "front-end" TypeScript module which is injected as a dependency to both the "front-end" and "electron" components ;
   - a "specification-factory" module containing TypeSpec grammar specifications and code emitters for ViewKit, React views, Python and TypeScript SDK data models, and JSON Schemas ;
2. "back-end": the Node.js HTTP server back-end application, capable of running extensions ;
3. "extensions/sdk": the Python and TypeScript SDKs ;
4. "extensions/instances": the built-in extensions for the back-end ;
5. "front-end": the React.js web front-end application ;
6. "electron": the wrapping Electron application which embeds the "back-end" and "front-end" previous components.
