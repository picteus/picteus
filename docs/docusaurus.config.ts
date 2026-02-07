import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";


const config: Config =
  {
    title: "Picteus",
    tagline: "Extensible local-first framework for indexing and orchestrating AI image assets",
    organizationName: "picteus",
    projectName: "picteus",
    url: "https://picteus.github.io",
    baseUrl: "/",
    deploymentBranch: "gh-pages",
    favicon: "img/favicon.ico",
    trailingSlash: false,
    onBrokenLinks: "throw",
    future: { v4: true },
    i18n:
      {
        defaultLocale: "en",
        locales: ["en"]
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
                    type: ["rss", "atom"],
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
    themeConfig:
      {
        colorMode:
          {
            respectPrefersColorScheme: true
          }, docs: {
          sidebar: {
            hideable: true
          }
        },
        navbar:
          {
            title: "Picteus",
            logo:
              {
                alt: "Picteus Logo",
                src: "img/logo.svg"
              },
            items:
              [
                {
                  type: "docSidebar",
                  sidebarId: "setupSidebar",
                  position: "left",
                  label: "Setup"
                },
                {
                  href: "https://github.com/picteus/picteus",
                  label: "GitHub",
                  position: "right"
                }
              ]
          },
        footer:
          {
            style: "dark",
            links: [],
            copyright: `Copyright © 2024-${new Date().getFullYear()} Picteus Team`
          },
        prism:
          {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ["batch", "powershell", "bash"]
          }
      } satisfies Preset.ThemeConfig
  };

export default config;
