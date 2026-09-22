import type { ComponentProps, ComponentType, ReactNode } from "react";
import IconLocal from "@site/static/img/icon-local.svg";
import IconPrivacy from "@site/static/img/icon-privacy.svg";
import IconExtensible from "@site/static/img/icon-extensible.svg";

import styles from "./styles.module.css";


type FeatureItemType =
  {
    title: string;
    Svg: ComponentType<ComponentProps<"svg">>;
    description: string;
  };

type FeaturePropsType = FeatureItemType;

const featureList: FeatureItemType[] =
  [
    {
      title: "Local",
      Svg: IconLocal,
      description: "Picteus was designed from the ground up to offer local access to all your assets."
    },
    {
      title: "Data privacy",
      Svg: IconPrivacy,
      description: "Picteus never shares data with the outer world without your consent."
    },
    {
      title: "Extensible framework",
      Svg: IconExtensible,
      description: "Extend or customize your application via extensions."
    }
  ];

function Feature(props: FeaturePropsType): ReactNode
{
  const { title, Svg, description } = props;
  return (
    <div className={styles.featureColumn}>
      <div className={styles.iconCircle}>
        <Svg className={styles.featureIcon} aria-hidden="true" />
      </div>
      <h2 className={styles.featureTitle}>
        {title}
      </h2>
      <p className={styles.featureDescription}>
        {description}
      </p>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode
{
  return (
    <section className={styles.featuresSection}>
      <div className={styles.featuresContainer}>
        {featureList.map(
          (featureItem, itemIndex) =>
          {
            return (
              <div key={featureItem.title} className={styles.featureWrapper}>
                {itemIndex > 0 && <div className={styles.verticalSeparator} aria-hidden="true" />}
                <Feature {...featureItem} />
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}
