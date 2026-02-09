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

// Token category definitions
interface TokenCategory {
  type: string;
  path: string;
  pattern: RegExp;
  variableType: 'COLOR' | 'FLOAT';
}

const TOKEN_CATEGORIES: TokenCategory[] = [
  { type: 'foundation-color', path: TOKEN_FILES.FOUNDATION_COLOR, pattern: FOUNDATION_COLOR_PATTERN, variableType: 'COLOR' },
  { type: 'semantic-attachment', path: TOKEN_FILES.SEMANTIC_ATTACHMENT, pattern: SEMANTIC_ATTACHMENT_PATTERN, variableType: 'COLOR' },
  { type: 'foundation-radius', path: TOKEN_FILES.FOUNDATION_RADIUS, pattern: FOUNDATION_RADIUS_PATTERN, variableType: 'FLOAT' },
  { type: 'foundation-spacing', path: TOKEN_FILES.FOUNDATION_SPACING, pattern: FOUNDATION_SPACING_PATTERN, variableType: 'FLOAT' }
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

  return {
    tokens: {
      [TOKEN_FILES.FOUNDATION_COLOR]: foundationColorTokens,
      [TOKEN_FILES.SEMANTIC_ATTACHMENT]: semanticAttachmentTokens,
      [TOKEN_FILES.FOUNDATION_RADIUS]: foundationRadiusTokens,
      [TOKEN_FILES.FOUNDATION_SPACING]: foundationSpacingTokens
    },
    stats: {
      ...stats,
      foundationColorFamilies: Object.keys(foundationColorTokens.color.foundation).length
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
    if (/-(8|16|24|32|40|48|56|64|72|80|88|96)$/.test(variable.name)) {
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
          tokenValue = buildReference(aliasedVariable.name);
          console.log(`  ${modeName}: ${variable.name} → ${tokenValue}`);
        } else {
          stats.skipped++;
          continue;
        }
      } else if (typeof value === 'object' && 'r' in value) {
        // Direct color value
        const rgba = value as RGBA;
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
async function triggerGitHubSync(tokensMap: any, changedFiles: string[], githubToken: string) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;
  
  // Prepare file updates for only changed files
  const fileUpdates: any = {};
  for (const filePath of changedFiles) {
    fileUpdates[filePath] = tokensMap[filePath];
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
async function saveTokensLocally(tokensMap: any) {
  // Send each file to UI for download
  for (const [filePath, tokens] of Object.entries(tokensMap)) {
    const jsonContent = JSON.stringify(tokens, null, 2);
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
        const { tokens: tokensMap, stats } = await extractAllTokens();
        
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
        await triggerGitHubSync(tokensMap, changeDetection.changedFiles, githubToken);
        
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
        await saveTokensLocally(result.tokens);
        
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
