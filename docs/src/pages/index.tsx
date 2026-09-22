import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import HeroLogo from "@site/static/img/hero-logo.svg";
import IconArrow from "@site/static/img/icon-arrow.svg";

import styles from "./index.module.css";


function HomepageHeader(): ReactNode
{
  return (
    <header className={styles.heroSection}>
      <div className={styles.heroContainer}>
        <div className={styles.logoWrapper}>
          <HeroLogo className={styles.heroLogo} role="img" aria-label="Picteus Logo" />
        </div>
        <p className={styles.eyebrow}>
          Local-first image intelligence
        </p>
        <h1 className={styles.title}>
          Picteus
        </h1>
        <p className={styles.description}>
          Extensible local-first framework for indexing and orchestrating AI image assets
        </p>
        <div className={styles.ctaWrapper}>
          <Link className={styles.ctaButton} to="/docs/setup/install">
            <span>View installation guide</span>
            <IconArrow className={styles.ctaArrow} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.highlightsRow}>
          <div className={styles.highlightLeft}>
            <div className={styles.highlightTitle}>Private by default</div>
            <div className={styles.highlightSubtitle}>Runs on your machine</div>
          </div>
          <div className={styles.highlightDivider} aria-hidden="true" />
          <div className={styles.highlightRight}>
            <div className={styles.highlightTitle}>Built to extend</div>
            <div className={styles.highlightSubtitle}>Plugins and APIs included</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode
{
  return (
    <Layout
      title="Picteus Documentation"
      description="Extensible local-first framework for indexing and orchestrating AI image assets"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
