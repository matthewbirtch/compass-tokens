/**
 * Compass Token Sync - Figma Plugin
 * Syncs foundation and semantic color variables from Figma to GitHub repository
 */

// Configuration
const GITHUB_REPO = 'matthewbirtch/compass-tokens';

// Token file paths
const TOKEN_FILES = {
  FOUNDATION_COLOR: 'tokens/src/foundation/color.json',
  SEMANTIC_ATTACHMENT: 'tokens/src/semantic/attachment.json',
  FOUNDATION_RADIUS: 'tokens/src/foundation/radius.json',
  FOUNDATION_SPACING: 'tokens/src/foundation/spacing.json',
  TYPOGRAPHY_FOUNDATION: 'tokens/src/foundation/typography.json',
  TYPOGRAPHY_SEMANTIC: 'tokens/src/semantic/typography.json',
  THEME_DENIM: 'tokens/src/themes/denim.json',
  THEME_SAPPHIRE: 'tokens/src/themes/sapphire.json',
  THEME_QUARTZ: 'tokens/src/themes/quartz.json',
  THEME_ONYX: 'tokens/src/themes/onyx.json',
  THEME_INDIGO: 'tokens/src/themes/indigo.json'
};

// Theme mode to file mapping
const THEME_MODE_TO_FILE: { [key: string]: string } = {
  'Denim': TOKEN_FILES.THEME_DENIM,
  'Sapphire': TOKEN_FILES.THEME_SAPPHIRE,
  'Quartz': TOKEN_FILES.THEME_QUARTZ,
  'Onyx': TOKEN_FILES.THEME_ONYX,
  'Indigo': TOKEN_FILES.THEME_INDIGO
};

// Token patterns
const FOUNDATION_COLOR_PATTERN = /^(blue|indigo|neutral|cyan|purple|teal|yellow|orange|green|red)\/\d+$/;
const SEMANTIC_ATTACHMENT_PATTERN = /^attachment\/(blue|green|orange|red|grey)$/;
const FOUNDATION_RADIUS_PATTERN = /^radius-(xs|s|m|l|xl|full)$/;
const FOUNDATION_SPACING_PATTERN = /^spacing-(xxxxs|xs|m|l|xl|xxl|xxxl|xxxxl)$/;
const TYPOGRAPHY_FONT_FAMILY_PATTERN = /^font\/family\/(heading|body|code)$/;
const TYPOGRAPHY_FONT_SIZE_PATTERN = /^font\/size\/(25|50|75|100|200|300|400|500|600|700|800|900|1000)$/;
const TYPOGRAPHY_FONT_WEIGHT_PATTERN = /^font\/weight\/(light|regular|semi-bold|bold)$/;
const TYPOGRAPHY_LINE_HEIGHT_PATTERN = /^line-height\/(heading|body)\/\d+$/;
const TYPOGRAPHY_LETTER_SPACING_PATTERN = /^letter-spacing\/(tight-2|tight-1|normal|wide-1|wide-2)$/;

// Token category definitions
interface TokenCategory {
  type: string;
  path: string;
  pattern: RegExp;
  variableType: 'COLOR' | 'FLOAT' | 'STRING';
  subtype?: string;
}

const TOKEN_CATEGORIES: TokenCategory[] = [
  { type: 'foundation-color', path: TOKEN_FILES.FOUNDATION_COLOR, pattern: FOUNDATION_COLOR_PATTERN, variableType: 'COLOR' },
  { type: 'semantic-attachment', path: TOKEN_FILES.SEMANTIC_ATTACHMENT, pattern: SEMANTIC_ATTACHMENT_PATTERN, variableType: 'COLOR' },
  { type: 'foundation-radius', path: TOKEN_FILES.FOUNDATION_RADIUS, pattern: FOUNDATION_RADIUS_PATTERN, variableType: 'FLOAT' },
  { type: 'foundation-spacing', path: TOKEN_FILES.FOUNDATION_SPACING, pattern: FOUNDATION_SPACING_PATTERN, variableType: 'FLOAT' },
  { type: 'typography-foundation', path: TOKEN_FILES.TYPOGRAPHY_FOUNDATION, pattern: TYPOGRAPHY_FONT_FAMILY_PATTERN, variableType: 'STRING', subtype: 'fontFamily' },
  { type: 'typography-foundation', path: TOKEN_FILES.TYPOGRAPHY_FOUNDATION, pattern: TYPOGRAPHY_FONT_SIZE_PATTERN, variableType: 'FLOAT', subtype: 'fontSize' },
  { type: 'typography-foundation', path: TOKEN_FILES.TYPOGRAPHY_FOUNDATION, pattern: TYPOGRAPHY_FONT_WEIGHT_PATTERN, variableType: 'FLOAT', subtype: 'fontWeight' },
  { type: 'typography-foundation', path: TOKEN_FILES.TYPOGRAPHY_FOUNDATION, pattern: TYPOGRAPHY_FONT_WEIGHT_PATTERN, variableType: 'STRING', subtype: 'fontWeight' },
  { type: 'typography-foundation', path: TOKEN_FILES.TYPOGRAPHY_FOUNDATION, pattern: TYPOGRAPHY_LINE_HEIGHT_PATTERN, variableType: 'FLOAT', subtype: 'lineHeight' },
  { type: 'typography-foundation', path: TOKEN_FILES.TYPOGRAPHY_FOUNDATION, pattern: TYPOGRAPHY_LETTER_SPACING_PATTERN, variableType: 'FLOAT', subtype: 'letterSpacing' }
];

// File configuration interface
interface FileConfig {
  fileId: string;
  fileName: string;
  tokenTypes: string[];
}

// Storage keys
const STORAGE_KEYS = {
  GITHUB_TOKEN: 'github-token',
  LAST_SYNC: 'last-sync',
  FILE_CONFIGS: 'file-configs'
};

// Show UI
figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: 'Compass Token Sync'
});

// Initialize plugin
async function initialize() {
  // Load saved GitHub token
  const githubToken = await figma.clientStorage.getAsync('github-token');
  const lastSync = await figma.clientStorage.getAsync('last-sync');
  
  figma.ui.postMessage({
    type: 'init',
    data: {
      hasToken: !!githubToken,
      lastSync: lastSync || null
    }
  });
}

/**
 * Categorize a variable by its naming pattern and type
 */
function categorizeVariable(name: string, resolvedType: string): TokenCategory | null {
  for (const category of TOKEN_CATEGORIES) {
    if (category.pattern.test(name) && category.variableType === resolvedType) {
      return category;
    }
  }
  return null;
}

/**
 * Check if a variable name matches the foundation color pattern
 */
function isFoundationColor(name: string): boolean {
  return FOUNDATION_COLOR_PATTERN.test(name);
}

/**
 * Check if a variable name matches the semantic attachment pattern
 */
function isSemanticAttachment(name: string): boolean {
  return SEMANTIC_ATTACHMENT_PATTERN.test(name);
}

/**
 * Convert Figma RGB (0-1) to uppercase HEX
 */
function rgbToHex(rgba: RGBA): string {
  const toHex = (n: number) => {
    const value = Math.round(n * 255);
    return value.toString(16).toUpperCase().padStart(2, '0');
  };
  
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
}

/**
 * Parse foundation color variable name to token path components
 */
function parseFoundationColorName(name: string): { family: string; shade: string } | null {
  const match = name.match(/^([a-z]+)\/(\d+)$/i);
  if (!match) return null;
  
  return {
    family: match[1].toLowerCase(),
    shade: match[2]
  };
}

/**
 * Parse foundation radius variable name
 */
function parseFoundationRadiusName(name: string): { size: string } | null {
  const match = name.match(/^radius-([a-z]+)$/i);
  if (!match) return null;
  
  return {
    size: match[1].toLowerCase()
  };
}

/**
 * Parse foundation spacing variable name
 */
function parseFoundationSpacingName(name: string): { size: string } | null {
  const match = name.match(/^spacing-([a-z]+)$/i);
  if (!match) return null;
  
  return {
    size: match[1].toLowerCase()
  };
}

/**
 * Parse semantic attachment variable name
 */
function parseSemanticAttachmentName(name: string): { color: string } | null {
  const match = name.match(/^attachment\/([a-z]+)$/i);
  if (!match) return null;
  
  return {
    color: match[1].toLowerCase()
  };
}

/**
 * Parse font family string (comma-separated) into array
 */
function parseFontFamily(value: string): string[] {
  return value.split(',').map(s => s.trim());
}

/**
 * Parse typography variable name into property type and value
 */
function parseTypographyVariableName(name: string): { property: string; value: string } | null {
  // Font family: font/family/heading
  let match = name.match(/^font\/family\/([a-z-]+)$/i);
  if (match) {
    let familyName = match[1].toLowerCase();
    // Map "code" to "mono" to match existing token structure
    if (familyName === 'code') {
      familyName = 'mono';
    }
    return {
      property: 'fontFamily',
      value: familyName
    };
  }
  
  // Font size: font/size/200
  match = name.match(/^font\/size\/(\d+)$/i);
  if (match) {
    return {
      property: 'fontSize',
      value: match[1]
    };
  }
  
  // Font weight: font/weight/bold or font/weight/semi-bold
  match = name.match(/^font\/weight\/([a-z-]+)$/i);
  if (match) {
    let weightName = match[1].toLowerCase();
    // Map "semi-bold" to "semibold" to match existing token structure
    if (weightName === 'semi-bold') {
      weightName = 'semibold';
    }
    return {
      property: 'fontWeight',
      value: weightName
    };
  }
  
  // Line height: line-height/heading/24 or line-height/body/200
  // We only care about the numeric value, not the heading/body category
  match = name.match(/^line-height\/(?:heading|body)\/(\d+)$/i);
  if (match) {
    return {
      property: 'lineHeight',
      value: match[1]
    };
  }
  
  // Letter spacing: letter-spacing/tight-1
  match = name.match(/^letter-spacing\/(.+)$/i);
  if (match) {
    return {
      property: 'letterSpacing',
      value: match[1].toLowerCase()
    };
  }
  
  return null;
}

