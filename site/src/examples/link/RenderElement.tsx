import { Link, Text } from "@salt-ds/core";
import type { ReactElement } from "react";
import styles from "./index.module.css";

const CustomLinkImplementation = (props: any) => (
  <a {...props}>
    <Text>Your own Link implementation</Text>
  </a>
);

export const RenderElement = (): ReactElement => {
  return (
    <Link
      href="#"
      className={styles.linkExample}
      render={<CustomLinkImplementation />}
    />
  );
};
