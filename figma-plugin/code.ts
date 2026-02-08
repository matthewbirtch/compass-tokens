/**
 * Compass Token Sync - Figma Plugin
 * Syncs foundation and semantic color variables from Figma to GitHub repository
 */

// Configuration
const GITHUB_REPO = 'matthewbirtch/compass-tokens';

// Token file paths
const TOKEN_FILES = {
  FOUNDATION_COLOR: 'tokens/src/foundation/color.json',
  SEMANTIC_ATTACHMENT: 'tokens/src/semantic/attachment.json'
};

// Token patterns
const FOUNDATION_COLOR_PATTERN = /^(blue|indigo|neutral|cyan|purple|teal|yellow|orange|green|red)\/\d+$/;
const SEMANTIC_ATTACHMENT_PATTERN = /^attachment\/(blue|green|orange|red|grey)$/;

// Token category definitions
interface TokenCategory {
  type: string;
  path: string;
  pattern: RegExp;
}

const TOKEN_CATEGORIES: TokenCategory[] = [
  { type: 'foundation-color', path: TOKEN_FILES.FOUNDATION_COLOR, pattern: FOUNDATION_COLOR_PATTERN },
  { type: 'semantic-attachment', path: TOKEN_FILES.SEMANTIC_ATTACHMENT, pattern: SEMANTIC_ATTACHMENT_PATTERN }
];

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
 * Categorize a variable by its naming pattern
 */
function categorizeVariable(name: string): TokenCategory | null {
  for (const category of TOKEN_CATEGORIES) {
    if (category.pattern.test(name)) {
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
  const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  
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

  const stats = {
    foundationColors: { processed: 0, skipped: 0 },
    semanticAttachment: { processed: 0, skipped: 0 },
    total: { processed: 0, skipped: 0 }
  };

  // Process all color variables
  for (const variable of colorVariables) {
    const category = categorizeVariable(variable.name);
    
    if (!category) {
      stats.total.skipped++;
      continue;
    }

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
      const parsed = parseSemanticAttachmentName(variable.name);
      if (!parsed) {
        stats.semanticAttachment.skipped++;
        stats.total.skipped++;
        continue;
      }

      const { color } = parsed;
      
      // Get the first mode's value
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      
      // Check if it's an alias (reference to another variable)
      if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
        const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
        
        if (aliasedVariable) {
          // Build reference string
          const reference = buildReference(aliasedVariable.name);
          
          semanticAttachmentTokens.color.semantic.attachment[color] = {
            $type: "color",
            $value: reference
          };
          
          stats.semanticAttachment.processed++;
          stats.total.processed++;
        } else {
          stats.semanticAttachment.skipped++;
          stats.total.skipped++;
        }
      } else if (typeof value === 'object' && 'r' in value) {
        // Direct color value (not recommended for semantic tokens, but handle it)
        const rgba = value as RGBA;
        const hexValue = rgbToHex(rgba);
        
        semanticAttachmentTokens.color.semantic.attachment[color] = {
          $type: "color",
          $value: hexValue
        };
        
        stats.semanticAttachment.processed++;
        stats.total.processed++;
      }
    }
  }

  return {
    tokens: {
      [TOKEN_FILES.FOUNDATION_COLOR]: foundationColorTokens,
      [TOKEN_FILES.SEMANTIC_ATTACHMENT]: semanticAttachmentTokens
    },
    stats: {
      ...stats,
      foundationColorFamilies: Object.keys(foundationColorTokens.color.foundation).length
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
 * Validate all token types
 */
function validateAllTokens(tokensMap: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate foundation colors
  const foundationValidation = validateFoundationTokens(tokensMap[TOKEN_FILES.FOUNDATION_COLOR]);
  allErrors.push(...foundationValidation.errors);
  allWarnings.push(...foundationValidation.warnings);

  // Validate semantic attachment
  const semanticValidation = validateSemanticTokens(tokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT]);
  allErrors.push(...semanticValidation.errors);
  allWarnings.push(...semanticValidation.warnings);

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
  
  // Fetch foundation colors
  tokens[TOKEN_FILES.FOUNDATION_COLOR] = await fetchCurrentTokensFromFile(
    githubToken, 
    TOKEN_FILES.FOUNDATION_COLOR
  );
  
  // Fetch semantic attachment
  tokens[TOKEN_FILES.SEMANTIC_ATTACHMENT] = await fetchCurrentTokensFromFile(
    githubToken, 
    TOKEN_FILES.SEMANTIC_ATTACHMENT
  );
  
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
 * Compare all token types for differences
 * Returns object with file paths that have changes
 */
function detectChanges(newTokensMap: any, currentTokensMap: any): { hasChanges: boolean; changedFiles: string[] } {
  const changedFiles: string[] = [];
  
  // Check foundation colors
  if (hasFoundationColorChanges(
    newTokensMap[TOKEN_FILES.FOUNDATION_COLOR], 
    currentTokensMap[TOKEN_FILES.FOUNDATION_COLOR]
  )) {
    changedFiles.push(TOKEN_FILES.FOUNDATION_COLOR);
  }
  
  // Check semantic attachment
  if (hasSemanticAttachmentChanges(
    newTokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT], 
    currentTokensMap[TOKEN_FILES.SEMANTIC_ATTACHMENT]
  )) {
    changedFiles.push(TOKEN_FILES.SEMANTIC_ATTACHMENT);
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
        
        figma.ui.postMessage({
          type: 'extracted',
          data: stats
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
            foundationColors: stats.foundationColors.processed,
            semanticAttachment: stats.semanticAttachment.processed,
            totalTokens: stats.total.processed,
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
