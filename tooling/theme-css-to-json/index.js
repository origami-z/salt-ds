"use strict";

const fs = require("fs");
const path = require("path");
const { findLast, generate, parse, walk } = require("css-tree");

var argv = require("yargs/yargs")(process.argv.slice(2)).argv;

// In the future this can be exposed to command arg
const cssUitkVarPrefix = "--uitk-";
const cssVarPrefix = "--";
const prettyPrintOutputJson = true;
const splitFileByClass = true; // this would generate multiple JSON from a single CSS to avoid same token been overridden

const filesArg = argv._;

const log = (...params) => {
  console.log(...params);
};

const logInfo = (...params) => {
  if (argv.verbose) {
    console.info(...params);
  }
};

log("filesArg: ", filesArg);
const outputDir = path.join(__dirname, "dist");
log("Output dir: ", outputDir);
// if (fs.existsSync(outputDir)) {
//   fs.rmdirSync(outputDir);
// }
// fs.mkdirSync(outputDir);

const removePrefix = (input) => input.replaceAll(cssVarPrefix, "");
/**
 * `var(--uitk-abc-def)` => `{uitk.abc.def}`
 */
const cssVarToReference = (input) =>
  "{" +
  removePrefix(input.replace(/(^.*\(|\).*$)/g, ""))
    .split("-")
    .join(".") +
  "}";
/**
 * Guess token type from path.
 *
 * @param {string[]} tokenNameArray
 * @param {path.ParsedPath} filePath
 */
const guessTokenType = (tokenNameArray, filePath) => {
  if (tokenNameArray.includes("opacity")) {
    return "opacity";
  } else if (
    tokenNameArray.some((token) =>
      /^(color|foreground|background|borderColor|outlineColor|startColor|stopColor|indicator|fade|fill)$/i.test(
        token
      )
    )
  ) {
    return "color";
  } else if (tokenNameArray.some((token) => /(fontWeight)/i.test(token))) {
    return "font-weight";
  } else if (tokenNameArray.some((token) => /(borderRadius)/i.test(token))) {
    return "border-radius";
  } else if (tokenNameArray.some((token) => /(borderStyle)/i.test(token))) {
    return "border-style";
  }

  if (filePath.name.includes("palette")) {
    return "color";
  }

  return "UNKNOWN";
};

/**
 * Write token to obj.
 *
 * @param {*} target
 * @param {string[]} objKeys
 * @param {*} value
 * @param {string} value
 * @returns
 */
const writeObjValue = (target, objKeys, value, tokenType) => {
  if (!Array.isArray(objKeys)) return target;

  if (objKeys.length > 1) {
    if (target[objKeys[0]] === undefined) {
      target[objKeys[0]] = {};
    }
    writeObjValue(target[objKeys[0]], objKeys.slice(1), value, tokenType);
  } else {
    target[objKeys[0]] = {
      value,
      type: tokenType,
    };
  }
};

/**
 * Trying to figure out the best description to describe the class combinations
 *
 * - `[.light, .dark]` => `both-themes`
 * - `[.light]` => `light`
 * - `[.low, .medium, .high, .touch]` => `all-densities`
 * - `[.low]` => `low`
 *
 * This is just an over simplified version....
 */
const getDescriptionFromClasses = (classes) => {
  if (classes.every((x) => /light|dark/.test(x))) {
    if (classes.length > 1) {
      return "both-themes";
    } else {
      if (/light|dark/.exec(classes[0])) {
        return /light|dark/.exec(classes[0])[0];
      } else {
        log("ERROR: ", classes[0], "no light dark?!");
      }
    }
  } else if (classes.every((x) => /low|medium|high|touch/.test(x))) {
    if (classes.length === 4) {
      return "all-densities";
    } else {
      return /low|medium|high|touch/.exec(classes[0])[0];
    }
  } else {
    return classes.join(",").replace(/\./g, "");
  }
};

/**
 * Adds `default` key to token nodes when other key apart from 'value', 'type', and '$' prefixed keys exist,
 * e.g.
 * ```
 * { value: 'a', type: 'color', 'otherState': { value: 'b', type: 'color' } }
 * ```
 * becomes
 * ```
 * { 'default': {value: 'a', type: 'color'}, 'otherState': { value: 'b', type: 'color' } }
 * ```
 * @param {object} obj
 */
