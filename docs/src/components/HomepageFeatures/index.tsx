import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Local",
    Svg: require("@site/static/img/local.svg").default,
    description: (
      <>
        Picteus was designed from the ground up to offer a local access to all your assets.
      </>
    )
  },
  {
    title: "Data privacy",
    Svg: require("@site/static/img/privacy.svg").default,
    description: (
      <>
        Picteus never shares data with the outer world without your consent.
      </>
    )
  },
  {
    title: "Extensible framework",
    Svg: require("@site/static/img/extensible.svg").default,
    description: (
      <>
        Extend or customize your application via extensions.
      </>
    )
  }
];

function Feature({ title, Svg, description }: FeatureItem)
{
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode
{
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, index) => (
            <Feature key={index} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
