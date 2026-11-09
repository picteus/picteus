import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";


const MARKDOWN_EXTENSION = ".md";
const REFERENCE_DIRECTORY_NAME = "reference";
const MODELS_REFERENCE_ANCHOR = "models-reference";
const INDEX_FILE_NAME = `index${MARKDOWN_EXTENSION}`;
const MODELS_REFERENCE_FILE_NAME = `${MODELS_REFERENCE_ANCHOR}${MARKDOWN_EXTENSION}`;

const SKILLS_DIRECTORY_PATH = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT_PATH = path.resolve(SKILLS_DIRECTORY_PATH, "..");
const EXTENSIONS_DOCUMENTATION_DIRECTORY_PATH = path.join(REPOSITORY_ROOT_PATH, "docs", "docs", "extensions");
const TARGET_REFERENCES_DIRECTORY_PATH = path.join(SKILLS_DIRECTORY_PATH, "picteus-extension-builder", "references");
const PUBLISHED_DOCUMENTATION_BASE_URL = "https://picteus.github.io/picteus/docs";

const STANDALONE_REFERENCE_TOPICS = [ "overview", "manifest", "class", "api", "manual" ];
const COMPOSITE_REFERENCE_TOPICS = [ "intents", "viewkit" ];
const ROOT_EXTENSION_TOPICS = [ "unpacked" ];

const LINK_REPLACEMENTS =
  [
    {
      pattern: new RegExp(`\\]\\((?:\\.\\/|${REFERENCE_DIRECTORY_NAME}\\/)(${STANDALONE_REFERENCE_TOPICS.join("|")})\\${MARKDOWN_EXTENSION}(#[^)]+)?\\)`, "g"),
      replacement: `](./$1${MARKDOWN_EXTENSION}$2)`
    },
    {
      pattern: new RegExp(`\\]\\(\\.\\/(${COMPOSITE_REFERENCE_TOPICS.join("|")})\\/${INDEX_FILE_NAME}(#[^)]+)?\\)`, "g"),
      replacement: `](./$1${MARKDOWN_EXTENSION}$2)`
    },
    {
      pattern: new RegExp(`\\]\\(\\.\\/${MODELS_REFERENCE_FILE_NAME}(#[^)]+)?\\)`, "g"),
      replacement: `](#${MODELS_REFERENCE_ANCHOR})`
    },
    {
      pattern: new RegExp(`\\]\\(\\.?\\/?(${ROOT_EXTENSION_TOPICS.join("|")})\\${MARKDOWN_EXTENSION}(#[^)]+)?\\)`, "g"),
      replacement: `](./$1${MARKDOWN_EXTENSION}$2)`
    },
    {
      pattern: new RegExp(`\\]\\(\\.\\.\\/\\.\\.\\/manual\\/webservicesapi\\/${INDEX_FILE_NAME}(#[^)]+)?\\)`, "g"),
      replacement: `](${PUBLISHED_DOCUMENTATION_BASE_URL}/manual/webservicesapi$1)`
    },
    {
      pattern: new RegExp(`\\]\\(\\.\\.\\/(?:\\.\\.\\/)?(manual\\/webservicesapi|manual|setup)\\/([a-z0-9-]+)\\${MARKDOWN_EXTENSION}(#[^)]+)?\\)`, "g"),
      replacement: `](${PUBLISHED_DOCUMENTATION_BASE_URL}/$1/$2$3)`
    }
  ];

const REFERENCE_TARGETS =
  [
    ...STANDALONE_REFERENCE_TOPICS.map(topic => (
      {
        destinationFileName: `${topic}${MARKDOWN_EXTENSION}`,
        sourceRelativePaths: [ path.join(REFERENCE_DIRECTORY_NAME, `${topic}${MARKDOWN_EXTENSION}`) ]
      })),
    ...ROOT_EXTENSION_TOPICS.map(topic => (
      {
        destinationFileName: `${topic}${MARKDOWN_EXTENSION}`,
        sourceRelativePaths: [ `${topic}${MARKDOWN_EXTENSION}` ]
      })),
    ...COMPOSITE_REFERENCE_TOPICS.map(topic => (
      {
        destinationFileName: `${topic}${MARKDOWN_EXTENSION}`,
        sourceRelativePaths:
          [
            path.join(REFERENCE_DIRECTORY_NAME, topic, INDEX_FILE_NAME),
            path.join(REFERENCE_DIRECTORY_NAME, topic, MODELS_REFERENCE_FILE_NAME)
          ]
      }))
  ];

function stripCarouselBlocks(markdownContent)
{
  return markdownContent.replace(/^````carousel\s*\r?\n/gm, "").replace(/^<!--\s*slide\s*-->\s*\r?\n/gm, "\n").replace(/^````\s*$/gm, "");
}

function rewriteRelativeLinks(markdownContent)
{
  return LINK_REPLACEMENTS.reduce((updatedContent, rule) => updatedContent.replace(rule.pattern, rule.replacement),
    markdownContent);
}

function demotePrimaryHeading(markdownContent)
{
  return markdownContent.replace(/^# /m, "## ");
}

function readAndTransformSourceFile(relativeFilePath, shouldDemoteHeading)
{
  const absoluteFilePath = path.join(EXTENSIONS_DOCUMENTATION_DIRECTORY_PATH, relativeFilePath);
  const rawMarkdown = fs.readFileSync(absoluteFilePath, "utf8");
  const transformedMarkdown = rewriteRelativeLinks(stripCarouselBlocks(rawMarkdown)).trim();
  if (shouldDemoteHeading === true)
  {
    return `${demotePrimaryHeading(transformedMarkdown)}\n`;
  }
  else
  {
    return `${transformedMarkdown}\n`;
  }
}

function buildReferenceFile(referenceTarget)
{
  // We transform each source Markdown file and demote secondary files so the merged output keeps a single H1 heading
  const sections = referenceTarget.sourceRelativePaths.map(
    (sourceRelativePath, sectionIndex) => readAndTransformSourceFile(sourceRelativePath, sectionIndex > 0)
  );
  const combinedMarkdown = sections.join(`\n---\n\n<a id="${MODELS_REFERENCE_ANCHOR}"></a>\n\n`);
  const destinationFilePath = path.join(TARGET_REFERENCES_DIRECTORY_PATH, referenceTarget.destinationFileName);
  fs.writeFileSync(destinationFilePath, combinedMarkdown, "utf8");
}

function buildSkillReferences()
{
  // We ensure the target references directory exists before generating all reference files
  fs.mkdirSync(TARGET_REFERENCES_DIRECTORY_PATH, { recursive: true });
  for (const referenceTarget of REFERENCE_TARGETS)
  {
    buildReferenceFile(referenceTarget);
  }
  const relativeOutputPath = path.relative(REPOSITORY_ROOT_PATH, TARGET_REFERENCES_DIRECTORY_PATH);
  console.log(`Built ${REFERENCE_TARGETS.length} reference files in ${relativeOutputPath}`);
}

buildSkillReferences();