/**
 * Parse semantic typography text style name
 * Examples: "heading/1000", "heading/1000-regular", "body/300-semibold"
 */
function parseSemanticTypographyName(name: string): { category: string; size: string; variant?: string } | null {
  // Match patterns like "Heading 1000" or "Body 300 - Semibold" or "Code 100"
  const match = name.match(/^(Heading|Body|Code)\s+(25|50|75|100|200|300|400|500|600|700|800|900|1000)(?:\s+-\s+(.+))?$/);
  if (!match) return null;
  
  const category = match[1].toLowerCase();
  const size = match[2];
  const variantRaw = match[3];
  
  let variant: string | undefined;
  if (variantRaw) {
    // Normalize variant names
    if (variantRaw === 'All Caps') {
      variant = 'allCaps';
    } else {
      // Convert "Semibold", "Regular", "Light", "Bold" to lowercase
      variant = variantRaw.toLowerCase();
    }
  }
  
  return {
    category,
    size,
    variant
  };
}

/**
 * Map Figma font weight number to foundation weight token name
 */
function mapFontWeightToToken(weight: number): string {
  if (weight <= 300) return 'light';
  if (weight <= 400) return 'regular';
  if (weight <= 600) return 'semibold';
  return 'bold';
}

/**
 * Map Figma letter spacing to foundation token name
 */
function mapLetterSpacingToToken(spacing: number): string {
  if (spacing <= -2) return 'tight-2';
  if (spacing <= -1) return 'tight-1';
  if (spacing <= 0) return 'normal';
  if (spacing <= 1) return 'wide-1';
  return 'wide-2';
}

/**
 * Find the closest line height scale value for a given pixel value
 */
function findClosestLineHeightScale(pixelValue: number, fontSize: number): string {
  // Common line heights mapped to their scale values
  const lineHeightMap: { [key: string]: number } = {
    '25': 16, '50': 16, '75': 16,
    '100': 20,
    '200': 24, '300': 24,
    '400': 28, '500': 28,
    '600': 30,
    '700': 36,
    '800': 40,
    '900': 44,
    '1000': 48
  };
  
  // Find the scale value that matches this pixel value
  for (const [scale, pixels] of Object.entries(lineHeightMap)) {
    if (pixels === pixelValue) {
      return scale;
    }
  }
  
  // If no exact match, return the closest scale for this font size
  // This is a fallback - ideally we'd have exact matches
  return String(Math.round(fontSize * 10 / 2) * 2);
}

/**
 * Custom JSON stringify that preserves key order exactly as specified
 * JavaScript's JSON.stringify reorders numeric-like keys, which breaks our sorting
 */
function stringifyPreservingOrder(obj: any, indent: number = 2, keyOrder?: Map<any, string[]>): string {
  const indentStr = ' '.repeat(indent);
  
  function stringify(value: any, depth: number, path: string = ''): string {
    const currentIndent = indentStr.repeat(depth);
    const nextIndent = indentStr.repeat(depth + 1);
    
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      const items = value.map((item, idx) => `${nextIndent}${stringify(item, depth + 1, `${path}[${idx}]`)}`);
      return `[\n${items.join(',\n')}\n${currentIndent}]`;
    }
    
    if (typeof value === 'object') {
      // Use provided key order if available, otherwise use Object.keys
      const keys = keyOrder?.get(value) || Object.keys(value);
      if (keys.length === 0) return '{}';
      
      const pairs = keys.map(key => {
        const val = stringify(value[key], depth + 1, `${path}.${key}`);
        return `${nextIndent}${JSON.stringify(key)}: ${val}`;
      });
      
      return `{\n${pairs.join(',\n')}\n${currentIndent}}`;
    }
    
    return 'null';
  }
  
  return stringify(obj, 0);
}

/**
 * Extract semantic typography tokens from Figma Text Styles
 */
async function extractSemanticTypographyTokens() {
  const textStyles = await figma.getLocalTextStylesAsync();
  console.log(`Found ${textStyles.length} text styles`);
  if (textStyles.length > 0) {
    console.log('Text style names:', textStyles.map(s => s.name).join(', '));
  }
  
  const tokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    typography: {
      semantic: {
        heading: {},
        body: {},
        code: {}
      }
    }
  };
  
  const stats = {
    processed: 0,
    skipped: 0
  };
  
  for (const style of textStyles) {
    const parsed = parseSemanticTypographyName(style.name);
    
    if (!parsed) {
      console.log(`❌ Skipped: "${style.name}" (doesn't match pattern)`);
      stats.skipped++;
      continue;
    }
    console.log(`✅ Matched: "${style.name}" -> ${parsed.category}/${parsed.size}${parsed.variant ? '-' + parsed.variant : ''}`);
    
    const { category, size, variant } = parsed;
    console.log(`  ✓ Parsed: category=${category}, size=${size}, variant=${variant || 'default'}`);
    
    // Get actual style properties from Figma
    // Font weight is determined by the variant in the name
    let weightToken = 'semibold'; // default for headings
    if (category === 'body') {
      weightToken = variant === 'semibold' ? 'semibold' : 'regular';
    } else if (category === 'heading') {
      if (variant === 'regular') weightToken = 'regular';
      else if (variant === 'light') weightToken = 'light';
      else weightToken = 'semibold'; // default
    }
    
    // Get letter spacing from the style
    let letterSpacingValue = 0;
    if (style.letterSpacing && typeof style.letterSpacing === 'object') {
      if ('unit' in style.letterSpacing && style.letterSpacing.unit === 'PIXELS') {
        letterSpacingValue = style.letterSpacing.value;
      }
    }
    
    console.log(`  Style properties: weightToken=${weightToken}, letterSpacing=${letterSpacingValue}`);
    
    // Map to foundation token references
    const letterSpacingToken = mapLetterSpacingToToken(letterSpacingValue);
    
    // Build token key
    const tokenKey = variant ? `${size}-${variant}` : size;
    
    // Build composite token
    const compositeToken: any = {
      $type: "typography",
      $value: {
        fontFamily: `{typography.foundation.fontFamily.${category}}`,
        fontSize: `{typography.foundation.fontSize.${size}}`,
        fontWeight: `{typography.foundation.fontWeight.${weightToken}}`,
        lineHeight: `{typography.foundation.lineHeight.${size}}`,
        letterSpacing: `{typography.foundation.letterSpacing.${letterSpacingToken}}`
      }
    };
    
    tokens.typography.semantic[category][tokenKey] = compositeToken;
    console.log(`  ✓ Added ${category}.${tokenKey}`);
    stats.processed++;
  }
  
  // Store the correct key order for each category to pass to stringify
  const keyOrderMap = new Map<any, string[]>();
  
  // Sort heading, body, and code tokens by size (ascending)
  ['heading', 'body', 'code'].forEach(category => {
    if (Object.keys(tokens.typography.semantic[category]).length > 0) {
      const categoryObj = tokens.typography.semantic[category];
      const sortedKeys = Object.keys(categoryObj).sort((a, b) => {
        // Extract numeric size from key (e.g., "1000" or "1000-regular")
        const sizeA = parseInt(a.split('-')[0]);
        const sizeB = parseInt(b.split('-')[0]);
        
        // Primary sort: by size (ascending - smallest first)
        if (sizeA !== sizeB) {
          return sizeA - sizeB;
        }
        
        // Secondary sort: by variant (alphabetical)
        // Default (no variant) comes first, then alphabetical
        const variantA = a.includes('-') ? a.substring(a.indexOf('-') + 1) : '';
        const variantB = b.includes('-') ? b.substring(b.indexOf('-') + 1) : '';
        
        if (variantA === '' && variantB !== '') return -1;
        if (variantA !== '' && variantB === '') return 1;
        return variantA.localeCompare(variantB);
      });
      
      // Store the sorted key order for this category object
      keyOrderMap.set(categoryObj, sortedKeys);
    }
  });
  
  // Store key order for the semantic object and main typography object
  keyOrderMap.set(tokens.typography.semantic, ['heading', 'body', 'code']);
  keyOrderMap.set(tokens.typography, ['semantic']);
  keyOrderMap.set(tokens, ['$schema', 'typography']);
  
  console.log(`Semantic typography token structure:`, {
    headingCount: Object.keys(tokens.typography.semantic.heading).length,
    bodyCount: Object.keys(tokens.typography.semantic.body).length,
    codeCount: Object.keys(tokens.typography.semantic.code).length
  });
  
  // Debug: show first 10 heading keys from our sorted order
  const sortedHeadingKeys = keyOrderMap.get(tokens.typography.semantic.heading) || [];
  console.log(`First 10 heading keys (sorted order):`, sortedHeadingKeys.slice(0, 10));
  
  return { tokens, stats, keyOrderMap };
}

/**
 * Build foundation typography tokens from Figma variables
 */
