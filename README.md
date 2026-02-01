# Compass Tokens

A design token system for the Compass Design System, providing a single source of truth for design decisions across React and React Native applications.

## Overview

This repository contains design tokens following the [Design Tokens Community Group (DTCG)](https://tr.designtokens.org/format/) specification. Tokens are organized by category and split into foundation and theme layers.

## Token Structure

```
tokens/
  src/
    foundation/
      color.json        # Foundation color palette (92 colors)
      spacing.json      # Foundation spacing scale (8 sizes)
      radius.json       # Border radius scale (6 sizes)
      border.json       # Border width, style, emphasis (3 widths, 3 styles, 3 emphasis)
      elevation.json    # Elevation/shadow scale (6 levels)
      opacity.json      # Opacity scale (12 levels)
      typography.json   # Coming soon
    semantic/
      attachment.json   # Attachment icon colors (file type indicators)
    themes/
      denim.json        # Denim theme (default light with indigo sidebar)
      sapphire.json     # Sapphire theme (light with blue sidebar)
      quartz.json       # Quartz theme (light with light gray sidebar)
      onyx.json         # Onyx theme (dark mode)
      indigo.json       # Indigo theme (dark mode with indigo tones)
```

### Foundation Tokens
Foundation tokens are the base-level design decisions - raw color values, spacing units, font families, etc. These are primitive values that don't reference other tokens.

**Locations**: 
- `tokens/src/foundation/color.json` - Color palette
- `tokens/src/foundation/spacing.json` - Spacing scale
- `tokens/src/foundation/radius.json` - Border radius scale
- `tokens/src/foundation/border.json` - Border width & style primitives
- `tokens/src/foundation/elevation.json` - Elevation/shadow scale
- `tokens/src/foundation/opacity.json` - Opacity scale

### Semantic Tokens
Semantic tokens are component-specific tokens that reference foundation tokens but are theme-independent. These provide consistent meaning across all themes.

**Locations**: 
- `tokens/src/semantic/attachment.json` - Attachment icon colors

Example: Attachment colors for file type icons (blue for documents, green for spreadsheets, etc.)

### Theme Tokens
Theme tokens are semantic tokens that reference foundation tokens. They provide meaning and context to the raw values (e.g., "button background", "primary text color").

**Available Themes**:
- `tokens/src/themes/denim.json` - Default light theme with indigo sidebar
- `tokens/src/themes/sapphire.json` - Light theme with blue sidebar
- `tokens/src/themes/quartz.json` - Light theme with light gray sidebar
- `tokens/src/themes/onyx.json` - Dark theme
- `tokens/src/themes/indigo.json` - Dark theme with indigo tones

Theme tokens use the DTCG reference syntax to point to foundation tokens:

```json
{
  "link-color": {
    "$type": "color",
    "$value": "{color.foundation.blue.500}"
  }
}
```

## Color Tokens

### Foundation Colors

Foundation colors are organized by color family with numeric scales:

- **blue**: 100-800 (8 shades)
- **indigo**: 100-800 (8 shades)
- **neutral**: 0-1200 (25 shades, including 0 for white)
- **cyan**: 100-800 (8 shades)
- **purple**: 100-800 (8 shades)
- **teal**: 100-800 (8 shades)
- **yellow**: 100-800 (8 shades)
- **orange**: 100-800 (8 shades)
- **green**: 100-800 (8 shades)
- **red**: 100-800 (8 shades)

Lower numbers represent lighter shades, higher numbers represent darker shades.

### Semantic Colors - Attachments

Attachment colors are used for file type icon indicators and are consistent across all themes:

- **blue** - Document files (e.g., .docx, .pdf, .txt)
- **green** - Spreadsheet files (e.g., .xlsx, .csv)
- **orange** - Presentation files (e.g., .pptx, .key)
- **red** - Video/media files (e.g., .mp4, .mov)
- **grey** - Generic/unknown file types

These tokens reference foundation colors and are theme-independent.

### Theme Colors

All themes provide the same semantic color tokens for the Mattermost interface. The themes differ in their color choices to provide different visual styles:

#### Available Themes

- **Denim** - Default light theme with indigo sidebar (`#1E325C`)
- **Sapphire** - Light theme with bright blue sidebar (`#1543A3`)
- **Quartz** - Light theme with light gray sidebar (high contrast)
- **Onyx** - Dark theme with dark gray backgrounds
- **Indigo** - Dark theme with indigo-tinted backgrounds

#### Semantic Tokens (all themes)

**UI Structure**:
- `center-channel-bg` - Main content area background
- `center-channel-color` - Main content text color
- `sidebar-bg` - Sidebar background
- `sidebar-text` - Sidebar text color
- `sidebar-header-bg` - Sidebar header background
- `sidebar-text-hover-bg` - Sidebar item hover state

**Interactive Elements**:
- `link-color` - Hyperlink color
- `button-bg` - Primary button background
- `button-color` - Button text color

**Status Indicators**:
- `online-indicator` - Online presence indicator
- `away-indicator` - Away presence indicator
- `dnd-indicator` - Do not disturb indicator

**Messaging**:
- `mention-bg` - Mention badge background
- `mention-highlight-bg` - Mention highlight background
- `new-message-separator` - New message divider
- `error-text` - Error message text

**Note**: Theme tokens with opacity variants (e.g., `-8`, `-16`, `-24`) are excluded from the source tokens and will be generated during the build process.

## Spacing Tokens

### Foundation Spacing

Foundation spacing tokens provide a consistent spacing scale for layout, padding, margins, and gaps:

| Token | Value | Use Cases |
|-------|-------|-----------|
| `xxxxs` | 4 | Tiny gaps, icon padding |
| `xs` | 8 | Compact spacing, small gaps |
| `m` | 12 | Medium spacing, form element gaps |
| `l` | 16 | Standard spacing, card padding |
| `xl` | 20 | Large spacing, section padding |
| `xxl` | 24 | Extra large spacing, component separation |
| `xxxl` | 32 | Section spacing, major layout gaps |
| `xxxxl` | 40 | Large section spacing, page margins |

The spacing scale is designed to work with common layout patterns and maintain visual rhythm throughout the interface.

**Note**: Values are unitless for cross-platform compatibility. Build tools add platform-specific units (px for web, dp for Android, pt for iOS).

### Token Format

```json
{
  "spacing": {
    "foundation": {
      "l": {
        "$type": "dimension",
        "$value": 16
      }
    }
  }
}
```

## Border Radius Tokens

### Foundation Radius

Foundation radius tokens provide consistent border-radius values for UI elements:

| Token | Value | Use Cases |
|-------|-------|-----------|
| `xs` | 2 | Subtle rounding for small elements, badges |
| `s` | 4 | Buttons, inputs, small cards, chips |
| `m` | 8 | Cards, modals, panels, tooltips |
| `l` | 12 | Large cards, containers, sidebars |
| `xl` | 16 | Prominent containers, hero elements, large modals |
| `full` | 50% | Circular elements, pills, fully rounded buttons, avatars |

The radius scale provides visual consistency and helps establish the design system's aesthetic.

**Note**: Numeric values are unitless for cross-platform compatibility (except `full` which uses %). Build tools add platform-specific units.

### Token Format

```json
{
  "radius": {
    "foundation": {
      "m": {
        "$type": "dimension",
        "$value": 8
      }
    }
  }
}
```

## Border Tokens

### Foundation Border

Foundation border tokens provide primitive values for border width and style:

#### Border Width

| Token | Value | Use Cases |
|-------|-------|-----------|
| `thin` | 1 | Standard UI borders, dividers, card edges |
| `medium` | 2 | Emphasis, selected states, focus rings |
| `thick` | 4 | Strong emphasis, progress indicators |

#### Border Style

| Token | Value | Use Cases |
|-------|-------|-----------|
| `solid` | solid | Standard borders, most UI elements |
| `dashed` | dashed | Placeholder states, drag zones |
| `dotted` | dotted | Subtle indicators, decorative elements |

#### Border Emphasis

| Token | Value | Percentage | Use Cases |
|-------|-------|------------|-----------|
| `subtle` | 0.08 | 8% | Light dividers, card separators |
| `default` | 0.12 | 12% | Standard UI element borders |
| `strong` | 0.16 | 16% | Prominent dividers, focus states, emphasis |

Border emphasis tokens control visual weight by referencing foundation opacity values. Combined with theme colors and border width/style at build time.

### Token Format

```json
{
  "border": {
    "foundation": {
      "width": {
        "thin": {
          "$type": "dimension",
          "$value": 1
        }
      },
      "style": {
        "solid": {
          "$type": "string",
          "$value": "solid"
        }
      },
      "emphasis": {
        "default": {
          "$type": "number",
          "$value": "{opacity.foundation.12}"
        }
      }
    }
  }
}
```

**Usage**: Combine width + style + theme color + emphasis to create complete border declarations.

**Example**: `border.width.thin` (1) + `border.style.solid` + theme color + `border.emphasis.default` (12%) → `solid 1px rgba(var(--center-channel-color-rgb), 0.12)`

**Note**: Width values are unitless. Build tools add platform-specific units (px, dp, pt) during transformation.

## Elevation Tokens

### Foundation Elevation

Foundation elevation tokens define box-shadow values for creating depth and visual hierarchy:

| Token | Shadow | Use Cases |
|-------|--------|-----------|
| `1` | 0 2px 3px rgba(0,0,0,0.08) | Subtle elevation - hover states, small dropdowns |
| `2` | 0 4px 6px rgba(0,0,0,0.12) | Low elevation - buttons, chips, small cards |
| `3` | 0 6px 14px rgba(0,0,0,0.12) | Medium elevation - cards, menus, tooltips |
| `4` | 0 8px 24px rgba(0,0,0,0.12) | High elevation - modals, popovers, floating panels |
| `5` | 0 12px 32px rgba(0,0,0,0.12) | Higher elevation - dialogs, drawers |
| `6` | 0 20px 32px rgba(0,0,0,0.12) | Highest elevation - full-screen overlays, important modals |

Elevation creates visual hierarchy by simulating depth through shadows. Higher numbers indicate elements that float further above the surface.

### Token Format

```json
{
  "elevation": {
    "foundation": {
      "3": {
        "$type": "shadow",
        "$value": {
          "offsetX": 0,
          "offsetY": 6,
          "blur": 14,
          "spread": 0,
          "color": "#0000001F"
        }
      }
    }
  }
}
```

**CSS Output**: `box-shadow: 0 6px 14px 0 #0000001F;`

**Note**: Shadow offset/blur/spread values are unitless. Build tools add platform-specific units during transformation.

## Opacity Tokens

### Foundation Opacity

Foundation opacity tokens provide a consistent transparency scale used for color variations, overlays, and effects:

| Token | Value | Percentage | Use Cases |
|-------|-------|------------|-----------|
| `4` | 0.04 | 4% | Very subtle transparency |
| `8` | 0.08 | 8% | Light borders, subtle overlays |
| `12` | 0.12 | 12% | Default borders, elevation shadows |
| `16` | 0.16 | 16% | Dark borders, hover states |
| `24` | 0.24 | 24% | Medium transparency |
| `32` | 0.32 | 32% | Visible transparency |
| `40` | 0.40 | 40% | Moderate transparency |
| `48` | 0.48 | 48% | Half transparency |
| `56` | 0.56 | 56% | Strong transparency |
| `64` | 0.64 | 64% | Icon opacity, prominent transparency |
| `75` | 0.75 | 75% | Offline indicator, mostly opaque |
| `80` | 0.80 | 80% | Icon hover state, high opacity |

These opacity values are used by build tools to generate color variants (e.g., `center-channel-color-8`, `center-channel-color-16`).

### Token Format

```json
{
  "opacity": {
    "foundation": {
      "12": {
        "$type": "number",
        "$value": 0.12
      }
    }
  }
}
```

**Usage**: Apply to colors via `rgba()` - e.g., `rgba(var(--center-channel-color-rgb), 0.12)`

### Token Format

All tokens follow the DTCG format:

```json
{
  "$schema": "https://tr.designtokens.org/format/",
  "color": {
    "foundation": {
      "blue": {
        "500": {
          "$type": "color",
          "$value": "#1C58D9"
        }
      }
    }
  }
}
```

### Source Format

**Source tokens store HEX values only**. This keeps the source of truth simple and maintainable.

### Derived Formats

RGB and RGBA values will be generated programmatically from the HEX source tokens during the build process. This ensures consistency and reduces maintenance overhead.

## Usage

### Installation

```bash
npm install @mattermost/compass-tokens
```

### Importing Tokens

```javascript
// Import foundation tokens
import foundationColors from '@mattermost/compass-tokens/tokens/src/foundation/color.json';
import foundationSpacing from '@mattermost/compass-tokens/tokens/src/foundation/spacing.json';
import foundationRadius from '@mattermost/compass-tokens/tokens/src/foundation/radius.json';
import foundationBorder from '@mattermost/compass-tokens/tokens/src/foundation/border.json';
import foundationElevation from '@mattermost/compass-tokens/tokens/src/foundation/elevation.json';
import foundationOpacity from '@mattermost/compass-tokens/tokens/src/foundation/opacity.json';

// Access a specific color
const primaryBlue = foundationColors.color.foundation.blue['500'].$value;
// Returns: "#1C58D9"

// Access spacing values
const standardSpacing = foundationSpacing.spacing.foundation.l.$value;
// Returns: 16

// Access radius values
const cardRadius = foundationRadius.radius.foundation.m.$value;
// Returns: 8

// Access border primitives
const borderWidth = foundationBorder.border.foundation.width.thin.$value;
// Returns: 1
const borderStyle = foundationBorder.border.foundation.style.solid.$value;
// Returns: "solid"
const borderEmphasis = foundationBorder.border.foundation.emphasis.default.$value;
// Returns: "{opacity.foundation.12}" (reference to foundation opacity)

// Access elevation (box-shadow) values
const cardElevation = foundationElevation.elevation.foundation['3'].$value;
// Returns: shadow object with offsetX: 0, offsetY: 6, blur: 14, spread: 0, color

// Access opacity values
const borderOpacity = foundationOpacity.opacity.foundation['12'].$value;
// Returns: 0.12

// Import semantic tokens (theme-independent)
import attachmentColors from '@mattermost/compass-tokens/tokens/src/semantic/attachment.json';

// Access attachment colors for file type indicators
const docColor = attachmentColors.color.semantic.attachment.blue.$value;
// Returns: "{color.foundation.blue.300}" (reference to foundation token)

// Import theme tokens (any theme)
import denimTheme from '@mattermost/compass-tokens/tokens/src/themes/denim.json';
import sapphireTheme from '@mattermost/compass-tokens/tokens/src/themes/sapphire.json';
import quartzTheme from '@mattermost/compass-tokens/tokens/src/themes/quartz.json';
import onyxTheme from '@mattermost/compass-tokens/tokens/src/themes/onyx.json';
import indigoTheme from '@mattermost/compass-tokens/tokens/src/themes/indigo.json';

// Access theme semantic colors
const buttonBg = denimTheme.color.theme.denim['button-bg'].$value;
// Returns: "{color.foundation.blue.500}" (reference to foundation token)
```

### React / React Native

Detailed usage examples for React and React Native will be added as the token system matures and build tools are configured.

## Development

### Folder Structure

The token system follows a three-tier architecture:

- **`tokens/src/foundation/`** - Primitive design values (colors, spacing, typography, etc.)
- **`tokens/src/semantic/`** - Component-specific tokens that are theme-independent (e.g., attachment colors, status indicators)
- **`tokens/src/themes/`** - Theme-specific semantic tokens (e.g., sidebar colors, button colors)

This structure makes it easy to:
- Add new foundation token categories (spacing, typography, radius, etc.)
- Create component-specific tokens that work across all themes
- Create multiple theme variants
- Keep primitive values separate from semantic meanings

### Token Source

Foundation color tokens are extracted from Figma variables and normalized to uppercase HEX format.

### Platform-Agnostic Design

**Unitless Dimension Values**: All dimension tokens (spacing, radius, border width, elevation) use unitless numbers for maximum cross-platform compatibility:

- **Source tokens**: Store pure numbers (e.g., `16`, `8`, `1`)
- **Build transformation**: Add platform-specific units during build

#### Platform Transformations

| Platform | Example Input | Output | Unit |
|----------|---------------|--------|------|
| **Web** | `spacing.l: 16` | `16px` | pixels |
| **React Native** | `spacing.l: 16` | `16` | density-independent |
| **iOS** | `spacing.l: 16` | `16pt` | points |
| **Android** | `spacing.l: 16` | `16dp` | density-independent pixels |

#### Exception: Percentage Values

Relative values like `radius.full: "50%"` keep their units since they're context-dependent.

#### Build Tools

Use tools like [Style Dictionary](https://amzn.github.io/style-dictionary) to transform tokens:

```javascript
// style-dictionary.config.js
module.exports = {
  platforms: {
    web: {
      transformGroup: "web",  // Adds 'px' suffix
      buildPath: "dist/web/",
      files: [{ destination: "tokens.css", format: "css/variables" }]
    },
    reactNative: {
      transformGroup: "react-native",  // No units
      buildPath: "dist/rn/",
      files: [{ destination: "tokens.js", format: "javascript/module" }]
    }
  }
};
```

### Future Enhancements

- Build scripts for platform-specific outputs (iOS, Android, Web, CSS variables)
- Automatic RGB/RGBA generation with opacity variants
- Token resolution (convert references to actual values)
- Typography tokens
- Additional component tokens

## Rules and Constraints

### For AI Assistants Working with This Token System

**Critical Rules**:

1. **NEVER add units to dimension tokens** - All spacing, radius, border width, and elevation values MUST be unitless numbers (Exception: `radius.full` uses `50%`)
2. **NEVER create opacity variants in source tokens** - Tokens ending in `-8`, `-16`, `-24`, etc. are generated at build time, not authored
3. **Colors must be uppercase HEX** - Foundation colors: `#1C58D9` not `#1c58d9`
4. **Token references use curly braces** - `{color.foundation.blue.500}` not `color.foundation.blue.500`
5. **Respect the three-tier architecture**:
   - **Foundation** = primitives (raw values, no references)
   - **Semantic** = component-specific, theme-independent (may reference foundation)
   - **Theme** = theme-specific UI tokens (may reference foundation or semantic)
6. **Follow DTCG format** - All tokens require `$type` and `$value`, optional `$description`
7. **Border tokens are primitives** - Border width/style/emphasis belong in `foundation/`, not semantic
8. **Figma is the source of truth** - Extract tokens from Figma variables when adding new foundation tokens

## Contributing

This repository is part of the Mattermost Compass Design System. Contributions should maintain consistency with design decisions made in Figma.

## License

MIT
