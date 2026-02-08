/**
 * Compass Token Sync - Figma Plugin
 * Syncs foundation color variables from Figma to GitHub repository
 */

// Configuration
const GITHUB_REPO = 'matthewbirtch/compass-tokens';
const COLOR_JSON_PATH = 'tokens/src/foundation/color.json';
const FOUNDATION_COLOR_PATTERN = /^(blue|indigo|neutral|cyan|purple|teal|yellow|orange|green|red)\/\d+$/;

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
 * Check if a variable name matches the foundation color pattern
 */
function isFoundationColor(name: string): boolean {
  return FOUNDATION_COLOR_PATTERN.test(name);
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
 * Parse variable name to token path components
 */
function parseVariableName(name: string): { family: string; shade: string } | null {
  const match = name.match(/^([a-z]+)\/(\d+)$/i);
  if (!match) return null;
  
  return {
    family: match[1].toLowerCase(),
    shade: match[2]
  };
}

/**
 * Extract and transform foundation colors from Figma
 */
async function extractColors() {
  const variables = await figma.variables.getLocalVariablesAsync('COLOR');
  
  const tokens: any = {
    $schema: "https://tr.designtokens.org/format/",
    color: {
      foundation: {}
    }
  };

  let processedCount = 0;
  let skippedCount = 0;

  for (const variable of variables) {
    // Filter: only foundation colors
    if (!isFoundationColor(variable.name)) {
      skippedCount++;
      continue;
    }

    const parsed = parseVariableName(variable.name);
    if (!parsed) {
      skippedCount++;
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
      if (!tokens.color.foundation[family]) {
        tokens.color.foundation[family] = {};
      }
      
      // Add token
      tokens.color.foundation[family][shade] = {
        $type: "color",
        $value: hexValue
      };
      
      processedCount++;
    }
  }

  return {
    tokens,
    stats: {
      processed: processedCount,
      skipped: skippedCount,
      families: Object.keys(tokens.color.foundation).length
    }
  };
}

/**
 * Validate tokens before sending to GitHub
 */
function validateTokens(tokens: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check structure
  if (!tokens.$schema) {
    warnings.push('Missing $schema field');
  }

  if (!tokens.color || !tokens.color.foundation) {
    errors.push('Invalid token structure');
    return { valid: false, errors, warnings };
  }

  const foundation = tokens.color.foundation;
  
  // Validate each color family
  Object.entries(foundation).forEach(([family, shades]: [string, any]) => {
    Object.entries(shades).forEach(([shade, token]: [string, any]) => {
      // Check required fields
      if (!token.$type || token.$type !== 'color') {
        errors.push(`${family}/${shade}: Invalid or missing $type`);
      }

      if (!token.$value) {
        errors.push(`${family}/${shade}: Missing $value`);
      } else {
        // Validate HEX format (uppercase, 6 digits)
        const hexPattern = /^#[0-9A-F]{6}$/;
        if (!hexPattern.test(token.$value)) {
          errors.push(`${family}/${shade}: Invalid HEX format "${token.$value}" (must be uppercase 6-digit HEX)`);
        }
      }

      // Check for opacity variants (not allowed in source)
      if (shade.match(/[-]\d+$/)) {
        errors.push(`${family}/${shade}: Opacity variants not allowed in source tokens`);
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
 * Trigger GitHub repository dispatch to create PR
 */
async function triggerGitHubSync(tokens: any, githubToken: string) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;
  
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
        tokens,
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
 * Save tokens to local file (alternative to GitHub sync)
 */
async function saveTokensLocally(tokens: any) {
  const jsonContent = JSON.stringify(tokens, null, 2);
  
  // Send to UI for download
  figma.ui.postMessage({
    type: 'download',
    data: {
      content: jsonContent,
      filename: 'color.json'
    }
  });
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
        
        // Extract colors
        const { tokens, stats } = await extractColors();
        
        figma.ui.postMessage({
          type: 'extracted',
          data: stats
        });
        
        // Validate tokens before sending
        const validation = validateTokens(tokens);
        if (!validation.valid) {
          throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.log('Validation warnings:', validation.warnings);
        }
        
        // Trigger GitHub sync
        await triggerGitHubSync(tokens, githubToken);
        
        // Save last sync time
        await figma.clientStorage.setAsync('last-sync', Date.now());
        
        figma.ui.postMessage({
          type: 'sync-success',
          data: {
            colorCount: stats.processed,
            timestamp: Date.now()
          }
        });
        break;
      
      case 'save-locally':
        figma.ui.postMessage({ type: 'sync-started' });
        
        const result = await extractColors();
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