function buildFoundationTypographyTokens(variables: Variable[]): any {
  const tokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    typography: {
      foundation: {
        fontFamily: {},
        fontSize: {},
        fontWeight: {},
        lineHeight: {},
        letterSpacing: {}
      }
    }
  };
  
  for (const variable of variables) {
    const parsed = parseTypographyVariableName(variable.name);
    if (!parsed) continue;
    
    const { property, value } = parsed;
    
    // Get the first mode's value
    const modeId = Object.keys(variable.valuesByMode)[0];
    const varValue = variable.valuesByMode[modeId];
    
    console.log(`  Building token for ${variable.name}: property=${property}, value=${value}, varValue type=${typeof varValue}, varValue=${JSON.stringify(varValue)}`);
    
    if (property === 'fontFamily') {
      // Handle font family (STRING type)
      if (typeof varValue === 'string') {
        console.log(`  ✓ Font family is string: "${varValue}"`);
        let fontStack = parseFontFamily(varValue);
        
        // Add default fallbacks if not already present
        if (fontStack.length === 1) {
          if (value === 'mono' || value === 'code') {
            fontStack.push('monospace');
          } else {
            fontStack.push('sans-serif');
          }
          console.log(`  ✓ Added fallback: ${fontStack.join(', ')}`);
        }
        
        tokens.typography.foundation.fontFamily[value] = {
          $type: "fontFamily",
          $value: fontStack
        };
        console.log(`  ✓ Added fontFamily ${value}:`, tokens.typography.foundation.fontFamily[value]);
      } else {
        console.log(`  ❌ Font family is not a string, it's ${typeof varValue}`);
      }
    } else if (property === 'fontSize') {
      // Handle font size (FLOAT type)
      if (typeof varValue === 'number') {
        tokens.typography.foundation.fontSize[value] = {
          $type: "dimension",
          $value: varValue
        };
      }
    } else if (property === 'fontWeight') {
      // Handle font weight (FLOAT or STRING type)
      if (typeof varValue === 'number') {
        tokens.typography.foundation.fontWeight[value] = {
          $type: "fontWeight",
          $value: varValue
        };
      } else if (typeof varValue === 'string') {
        // Handle string weight values - can be numeric strings or weight names
        const trimmedValue = varValue.trim();
        
        // Try to parse as number first
        const parsedNumber = parseInt(trimmedValue);
        if (!isNaN(parsedNumber) && parsedNumber >= 100 && parsedNumber <= 900) {
          console.log(`  ✓ Parsed font weight "${varValue}" to ${parsedNumber}`);
          tokens.typography.foundation.fontWeight[value] = {
            $type: "fontWeight",
            $value: parsedNumber
          };
        } else {
          // Map named weight strings to numeric values
          const normalizedWeight = trimmedValue.toLowerCase().replace(/\s+/g, '');
          const weightMap: { [key: string]: number } = {
            'light': 300,
            'regular': 400,
            'semibold': 600,
            'bold': 700
          };
          const numericWeight = weightMap[normalizedWeight];
          if (numericWeight) {
            console.log(`  ✓ Mapped font weight "${varValue}" to ${numericWeight}`);
            tokens.typography.foundation.fontWeight[value] = {
              $type: "fontWeight",
              $value: numericWeight
            };
          } else {
            console.log(`  ❌ Unknown font weight string: "${varValue}" (normalized: "${normalizedWeight}")`);
          }
        }
      }
    } else if (property === 'lineHeight') {
      // Handle line height (FLOAT type)
      // Use the scale value from variable name (matching fontSize pattern)
      if (typeof varValue === 'number') {
        // Use 'value' which is the scale number from the variable name (e.g., "200" from "line-height/body/200")
        // Only add if not already present (avoid duplicates from heading/body variants)
        if (!tokens.typography.foundation.lineHeight[value]) {
          tokens.typography.foundation.lineHeight[value] = {
            $type: "dimension",
            $value: varValue
          };
          console.log(`  ✓ Added lineHeight ${value} with value ${varValue}`);
        } else {
          console.log(`  ⚠️ LineHeight ${value} already exists, skipping`);
        }
      }
    } else if (property === 'letterSpacing') {
      // Handle letter spacing (FLOAT type, can be negative)
      if (typeof varValue === 'number') {
        tokens.typography.foundation.letterSpacing[value] = {
          $type: "dimension",
          $value: varValue
        };
      }
    }
  }
  
  // Sort font sizes numerically (smallest to largest)
  if (Object.keys(tokens.typography.foundation.fontSize).length > 0) {
    const sortedSizes: any = {};
    const sizeKeys = Object.keys(tokens.typography.foundation.fontSize).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      return numA - numB;
    });
    sizeKeys.forEach(key => {
      sortedSizes[key] = tokens.typography.foundation.fontSize[key];
    });
    tokens.typography.foundation.fontSize = sortedSizes;
  }
  
  // Sort font weights numerically (smallest to largest)
  if (Object.keys(tokens.typography.foundation.fontWeight).length > 0) {
    const sortedWeights: any = {};
    // Sort by the actual numeric value, not the key name
    const weightKeys = Object.keys(tokens.typography.foundation.fontWeight).sort((a, b) => {
      const valueA = tokens.typography.foundation.fontWeight[a].$value;
      const valueB = tokens.typography.foundation.fontWeight[b].$value;
      return valueA - valueB;
    });
    weightKeys.forEach(key => {
      sortedWeights[key] = tokens.typography.foundation.fontWeight[key];
    });
    tokens.typography.foundation.fontWeight = sortedWeights;
  }
  
  // Sort line heights numerically (smallest to largest)
  if (Object.keys(tokens.typography.foundation.lineHeight).length > 0) {
    const sortedHeights: any = {};
    const heightKeys = Object.keys(tokens.typography.foundation.lineHeight).sort((a, b) => Number(a) - Number(b));
    heightKeys.forEach(key => {
      sortedHeights[key] = tokens.typography.foundation.lineHeight[key];
    });
    tokens.typography.foundation.lineHeight = sortedHeights;
  }
  
  // Sort letter spacing numerically (smallest to largest, including negatives)
  if (Object.keys(tokens.typography.foundation.letterSpacing).length > 0) {
    const sortedSpacing: any = {};
    const spacingKeys = Object.keys(tokens.typography.foundation.letterSpacing).sort((a, b) => {
      const valueA = tokens.typography.foundation.letterSpacing[a].$value;
      const valueB = tokens.typography.foundation.letterSpacing[b].$value;
      return valueA - valueB;
    });
    spacingKeys.forEach(key => {
      sortedSpacing[key] = tokens.typography.foundation.letterSpacing[key];
    });
    tokens.typography.foundation.letterSpacing = sortedSpacing;
  }
  
  return tokens;
}

/**
 * Resolve a variable alias to its final value
 */
async function resolveVariableAlias(variable: Variable): Promise<string | null> {
  const modeId = Object.keys(variable.valuesByMode)[0];
  const value = variable.valuesByMode[modeId];
  
  // If it's an alias, resolve it
  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
    if (!aliasedVariable) return null;
    
    // Get the aliased variable's value
    const aliasedModeId = Object.keys(aliasedVariable.valuesByMode)[0];
    const aliasedValue = aliasedVariable.valuesByMode[aliasedModeId];
    
    if (typeof aliasedValue === 'object' && 'r' in aliasedValue) {
      return rgbToHex(aliasedValue as RGBA);
    }
  }
  
  return null;
}

/**
 * Build a reference string for semantic tokens
 */
function buildReference(variableName: string): string {
  // Convert "blue/300" to "{color.foundation.blue.300}"
  const parts = variableName.split('/');
  if (parts.length === 2) {
    return `{color.foundation.${parts[0]}.${parts[1]}}`;
  }
  return variableName;
}

/**
 * Extract and transform all supported tokens from Figma
 */
