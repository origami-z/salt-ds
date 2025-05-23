import { Slider } from "@salt-ds/lab";
import type { ReactElement } from "react";

export const WithFormatting = (): ReactElement => (
  <Slider
    aria-label="With formatting"
    style={{ width: "80%" }}
    format={(value: number) =>
      Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value)
    }
    minLabel="€0"
    maxLabel="€100"
  />
);
