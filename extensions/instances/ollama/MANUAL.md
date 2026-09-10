# Summary
This extension offers a bridge between Picteus and Ollama.

It offers 3 features:
- "auto-captioning": everytime an image is indexed in Picteus, Ollama will be requested to compute its caption, which is stored and available in the image detail page ;
- "auto-tagging": everytime an image is indexed in Picteus, Ollama will be requested to compute the tags which best fit for it, which are stored and available in the image detail page ;
- an "Ask question" command which proposes to type a question, which will be submitted to Ollama, and to display the answer.

This extension requires that you have a running Ollama instance and that the settings are properly configured. When an image is indexed but Ollama is not running, the "auto-captioning" and "auto-tagging" are disabled.

You do not need to install the Vision Language models, Picteus will perform that action when required.

# Prerequisites
[Ollama](https://ollama.com) must be installed and must be up and running.

# Settings
- The `Ollama URL` indicates the URL at which the Ollama server listens to. By default, the server listens to `http://127.0.0.1:11434`.
- Some parameters indicate whether Ollama should be requested for every indexed image for computing its caption, for "auto-captioning" ; you can decide what Vision Language (VL) to use, and you can tune the question which is sent to it.
- Some parameters indicate whether Ollama should be requested for every indexed image for computing its tags for "auto-tagging" ; you can decide what Vision Language (VL) to use, and you can tune the allowed tags.

# Commands

## askQuestion
This opens a dialog box which enables to choose a Vision Language model, type a question that will be submitted to Ollama and the answer will be displayed in a dialog box.
