/// <reference types="vite/client" />

interface ImportMetaEnv
{
  readonly PACKAGE_VERSION: string;
  readonly APPLICATION_VERSION: string;
  readonly PACKAGE_HOMEPAGE: string;
}

interface ImportMeta
{
  readonly env: ImportMetaEnv;
}