const remapWithDefault = (obj) => {
  // log("remapWithDefault", obj);
  const keys = Object.keys(obj);
  // log("remapWithDefault keys", keys);
  if (
    typeof obj === "object" &&
    keys.includes("type") &&
    keys.includes("value") &&
    keys.filter((x) => !x.startsWith("$") && !["type", "value"].includes(x))
      .length > 0
  ) {
    logInfo("remapping default", obj);
    const newObj = { default: { value: obj.value, type: obj.type }, ...obj };
    delete newObj.value;
    delete newObj.type;
    return newObj;
  } else {
    return obj;
  }
};

const walkDownObjToRemap = (obj) => {
  // log("walkDownObjToRemap", obj);
  if (typeof obj === "object") {
    const remapped = remapWithDefault(obj);
    let newObj = {};
    Object.keys(remapped).forEach((key) => {
      const value = remapped[key];
      if (typeof value === "object") {
        newObj[key] = walkDownObjToRemap(value);
      } else {
        newObj[key] = value;
      }
    });
    return newObj;
  } else {
    return obj;
  }
};

/**
 * Write object to file by stringify it
 *
 * @param {object} obj
 * @param {string} filePath
 */
const writeObjToFile = (obj, filePath) => {
  const filePathDir = path.dirname(filePath);
  // log({ filePath, filePathDir });

  if (!fs.existsSync(filePathDir)) {
    // Create dir if not exist
    // log("Creating new dir", filePathDir);
    fs.mkdirSync(filePathDir, { recursive: true });
  } else if (fs.existsSync(filePath)) {
    // delete existing file
    // log("Removed existing file", outputFilePath);
    fs.rmSync(filePath);
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(obj, null, prettyPrintOutputJson ? 2 : undefined),
    { flags: "a" }
  );
  logInfo("Wrote to", filePath);
};

filesArg.forEach((inputFile) => {
  const inputFilePath = path.parse(inputFile);
  const outputFileDir = path.join(
    outputDir,
    path.basename(path.dirname(inputFile))
  );
  const outputFilePath = path.join(outputFileDir, inputFilePath.name + ".json");

  const css = fs.readFileSync(inputFile, "utf8");
  // log(css);
  const ast = parse(css);

  if (splitFileByClass) {
    walk(ast, {
      visit: "StyleSheet",
      enter(root) {
        root.children.forEach((node) => {
          if (node.type !== "Rule") {
            // e.g. skip @rule for animation
            return;
          }
          const classes = [];
          walk(node, {
            visit: "ClassSelector",
            enter(node) {
              classes.push(node.name);
            },
          });
          const description = getDescriptionFromClasses(classes);
          // log({ classes, description });

          // Some way to identify the source of CSS
          const resultObj = { comment: `Generated from ${inputFile}` };

          walk(node, {
            visit: "Declaration",
            enter(node) {
              if (node.value.value) {
                const property = removePrefix(node.property.trim()).split("-");
                let value = node.value.value.trim();

                if (value.startsWith("var")) {
                  // variable reference
                  value = cssVarToReference(value);
                } else if (value.startsWith("calc")) {
                  // store the raw formulae with prefix removed to be manually edited later
                  value = removePrefix(value);
                } else {
                  // raw value
                  // do nothing
                }

                const tokenType = guessTokenType(property, inputFilePath);
                writeObjValue(resultObj, property, value, tokenType);
                // log(resultObj, property, value);
              } else {
                // find out what's the situation here
                // debugger;
              }
            },
          });

          const outputFilePathParts = path.join(
            outputFileDir,
            inputFilePath.name + "-" + description + ".json"
          );

          const remapped = walkDownObjToRemap(resultObj);
          writeObjToFile(remapped, outputFilePathParts);
        });
      },
      leave(node) {
        return walk.skip;
      },
    });
  } else {
    const resultObjFull = {};

    walk(ast, {
      visit: "Rule",
      enter(node) {
        const declarations = [];
        node.block.children.forEach((x) => {
          if (x.type === "Declaration") {
            if (x.value.value) {
              const property = removePrefix(x.property.trim()).split("-");
              let value = x.value.value.trim();

              if (value.startsWith("var")) {
                // variable reference
                value = cssVarToReference(value);
              } else if (value.startsWith("calc")) {
                // store the raw formular with prefix removed to be manually edited later
                value = removePrefix(value);
              } else {
                // raw value
                // do nothing
              }

              const tokenType = guessTokenType(property, inputFilePath);
              writeObjValue(resultObjFull, property, value, tokenType);
              // log(resultObj, property, value);
            } else {
              // find out what's the situation here
              // debugger;
            }
          }
        });
      },
    });

    writeObjToFile(resultObjFull, outputFilePath);
  }
});
