# The "Picteus" project

Before you start cloning this repository, we just want to share a few words, and we hope it will raise your interest ;)

Here are hence some contextual pieces of information about this repository:
- it contains the public source code of the "Picteus" project ;
- "Picteus" is the "code name" for an ambitious project at the core of which reside images, and in the next step videos, — more explanation below ;
- it has been built by software engineers, passionate about images and videos assets, let's name them "we" ;
- "we" hope that this modest codebase has a future, and we work hard to make it happen ;
- "we" have too many ideas, and that's our problem, because as long as you do not choose a direction, all comes to over-abstracting all over the place.

# Whom

"We" are targeting 2 audiences:
1. the "end-users": they belong to the community of the professionals who are more or less intensively resorting to AI-based image generation solutions in their daily work. We want to offer them a really pleasant UX, which eases and makes them more performant during their images generation journey ;
2. the "developers": they are offering extensions to the "end-users", which makes the application much more powerful, because more helpful. We want to offer them a sweet spot for developing advanced routines for analyzing, organizing, annotating, images, through a simple and effective DX supported by an intuitive images-oriented API, so that they really concentrate on their features.

The personas regarding the "end-users" are multiple, because some are mostly using prompt-based generation, some are using advanced workflows.

# What

Picteus is about offering an application which is supposed to solve pain points for the community of professionals who are more or less intensively resorting to AI-based image generation solutions in their daily work. It gives control to their data. Ultimately, it is a cockpit from which the professional starts her generative journey.

From a theoretical point of view, it is about building a constrained ecosystem dealing with image assets, a limited, modest and constrained but steady Operating System for AI-generated images, equipped with a User Interface where all the effort should be focused on delivering comfort to the end-user, at the core of which is an ambitious images search engine, offering the opportunity to tag and extend all the assets' metadata.

Technically speaking:

- this is a piece of software, you can also call it an application, some may use the "platform" term ;
- it is installed on your laptop or desktop — no mobile adaptation is scheduled for now —, the idea being to provide maximum comfort to users, so that they benefit from OS specific integrated features and native "touch" ;
- it is Electron-based, hence working on most OS including Windows, macOS and Linux ;
- it can run in a Docker-like container, hence it may be installed on a server, but you will properly configure the mounted filesystem volume if you want long-term persistence ;
- it hosts locally 2 databases:
  1. a regular SQL one, SQLite for the time being, but it is forecast with little effort to plug to other implementations — such as PostgreSQL as first candidate — in order to reference the referenced assets, and to persist in organizational and searchable metadata, offering a framework of data attached to the image, including its generation "recipe", accessible and portable with any SQL client ;
  2. a vector database, [Chroma DB](https://docs.trychroma.com), enabling to store images and text embeddings associated with the assets, offering advanced features such as similarity computation ;
- it exposes an API complying to OpenAPI v3.1, so that any client library may be generated to interact with the core of the platform, and so that you benefited from a SwaggerUI to interact with it, and this API is secured by managed scoped based API keys, so that the end-user's assets are safe and the end-user keeps control over what the extensions are allowed to perform, because extensions are restricted in terms of API — extension's permissions assessed to the end-user at installed time are on the list ;
- its feature and UI is extensible via plugins / add-ons named "extensions", and for that a TypeScript and Python SDK is available supported by 2 locally hosted runtimes (ava is next on the list), Python and Node.js — initially downloaded and installed in an isolated location so that it never interferes with other software —, so that anyone can author an extension and install it ;
  1. some extensions download (tensor files) and run ML models locally to accomplish various tasks, ranging from computing metadata to image generation, including image processing and edition — for instance [vit-gpt2-image-captioning](https://huggingface.co/nlpconnect/vit-gpt2-image-captioning), [briaai/RMBG](https://huggingface.co/briaai/RMBG-1.4), ["stabilityai/stable-diffusion-x4-upscaler"](https://huggingface.co/stabilityai/stable-diffusion-x4-upscaler) —, enabling the end-user's data to stay local, lowering the barrier of integrating and interacting with any type of ML model in a very fast and easy way ;
  2. some extensions are collaborating with local AI-based systems, such as Vision Languages Models (LVM) — for instance [LLaVA](https://llava-vl.github.io), [Qwen](https://huggingface.co/Qwen) —, image generation models — for instance Stable Diffusion, Flux — , image generation solutions — for instance [ComfyUI](https://github.com/Comfy-Org/ComfyUI), [Automatic1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui), offering to leverage advanced locally running models ;
  3. some extensions are collaborating with outer AI-based systems on the same spectrum of features — for instance Gemini, Midjourney, Replicate, making it possible to resort to their API to accomplish any kind of task involving images, or to observe the end-user's behavior and retrieve automatically their generated assets along with their "recipe" thanks to Chromium extensions hosted in the Electron application or installed on Chrome-based browsers ;
- it hosts an MCP server via a dedicated extension, offering a natural language based interaction with the whole API and making it possible to be involved with AI agents and any LLM client application supporting the Model Context Protocol — for instance [Cherry Studio](https://github.com/CherryHQ/cherry-studio).

# Why

- Because there are more and more professionals involved in image and video generation through AI, a fast-growing ecosystem of solutions available, but the end-user is left alone when it comes to retrieve, organizing her generated assets and have access to their "recipe" in a searchable and centralized way, because they lose a lot of time, because they are not properly equipped.
- Because companies busy building amazing generation models do not dedicate enough time to build a UI with an efficient UX, which is connected to the outer world.

Picteus aims at building a bridge between end-users and AI-based models working on images by offering in a single place all the connections to outer solutions, be they models run by the applications, solutions running in the local machine or solutions running remotely.

# How

The development strategy of Picteus consists in offering to the developers' ecosystem the opportunity to add features through extensions. The framework is made of a central API supported by 2 databases which store all kinds of structured or unstructured data on assets, each extension can interact with it and can manage those metadata and can add commands to the front-end application.

Picteus offers a backbone, the scaffolding and all the heavy lifting for being extensions enriching its features. Extensions lower the barrier when it comes to offering new features, it enables any developer to introduce new features seamlessly integrated into the application with no dependence over the core team in charge of the backbone. Extensions lower friction and reduce viscosity.

# When

This is already happening now. Even if the front-end application is far from polished and complete enough, end-users can already benefit from a search engine on their local image assets. Even if the SDKs are still modest, developers can already start developing new extensions.

We have a large roadmap: we will keep on offering new features on the core platform, enrich the UI, improve the UX, and keep on making it possible to have the platform connected with other systems.

# Who

We are a team of passionate software engineers, designers and product managers.
