export default {
  errorBoundary: {
    message: "Something went wrong!!!",
    button: "Try again"
  },
  splashscreen: {
    applicationName: "Picteus",
    tagline: "Local-First Image Intelligence",
    loading: "Loading application…",
    statusInitializing: "Initializing local runtime",
    stepsCompleted_one: "{{count}} step completed",
    stepsCompleted_other: "{{count}} steps completed",
    firstStartNotice: "The first time the application starts, it may take between 2 and 5 minutes to initialize.",
    features: {
      spotlight: {
        badge: "Quick Actions",
        title: "Jump anywhere with the Universal Action Center",
        description: "Once loaded, press ⌘K (or Ctrl+K) to navigate screens, search recent assets, toggle themes, or trigger commands."
      },
      localFirst: {
        badge: "Local-First",
        title: "Structured metadata & vector similarity search",
        description: "The application combines local SQLite persistence with ChromaDB embeddings for instant faceted filtering and visual discovery."
      },
      integrations: {
        badge: "AI Ecosystem",
        title: "Orchestrate local & cloud creative runtimes",
        description: "Connect ComfyUI, Automatic1111, Ollama, Claude, Gemini, Replicate, and C2PA content credentials through isolated extensions."
      },
      extensions: {
        badge: "Extensible & MCP",
        title: "Build custom plugins & connect AI agents",
        description: "Author Python or TypeScript extensions with the SDK and expose your image catalog to AI agents via MCP."
      }
    },
    links: {
      documentation: {
        title: "Documentation",
        description: "Guides, manuals & extension SDK"
      },
      github: {
        title: "GitHub",
        description: "Source code, releases & issues"
      },
      discord: {
        title: "Discord",
        description: "Join the community & get support",
        onlineCount: "{{count}} online"
      }
    }
  },
  menu: {
    explorer: "Explorer",
    desk: "Desk",
    imageCommands: "Image commands",
    repositories: "Repositories",
    collections: "Collections",
    extensions: "Extensions",
    activity: "Activity",
    test: "Test",
    settings: "Settings"
  },
  actionsCenter: {
    searchOrJump: "Jump to or run an action…",
    placeholder: "Jump to, search images, run a command…",
    imageTab: "Image",
    routes: {
      explorer: "Explorer",
      desk: "Desk",
      repositories: "Repositories",
      collections: "Collections",
      extensions: "Extensions",
      activity: "Activity",
      settings: "Settings"
    },
    sections: {
      jumpTo: "JUMP TO",
      extensions: "EXTENSIONS",
      commands: "COMMANDS",
      quickToggles: "QUICK TOGGLES",
      recentImages: "RECENT IMAGES"
    },
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    noResults: "No results found",
    navigate: "navigate",
    select: "select",
    resultsCount_zero: "0 results",
    resultsCount_one: "1 result",
    resultsCount_other: "{{count}} results"
  },
  titles: {
    warning: "Warning",
    error: "Error"
  },
  message: {
    idCopied: "The image ID has been successfully copied to your clipboard.",
    fileProcessing:
      "File processing is in progress and may take some time. Please do not close the window.",
    toastSuccessTitle: "Operation successful",
    toastProgressTitle: "Operation ongoing",
    toastCancelTitle: "Operation cancelled",
    toastWarningTitle: "Warning",
    toastFailureTitle: "Operation failed",
    notFoundImage: "The image no longer exists"
  },
  errors: {
    imageTitle: "Loading error",
    imageDetail: "An error occurred: could not load the image visual.",
    imageCondensed: "Could not load the visual",
    imageNotAvailable: "Image not available anymore"
  },
  keyShortcuts: {
    escape: "ESC"
  },
  field: {
    noValue: "—",
    value: "Value",
    id: "ID",
    parent: "Parent",
    url: "URL",
    search: "Search",
    file: "File",
    folder: "Folder",
    comment: "Comment",
    name: "Name",
    sourceUrl: "Source",
    state: "State",
    date: "Date",
    createdOn: "Created on",
    modifiedOn: "Modified on",
    importedOn: "Imported on",
    updatedOn: "Updated on",
    inceptionDate: "Inception date",
    dimensions: "Dimensions",
    repository: "Repository",
    repositories: "Repositories",
    properties: "Properties",
    essentials: "Essentials",
    icon: "Icon",
    size: "Size",
    maximum: "Maximum",
    minimum: "Minimum",
    from: "From",
    to: "To",
    any: "Any",
    format: "Format",
    formats: "Formats",
    features: "Features",
    tags: "Tags",
    location: "Location",
    entity: "Entity",
    action: "Action",
    payload: "Payload",
    contextId: "Context",
    description: "Description",
    message: "Message",
    version: "Version",
    extension: "Extension",
    collections: "Collections",
    categories: "Categories",
    imageCount: "Image count",
    source: "Source",
    logLevel: "Level",
    binarySize: "Binary size",
    width: "Width",
    height: "Height",
    generatorPlaceholder: "Choose a generator",
    distance: "Distance",
    runtimes: "Runtimes",
    runtime: "Runtime",
    events: "Events",
    capabilities: "Capabilities",
    commands: "Commands",
    schemaVersion: "Schema",
    software: "Software",
    aspectRatio: "Aspect ratio",
    modelTags: "Models",
    assetIds: "Assets",
    prompt: "Prompt",
    instructions: "Instructions",
    manual: "Manual",
    prerequisites: "Prerequisites",
    settings: "Settings",
    author: "Author",
    image: "Image",
    images: "Images",
    process: "Server",
    details: "Details",
    status: "Status",
    enabled: "Enabled"
  },
  filters: {
    title: "Filters",
    search: "Search",
    searchTextIn: "Search text in",
    inName: "Image name",
    inMetadata: "Image metadata",
    inFeatures: "Image features",
    allValues: "All values",
    pickAnOption: "Pick an option",
    collection: "Collection",
    selectAll: "Select all",
    clearAll: "Clear all",
    noMatching: "No matching",
    noConditions: "No conditions. Click to add.",
    addCondition: "Add condition"
  },
  sort: {
    ascending: "Ascending",
    descending: "Descending",
    sortBy: "Sort by",
    sortedBy: "Sorted by",
    sortOrder: "Sort order",
    sortByPlaceholder: "Choose sorting criteria",
    sortOrderPlaceholder: "Choose sorting order"
  },
  viewMode: {
    cards: "Cards",
    list: "List"
  },
  button: {
    add: "Add",
    remove: "Remove",
    edit: "Edit",
    find: "Find",
    open: "Open",
    copy: "Copy",
    copied: "Copied",
    externalLinkOpen: "Show on filesystem",
    clearAll: "Clear all",
    clearSearch: "Clear search",
    synchronize: "Synchronize",
    delete: "Delete",
    apply: "Apply",
    update: "Update",
    save: "Save",
    send: "Send",
    run: "Run",
    view: "View",
    install: "Install",
    create: "Create",
    uninstall: "Uninstall",
    confirm: "Confirm",
    pause: "Pause",
    start: "Start",
    resume: "Resume",
    settings: "Settings",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    close: "Close",
    refresh: "Refresh",
    retry: "Retry",
    show: "Show",
    hide: "Hide",
    addToSelection: "Add to selection",
    removeFromSelection: "Remove from selection"
  },
  widgets: {
    collectionPlaceHolder: "Select a collection",
    repositoryPlaceHolder: "Select a repository",
    tagsPlaceHolder: "Select tags",
    filePlaceHolder: "Select a file",
    directoryPlaceHolder: "Select a directory"
  },
  imagePicker: {
    defaultTitleSingle: "Pick an image",
    defaultTitleMultiple: "Pick images",
    pickTitleSingle: "Pick the image for {{command}}",
    pickTitleMultiple: "Pick the images for {{command}}",
    tabRecent: "Recent images",
    recentCaptionSingle: "Images you opened recently, newest first. Pick one.",
    recentCaptionMultiple: "Images you opened recently, newest first. Pick one or more.",
    recentFallbackCaption: "Nothing opened yet, so here is your whole library, newest first.",
    emptyLibraryTitle: "No images yet",
    emptyLibraryDescription: "Add images to a repository and they will show up here.",
    emptyMatchingTagsTitle: "No matching images",
    emptyMatchingTagsDescription: "No images match the required tag(s): {{tags}}.",
    noCollectionsTitle: "No collections yet",
    noCollectionsDescription: "Make one in Explore and it shows up here.",
    emptyCollectionTitle: "No images in this collection",
    emptyCollectionDescription: "Add images to this collection in Explore and they will show up here.",
    emptyCollectionMatchingTagsDescription: "No images in this collection match the required tag(s): {{tags}}.",
    selectedCount: "{{count}} selected",
    clear: "Clear",
    emptyFieldSingle: "No image selected",
    emptyFieldMultiple: "No images selected",
    pickSingle: "Pick image…",
    pickMultiple: "Pick images…",
    change: "Change…",
    overflowCount: "+{{count}}"
  },
  emptyImages: {
    title: "No available image",
    titleNoEmbedding: "No image",
    titleAllRepositoriesDisabled: "All repositories are disabled",
    titleRepositoryDisabled: "This repository is disabled",
    titleImageRepositoryDisabled: "Repository is disabled",
    description:
      "There are currently no images corresponding to your search criteria. Please try again with different criteria.",
    descriptionNoRepository:
      "There are currently no images stored in your repositories. Please upload or add images to your repositories to see them listed here.",
    descriptionAllRepositoriesDisabled:
      "All your configured repositories are currently disabled. Enable at least one repository to see its images here.",
    descriptionRepositoryDisabled:
      "Images in this repository are hidden while it is disabled. Enable the repository to browse its images.",
    descriptionImageRepositoryDisabled:
      "This image belongs to a disabled repository. Enable the repository to view it again.",
    descriptionNoData:
      "There is no more image in the collection or in the initial set.",
    descriptionNoEmbedding: "There is no image displayed, because no embedding was computed so far: install or enable an extension which compute embeddings.",
    buttonTextNoRepository: "Manage repositories",
    buttonTextEnableRepository: "Enable repository"
  },
  emptyDesk: {
    title: "Desk is empty",
    description: "There are currently no tabs on the desk. Generated images and interactive extension results will appear here as tabs."
  },
  deskTabsMenu: {
    allTabs: "All tabs",
    searchPlaceholder: "Search open tabs",
    current: "Current",
    noTabsFound: "No matching tabs found",
    noTabMatches: "No tab matches \"{{criterion}}\"",
    searchDescription: "Search looks at tab titles and subtitles.",
    tabCount: "{{count}} tabs",
    tabCountSingle: "1 tab",
    filteredTabCount: "{{filteredCount}} of {{totalCount}} tabs",
    navigate: "navigate",
    open: "open"
  },
  deskTabHeader: {
    tabDetails: "Details"
  },
  deskTabDetails: {
    title: "Details",
    description: "Description",
    details: "Details",
    openedBy: "Opened by"
  },
  emptySelectedImages: {
    title: "No selected image",
    description: "There are currently no images selected."
  },
  emptyRepositories: {
    title: "No repository",
    description:
      "It seems there are no repositories configured at the moment. Please add a repository to start managing your images.",
    buttonText: "Add repository"
  },
  emptyCollections: {
    title: "No collection",
    description:
      "It seems there are no collection configured at the moment. Please add a collection to better manage your images.",
    buttonText: "Add collection"
  },
  emptyExtensions: {
    title: "No installed extension",
    description:
      "It seems there are no extensions configured at the moment. Please add an extension to start enhancing the app's features.",
    buttonText: "Install extension"
  },
  pagination: {
    results: "results",
    of: "of",
    resultsPerPage: "Show {{count}} entries "
  },
  fieldError: {
    wrongFileFormat: "Invalid file format. Please upload a {{extensions}} file",
    empty: "This field can not be empty",
    badUrl: "The URL is not valid"
  },
  addOrUpdateRepositoryModal: {
    successAdd: "The repository has been successfully added",
    successUpdate: "The repository has been successfully updated",
    errorAdd: "An error occurred while adding the repository",
    errorUpdate: "An error occurred while updating the repository",
    addTitle: "Add repository",
    updateTitle: "Edit repository",
    addButton: "Add repository",
    noFolderSelected: "No folder selected",
    chooseFolder: "Choose",
    changeFolder: "Change",
    folderHint: "Includes images in subfolders.",
    sameFolderConflict: "A repository named \"{{name}}\" already uses this folder.",
    namePlaceholder: "ComfyUI",
    nameAddHint: "This is how it appears in the application. Pick a name you'll recognise, like \"ComfyUI\". You can rename it any time.",
    nameEditHint: "This is how it appears in the application. The folder name on disk does not change.",
    commentPlaceholder: "What is in this repository?",
    whatHappensNext: "The application indexes the images in this folder and keeps watching it for new ones. Your files stay where they are. Supported: PNG, JPEG, WEBP, GIF, AVIF and HEIF."
  },
  addOrUpdateCollectionModal: {
    successAdd: "The collection has been successfully added",
    successUpdate: "The collection has been successfully updated",
    errorAdd: "An error occurred while adding the collection",
    errorUpdate: "An error occurred while updating the collection",
    addTitle: "Add collection",
    updateTitle: "Edit collection",
    namePlaceholder: "My collection",
    commentPlaceholder: "All the images generated by MidJourney"
  },
  installExtensionModal: {
    successAdd: "The extension has been successfully installed",
    errorAdd: "An error occurred while installing the extension",
    title: "Install extension",
    subtitle: "Add an extension from a .zip, .tar.gz or .tgz file, or from a URL.",
    confirmMessage: "Are you sure you want to install the extension from '{{source}}'?",
    sourceFile: "File",
    sourceUrl: "URL",
    urlLabel: "URL of the extension file",
    urlPlaceholder: "https://example.com/extension.zip",
    extensionGuideHint: "Looking for extensions or building your own? Read the extension guide",
    dropzone: {
      select: "Choose a file",
      dragAndDrop: "Drop the extension file here",
      acceptedExtensions: ".zip, .tar.gz or .tgz",
      acceptedFormatsList: "ZIP, GZIP, or TAR.GZ"
    }
  },
  updateExtensionModal: {
    successAdd: "The extension has been successfully updated",
    errorAdd: "An error occurred while updating the extension",
    subtitle: "Install another version of {{name}} from a .zip, .tar.gz or .tgz file, or from a URL.",
    installedVersionLabel: "Installed version",
    confirmMessage: "Are you sure you want to update the extension '{{name}}'?",
    warning:
      "You are about to update the extension with ID : <strong>{{name}}</strong>. This will terminate all related processes, which may result in data loss. Please ensure you understand the implications before proceeding."
  },
  marketplaceUpdateModal: {
    subtitle: "A newer version is ready in the marketplace.",
    installedLabel: "Installed",
    newVersionLabel: "New version",
    latestBadge: "Latest",
    stopWarning: "{{name}} stops while it updates, so anything it's running right now ends."
  },
  createExtensionModal: {
    success: "The extension has been successfully generated",
    error: "An error occurred while generating the extension",
    errorLoadConfiguration: "Failed to load the application configuration",
    title: "Create an extension",
    subtitle: "The application generates a starter extension and installs it, so you can edit its files with your code editor or an AI agent.",
    readExtensionGuide: "Read the extension guide",
    unpackedExtensionsDirectoryPathNotDefinedAlert: "The unpacked extensions directory path is not configured. You will be prompted to select a directory manually upon submission.",
    extensionAlreadyExistsError: "An extension with the identifier '{{id}}' already exists.",
    sections: {
      about: "About",
      technical: "Technical"
    },
    fields: {
      id: {
        description: "Made from the name. Letters, numbers, - _ and . only.",
        placeholder: "my-extension",
        invalid: "The identifier must be 1-32 characters long and contain only lowercase letters, uppercase letters, numbers, dashes, underscores, and dots."
      },
      version: {
        description: "Semver format (e.g. 0.1.0)",
        placeholder: "0.1.0",
        invalid: "The version must be 5-32 characters long and follow the semver convention."
      },
      name: {
        placeholder: "My Extension",
        invalid: "The name must be 1-128 characters long and contain only letters, numbers, spaces, and standard symbols."
      },
      description: {
        placeholder: "Computes tags on images.",
        invalid: "The description must be 1-1024 characters long."
      },
      categories: {
        placeholder: "Add a category"
      },
      author: {
        placeholder: "Your name",
        invalid: "The author must be 1-128 characters long."
      }
    }
  },
  extensionConfiguration: {
    errorLoading: "An error occurred while loading the extension settings",
    errorSaving: "An error occurred while saving the extension settings",
    successSaving: "The extension settings have been successfully saved",
    saveErrorTitle: "Couldn't save settings",
    reset: "Reset",
    errorResetting: "An error occurred while resetting the extension settings",
    successResetting: "The extension settings have been successfully reset",
    prerequisitesHeading: "Before you start",
    discardTitle: "Discard unsaved changes?",
    unsavedCount_zero: "No unsaved changes",
    unsavedCount_one: "1 unsaved change",
    unsavedCount_other: "Not saved • {{count}} unsaved changes",
    instructions: {
      batchTitle: "Batch configuration",
      batchDescription: "Define instructions to quickly apply to all enabled AI models below.",
      applyToAll: "Apply to all enabled models",
      commonCaptionQuestion: "Caption question template",
      commonEligibleTagsQuestion: "Eligible tags question template. Should contain the {{tags}} string.",
      commonEligibleTags: "Eligible tags template",
      enableCaptions: "Enable captions",
      isAuto: "Run automatically on image indexing",
      captionQuestion: "Caption question",
      captionQuestionPlaceholder: "Describe this image in one concise sentence in plain text.",
      changedBadge: "Changed",
      enableEligibleTags: "Enable eligible tags",
      eligibleTagsQuestionPlaceholder: "Which of the candidate following tags best describe this image: {{tags}}?",
      eligibleTags: "Candidate tags",
      eligibleTagsPlaceholder: "Type a tag and press Enter…",
      eligibleTagsOnSummary_one: "Eligible tags • on • 1 tag",
      eligibleTagsOnSummary_other: "Eligible tags • on • {{count}} tags",
      eligibleTagsOffSummary: "Eligible tags • off",
      enableEmbeddings: "Enable embeddings",
      configuredModelsTitle: "Configured models",
      availableModelsTitle: "Available models",
      allModelsConfigured: "All available AI models are currently configured.",
      noMatchingModels: "No matching models found.",
      deleteModel: "Remove model configuration",
      searchModelsPlaceholder: "Search available models…",
      loadErrorTitle: "Couldn't load {{name}}'s models"
    }
  },
  extensionPage: {
    tabs: {
      overview: "Overview",
      aiModels: "AI models"
    },
    unsavedConfirmTitle: "Unsaved changes",
    unsavedConfirmMessage: "You have unsaved changes. Discard them and leave?",
    overview: {
      whatItDoes: "What it does",
      readFullManual: "Read the full manual",
      checkSettings: "Check settings →",
      runsOnItsOwn: "Runs on its own",
      runsOnItsOwnSummaryNone: "No AI models are configured yet. Configure models to generate captions, tags, or embeddings for your images.",
      runsOnItsOwnSummaryManualOnly: "{{configuredCount}} model(s) configured. Auto-indexing is currently off, so models only run when you trigger synchronization.",
      runsOnItsOwnSummaryAuto: "{{configuredCount}} model(s) configured, with {{autoCount}} running automatically when new images are indexed.",
      manageAiModels: "Manage AI models",
      computesLabel: "Computes",
      computesCaptions: "Captions",
      aiModelsMoreAvailable: "{{count}} more available",
      aiModelsNoneConfigured: "No models configured yet.",
      aiModelLine: "{{model}} • {{capabilities}}",
      aiModelCaptionsAuto: "captions on new images",
      aiModelCaptionsManual: "captions when you run them",
      aiModelTagsAuto: "tags on new images",
      aiModelTagsManual: "tags when you run them",
      aiModelEmbeddingsAuto: "embeddings on new images",
      aiModelEmbeddingsManual: "embeddings when you run them"
    },
    commands: {
      headerNote: "What each command does, word for word from the extension.",
      headerNoteSingle: "What this command does, word for word from the extension.",
      scopeAll: "All",
      scopeProcess: "No selection",
      scopeImage: "On one image",
      scopeImages: "On one or more images",
      groupProcessTitle: "Runs without a selection",
      groupImageTitle: "Runs on one image",
      groupImageCaption: "You pick one image first.",
      groupImagesTitle: "Runs on one or more images",
      groupImagesCaption: "You pick the images first.",
      emptyLibraryNotice: "Index some images in Explore first.",
      targetOneImage: "One image",
      targetImages: "One or more images",
      asksFor: "Asks for: {{parameters}}",
      optionalParameter: "{{name}} (optional)",
      runDisabledPaused: "Enable {{name}} to run commands.",
      runDisabledStarting: "{{name}} is starting…",
      runDisabledError: "{{name}} is in an error state.",
      runDisabledNotReady: "{{name}} is not ready yet.",
      emptyFiltered: "No commands match your search.",
      resetFilters: "Reset filters"
    },
    settings: {
      lookingForModelsTitle: "Looking for model settings?",
      lookingForModelsDescription: "Caption questions, eligible tags, and auto-indexing are configured per AI model.",
      goToAiModels: "Go to AI models →",
      resetConfirmTitle: "Reset settings",
      resetConfirmMessage: "Reset {{name}}'s settings back to their default values?"
    },
    aiModels: {
      missingSettingsTitle: "Add your required settings to see {{name}}'s models",
      missingSettingsDescription: "{{name}} lists its models only once its required settings are configured. No images are sent until you add a model and turn it on.",
      noModelsAvailableTitle: "No models available from {{name}}",
      noModelsAvailableWithSettingsDescription: "{{name}} hasn't listed any models yet. Check its settings so the application can load them. No images are sent until you add a model and turn it on.",
      noModelsAvailableDescription: "{{name}} hasn't listed any AI models yet.",
      noModelsDisabledTitle: "Enable {{name}} to see its models",
      noModelsDisabledDescription: "{{name}} is currently disabled. Turn it on to load its available AI models.",
      openSettings: "Open Settings",
      emptyTitle: "No AI models set up yet",
      emptyDescription: "Add a model from {{name}} to configure caption questions, eligible tags, or embeddings.",
      addModel: "Add model",
      saveSuccess: "AI model instructions have been saved.",
      saveError: "Couldn't save AI model instructions."
    }
  },
  extensionSettingsModal: {
    title: "{{name}} • Settings",
    intentSubtitle: "Requested by the extension",
    openFullPage: "Open the full page →",
    discardMessage: "Your edits to {{name}}'s settings haven't been saved yet."
  },
  extensionManualDrawer: {
    title: "{{name}} manual",
    commandSubtitle: "{{extension}} • v{{version}}",
    noManual: "No manual provided for this extension yet.",
    settingsCalloutTitle: "Change these settings",
    settingsCalloutDescription: "Values are edited in the Settings tab.",
    openSettingsTab: "Open Settings tab"
  },
  captionModelModal: {
    title: "{{extension}} • {{model}}",
    subtitle: "The model that wrote this caption",
    editQuestionAction: "Edit question",
    futureCaptionsNotice: "This changes the question used for future captions from this model, across the application. This caption stays as it is.",
    allAiModelsLink: "All of {{extension}}'s AI models →",
    discardMessage: "Your changes to {{model}}'s caption question haven't been saved yet.",
    saveSuccess: "Caption question updated for {{model}}.",
    saveError: "Couldn't update the caption question."
  },
  imageDetail: {
    aiGenerated: "AI-generated",
    information: "Information",
    metadata: "Metadata",
    tags: "Tags",
    recipe: "Recipe",
    recipeAvailable: "With {{extension}} recipe",
    embeddings: "Embeddings",
    embeddingsSubtitle: "Images closest to this one, by each embedding",
    exploreSimilar: "Explore similar",
    commands: "Image commands",
    moreCommands: "More commands",
    noCommandsFound: "No commands found",
    features: "Features",
    rawFeatures: "Raw",
    newFeatures: "Features",
    schemaComplianceError: "The underlying information cannot be displayed because of a schema compliance issue",
    type:
      {
        caption: "Caption",
        description: "Description",
        comment: "Comment",
        annotation: "Annotation",
        metadata: "Metadata",
        recipe: "Recipe",
        identity: "Identity",
        physics: "Physics",
        other: "Other"
      },
    metadataSources:
      {
        exif: "EXIF",
        iptc: "IPTC",
        xmp: "XMP",
        icc: "ICC",
        tiffTagPhotoshop: "Photoshop",
        others: "Other",
        all: "All"
      },
    settings:
      {
        title: "Customize cards",
        description: "Reorder cards by dragging placeholders or using arrow buttons. Toggle switches to hide or restore sections.",
        hide: "Hide",
        show: "Show",
        restoreAll: "Restore all ({{count}})",
        reset: "Reset defaults",
        allVisible: "All cards are visible",
        moveUp: "Move up",
        moveDown: "Move down"
      }
  },
  repositoryScreen: {
    title: "Repositories",
    repositoriesCount_one: "{{count}} repository",
    repositoriesCount_other: "{{count}} repositories",
    subtitle: "Folders you add, and the ones your extensions fill.",
    addRepository: "Add repository",
    searchPlaceholder: "Search names and comments",
    origin: {
      all: "All",
      user: "Added by you",
      extensions: "From extensions"
    },
    imagesCount_one: "{{count}} image",
    imagesCount_other: "{{count}} images",
    table: {
      recent: "Recent"
    },
    noImagesIndexed: "No images indexed yet",
    disabledPreview: "Repository is disabled",
    addedBy: "Added by {{name}}",
    drawer: {
      viewImages: "View images",
      openInNewWindow: "Open in new window",
      recentImages: "Recent images",
      viewAll: "View all {{number}}",
      folder: "Folder",
      showInFinder: "Show in Finder",
      copyPath: "Copy path"
    },
    imagesScreen: {
      subtitle: "Repository • {{path}} • {{number}} images",
      lockedRepositoryHint: "Locked on this screen. To search every repository, use Explore."
    },
    status: {
      ready: "Ready",
      watching: "Watching",
      indexing: "Indexing…",
      disabled: "Disabled",
      unavailable: "Unavailable"
    },
    firstLaunch: {
      caption: "New to the application? Start here",
      title: "Add your own folders",
      description: "Add the folders where you save your generations, like your ComfyUI outputs. The application indexes them and watches for new images. Your files stay where they are.",
      chooseFolder: "Choose a folder",
      readManual: "Read the manual",
      watchOnYoutube: "Watch on YouTube"
    },
    menu: {
      enable: "Enable",
      disable: "Disable",
      watch: "Watch",
      stopWatching: "Stop watching"
    },
    emptyFiltered: {
      title: "No repositories match",
      description: "Try changing your search query or switching repository origin."
    },
    successRemove: "The repository has been successfully removed",
    errorRemove: "An error occurred while removing the repository",
    successEnable: "The repository has been enabled",
    successDisable: "The repository has been disabled",
    successWatch: "The repository is now watched for new images",
    successStopWatching: "The repository is no longer watched for new images",
    errorMode: "An error occurred while updating the mode of the repository",
    confirmSynchronizeTitle: "Synchronize repository",
    confirmSynchronizeMessage: "Are you sure you want to synchronize the repository '{{name}}'?",
    confirmSynchronizeConsequences:
      "The application will scan its folder to index new or updated images and remove any missing ones from its index, which may take some time.",
    confirmDisableTitle: "Disable repository",
    confirmDisableMessage: "Are you sure you want to disable the repository '{{name}}'?",
    confirmDisableConsequences:
      "Folder watching will stop and its images will be hidden from browsing, search, and extensions until re-enabled (your files on disk and indexed data will be preserved).",
    confirmWatchTitle: "Watch repository",
    confirmWatchMessage: "Are you sure you want to watch the repository '{{name}}'?",
    confirmWatchConsequences:
      "The application will continuously monitor its folder to automatically index new, updated, or deleted images, and will synchronize it first if it has not been indexed yet.",
    confirmStopWatchingTitle: "Stop watching repository",
    confirmStopWatchingMessage: "Are you sure you want to stop watching the repository '{{name}}'?",
    confirmStopWatchingConsequences:
      "The application will no longer monitor its folder for file system changes, so new, updated, or deleted images will not be indexed automatically until you synchronize manually or re-enable watching.",
    confirmDeleteTitle: "Delete repository",
    confirmDeleteMessage: "Are you sure you want to delete the repository '{{name}}'?",
    confirmDeleteConsequences:
      "Any active watching will stop and the repository, along with all its indexed images, metadata, embeddings, and collection entries, will be permanently removed from the application. Your image files on disk will not be deleted."
  },
  repositoryDetail: {
    latestImages: "Latest images",
    imageCount: "Image count"
  },
  collectionsScreen: {
    title: "Collections",
    successDelete: "The collection has been successfully deleted",
    errorDelete: "An error occurred while deleting the collection",
    confirmDeleteTitle: "Delete collection",
    confirmDeleteMessage: "Are you sure you want to delete the collection '{{name}}'?"
  },
  collectionDetail: {
    latestImages: "Latest images"
  },
  extension: {
    categories: {
      capture: "Capture",
      enrichment: "Enrichment",
      generation: "Generation",
      integration: "Integration",
      utility: "Utility",
      other: "Other"
    },
    runtimes: {
      node: "Node.js",
      python: "Python"
    },
    status: {
      running: "Running",
      starting: "Starting…",
      paused: "Paused",
      error: "Error",
      notInstalled: "Not installed",
      installing: "Installing…",
      updating: "Updating…"
    },
    updatePill: "Update {{version}}",
    byAuthorVersion: "By {{author}} • v{{version}}",
    versionOnly: "v{{version}}",
    updateTitleWithName: "Update {{name}}",
    updateToVersion: "Update to {{version}}",
    menu: {
      updateFromFileOrLink: "Update from file or link…"
    },
    successInstall: "The extension has been installed.",
    successUpdate: "The extension has been updated to v{{version}}.",
    successUninstall: "The extension has been successfully uninstalled",
    errorInstall: "The extension could not be installed.",
    errorUpdate: "The extension could not be updated.",
    errorUninstall: "An error occurred while uninstalling the extension",
    errorToggleStatus: "An error occurred while changing the extension state.",
    confirmInstallTitle: "Install extension",
    confirmInstallMessage: "Are you sure you want to install the '{{name}}' extension?",
    confirmInstallConsequences:
      "The application will download and install the extension along with its runtime dependencies, enable it, and start its processes. Only install extensions from sources you trust.",
    confirmUpdateTitle: "Update extension",
    confirmUpdateConsequences:
      "Any running processes will be stopped while the new version and its runtime dependencies are installed, then the extension will be restarted. Your saved settings and existing computed data will be preserved.",
    confirmDeleteTitle: "Uninstall extension",
    confirmDeleteMessage: "Are you sure you want to uninstall the extension '{{name}}'?",
    confirmDeleteConsequences:
      "Any running processes will stop and the extension, along with its settings, declared AI models, computed features, embeddings, tags, and attachments, will be permanently removed from the application. Your repositories and image files will not be deleted.",
    synchronizing: "The extension '{{name}}' is now synchronizing…"
  },
  extensionsScreen: {
    title: "Extensions",
    subtitle: "They add features to the application. Install more, or pause the ones you don't use.",
    extensionsCount_one: "{{count}} extension",
    extensionsCount_other: "{{count}} extensions",
    createExtension: "Create extension",
    installExtension: "Install extension",
    searchPlaceholder: "Search extensions",
    scope: {
      installed: "Installed",
      notInstalled: "Not installed",
      all: "All"
    },
    filters: {
      categoryHeading: "Category",
      categorySearchPlaceholder: "Filter categories",
      statusNotUsedHint: "Not used for extensions that are not installed. Your Status choice comes back when you switch to Installed.",
      footerHint: "Shows extensions in any ticked category AND with any ticked status. Counts show what you would get.",
      clearFilters: "Clear filters",
      categoryPill: "Category: {{values}}",
      statusPill: "Status: {{values}}",
      statusPillNotUsed: "Status: {{values}} • not used here",
      resultsCounter: "{{shown}} of {{total}}"
    },
    emptyFiltered: {
      title: "No extensions match",
      description: "Try clearing a filter, switching install view, or changing your search query."
    },
    errorLoading: "The marketplace extensions could not be loaded."
  },
  eventInformation: {
    idle: "Listening to events…",
    unknownEvent: "Unknown event",
    extension: {
      installed: "The extension '{{id}}' has been installed",
      updated: "The extension '{{id}}' has been updated",
      uninstalled: "The extension '{{id}}' has been uninstalled",
      started: "The extension '{{id}}' has been started",
      stopped: "The extension '{{id}}' has been paused",
      state: {
        started: "The extension '{{id}}' has been started",
        stopped: "The extension '{{id}}' has been stopped"
      },
      process: {
        started: "The process of the extension '{{id}}' has started",
        stopped: "The process of the extension '{{id}}' has stopped"
      },
      connection: {
        started: "The extension '{{id}}' is now connected",
        stopped: "The extension '{{id}}' was disconnected"
      },
      error: "An error occurred in the extension",
      info: "The extension sent an informational message",
      fatal: "The extension has been stopped due too many process stops",
      notification: "The extension has send a notification",
      intent: "The extension triggered {{type}} intent",
      acknowledgment: "The extension has acknowledged a processing"
    },
    repository: {
      created: "The repository '{{id}}' has been created",
      updated: "The repository '{{id}}' has been updated",
      mode: {
        disabled: "The repository '{{id}}' has been disabled",
        enabled: "The repository '{{id}}' has been enabled",
        watching: "The repository '{{id}}' is now watched"
      },
      available: {
        true: "The repository '{{id}}' is now available",
        false: "The repository '{{id}}' is no longer available"
      },
      synchronize: {
        started:
          "The synchronization for the repository with ID '{{id}}' has been initiated",
        stopped:
          "The synchronization for the repository with ID '{{id}}' has been completed"
      },
      watch: {
        started: "Watch on the repository '{{id}}' has been started",
        stopped: "Watch on the repository '{{id}}' has been stopped"
      },
      deleted: "Repository '{{id}}' has been deleted"
    },
    collection: {
      created: "The collection '{{id}}' has been created",
      updated: "The collection '{{id}}' has been updated",
      deleted: "Collection '{{id}}' has been deleted"
    },
    image: {
      created: "The image has been created",
      updated: "The image has been updated",
      tags: { updated: "The image tags have been updated" },
      features: { updated: "The image features have been updated" },
      embeddings: { updated: "The image embeddings have been updated" },
      deleted: "The image '{{id}}' has been deleted"
    }
  },
  notifications: {
    empty: {
      title: "No notification",
      description: "Notification will pop when new images will be indexed or images updated."
    },
    repositoryEvent: "Repository event",
    imageCreated: "Image created",
    imageUpdated: "Image updated",
    imageDeleted: "Image deleted",
    imageCreatedDescription: "The image {{imageName}} has been created.",
    imageUpdatedDescription: "The image '{{imageName}}' has been updated.",
    imageDeletedDescription: "The image '{{imageName}}' has been deleted."
  },
  imagesScreen: {
    masonryView: "Masonry",
    galleryView: "Gallery",
    detailView: "Detail"
  },
  activityScreen: {
    title: "Activity",
    search: "Filter results",
    searchValuePlaceholder: "Search value",
    emptyActivity: {
      title: "No activity available",
      description: "There are currently no activities to display"
    },
    confirmDeleteTitle: "Clear activity events",
    confirmDeleteMessage: "Are you sure you want to clear all activity events?",
    successDelete: "All activity events have been cleared",
    errorDelete: "An error occurred while clearing activity events"
  },
  settingsScreen: {
    title: "Settings",
    tabs: {
      display: "Display",
      extensions: "Extensions"
    },
    extensions: {
      shouldConfirmRedirection:
        "Display a confirmation dialog before the extension triggers a redirection",
      resetDoNotAskAgainCommands: "Reset skipped command confirmation prompts",
      resetDoNotAskAgainCommandsDescription:
        "Restore confirmation prompts for all commands previously marked as 'Do not ask again' ({{count}} currently skipped)",
      resetDoNotAskAgainCommandsButton: "Reset prompts"
    },
    darkMode: "Dark color scheme",
    lightMode: "Light color scheme",
    autoReload: "Auto reload on new or updated images"
  },
  textToImagesModal: {
    title: "Text-to-images search",
    errorFind: "Error",
    description:
      "Define the number of similar images to retrieve. The system will perform a text-to-image search on embeddings in the library to find the most relevant matches.",
    countPlaceholder: "The amount of images to retrieve",
    searchPlaceholder: "Search text"
  },
  closestEmbeddingsImagesModal: {
    title: "Closest images",
    errorFind: "Error",
    description:
      "Define the number of similar images to retrieve. The system will execute a nearest neighbor search against image embeddings in the library to identify the most relevant matches.",
    countPlaceholder: "The amount of images to retrieve"
  },
  runCapabilitiesModal: {
    title: "Synchronize extensions",
    explanation:
      "Synchronization re-runs the selected extensions' tagging, feature and embedding capabilities over the matching images. Existing results may be overwritten and the operation can take a while.",
    collectionExplanation: "Images involved in the synchronization:",
    capabilities: "Capabilities to run:",
    noCapabilities: "Please select at least one capability.",
    selectAll: "Select all",
    noExtensions: "There is no installed and enabled extension providing image capabilities.",
    synchronizingSingle: "The image is now synchronizing…",
    synchronizingMultiple: "The images are now synchronizing…"
  },
  synchronizeExtensionModal: {
    title: "Synchronize extension",
    explanation:
      "Synchronization re-runs the \"{{name}}\" extension over the images of the library. Existing results may be overwritten and the operation can take a while.",
    collectionExplanation: "Images that will be synchronized:",
    facets: "Facets involved:"
  },
  useFileOrDirectoryPicker: {
    file: "Please, select a file",
    directory: "Please, select a directory"
  },
  commands: {
    coreFeatures: "Core features",
    extensionsCommands: "Extensions commands",
    closestImages: "Closest images",
    synchronize: "Synchronize",
    pin: "Pin",
    pinNotification: {
      title: "Image pinned",
      subtitle: "The image has been added to the Desk"
    },
    allExtensionsDetails: "All extensions",
    noExtensionDetails: " ",
    open: "Open",
    copy: "Copy",
    copySuccess: "The image has been copied to your clipboard",
    download: "Download",
    delete: "Delete",
    noCommandsAvailable: "No commands available",
    textToImages: "Text to images",
    doNotAskAgain: "Do not ask again",
    by: "By",
    howItWorks: "How it works",
    searchPlaceholder: "Search commands",
    runsOnImages_one: "Runs on 1 image",
    runsOnImages_other: "Runs on {{count}} images",
    confirmRun: "Ready to run {{command}}.",
    extensionCommandFailed:
      "The command '{{command}}' of extension '{{extension}}' failed to trigger",
    confirmImageDeleteTitle: "Image deletion",
    confirmImageDeleteMessage: "Are you sure you want to delete this image?",
    confirmImageDeleteConsequences: "The image, along with its metadata, embeddings, and collection entries, will be removed from the application.",
    confirmImageDeleteShouldDeleteFile: "Also delete the corresponding file from the file system, which cannot be recovered",
    confirmImagesDeleteTitle: "Images deletion",
    confirmImagesDeleteMessage: "Are you sure you want to delete those image? They will be deleted from your file system and cannot be recovered."
  },
  selectedImages: {
    selectLabel: "Select bulk action for images",
    selectPlaceholder: "Choose an action",
    buttonLabelWithCount_one: "1 image selected",
    buttonLabelWithCount_other: "{{count}} images selected",
    buttonUnselectAll: "Unselect all",
    createCollection: "Create collection",
    addToCollection: "Add to collection"
  },
  imagesCollection: {
    images: "images",
    more: "more"
  },
  extensionCapabilities: {
    imageFeatures: {
      label: "Features",
      description: "Extracts and analyzes image features, attributes, and generation metadata."
    },
    imageTags: {
      label: "Tags",
      description: "Detects and generates semantic tags and labels for images."
    },
    imageEmbeddings: {
      label: "Image Embeddings",
      description: "Computes vector embeddings from images for visual similarity search."
    },
    textEmbeddings: {
      label: "Text Embeddings",
      description: "Computes vector embeddings from text prompts for semantic search."
    }
  },
  extensionIntent: {
    modalTitle: "{{extension}}",
    onResultSuccess: "Information has been successfully sent to the extension",
    onResultError:
      "An error occurred while sending information to the extension",
    title: "Confirmation",
    question: "Do you want to proceed?",
    onAction: "Action executed",
    settingsMessage: "You are about to be redirecting you to the extension settings.",
    repositoryMessage: "You are about to be redirecting you to a repository detail screen.",
    showImageMessage: "An image is about to be displayed.",
    showSidebarMessage: "A new sidebar is about to be opened.",
    openBrowserMessage: "Your browser is about to be opened with the '{{url}}' URL.",
    unsupportedUiIntegration: "Cannot handle a UI intent with integration '{{integration}}'"
  },
  utils: {
    timeAgo: {
      second: "{{count}} second ago",
      second_other: "{{count}} seconds ago",
      minute: "{{count}} minute ago",
      minute_other: "{{count}} minutes ago",
      hour: "{{count}} hour ago",
      hour_other: "{{count}} hours ago",
      fullDate: "{{date}}"
    }
  }
};
