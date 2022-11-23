- [Theme Flow App](#theme-flow-app) visualize relationship of theme layers and see live updates
- [Figma Style Generator Plugin](#figma-style-generator-plugin) generate Figma styles from JSON
- [Generic Style Generator](#generic-style-generator) generate cross platform styles from JSON
- [Theme Css to Json Convertor](#theme-css-to-json-convertor) coverts current theme CSS to JSON

<h2 id="theme-flow-app">Theme Flow App</h2>

Added an experimental theme editor using flow chart. Try update the edge "actionable-cta-background" from "blue 600" to "orange 900" by dragging, and observe the button at the bottom of the preview section to update color.

before

![theme flow default](https://user-images.githubusercontent.com/5257855/170320433-f17db108-f89a-4269-92ca-e4fbbfa7553d.png)

after

![theme flow override color](https://user-images.githubusercontent.com/5257855/170300618-31783abd-2f56-4567-88f7-1218ce64eb77.png)

### How this works

⚠️ There is a lot of hacking and bugs, this is just a prototype to show the concept.

- Define color palette, some actionable and button css using theme editor's `JSONByScope[]` format in `playground/theme-flow-app/src/theme.ts`
- Convert the JSON object to CSS using existing `parseJSONtoCSS`
- Join CSSs into one `<style>` tag and insert into `<head>`, so that the styles defined by the graph will be overriding default uitk theme. Search `useHeadStyle` in code for reference.
- Convert the CSS into [React Flow](https://reactflow.dev/) compatible nodes and edges to visualise the relationship
- Upon updating the edge, update the CSS as well as the flow chart itself.

( Below should be solvable by using Style Dictionary, see below [Generic Style Generator](#user-content-generic-style-generator) section)

Below definition doesn't work with `parseToCss`

```
      "foreground": {
          "value": "{uitk.color.grey.400}",
          "type": "color",
          "hover": {
            "value": "{uitk.color.grey.400}",
            "type": "color"
          }
        }
      }
```

This also doesn't work, which the 2nd one will override the 1st one => "--uitk-rate-border: var(--uitk-color-grey-90);"

```
        "border": {
          "undo": {
            "value": "{uitk.color.orange.600}",
            "type": "color"
          }
        },
        "border": {
          "value": "{uitk.color.grey-90}",
          "type": "color"
        }
```

### Findings

- Characteristics code/design naming difference: e.g. `actionable` "text" v.s. "text-color"
- Component CSS variant naming difference. e.g. can't do `button.cta.background` like `actionable.cta.background`, but rather `.uitkButton-cta { background ... }`

<h2 id="figma-style-generator-plugin">Figma Style Generator Plugin</h2>

Trying to find out a reverse way of exporting styles from Figma like this [Export to CSS variable plugin](https://github.com/origami-z/figma-export-to-css-variables)

Import development manifest in Figma at `tooling/figma-style-generator/manifest.json`

<img width="442" alt="Figma Style Generator Plugin UI Part 1" src="https://user-images.githubusercontent.com/5257855/166314400-cc864f2b-d7c8-4223-9bc5-d8d845a6247f.png">

<img width="442" alt="Figma Style Generator Plugin UI Part 2" src="https://user-images.githubusercontent.com/5257855/170301786-8c6d33b5-6e1a-4e32-b45c-f096946b7055.png">

The plugin will parse the JSON and create local paint styles.

<img width="244" alt="Figma local paint styles" src="https://user-images.githubusercontent.com/5257855/166314503-0e703601-648f-4c88-8a98-42d7acf1dcf8.png">

Since Figma doesn't support linking styles, color value is resolved in the plugin and _description_ created will contain referenced name.

<img width="481" alt="actionable cta background style" src="https://user-images.githubusercontent.com/5257855/166314667-2138639c-265d-49a8-991a-58d8b836c9b6.png">

### Findings

- It should be useful to show the reference name in style description before Figma officially support linking, to designers would get familiar with characteristics system used.
- Potentially Figma's [`setplugindata `](https://www.figma.com/plugin-docs/api/properties/nodes-setplugindata/) will also help down the line to store reference within Figma

<h2 id="generic-style-generator">Generic Style Generator</h2>

Explore [Style dictionary](https://amzn.github.io/style-dictionary/) to generate CSS + other platforms (e.g. JS for react native, Swift for iOS) from shared styles.

From `tooling/generic-style-generator/tokens` to `tooling/generic-style-generator/build`

- Prefix `uitk`, so no need to include it in the source (compare with above trails)
- Use `js` to do calculations for **sizes**, which doesn't need to use lib like [`expr-eval`](https://github.com/silentmatt/expr-eval) Figma token uses to support math
- Custom formats `"uitk/css/themes/*"` & `"uitk/css/densities/*"` to not use `:root` in the output, [docs](https://amzn.github.io/style-dictionary/#/api?id=registerformat)
- Custom filter `"uitk/colors/*"` to include all colors (e.g. palettes, and charateristics), [docs](https://amzn.github.io/style-dictionary/#/transforms?id=defining-custom-transforms)
- Custom transform group `"uitk/css"` to use `px` for spacing, [docs](https://amzn.github.io/style-dictionary/#/api?id=registertransformgroup)
- Custom format `"uitk/css/themes/light"` in combination with custom filter `"uitk/filter/colors/palette-light"` to generate light theme only tokens
- Custom format `"uitk/css/density/medium"` in combination with custom filter `"uitk/filter/sizes/density/medium"` to generate medium density only sizing tokens
- **Note**: given we have the same set of tokens for different theme/density, Style Dictionary will throw error of "conflict definition". So a split of source with separate config will be needed, e.g. `"tokens/**/light/*.json",` is used in `config-light.json`

- [x] In Figma, for styles grouping to make sense, "Default" needs to be used along side of "Hover" / "Active" states. Given we don't want them in the CSS variable names, we can put "default" in the JSON definition and remove it while converting to CSS. We need to write a custom `formattedVariables` to remove `-default` suffix.
- [x] To fix below warning, is it better to generate light / dark theme into a single CSS, not worry about duplicating variables for both themes currently defined in `.uitk-light, .uitk-dark`?

> ⚠️ build/css/palette-dark.css
> While building palette-dark.css, filtered out token references were found; output may be unexpected. Here are the references that are used but not defined in the file
> color.blue.500
> color.white

Example CSS variables

```css
/** colors.css */
.uitk-light, .uitk-dark {
  --uitk-color-transparent: rgba(0, 0, 0, 0);
  --uitk-color-white: #ffffff;
  --uitk-color-black: #000000;
  --uitk-color-red-10: #ffe3e0;
  --uitk-color-red-20: #ffcfc9;
  --uitk-color-red-30: #ffbbb2;
  --uitk-color-red-40: #ffa79c;
  --uitk-color-red-50: #ff9485;
  --uitk-color-red-100: #ff806f;
  --uitk-color-red-200: #ff6c58;
  --uitk-color-red-300: #ff5942;
```

```css
/** palettes-light.css */
.uitk-light {
/*...*/
  --uitk-palette-rate-border: var(--uitk-color-grey-90);
  --uitk-palette-positive-foreground: var(--uitk-color-green-700);
  --uitk-palette-neutral-scrim-medium: rgba(0, 0, 0, var(--uitk-opacity-scrim-low));
  --uitk-palette-neutral-scrim-low: rgba(255, 255, 255, var(--uitk-opacity-scrim-medium));
  --uitk-palette-neutral-border-disabled-high: rgba(132, 135, 142, var(--uitk-opacity-border));
  --uitk-palette-neutral-border-disabled-medium: rgba(197, 201, 208, var(--uitk-opacity-border));
  --uitk-palette-neutral-border-high: var(--uitk-color-grey-90);
  --uitk-palette-neutral-border-medium: var(--uitk-color-grey-60);
  --uitk-palette-neutral-border-low: var(--uitk-color-grey-30);
  --uitk-palette-neutral-background-high: var(--uitk-color-grey-20);
  --uitk-palette-neutral-background-medium: var(--uitk-color-white);
```

```css
/**characteristics.css*/
.uitk-light,
.uitk-dark {
  --uitk-actionable-secondary-background: var(
    --uitk-palette-interact-secondary-background
  );
  --uitk-actionable-secondary-foreground: var(
    --uitk-palette-interact-secondary-foreground
  );
  --uitk-actionable-cta-background: var(--uitk-palette-interact-cta-background);
  --uitk-actionable-cta-foreground: var(--uitk-palette-interact-cta-foreground);
  --uitk-actionable-primary-background: var(
    --uitk-palette-interact-primary-background
  );
  --uitk-actionable-primary-foreground: var(
    --uitk-palette-interact-primary-foreground
  );
}
```

```css
/** sizes_all.css */
.uitk-density-touch, .uitk-density-low, .uitk-density-medium, .uitk-density-high {
  --uitk-size-sharktooth-width: 10px;
  --uitk-size-sharktooth-height: 5px;
  --uitk-size-graphic-large: 48px;
  --uitk-size-graphic-medium: 24px;
  --uitk-size-graphic-small: 12px;
  --uitk-size-basis-unit: 4px;
```

```css
/** sizes_medium.css */
.uitk-density-medium {
  --uitk-size-appheader: 44px;
  --uitk-size-adornment: 32px;
  --uitk-size-base: 28px;
  --uitk-size-unit: 8px;
```

Example Swift code for iOS

```swift
// StyleDictionaryColor.swift
import UIKit

public enum StyleDictionaryColor {
    public static let uitkBlack = UIColor(red: 0.000, green: 0.000, blue: 0.000, alpha: 1)
    public static let uitkBlue10 = UIColor(red: 0.796, green: 0.906, blue: 0.976, alpha: 1)
    public static let uitkBlue100 = UIColor(red: 0.392, green: 0.694, blue: 0.894, alpha: 1)
    public static let uitkBlue1000 = UIColor(red: 0.137, green: 0.184, blue: 0.220, alpha: 1)
    public static let uitkBlue20 = UIColor(red: 0.718, green: 0.871, blue: 0.965, alpha: 1)
    public static let uitkBlue200 = UIColor(red: 0.294, green: 0.624, blue: 0.847, alpha: 1)
    public static let uitkBlue2000 = UIColor(red: 0.153, green: 0.235, blue: 0.310, alpha: 1)

```

<h2 id="theme-css-to-json-convertor">Theme Css to Json Convertor</h2>

`./tooling/theme-css-to-json` is using `css-tree` to parse CSS variables and convert to JSON which will be compatible with Style Dictionary, which eventually would replace RegExp based `tooling/theme-editor/src/helpers/parseToJson.ts`

- [x] Split each CSS class group into different files, so the output JSON to be used by the Generic Generator above.

`build` in `tooling/theme-css-to-json/package.json` will output below

<img width="237" alt="theme css to json output" src="https://user-images.githubusercontent.com/5257855/170277647-a06f4c73-f546-496b-ad6f-e02db966bd44.png">

`color-both-themes.json`

```json
{
  "comment": "Generated from ../../packages/theme/css/foundations/color.css",
  "uitk": {
    "color": {
      "white": {
        "value": "rgb(255, 255, 255)",
        "type": "color"
      },
      "black": {
        "value": "rgb(0, 0, 0)",
        "type": "color"
      },
      "red": {
        "10": {
          "value": "rgb(255, 227, 224)",
          "type": "color"
        },
        "20": {
          "value": "rgb(255, 207, 201)",
          "type": "color"
        },
```

`fade-both-themes.json`

```json
{
  "comment": "Generated from ../../packages/theme/css/foundations/fade.css",
  "uitk": {
    "color": {
      "blue": {
        "30": {
          "fade": {
            "99": {
              "value": "rgba(164, 213, 244, 0.99)",
              "type": "color"
            }
          }
        },
        "300": {
          "fade": {
            "fill": {
              "value": "rgba(51, 141, 205, var(--uitk-palette-opacity-fill))",
              "type": "color"
            }
          }
        },
```

`palette-light.json`

```json
{
  "comment": "Generated from ../../packages/theme/css/foundations/palette.css",
  "uitk": {
    "palette": {
      "accent": {
        "background": {
          "value": "$uitk.color.blue.500",
          "type": "color"
        },
        "border": {
          "value": "$uitk.color.blue.500",
          "type": "color"
        },
        "foreground": {
          "value": "$uitk.color.white",
          "type": "color"
        }
      },
```

`actionable-both-themes.json`

```json
{
  "actionable": {
    "primary": {
      "foreground": {
        "default": {
          "value": "$uitk.palette.interact.primary.foreground",
          "type": "color"
        },
        "hover": {
          "value": "$uitk.palette.interact.primary.foreground.hover",
          "type": "color"
        },
        "active": {
          "value": "$uitk.palette.interact.primary.foreground.active",
          "type": "color"
        },
        "disabled": {
          "value": "$uitk.palette.interact.primary.foreground.disabled",
          "type": "color"
        }
      },
      "background": {
        "default": {
          "value": "$uitk.palette.interact.primary.background",
          "type": "color"
        },
        "hover": {
          "value": "$uitk.palette.interact.primary.background.hover",
          "type": "color"
        },
        "active": {
          "value": "$uitk.palette.interact.primary.background.active",
          "type": "color"
        },
        "disabled": {
          "value": "$uitk.palette.interact.primary.background.disabled",
          "type": "color"
        }
      },
```

### Findings

- Existing uitk-theme can be converted to JSON format to be used further, e.g. import to Figma plugin, generate code back to CSS that we can use, or js files to be used to experiment with React Native
- Further work needs to be done to support tokens more than just color and sizing, e.g. each token has a `type` which needs to be recognizable by other ecosystem.
