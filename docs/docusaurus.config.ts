import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import packageJson from "../package.json";


const config: Config =
  {
    title: "Picteus",
    tagline: "Extensible local-first framework for indexing and orchestrating AI image assets",
    organizationName: "picteus",
    projectName: "picteus",
    url: "https://picteus.github.io",
    baseUrl: process.env.DOCUSAURUS_BASE_URL ?? "/picteus",
    deploymentBranch: "gh-pages",
    favicon: "img/favicon.ico",
    trailingSlash: false,
    onBrokenLinks: "throw",
    future:
      {
        v4: true
      },
    i18n:
      {
        defaultLocale: "en",
        locales: [ "en" ]
      },
    presets:
      [
        [
          "classic",
          {
            docs:
              {
                sidebarPath: "./sidebars.ts"
              },
            blog:
              {
                showReadingTime: true,
                feedOptions:
                  {
                    type: [ "rss", "atom" ],
                    xslt: true
                  },
                onInlineTags: "warn",
                onInlineAuthors: "warn",
                onUntruncatedBlogPosts: "warn"
              },
            theme:
              {
                customCss: "./src/css/custom.css"
              }
          } satisfies Preset.Options
        ]
      ],
    themes:
      [
        [
          require.resolve("@easyops-cn/docusaurus-search-local"),
          {
            hashed: true,
            language: [ "en" ],
            docsRouteBasePath: "/docs",
            indexDocs: true,
            indexBlog: false,
            indexPages: false,
            highlightSearchTermsOnTargetPage: true
          }
        ]
      ],
    themeConfig:
      {
        colorMode:
          {
            respectPrefersColorScheme: true
          },
        docs:
          {
            sidebar:
              {
                hideable: true
              }
          },
        navbar:
          {
            title: "Picteus",
            logo:
              {
                alt: "Picteus Logo",
                src: "img/logo-black.svg",
                srcDark: "img/logo-white.svg",
                width: 28,
                height: 28
              },
            items:
              [
                {
                  type: "docSidebar",
                  sidebarId: "visionSidebar",
                  position: "left",
                  label: "Vision",
                  className: "navbar__item--vision"
                },
                {
                  type: "docSidebar",
                  sidebarId: "setupSidebar",
                  position: "left",
                  label: "Setup",
                  className: "navbar__item--setup"
                },
                {
                  type: "docSidebar",
                  sidebarId: "manualSidebar",
                  position: "left",
                  label: "Manual",
                  className: "navbar__item--manual"
                },
                {
                  type: "docSidebar",
                  sidebarId: "developerSidebar",
                  position: "left",
                  label: "Developer",
                  className: "navbar__item--developer"
                },
                {
                  type: "docSidebar",
                  sidebarId: "extensionsSidebar",
                  position: "left",
                  label: "Extensions",
                  className: "navbar__item--extensions"
                },
                {
                  type: "html",
                  position: "right",
                  value: `<span class="navbar__version-badge">v${packageJson.version}</span>`
                },
                {
                  href: "https://github.com/picteus/picteus",
                  position: "right",
                  className: "header-github-link",
                  "aria-label": "Picteus on GitHub"
                }
              ]
          },
        footer:
          {
            style: "light",
            logo:
              {
                alt: "Picteus Logo",
                src: "img/logo-black.svg",
                srcDark: "img/logo-white.svg",
                width: 22,
                height: 22
              },
            links: [],
            copyright: `Copyright © 2024–${new Date().getFullYear()} Picteus Team`
          },
        prism:
          {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: [ "batch", "powershell", "bash" ]
          }
      } satisfies Preset.ThemeConfig
  };

export default config;