async function extractAllTokens() {
  // Fetch all variable types
  const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  const floatVariables = await figma.variables.getLocalVariablesAsync('FLOAT');
  const stringVariables = await figma.variables.getLocalVariablesAsync('STRING');
  
  // Initialize token structures
  const foundationColorTokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    color: {
      foundation: {}
    }
  };

  const semanticAttachmentTokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    color: {
      semantic: {
        attachment: {}
      }
    }
  };

  const foundationRadiusTokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    radius: {
      foundation: {}
    }
  };

  const foundationSpacingTokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    spacing: {
      foundation: {}
    }
  };

  const stats = {
    foundationColors: { processed: 0, skipped: 0 },
    semanticAttachment: { processed: 0, skipped: 0 },
    foundationRadius: { processed: 0, skipped: 0 },
    foundationSpacing: { processed: 0, skipped: 0 },
    foundationTypography: { processed: 0, skipped: 0 },
    semanticTypography: { processed: 0, skipped: 0 },
    total: { processed: 0, skipped: 0 }
  };

  // Process all color variables
  for (const variable of colorVariables) {
    console.log(`Processing COLOR variable: "${variable.name}"`);
    const category = categorizeVariable(variable.name, 'COLOR');
    
    if (!category) {
      console.log(`  ❌ Skipped (no matching category)`);
      stats.total.skipped++;
      continue;
    }
    
    console.log(`  ✓ Categorized as: ${category.type}`);

    // Process based on category
    if (category.type === 'foundation-color') {
      const parsed = parseFoundationColorName(variable.name);
      if (!parsed) {
        stats.foundationColors.skipped++;
        stats.total.skipped++;
        continue;
      }

      const { family, shade } = parsed;
      
      // Get the first mode's value
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'object' && 'r' in value) {
        const rgba = value as RGBA;
        const hexValue = rgbToHex(rgba);
        
        // Initialize family if needed
        if (!foundationColorTokens.color.foundation[family]) {
          foundationColorTokens.color.foundation[family] = {};
        }
        
        // Add token
        foundationColorTokens.color.foundation[family][shade] = {
          $type: "color",
          $value: hexValue
        };
        
        stats.foundationColors.processed++;
        stats.total.processed++;
      }
    } else if (category.type === 'semantic-attachment') {
      console.log(`  Processing semantic attachment: ${variable.name}`);
      const parsed = parseSemanticAttachmentName(variable.name);
      if (!parsed) {
        console.log(`  ❌ Failed to parse semantic name`);
        stats.semanticAttachment.skipped++;
        stats.total.skipped++;
        continue;
      }

      const { color } = parsed;
      console.log(`  Parsed color: ${color}`);
      
      // Get the first mode's value
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      console.log(`  Value type:`, typeof value, value);
      
      // Check if it's an alias (reference to another variable)
      if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
        console.log(`  ✓ Is alias, resolving...`);
        const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
        
        if (aliasedVariable) {
          console.log(`  ✓ Resolved to: ${aliasedVariable.name}`);
          // Build reference string
          const reference = buildReference(aliasedVariable.name);
          console.log(`  ✓ Reference: ${reference}`);
          
          semanticAttachmentTokens.color.semantic.attachment[color] = {
            $type: "color",
            $value: reference
          };
          
          stats.semanticAttachment.processed++;
          stats.total.processed++;
        } else {
          console.log(`  ❌ Failed to resolve alias`);
          stats.semanticAttachment.skipped++;
          stats.total.skipped++;
        }
      } else if (typeof value === 'object' && 'r' in value) {
        // Direct color value (not recommended for semantic tokens, but handle it)
        console.log(`  ✓ Direct color value`);
        const rgba = value as RGBA;
        const hexValue = rgbToHex(rgba);
        
        semanticAttachmentTokens.color.semantic.attachment[color] = {
          $type: "color",
          $value: hexValue
        };
        
        stats.semanticAttachment.processed++;
        stats.total.processed++;
      } else {
        console.log(`  ❌ Unknown value type`);
        stats.semanticAttachment.skipped++;
        stats.total.skipped++;
      }
    }
  }

  // Process all float variables (radius, spacing, etc.)
  for (const variable of floatVariables) {
    console.log(`Processing FLOAT variable: "${variable.name}"`);
    const category = categorizeVariable(variable.name, 'FLOAT');
    
    if (!category) {
      console.log(`  ❌ Skipped (no matching category)`);
      stats.total.skipped++;
      continue;
    }
    
    console.log(`  ✓ Categorized as: ${category.type}`);

    if (category.type === 'foundation-radius') {
      const parsed = parseFoundationRadiusName(variable.name);
      if (!parsed) {
        console.log(`  ❌ Failed to parse radius name`);
        stats.foundationRadius.skipped++;
        stats.total.skipped++;
        continue;
      }

      const { size } = parsed;
      console.log(`  Parsed size: ${size}`);
      
      // Get the first mode's value
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'number') {
        console.log(`  ✓ Numeric value: ${value}`);
        
        // Add token
        foundationRadiusTokens.radius.foundation[size] = {
          $type: "dimension",
          $value: value
        };
        
        stats.foundationRadius.processed++;
        stats.total.processed++;
      } else if (typeof value === 'string') {
        // Handle percentage values
        console.log(`  ✓ String value: ${value}`);
        foundationRadiusTokens.radius.foundation[size] = {
          $type: "dimension",
          $value: value
        };
        
        stats.foundationRadius.processed++;
        stats.total.processed++;
      } else {
        console.log(`  ❌ Unknown value type: ${typeof value}`);
        stats.foundationRadius.skipped++;
        stats.total.skipped++;
      }
    } else if (category.type === 'foundation-spacing') {
      const parsed = parseFoundationSpacingName(variable.name);
      if (!parsed) {
        console.log(`  ❌ Failed to parse spacing name`);
        stats.foundationSpacing.skipped++;
        stats.total.skipped++;
        continue;
      }

      const { size } = parsed;
      console.log(`  Parsed size: ${size}`);
      
      // Get the first mode's value
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'number') {
        console.log(`  ✓ Numeric value: ${value}`);
        
        // Add token
        foundationSpacingTokens.spacing.foundation[size] = {
          $type: "dimension",
          $value: value
        };
        
        stats.foundationSpacing.processed++;
        stats.total.processed++;
      } else {
        console.log(`  ❌ Unknown value type: ${typeof value}`);
        stats.foundationSpacing.skipped++;
        stats.total.skipped++;
      }
    }
  }

  // Sort radius tokens alphabetically and add full token (only if we have radius tokens)
  if (Object.keys(foundationRadiusTokens.radius.foundation).length > 0) {
    const sortedRadius: any = {};
    const radiusSizes = ['xs', 's', 'm', 'l', 'xl', 'full'];
    radiusSizes.forEach(size => {
      if (foundationRadiusTokens.radius.foundation[size]) {
        sortedRadius[size] = foundationRadiusTokens.radius.foundation[size];
      }
    });
    // Add full token if not present (Figma limitation workaround)
    if (!sortedRadius['full']) {
      sortedRadius['full'] = {
        $type: "dimension",
        $value: "50%",
        $description: "Full radius - circular elements, pills, fully rounded buttons"
      };
    }
    foundationRadiusTokens.radius.foundation = sortedRadius;
  }

  // Sort spacing tokens alphabetically (only if we have spacing tokens)
  if (Object.keys(foundationSpacingTokens.spacing.foundation).length > 0) {
    const sortedSpacing: any = {};
    const spacingSizes = ['xxxxs', 'xs', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'];
    spacingSizes.forEach(size => {
      if (foundationSpacingTokens.spacing.foundation[size]) {
        sortedSpacing[size] = foundationSpacingTokens.spacing.foundation[size];
      }
    });
    foundationSpacingTokens.spacing.foundation = sortedSpacing;
  }

  // Process typography variables (both STRING and FLOAT)
  console.log('Processing typography variables...');
  const typographyVariables: Variable[] = [];
  
  // Collect STRING variables (font families)
  for (const variable of stringVariables) {
    console.log(`Processing STRING variable: "${variable.name}"`);
    const category = categorizeVariable(variable.name, 'STRING');
    
    if (category && category.type === 'typography-foundation') {
      console.log(`  ✓ Categorized as typography: ${category.subtype}`);
      typographyVariables.push(variable);
      stats.foundationTypography.processed++;
      stats.total.processed++;
    } else {
      console.log(`  ❌ Skipped (no matching category)`);
      stats.total.skipped++;
    }
  }
  
  // Collect FLOAT variables (font sizes, weights, line heights, letter spacing)
  for (const variable of floatVariables) {
    const category = categorizeVariable(variable.name, 'FLOAT');
    
    if (category && category.type === 'typography-foundation') {
      console.log(`Processing FLOAT typography variable: "${variable.name}" (${category.subtype})`);
      typographyVariables.push(variable);
      stats.foundationTypography.processed++;
      stats.total.processed++;
    }
  }
  
  // Build typography tokens from collected variables
  const typographyTokens = buildFoundationTypographyTokens(typographyVariables);
  console.log(`Built typography tokens with ${typographyVariables.length} variables`);

  // Extract semantic typography from text styles
  console.log('Extracting semantic typography from text styles...');
  const { tokens: semanticTypographyTokens, stats: semanticTypoStats, keyOrderMap: semanticKeyOrderMap } = await extractSemanticTypographyTokens();
  console.log(`Semantic typography extraction complete: processed=${semanticTypoStats.processed}, skipped=${semanticTypoStats.skipped}`);
  stats.semanticTypography = semanticTypoStats;
  stats.total.processed += semanticTypoStats.processed;
  stats.total.skipped += semanticTypoStats.skipped;
  console.log(`Total tokens now: ${stats.total.processed}`);

  return {
    tokens: {
      [TOKEN_FILES.FOUNDATION_COLOR]: foundationColorTokens,
      [TOKEN_FILES.SEMANTIC_ATTACHMENT]: semanticAttachmentTokens,
      [TOKEN_FILES.FOUNDATION_RADIUS]: foundationRadiusTokens,
      [TOKEN_FILES.FOUNDATION_SPACING]: foundationSpacingTokens,
      [TOKEN_FILES.TYPOGRAPHY_FOUNDATION]: typographyTokens,
      [TOKEN_FILES.TYPOGRAPHY_SEMANTIC]: semanticTypographyTokens
    },
    stats: {
      ...stats,
      foundationColorFamilies: Object.keys(foundationColorTokens.color.foundation).length
    },
    keyOrderMaps: {
      [TOKEN_FILES.TYPOGRAPHY_SEMANTIC]: semanticKeyOrderMap
    }
  };
}

/**
 * Extract theme tokens from Figma variable modes
 */
