// @ts-nocheck

// For some reason, import from root doesn't work
import { parse, walk } from "css-tree/dist/csstree.esm";
import {
  SALT_CHARACTERISTICS,
  SALT_FOUNDATIONS,
  SALT_PALETTES,
  SALT_COMPONENTS,
} from "@salt-ds/theme-editor/src/utils/saltValues";

import {
  CssNode,
  Rule,
  Raw,
  SelectorList,
  ClassSelector,
  Selector,
} from "css-tree";
import { getIdFromPropertyName } from "./getIdFromPropertyName";

export type Declaration = { property: string; value: string };
export type DeclarationData = {
  groupName: string;
  declarations: Declaration[];
}[];

export function parseCssToFlowData(css: string) {
  const ast = parse(css);
  const groupDeclarationsMap = new Map<string, Declaration[]>();

  walk(ast, {
    visit: "Rule",
    enter(node: Rule) {
      const declarations: Declaration[] = [];
      node.block.children.forEach((x) => {
        if (x.type === "Declaration") {
          // TODO: check Raw type
          if ((x.value as Raw).value) {
            declarations.push({
              property: x.property,
              value: (x.value as Raw).value.trim(),
            });
          } else {
            debugger;
          }
        }
      });

      // Manually group CSSs together
      const idFromPropertyName = getIdFromPropertyName(
        declarations[0].property
      );

      const groupId = SALT_COMPONENTS.includes(idFromPropertyName)
        ? selectorListToString(node.prelude)
        : SALT_PALETTES.includes(idFromPropertyName)
        ? "PaletteGroup"
        : SALT_CHARACTERISTICS.includes(idFromPropertyName)
        ? "CharateristicsGroup"
        : // Things left should be foundations
          idFromPropertyName;

      // const group = {
      //   declarations,
      //   groupName: selectorListToString(node.prelude),
      // };
      // results.push(group);
      if (groupDeclarationsMap.has(groupId)) {
        groupDeclarationsMap.get(groupId).push(...declarations);
      } else {
        groupDeclarationsMap.set(groupId, declarations);
      }
    },
  });
  const results: DeclarationData = [];
  for (const [key, declarations] of groupDeclarationsMap) {
    results.push({
      groupName: key,
      declarations,
    });
  }
  return results;
}

function selectorListToString(selectorList: SelectorList) {
  return Array.from(
    selectorList.children.map((x) => {
      return Array.from(
        (x as Selector).children.map((y) => (y as ClassSelector).name)
      ).join(",");
    })
  ).join(",");
}
