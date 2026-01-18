export default {
  bootstrap: {
    loading: "Loading application...",
  },
  menu: {
    gallery: "Gallery",
    activity: "Activity",
    repositories: "Repositories",
    extensions: "Extensions",
    settings: "Settings",
    information: "Information",
    imageCommands: "Image commands",
    generator: "Generator",
    metadata: "Metadata",
    tags: "Tags",
    features: "Features",
  },
  message: {
    idCopied: "The image ID has been successfully copied to your clipboard.",
    fileProcessing:
      "File processing is in progress and may take some time. Please do not close the window.",
    toastErrorTitle: "Operation failed",
    toastSuccessTitle: "Operation successful",
  },
  field: {
    id: "ID",
    parentId: "Parent ID",
    url: "URL",
    search: "Search",
    file: "File",
    comment: "Comment",
    name: "Name",
    sourceUrl: "Source URL",
    status: "Status",
    createdOn: "Created on",
    modifiedOn: "Modified on",
    importedOn: "Imported on",
    updatedOn: "Updated on",
    dimensions: "Dimensions",
    repository: "Repository",
    repositories: "Repositories",
    repositoryId: "Repository ID",
    size: "Size",
    formats: "Formats",
    tags: "Tags",
    location: "Location",
    entity: "Entity",
    action: "Action",
    payload: "Payload",
    channel: "Channel",
    description: "Description",
    version: "Version",
    extension: "Extension",
    imageCount: "Image count",
    source: "Source",
    logLevel: "Log level",
    binarySize: "Binary size",
    width: "Width",
    height: "Height",
    generatorPlaceholder: "Choose a generator",
    distance: "Distance",
  },
  filters: {
    search: "Search",
    searchTextIn: "Search text in",
    inName: "Image name",
    inMetadata: "Image metadata",
    inFeatures: "Image features",
    selectAll: "Select all",
    clearAll: "Clear all",
  },
  sort: {
    asc: "Ascending",
    desc: "Descending",
    sortBy: "Sort by",
    sortedBy: "Sorted by",
    sortOrder: "Sort order",
    sortByPlaceholder: "Choose sorting criteria",
    sortOrderPlaceholder: "Choose sorting order",
  },
  button: {
    add: "Add",
    find: "Find",
    clearAll: "Clear all",
    synchronize: "Synchronize",
    delete: "Delete",
    apply: "Apply",
    update: "Update",
    save: "Save",
    send: "Send",
    uninstall: "Uninstall",
    confirm: "Confirm",
    pause: "Pause",
    start: "Start",
    resume: "Resume",
    settings: "Settings",
    cancel: "Cancel",
    refresh: "Refresh",
  },
  emptyResults: {
    title: "No Results Available",
    description: "There are currently no results",
    buttonText: "Reload",
  },
  emptyImages: {
    title: "No Images available",
    descriptionNoRepository:
      "There are currently no images stored in your repositories. Please upload or add images to your repositories to see them listed here.",
    description:
      "There are currently no images corresponding to your search criteria. Please try again with different criteria.",
    buttonTextNoRepository: "Manage repositories",
  },
  emptyRepositories: {
    title: "No repository added",
    description:
      "It seems there are no repositories configured at the moment. Please add a repository to start managing your pictures.",
    buttonText: "Add repository",
  },
  emptyExtensions: {
    title: "No extension installed",
    description:
      "It seems there are no extensions configured at the moment. Please add an extension to start enhancing the app's features.",
    buttonText: "Add extension",
  },
  pagination: {
    results: "results",
    of: "of",
    resultsPerPage: "Show {{count}} entries ",
  },
  fieldError: {
    wrongFileFormat:
      "Invalid file format. Please upload a {{extensions}} file.",
    badFileUrl: "The file URL must start with : 'file://' ",
    empty: "This field can not be empty",
  },
  addRepositoryModal: {
    successAdd: "The repository has been successfully added",
    errorAdd: "An error occurred while adding the repository : {{error}}",
    title: "Add repository",
    namePlaceholder: "AI generated pictures",
    urlPlaceholder: "file:///Users/john/ai-pictures/",
    commentPlaceholder: "Contains every AI generated pictures",
  },
  addExtensionModal: {
    successAdd: "The extension has been successfully added",
    errorAdd: "An error occurred while adding the extension : {{error}}",
    title: "Add extension",
    filePlaceholder: "Select a .ZIP file",
    dropzone: {
      select: "Select file",
      dragAndDrop: "Or drag and drop",
    },
  },
  updateExtensionModal: {
    successAdd: "The extension has been successfully updated",
    errorAdd: "An error occurred while adding the extension : {{error}}",
    title: "Update extension",
    filePlaceholder: "Select a .ZIP file",
    warning:
      "You are about to update the extension with ID : <strong>{{name}}</strong>. This will terminate all related processes, which may result in data loss. Please ensure you understand the implications before proceeding.",
  },
  extensionSettingsModal: {
    title: "Extension settings",
    warning:
      "You are about to update the settings of the extension with ID : <strong>{{name}}</strong>. Please ensure you understand the implications before proceeding.",
    error:
      "There is no settings schema set for the  extension with ID : <strong>{{name}}</strong>.",
    jsonInvalid: "The text you entered is not in a valid JSON format.",
    errorLoading: "An error occurred while loading the extension settings",
    errorSaving: "An error occurred while saving the extension settings",
    successSaving: "The extension settings have been successfully saved",
  },
  repositoryScreen: {
    title: "Repositories",
    successRemove: "The repository has been successfully removed",
    errorRemove: "An error occured while removing the repository : {{error}}",
    confirmDeleteTitle: "Delete repository",
    confirmDeleteMessage:
      "Are you sure you want to delete the repository '{{name}}' ?",
  },
  extensionsScreen: {
    title: "Extensions",
    successUninstall: "The extension has been successfully uninstalled",
    errorUninstall:
      "An error occured while uninstalling the extension : {{error}}",
    confirmDeleteTitle: "Uninstall extension",
    confirmDeleteMessage:
      "Are you sure you want to uninstall the extension '{{name}}' ?",
    errorToggleStatus:
      "An error occured while trying to toggle the extension status.",
    successSynchronize: "The extension '{{name}}' is now synchronizing.",
  },
  eventInformation: {
    idle: "Listening for events...",
    unknownEvent: "Unknown event",
    extension: {
      installed: "The extension '{{id}}' has been installed.",
      updated: "The extension '{{id}}' has been updated.",
      uninstalled: "The extension '{{id}}' has been uninstalled.",
      paused: "The extension '{{id}}' has been paused.",
      resumed: "The extension '{{id}}' has been resumed.",
      process: {
        started: "The process of the extension '{{id}}' has started.",
        stopped: "The process of the extension '{{id}}' has stopped.",
      },
      error: "An error occurred in the extension '{{id}}'.",
      info: "The extension '{{id}}' triggered an informational event.",
      fatal: "The extension '{{id}}' has been stopped due too many process stops.",
      notification: "The extension '{{id}}' has send a notification.",
      intent: "The extension '{{id}}' triggered an intent.",
    },
    repository: {
      created: "Repository '{{id}}' has been created.",
      synchronize: {
        started:
          "Synchronization for the repository with ID '{{id}}' has been initiated.",
        stopped:
          "Synchronization for the repository with ID '{{id}}' has been completed.",
      },
      watch: {
        started: "Watch on the repository '{{id}}' has been started.",
        stopped: "Watch on the repository '{{id}}' has been stopped.",
      },
      deleted: "Repository '{{id}}' has been deleted.",
    },
    image: {
      created: "The image '{{id}}' has been created.",
      updated: "The image '{{id}}' has been updated.",
      deleted: "The image '{{id}}' has been deleted.",
    },
  },
  notifications: {
    noNotifications: "No notifications",
    repositoryEvent: "Repository event",
    imageCreated: "Image created",
    imageUpdated: "Image updated",
    imageDeleted: "Image deleted",
    imageCreatedDescription: "The image {{imageName}} has been created.",
    imageUpdatedDescription: "The image '{{imageName}}' has been updated.",
    imageDeletedDescription: "The image '{{imageName}}' has been deleted.",
  },
  galleryScreen: {
    alertGalleryChanged: "Changes detected in the gallery. Reload to update.",
  },
  activityScreen: {
    title: "Activity",
    search: "Filter results",
    searchValuePlaceholder: "Search value",
    emptyActivity: {
      title: "No activity available",
      description: "There are currently no activities to display",
    },
  },
  settingsScreen: {
    title: "Settings",
    tabs: {
      display: "Display",
      extensions: "Extensions",
    },
    extensions: {
      shouldConfirmRedirection:
        "Display a confirmation dialog before the extension triggers a redirection",
    },
    darkMode: "Dark color scheme",
    lightMode: "Light color scheme",
  },
  textToImagesModal: {
    title: "Text-to-images search",
    errorFind: "Error",
    description:
      "Define the number of similar images to retrieve. The system will perform a text-to-image search on embeddings in the library to find the most relevant matches.",
    countPlaceholder: "The amount of images to retrieve",
    searchPlaceholder: "Search text",
  },
  closestEmbeddingsImagesModal: {
    title: "Find closest image matches",
    errorFind: "Error",
    description:
      "Define the number of similar images to retrieve. The system will execute a nearest neighbor search against image embeddings in the library to identify the most relevant matches.",
    countPlaceholder: "The amount of images to retrieve",
  },
  commands: {
    coreFeatures: "Core features",
    extensionsCommands: "Extensions commands",
    closestImages: "Closest images",
    synchronize: "Synchronize",
    synchronizeDetails: "All Extensions",
    textToImages: "Text to images",
    extensionCommandFailed:
      "The command '{{command}}' of extension '{{extension}}' failed to trigger",
  },
  selectedImagesAffix: {
    selectLabel: "Select bulk action for images",
    selectPlaceholder: "Choose an action",
    buttonLabelWithCount_one: "image selected",
    buttonLabelWithCount_other: "images selected",
    buttonUnselectAll: "Unselect all",
  },
  extensionIntent: {
    backToPicteus: "",
    modalTitle: "Extension '{{extension}}' prompts",
    onResultSuccess: "Information has been successfully sent to the extension",
    onResultError:
      "An error occurred while sending information to the extension",
    settingsRedirectTitle: "Picteus wants to redirect you",
    settingsRedirectDescription:
      "Picteus wants to redirect you to the extension settings. Do you want to proceed?",
    showImageTitle: "Picteus wants to display an image",
    showImageDescription:
      "Picteus wants to display an image. Do you want to proceed?",
  },
  utils: {
    timeAgo: {
      second: "{{count}} second ago",
      second_other: "{{count}} seconds ago",
      minute: "{{count}} minute ago",
      minute_other: "{{count}} minutes ago",
      hour: "{{count}} hour ago",
      hour_other: "{{count}} hours ago",
      fullDate: "{{date}}",
    },
  },
};