async function extractThemeTokens() {
  const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  
  // Find the theme collection by checking for theme mode names
  const themeCollections = new Map<string, any>();
  
  for (const variable of colorVariables) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    if (!collection) continue;
    
    // Check if this collection has theme modes
    const modeNames = collection.modes.map(m => m.name);
    const hasThemeModes = modeNames.some(name => 
      ['Denim', 'Sapphire', 'Quartz', 'Onyx', 'Indigo'].includes(name)
    );
    
    if (hasThemeModes && !themeCollections.has(collection.id)) {
      themeCollections.set(collection.id, collection);
      console.log(`Found theme collection: "${collection.name}" with modes:`, modeNames);
    }
  }
  
  if (themeCollections.size === 0) {
    console.log('No theme collections found');
    return { tokens: {}, stats: { processed: 0, skipped: 0, modes: 0 } };
  }
  
  // Initialize theme token structures for each theme
  const themeTokens: any = {};
  Object.keys(THEME_MODE_TO_FILE).forEach(themeName => {
    const filePath = THEME_MODE_TO_FILE[themeName];
    themeTokens[filePath] = {
      $schema: "https://tr.designtokens.org/format/",
      color: {
        theme: {
          [themeName.toLowerCase()]: {}
        }
      }
    };
  });
  
  const stats = {
    processed: 0,
    skipped: 0,
    modes: 0,
    variablesPerMode: {} as any
  };
  
  // Process theme variables
  for (const variable of colorVariables) {
    if (!themeCollections.has(variable.variableCollectionId)) continue;
    
    // Skip opacity variants (e.g., sidebar-bg-64, button-color-80)
    if (/-(4|8|12|16|20|24|32|40|48|56|64|72|80|88|96)$/.test(variable.name)) {
      console.log(`Skipping opacity variant: "${variable.name}"`);
      continue;
    }
    
    const collection = themeCollections.get(variable.variableCollectionId);
    console.log(`Processing theme variable: "${variable.name}"`);
    
    // Process each mode
    for (const mode of collection.modes) {
      const modeName = mode.name;
      
      // Check if this is a theme we're tracking
      if (!THEME_MODE_TO_FILE[modeName]) {
        continue;
      }
      
      const filePath = THEME_MODE_TO_FILE[modeName];
      const themeName = modeName.toLowerCase();
      const value = variable.valuesByMode[mode.modeId];
      
      if (!value) continue;
      
      // Initialize stats for this mode
      if (!stats.variablesPerMode[modeName]) {
        stats.variablesPerMode[modeName] = 0;
        stats.modes++;
      }
      
      let tokenValue: string;
      
      // Handle alias (reference to another variable)
      if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
        const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
        if (aliasedVariable) {
          // Skip if the aliased variable has an opacity suffix
          if (/-(4|8|12|16|20|24|32|40|48|56|64|72|80|88|96)$/.test(aliasedVariable.name)) {
            console.log(`  ${modeName}: Skipping "${variable.name}" → alias to opacity variant "${aliasedVariable.name}"`);
            stats.skipped++;
            continue;
          }
          
          tokenValue = buildReference(aliasedVariable.name);
          console.log(`  ${modeName}: ${variable.name} → ${tokenValue}`);
        } else {
          stats.skipped++;
          continue;
        }
      } else if (typeof value === 'object' && 'r' in value) {
        // Direct color value
        const rgba = value as RGBA;
        
        // Skip colors with opacity < 1.0 (opacity should be handled in transformation)
        if (rgba.a < 1.0) {
          console.log(`  ${modeName}: Skipping "${variable.name}" with opacity ${rgba.a}`);
          stats.skipped++;
          continue;
        }
        
        tokenValue = rgbToHex(rgba);
        console.log(`  ${modeName}: ${variable.name} → ${tokenValue}`);
      } else {
        stats.skipped++;
        continue;
      }
      
      // Add token to theme
      themeTokens[filePath].color.theme[themeName][variable.name] = {
        $type: "color",
        $value: tokenValue
      };
      
      stats.variablesPerMode[modeName]++;
      stats.processed++;
    }
  }
  
  return {
    tokens: themeTokens,
    stats
  };
}

/**
 * Sort theme tokens to match existing order in repository
 */
function sortThemeTokens(newTokens: any, currentTokens: any, themeName: string): any {
  const themeKey = themeName.toLowerCase();
  const newVars = newTokens.color.theme[themeKey];
  const currentVars = currentTokens.color && currentTokens.color.theme && currentTokens.color.theme[themeKey]
    ? currentTokens.color.theme[themeKey]
    : {};
  
  // Get order from current file
  const currentOrder = Object.keys(currentVars);
  const newKeys = Object.keys(newVars);
  
  // Sort: existing keys in their current order, then new keys alphabetically
  const sortedKeys = [
    ...currentOrder.filter(key => newKeys.includes(key)),  // Existing keys in original order
    ...newKeys.filter(key => !currentOrder.includes(key)).sort()  // New keys alphabetically
  ];
  
  // Rebuild in sorted order
  const sorted: any = {};
  sortedKeys.forEach(key => {
    sorted[key] = newVars[key];
  });
  
  return {
    ...newTokens,
    color: {
      theme: {
        [themeKey]: sorted
      }
    }
  };
}

/**
 * Validate foundation color tokens
 */
function validateFoundationTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check structure
  if (!tokens.$schema) {
    warnings.push('Foundation colors: Missing $schema field');
  }

  if (!tokens.color || !tokens.color.foundation) {
    errors.push('Foundation colors: Invalid token structure');
    return { valid: false, errors, warnings };
  }

  const foundation = tokens.color.foundation;
  
  // Validate each color family
  Object.entries(foundation).forEach(([family, shades]: [string, any]) => {
    Object.entries(shades).forEach(([shade, token]: [string, any]) => {
      // Check required fields
      if (!token.$type || token.$type !== 'color') {
        errors.push(`Foundation ${family}/${shade}: Invalid or missing $type`);
      }

      if (!token.$value) {
        errors.push(`Foundation ${family}/${shade}: Missing $value`);
      } else {
        // Validate HEX format (uppercase, 6 digits)
        const hexPattern = /^#[0-9A-F]{6}$/;
        if (!hexPattern.test(token.$value)) {
          errors.push(`Foundation ${family}/${shade}: Invalid HEX format "${token.$value}" (must be uppercase 6-digit HEX)`);
        }
      }

      // Check for opacity variants (not allowed in source)
      if (shade.match(/[-]\d+$/)) {
        errors.push(`Foundation ${family}/${shade}: Opacity variants not allowed in source tokens`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate semantic attachment tokens
 */
function validateSemanticTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check structure
  if (!tokens.$schema) {
    warnings.push('Semantic tokens: Missing $schema field');
  }

  if (!tokens.color || !tokens.color.semantic || !tokens.color.semantic.attachment) {
    errors.push('Semantic tokens: Invalid token structure');
    return { valid: false, errors, warnings };
  }

  const attachment = tokens.color.semantic.attachment;
  
  // Validate each attachment color
  Object.entries(attachment).forEach(([colorName, token]: [string, any]) => {
    // Check required fields
    if (!token.$type || token.$type !== 'color') {
      errors.push(`Semantic attachment/${colorName}: Invalid or missing $type`);
    }

    if (!token.$value) {
      errors.push(`Semantic attachment/${colorName}: Missing $value`);
    } else {
      // Check if it's a reference or direct value
      const isReference = typeof token.$value === 'string' && token.$value.startsWith('{') && token.$value.endsWith('}');
      const isHex = typeof token.$value === 'string' && /^#[0-9A-F]{6}$/i.test(token.$value);
      
      if (!isReference && !isHex) {
        errors.push(`Semantic attachment/${colorName}: Value must be either a reference like {color.foundation.blue.300} or a HEX color`);
      }
      
      // Warn if using direct hex instead of reference (not an error, but not recommended)
      if (isHex) {
        warnings.push(`Semantic attachment/${colorName}: Using direct HEX value instead of reference. Consider using foundation color references.`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate foundation dimension tokens (radius, spacing, etc.)
 */
function validateDimensionTokens(tokens: any, type: string, expectedSizes: string[]): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check structure
  if (!tokens.$schema) {
    warnings.push(`${type}: Missing $schema field`);
  }

  if (!tokens[type.toLowerCase()] || !tokens[type.toLowerCase()].foundation) {
    errors.push(`${type}: Invalid token structure`);
    return { valid: false, errors, warnings };
  }

  const foundation = tokens[type.toLowerCase()].foundation;
  
  // Validate each size
  Object.entries(foundation).forEach(([size, token]: [string, any]) => {
    // Check required fields
    if (!token.$type || token.$type !== 'dimension') {
      errors.push(`${type} ${size}: Invalid or missing $type (expected "dimension")`);
    }

    if (token.$value === undefined || token.$value === null) {
      errors.push(`${type} ${size}: Missing $value`);
    } else {
      // Validate value is number or percentage string
      const isNumber = typeof token.$value === 'number';
      const isPercentage = typeof token.$value === 'string' && token.$value.endsWith('%');
      
      if (!isNumber && !isPercentage) {
        errors.push(`${type} ${size}: Value must be a number or percentage string`);
      }
    }
  });

  // Check for missing expected sizes
  if (expectedSizes) {
    expectedSizes.forEach(size => {
      if (!foundation[size]) {
        warnings.push(`${type}: Missing expected size "${size}"`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate foundation radius tokens
 */
function validateRadiusTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  return validateDimensionTokens(tokens, 'Radius', ['xs', 's', 'm', 'l', 'xl', 'full']);
}

/**
 * Validate foundation spacing tokens
 */
function validateSpacingTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  return validateDimensionTokens(tokens, 'Spacing', ['xxxxs', 'xs', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl']);
}

/**
 * Validate semantic typography tokens
 */
function validateSemanticTypographyTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check structure
  if (!tokens.$schema) {
    warnings.push('Semantic typography: Missing $schema field');
  }

  if (!tokens.typography || !tokens.typography.semantic) {
    errors.push('Semantic typography: Invalid token structure');
    return { valid: false, errors, warnings };
  }

  const semantic = tokens.typography.semantic;
  
  // Validate heading, body, and code categories
  ['heading', 'body', 'code'].forEach(category => {
    if (semantic[category]) {
      Object.entries(semantic[category]).forEach(([name, token]: [string, any]) => {
        if (!token.$type || token.$type !== 'typography') {
          errors.push(`Semantic typography ${category}/${name}: Invalid or missing $type (expected "typography")`);
        }

        if (!token.$value) {
          errors.push(`Semantic typography ${category}/${name}: Missing $value`);
        } else {
          // Validate composite structure
          const requiredProps = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'];
          requiredProps.forEach(prop => {
            if (!token.$value[prop]) {
              errors.push(`Semantic typography ${category}/${name}: Missing ${prop} in $value`);
            }
          });
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate foundation typography tokens
 */
function validateTypographyTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check structure
  if (!tokens.$schema) {
    warnings.push('Typography: Missing $schema field');
  }

  if (!tokens.typography || !tokens.typography.foundation) {
    errors.push('Typography: Invalid token structure');
    return { valid: false, errors, warnings };
  }

  const foundation = tokens.typography.foundation;
  
  // Validate font families
  if (foundation.fontFamily) {
    Object.entries(foundation.fontFamily).forEach(([name, token]: [string, any]) => {
      if (!token.$type || token.$type !== 'fontFamily') {
        errors.push(`Typography fontFamily ${name}: Invalid or missing $type (expected "fontFamily")`);
      }

      if (!token.$value) {
        errors.push(`Typography fontFamily ${name}: Missing $value`);
      } else if (!Array.isArray(token.$value)) {
        errors.push(`Typography fontFamily ${name}: Value must be an array of strings`);
      } else if (token.$value.length === 0) {
        errors.push(`Typography fontFamily ${name}: Font family array cannot be empty`);
      } else if (!token.$value.every((v: any) => typeof v === 'string')) {
        errors.push(`Typography fontFamily ${name}: All font family values must be strings`);
      }
    });
  }
  
  // Validate font sizes
  if (foundation.fontSize) {
    Object.entries(foundation.fontSize).forEach(([size, token]: [string, any]) => {
      if (!token.$type || token.$type !== 'dimension') {
        errors.push(`Typography fontSize ${size}: Invalid or missing $type (expected "dimension")`);
      }

      if (token.$value === undefined || token.$value === null) {
        errors.push(`Typography fontSize ${size}: Missing $value`);
      } else if (typeof token.$value !== 'number') {
        errors.push(`Typography fontSize ${size}: Value must be a number`);
      } else if (token.$value <= 0) {
        errors.push(`Typography fontSize ${size}: Value must be positive`);
      }
    });
  }
  
  // Validate font weights
  if (foundation.fontWeight) {
    Object.entries(foundation.fontWeight).forEach(([weight, token]: [string, any]) => {
      if (!token.$type || token.$type !== 'fontWeight') {
        errors.push(`Typography fontWeight ${weight}: Invalid or missing $type (expected "fontWeight")`);
      }

      if (token.$value === undefined || token.$value === null) {
        errors.push(`Typography fontWeight ${weight}: Missing $value`);
      } else if (typeof token.$value !== 'number') {
        errors.push(`Typography fontWeight ${weight}: Value must be a number`);
      } else if (token.$value < 100 || token.$value > 900) {
        errors.push(`Typography fontWeight ${weight}: Value must be between 100 and 900`);
      }
    });
  }
  
  // Validate line heights
  if (foundation.lineHeight) {
    Object.entries(foundation.lineHeight).forEach(([height, token]: [string, any]) => {
      if (!token.$type || token.$type !== 'dimension') {
        errors.push(`Typography lineHeight ${height}: Invalid or missing $type (expected "dimension")`);
      }

      if (token.$value === undefined || token.$value === null) {
        errors.push(`Typography lineHeight ${height}: Missing $value`);
      } else if (typeof token.$value !== 'number') {
        errors.push(`Typography lineHeight ${height}: Value must be a number`);
      } else if (token.$value <= 0) {
        errors.push(`Typography lineHeight ${height}: Value must be positive`);
      }
    });
  }
  
  // Validate letter spacing
  if (foundation.letterSpacing) {
    Object.entries(foundation.letterSpacing).forEach(([spacing, token]: [string, any]) => {
      if (!token.$type || token.$type !== 'dimension') {
        errors.push(`Typography letterSpacing ${spacing}: Invalid or missing $type (expected "dimension")`);
      }

      if (token.$value === undefined || token.$value === null) {
        errors.push(`Typography letterSpacing ${spacing}: Missing $value`);
      } else if (typeof token.$value !== 'number') {
        errors.push(`Typography letterSpacing ${spacing}: Value must be a number`);
      }
      // Note: letter spacing can be negative, so no min value check
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate all token types
 */
function validateAllTokens(tokensMap: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate foundation colors (if present)
  if (tokensMap[TOKEN_FILES.FOUNDATION_COLOR]) {
    const foundationValidation = validateFoundationTokens(tokensMap[TOKEN_FILES.FOUNDATION_COLOR]);
    allErrors.push(...foundationValidation.errors);
    allWarnings.push(...foundationValidation.warnings);
  }

  // Validate semantic attachment (if present)
  if (tokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT]) {
    const semanticValidation = validateSemanticTokens(tokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT]);
    allErrors.push(...semanticValidation.errors);
    allWarnings.push(...semanticValidation.warnings);
  }

  // Validate radius (if present)
  if (tokensMap[TOKEN_FILES.FOUNDATION_RADIUS]) {
    const radiusValidation = validateRadiusTokens(tokensMap[TOKEN_FILES.FOUNDATION_RADIUS]);
    allErrors.push(...radiusValidation.errors);
    allWarnings.push(...radiusValidation.warnings);
  }

  // Validate spacing (if present)
  if (tokensMap[TOKEN_FILES.FOUNDATION_SPACING]) {
    const spacingValidation = validateSpacingTokens(tokensMap[TOKEN_FILES.FOUNDATION_SPACING]);
    allErrors.push(...spacingValidation.errors);
    allWarnings.push(...spacingValidation.warnings);
  }

  // Validate typography (if present)
  if (tokensMap[TOKEN_FILES.TYPOGRAPHY_FOUNDATION]) {
    const typographyValidation = validateTypographyTokens(tokensMap[TOKEN_FILES.TYPOGRAPHY_FOUNDATION]);
    allErrors.push(...typographyValidation.errors);
    allWarnings.push(...typographyValidation.warnings);
  }

  // Validate semantic typography (if present)
  if (tokensMap[TOKEN_FILES.TYPOGRAPHY_SEMANTIC]) {
    const semanticTypoValidation = validateSemanticTypographyTokens(tokensMap[TOKEN_FILES.TYPOGRAPHY_SEMANTIC]);
    allErrors.push(...semanticTypoValidation.errors);
    allWarnings.push(...semanticTypoValidation.warnings);
  }

  // Validate theme files (if present) - basic validation for now
  Object.keys(THEME_MODE_TO_FILE).forEach(themeName => {
    const filePath = THEME_MODE_TO_FILE[themeName];
    if (tokensMap[filePath]) {
      // Basic structure check
      const tokens = tokensMap[filePath];
      if (!tokens.color || !tokens.color.theme || !tokens.color.theme[themeName.toLowerCase()]) {
        allErrors.push(`Theme ${themeName}: Invalid token structure`);
      }
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Fetch current tokens from GitHub repository for a specific file
 */
async function fetchCurrentTokensFromFile(githubToken: string, filePath: string): Promise<any> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.raw+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
  }

  const content = await response.text();
  return JSON.parse(content);
}

/**
 * Fetch all current token files from GitHub repository
 */
async function fetchAllCurrentTokens(githubToken: string): Promise<any> {
  const tokens: any = {};
  
  // Try to fetch each file, but don't fail if file doesn't exist
  try {
    tokens[TOKEN_FILES.FOUNDATION_COLOR] = await fetchCurrentTokensFromFile(
      githubToken, 
      TOKEN_FILES.FOUNDATION_COLOR
    );
  } catch (e) {
    console.log('Foundation colors not found in repo (may be new file)');
    tokens[TOKEN_FILES.FOUNDATION_COLOR] = { color: { foundation: {} } };
  }
  
  try {
    tokens[TOKEN_FILES.SEMANTIC_ATTACHMENT] = await fetchCurrentTokensFromFile(
      githubToken, 
      TOKEN_FILES.SEMANTIC_ATTACHMENT
    );
  } catch (e) {
    console.log('Semantic attachment not found in repo (may be new file)');
    tokens[TOKEN_FILES.SEMANTIC_ATTACHMENT] = { color: { semantic: { attachment: {} } } };
  }
  
  try {
    tokens[TOKEN_FILES.FOUNDATION_RADIUS] = await fetchCurrentTokensFromFile(
      githubToken, 
      TOKEN_FILES.FOUNDATION_RADIUS
    );
  } catch (e) {
    console.log('Foundation radius not found in repo (may be new file)');
    tokens[TOKEN_FILES.FOUNDATION_RADIUS] = { radius: { foundation: {} } };
  }
  
  try {
    tokens[TOKEN_FILES.FOUNDATION_SPACING] = await fetchCurrentTokensFromFile(
      githubToken, 
      TOKEN_FILES.FOUNDATION_SPACING
    );
  } catch (e) {
    console.log('Foundation spacing not found in repo (may be new file)');
    tokens[TOKEN_FILES.FOUNDATION_SPACING] = { spacing: { foundation: {} } };
  }
  
  try {
    tokens[TOKEN_FILES.TYPOGRAPHY_FOUNDATION] = await fetchCurrentTokensFromFile(
      githubToken, 
      TOKEN_FILES.TYPOGRAPHY_FOUNDATION
    );
  } catch (e) {
    console.log('Foundation typography not found in repo (may be new file)');
    tokens[TOKEN_FILES.TYPOGRAPHY_FOUNDATION] = { typography: { foundation: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {}, letterSpacing: {} } } };
  }
  
  try {
    tokens[TOKEN_FILES.TYPOGRAPHY_SEMANTIC] = await fetchCurrentTokensFromFile(
      githubToken, 
      TOKEN_FILES.TYPOGRAPHY_SEMANTIC
    );
  } catch (e) {
    console.log('Semantic typography not found in repo (may be new file)');
    tokens[TOKEN_FILES.TYPOGRAPHY_SEMANTIC] = { typography: { semantic: { heading: {}, body: {}, code: {} } } };
  }
  
  // Fetch theme files
  for (const themeName of Object.keys(THEME_MODE_TO_FILE)) {
    const filePath = THEME_MODE_TO_FILE[themeName];
    try {
      tokens[filePath] = await fetchCurrentTokensFromFile(githubToken, filePath);
    } catch (e) {
      console.log(`Theme ${themeName} not found in repo (may be new file)`);
      tokens[filePath] = { color: { theme: { [themeName.toLowerCase()]: {} } } };
    }
  }
  
  return tokens;
}

/**
 * Compare foundation color tokens for differences
 */
function hasFoundationColorChanges(newTokens: any, currentTokens: any): boolean {
  const newColors = (newTokens.color && newTokens.color.foundation) ? newTokens.color.foundation : {};
  const currentColors = (currentTokens.color && currentTokens.color.foundation) ? currentTokens.color.foundation : {};
  
  // Get all color families from both
  const allFamilies = new Set([
    ...Object.keys(newColors),
    ...Object.keys(currentColors)
  ]);
  
  // Check each family
  for (const family of allFamilies) {
    const newShades = newColors[family] || {};
    const currentShades = currentColors[family] || {};
    
    // Get all shades from both
    const allShades = new Set([
      ...Object.keys(newShades),
      ...Object.keys(currentShades)
    ]);
    
    // Check each shade
    for (const shade of allShades) {
      const newValue = newShades[shade] ? newShades[shade].$value : undefined;
      const currentValue = currentShades[shade] ? currentShades[shade].$value : undefined;
      
      // If values differ (or one is missing), we have changes
      if (newValue !== currentValue) {
        console.log(`Foundation color change: ${family}/${shade}: ${currentValue} → ${newValue}`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Compare semantic attachment tokens for differences
 */
function hasSemanticAttachmentChanges(newTokens: any, currentTokens: any): boolean {
  const newAttachment = (newTokens.color && newTokens.color.semantic && newTokens.color.semantic.attachment) 
    ? newTokens.color.semantic.attachment : {};
  const currentAttachment = (currentTokens.color && currentTokens.color.semantic && currentTokens.color.semantic.attachment) 
    ? currentTokens.color.semantic.attachment : {};
  
  // Get all colors from both
  const allColors = new Set([
    ...Object.keys(newAttachment),
    ...Object.keys(currentAttachment)
  ]);
  
  // Check each color
  for (const color of allColors) {
    const newValue = newAttachment[color] ? newAttachment[color].$value : undefined;
    const currentValue = currentAttachment[color] ? currentAttachment[color].$value : undefined;
    
    // If values differ (or one is missing), we have changes
    if (newValue !== currentValue) {
      console.log(`Semantic attachment change: ${color}: ${currentValue} → ${newValue}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Compare foundation radius tokens for differences
 */
function hasFoundationRadiusChanges(newTokens: any, currentTokens: any): boolean {
  const newRadius = (newTokens.radius && newTokens.radius.foundation) ? newTokens.radius.foundation : {};
  const currentRadius = (currentTokens.radius && currentTokens.radius.foundation) ? currentTokens.radius.foundation : {};
  
  // Get all sizes from both
  const allSizes = new Set([
    ...Object.keys(newRadius),
    ...Object.keys(currentRadius)
  ]);
  
  // Check each size
  for (const size of allSizes) {
    const newValue = newRadius[size] ? newRadius[size].$value : undefined;
    const currentValue = currentRadius[size] ? currentRadius[size].$value : undefined;
    
    // If values differ (or one is missing), we have changes
    if (newValue !== currentValue) {
      console.log(`Radius change: ${size}: ${currentValue} → ${newValue}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Compare semantic typography tokens for differences
 */
function hasSemanticTypographyChanges(newTokens: any, currentTokens: any): boolean {
  const newSemantic = (newTokens.typography && newTokens.typography.semantic) ? newTokens.typography.semantic : {};
  const currentSemantic = (currentTokens.typography && currentTokens.typography.semantic) ? currentTokens.typography.semantic : {};
  
  // Check both heading and body categories
  const categories = ['heading', 'body'];
  
  for (const category of categories) {
    const newCat = newSemantic[category] || {};
    const currentCat = currentSemantic[category] || {};
    
    // Get all style names from both
    const allNames = new Set([
      ...Object.keys(newCat),
      ...Object.keys(currentCat)
    ]);
    
    // Check each style
    for (const name of allNames) {
      const newStyle = newCat[name];
      const currentStyle = currentCat[name];
      
      // Compare the composite values
      if (JSON.stringify(newStyle) !== JSON.stringify(currentStyle)) {
        console.log(`Semantic typography change: ${category}.${name}`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Compare foundation typography tokens for differences
 */
function hasTypographyChanges(newTokens: any, currentTokens: any): boolean {
  const newTypo = (newTokens.typography && newTokens.typography.foundation) ? newTokens.typography.foundation : {};
  const currentTypo = (currentTokens.typography && currentTokens.typography.foundation) ? currentTokens.typography.foundation : {};
  
  // Check all typography properties
  const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'];
  
  for (const property of properties) {
    const newProps = newTypo[property] || {};
    const currentProps = currentTypo[property] || {};
    
    // Get all keys from both
    const allKeys = new Set([
      ...Object.keys(newProps),
      ...Object.keys(currentProps)
    ]);
    
    // Check each key
    for (const key of allKeys) {
      const newValue = newProps[key] ? newProps[key].$value : undefined;
      const currentValue = currentProps[key] ? currentProps[key].$value : undefined;
      
      // Special handling for arrays (font families)
      if (Array.isArray(newValue) && Array.isArray(currentValue)) {
        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          console.log(`Typography ${property} change: ${key}: ${JSON.stringify(currentValue)} → ${JSON.stringify(newValue)}`);
          return true;
        }
      } else if (newValue !== currentValue) {
        console.log(`Typography ${property} change: ${key}: ${currentValue} → ${newValue}`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Compare all token types for differences
 * Returns object with file paths that have changes
 */
function detectChanges(newTokensMap: any, currentTokensMap: any): { hasChanges: boolean; changedFiles: string[] } {
  const changedFiles: string[] = [];
  
  // Check foundation colors (if present in new tokens)
  if (newTokensMap[TOKEN_FILES.FOUNDATION_COLOR] && 
      Object.keys(newTokensMap[TOKEN_FILES.FOUNDATION_COLOR].color.foundation).length > 0) {
    if (hasFoundationColorChanges(
      newTokensMap[TOKEN_FILES.FOUNDATION_COLOR], 
      currentTokensMap[TOKEN_FILES.FOUNDATION_COLOR]
    )) {
      changedFiles.push(TOKEN_FILES.FOUNDATION_COLOR);
    }
  }
  
  // Check semantic attachment (if present in new tokens)
  if (newTokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT] && 
      Object.keys(newTokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT].color.semantic.attachment).length > 0) {
    if (hasSemanticAttachmentChanges(
      newTokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT], 
      currentTokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT]
    )) {
      changedFiles.push(TOKEN_FILES.SEMANTIC_ATTACHMENT);
    }
  }
  
  // Check radius (if present in new tokens)
  if (newTokensMap[TOKEN_FILES.FOUNDATION_RADIUS] && 
      Object.keys(newTokensMap[TOKEN_FILES.FOUNDATION_RADIUS].radius.foundation).length > 0) {
    if (hasFoundationRadiusChanges(
      newTokensMap[TOKEN_FILES.FOUNDATION_RADIUS], 
      currentTokensMap[TOKEN_FILES.FOUNDATION_RADIUS]
    )) {
      changedFiles.push(TOKEN_FILES.FOUNDATION_RADIUS);
    }
  }
  
  // Check spacing (if present in new tokens) - reuse radius change detection
  if (newTokensMap[TOKEN_FILES.FOUNDATION_SPACING] && 
      Object.keys(newTokensMap[TOKEN_FILES.FOUNDATION_SPACING].spacing.foundation).length > 0) {
    const newSpacing = newTokensMap[TOKEN_FILES.FOUNDATION_SPACING];
    const currentSpacing = currentTokensMap[TOKEN_FILES.FOUNDATION_SPACING];
    
    // Check for changes (similar to radius)
    const newSizes = newSpacing.spacing ? newSpacing.spacing.foundation : {};
    const currentSizes = currentSpacing.spacing ? currentSpacing.spacing.foundation : {};
    
    const allSizes = new Set([...Object.keys(newSizes), ...Object.keys(currentSizes)]);
    let hasSpacingChanges = false;
    
    for (const size of allSizes) {
      const newValue = newSizes[size] ? newSizes[size].$value : undefined;
      const currentValue = currentSizes[size] ? currentSizes[size].$value : undefined;
      
      if (newValue !== currentValue) {
        console.log(`Spacing change: ${size}: ${currentValue} → ${newValue}`);
        hasSpacingChanges = true;
        break;
      }
    }
    
    if (hasSpacingChanges) {
      changedFiles.push(TOKEN_FILES.FOUNDATION_SPACING);
    }
  }
  
  // Check typography (if present in new tokens)
  if (newTokensMap[TOKEN_FILES.TYPOGRAPHY_FOUNDATION]) {
    const newTypo = newTokensMap[TOKEN_FILES.TYPOGRAPHY_FOUNDATION];
    const currentTypo = currentTokensMap[TOKEN_FILES.TYPOGRAPHY_FOUNDATION];
    
    // Check if there are any typography tokens extracted
    const hasTypoTokens = newTypo.typography && newTypo.typography.foundation &&
      (Object.keys(newTypo.typography.foundation.fontFamily || {}).length > 0 ||
       Object.keys(newTypo.typography.foundation.fontSize || {}).length > 0 ||
       Object.keys(newTypo.typography.foundation.fontWeight || {}).length > 0 ||
       Object.keys(newTypo.typography.foundation.lineHeight || {}).length > 0 ||
       Object.keys(newTypo.typography.foundation.letterSpacing || {}).length > 0);
    
    if (hasTypoTokens && hasTypographyChanges(newTypo, currentTypo)) {
      changedFiles.push(TOKEN_FILES.TYPOGRAPHY_FOUNDATION);
    }
  }
  
  // Check semantic typography (if present in new tokens)
  if (newTokensMap[TOKEN_FILES.TYPOGRAPHY_SEMANTIC]) {
    const newSemanticTypo = newTokensMap[TOKEN_FILES.TYPOGRAPHY_SEMANTIC];
    const currentSemanticTypo = currentTokensMap[TOKEN_FILES.TYPOGRAPHY_SEMANTIC];
    
    // Check if there are any semantic typography tokens extracted
    const hasSemanticTypoTokens = newSemanticTypo.typography && newSemanticTypo.typography.semantic &&
      (Object.keys(newSemanticTypo.typography.semantic.heading || {}).length > 0 ||
       Object.keys(newSemanticTypo.typography.semantic.body || {}).length > 0);
    
    if (hasSemanticTypoTokens && hasSemanticTypographyChanges(newSemanticTypo, currentSemanticTypo)) {
      changedFiles.push(TOKEN_FILES.TYPOGRAPHY_SEMANTIC);
    }
  }
  
  // Check theme files (if present in new tokens)
  for (const themeName of Object.keys(THEME_MODE_TO_FILE)) {
    const filePath = THEME_MODE_TO_FILE[themeName];
    
    // Only check if we extracted tokens for this theme
    if (newTokensMap[filePath]) {
      const newTheme = newTokensMap[filePath];
      const currentTheme = currentTokensMap[filePath];
      
      const newVars = newTheme.color && newTheme.color.theme && newTheme.color.theme[themeName.toLowerCase()] 
        ? newTheme.color.theme[themeName.toLowerCase()] 
        : {};
      const currentVars = currentTheme.color && currentTheme.color.theme && currentTheme.color.theme[themeName.toLowerCase()] 
        ? currentTheme.color.theme[themeName.toLowerCase()] 
        : {};
      
      const allVarNames = new Set([...Object.keys(newVars), ...Object.keys(currentVars)]);
      let hasThemeChanges = false;
      
      for (const varName of allVarNames) {
        const newValue = newVars[varName] ? newVars[varName].$value : undefined;
        const currentValue = currentVars[varName] ? currentVars[varName].$value : undefined;
        
        if (newValue !== currentValue) {
          console.log(`Theme ${themeName} change: ${varName}: ${currentValue} → ${newValue}`);
          hasThemeChanges = true;
          break;
        }
      }
      
      if (hasThemeChanges) {
        changedFiles.push(filePath);
      }
    }
  }
  
  if (changedFiles.length === 0) {
    console.log('No changes detected in any token files');
  } else {
    console.log(`Changes detected in: ${changedFiles.join(', ')}`);
  }
  
  return {
    hasChanges: changedFiles.length > 0,
    changedFiles
  };
}

/**
 * Trigger GitHub repository dispatch to create PR with multiple files
 */
async function triggerGitHubSync(tokensMap: any, changedFiles: string[], githubToken: string, keyOrderMaps?: any) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;
  
  // Prepare file updates for only changed files
  // Pre-stringify to preserve key order through GitHub API transmission
  const fileUpdates: any = {};
  for (const filePath of changedFiles) {
    const keyOrderMap = keyOrderMaps?.[filePath];
    fileUpdates[filePath] = stringifyPreservingOrder(tokensMap[filePath], 2, keyOrderMap);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      event_type: 'figma-sync',
      client_payload: {
        files: fileUpdates,
        timestamp: new Date().toISOString(),
        source: 'figma-plugin'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * Save tokens to local files (alternative to GitHub sync)
 */
async function saveTokensLocally(tokensMap: any, keyOrderMaps?: any) {
  // Send each file to UI for download
  for (const [filePath, tokens] of Object.entries(tokensMap)) {
    const keyOrderMap = keyOrderMaps?.[filePath];
    const jsonContent = stringifyPreservingOrder(tokens, 2, keyOrderMap);
    const filename = filePath.split('/').pop() || 'tokens.json';
    
    figma.ui.postMessage({
      type: 'download',
      data: {
        content: jsonContent,
        filename: filename
      }
    });
  }
}

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'sync-to-github':
        figma.ui.postMessage({ type: 'sync-started' });
        
        // Get GitHub token FIRST
        const githubToken = await figma.clientStorage.getAsync('github-token');
        console.log('Sync - Token check:', !!githubToken, 'Length:', githubToken ? githubToken.length : 0);
        
        if (!githubToken) {
          throw new Error('GitHub token not configured. Please add it in Settings.');
        }
        
        // Extract all tokens from Figma
        figma.ui.postMessage({ type: 'progress', message: 'Extracting tokens from Figma...' });
        const { tokens: tokensMap, stats, keyOrderMaps } = await extractAllTokens();
        
        // Also try to extract themes
        figma.ui.postMessage({ type: 'progress', message: 'Checking for theme variables...' });
        const { tokens: themeTokensMap, stats: themeStats } = await extractThemeTokens();
        
        // Merge theme tokens into main tokens map
        Object.assign(tokensMap, themeTokensMap);
        
        // Merge stats
        const combinedStats = {
          ...stats,
          themes: themeStats
        };
        
        figma.ui.postMessage({
          type: 'extracted',
          data: combinedStats
        });
        
        // Validate all tokens before proceeding
        const validation = validateAllTokens(tokensMap);
        if (!validation.valid) {
          throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.log('Validation warnings:', validation.warnings);
        }
        
        // Fetch current tokens from repository
        figma.ui.postMessage({ type: 'progress', message: 'Checking for changes...' });
        const currentTokensMap = await fetchAllCurrentTokens(githubToken);
        
        // Sort theme tokens to match existing order in repository
        for (const themeName of Object.keys(THEME_MODE_TO_FILE)) {
          const filePath = THEME_MODE_TO_FILE[themeName];
          if (tokensMap[filePath] && currentTokensMap[filePath]) {
            tokensMap[filePath] = sortThemeTokens(
              tokensMap[filePath],
              currentTokensMap[filePath],
              themeName
            );
          }
        }
        
        // Compare for changes
        const changeDetection = detectChanges(tokensMap, currentTokensMap);
        
        if (!changeDetection.hasChanges) {
          figma.ui.postMessage({
            type: 'no-changes',
            data: {
              totalTokens: stats.total.processed
            }
          });
          return;
        }
        
        // Trigger GitHub sync with only changed files
        figma.ui.postMessage({ type: 'progress', message: 'Creating pull request...' });
        await triggerGitHubSync(tokensMap, changeDetection.changedFiles, githubToken, keyOrderMaps);
        
        // Save last sync time
        await figma.clientStorage.setAsync('last-sync', Date.now());
        
        figma.ui.postMessage({
          type: 'sync-success',
          data: {
            foundationColors: combinedStats.foundationColors.processed,
            semanticAttachment: combinedStats.semanticAttachment.processed,
            totalTokens: combinedStats.total.processed + (combinedStats.themes ? combinedStats.themes.processed : 0),
            changedFiles: changeDetection.changedFiles,
            timestamp: Date.now()
          }
        });
        break;
      
      case 'save-locally':
        figma.ui.postMessage({ type: 'sync-started' });
        
        const result = await extractAllTokens();
        await saveTokensLocally(result.tokens, result.keyOrderMaps);
        
        figma.ui.postMessage({
          type: 'saved-locally',
          data: result.stats
        });
        break;
      
      case 'save-github-token':
        if (!msg.token || msg.token.trim() === '') {
          throw new Error('Token cannot be empty');
        }
        await figma.clientStorage.setAsync('github-token', msg.token.trim());
        console.log('Token saved successfully');
        figma.ui.postMessage({ type: 'token-saved' });
        break;
      
      case 'clear-github-token':
        await figma.clientStorage.deleteAsync('github-token');
        figma.ui.postMessage({ type: 'token-cleared' });
        break;
      
      case 'get-status':
        const token = await figma.clientStorage.getAsync('github-token');
        const sync = await figma.clientStorage.getAsync('last-sync');
        console.log('Status check - Has token:', !!token, 'Token length:', token ? token.length : 0);
        figma.ui.postMessage({
          type: 'status',
          data: {
            hasToken: !!token,
            lastSync: sync || null
          }
        });
        break;
    }
  } catch (error: any) {
    figma.ui.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

// Initialize
initialize();
