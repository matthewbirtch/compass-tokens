/**
 * Transformation utilities
 * Converts Figma variables to DTCG token format
 */

/**
 * Convert Figma RGB (0-1) to uppercase HEX
 * @param {Object} rgba - RGBA object with r, g, b, a values (0-1 range)
 * @returns {string} - Uppercase HEX color (e.g., "#1C58D9")
 */
function rgbToHex(rgba) {
  const toHex = (n) => {
    const value = Math.round(n * 255);
    return value.toString(16).toUpperCase().padStart(2, '0');
  };
  
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
}

/**
 * Parse Figma variable name to token path components
 * Example: "blue/500" → { family: "blue", shade: "500" }
 * 
 * @param {string} name - Variable name from Figma
 * @returns {Object|null} - { family, shade } or null if invalid
 */
function parseVariableName(name) {
  const match = name.match(/^([a-z]+)\/(\d+)$/i);
  if (!match) return null;
  
  return {
    family: match[1].toLowerCase(),
    shade: match[2]
  };
}

/**
 * Transform Figma variables to DTCG token structure
 * @param {Array} variables - Array of Figma variables
 * @returns {Object} - DTCG-formatted token structure
 */
function buildTokenStructure(variables) {
  const tokens = {
    $schema: "https://tr.designtokens.org/format/",
    color: {
      foundation: {}
    }
  };

  let processedCount = 0;
  let skippedCount = 0;

  for (const variable of variables) {
    const parsed = parseVariableName(variable.name);
    
    if (!parsed) {
      console.warn(`⚠ Skipping invalid variable name: ${variable.name}`);
      skippedCount++;
      continue;
    }

    const { family, shade } = parsed;
    
    // Get the first mode's value (typically "Mode 1" or default mode)
    const modeId = Object.keys(variable.value)[0];
    const rgba = variable.value[modeId];
    
    if (!rgba || typeof rgba.r === 'undefined') {
      console.warn(`⚠ Skipping variable with no valid color: ${variable.name}`);
      skippedCount++;
      continue;
    }

    const hexValue = rgbToHex(rgba);
    
    // Initialize family object if it doesn't exist
    if (!tokens.color.foundation[family]) {
      tokens.color.foundation[family] = {};
    }
    
    // Add the token
    tokens.color.foundation[family][shade] = {
      $type: "color",
      $value: hexValue
    };
    
    processedCount++;
  }

  console.log(`✓ Processed ${processedCount} color tokens`);
  if (skippedCount > 0) {
    console.log(`⚠ Skipped ${skippedCount} invalid variables`);
  }

  return tokens;
}

/**
 * Count total number of colors in token structure
 * @param {Object} tokens - Token structure
 * @returns {number} - Total color count
 */
function countColors(tokens) {
  let count = 0;
  
  if (tokens.color && tokens.color.foundation) {
    Object.values(tokens.color.foundation).forEach(family => {
      count += Object.keys(family).length;
    });
  }
  
  return count;
}

/**
 * Get a summary of color families and their shade counts
 * @param {Object} tokens - Token structure
 * @returns {Object} - Summary object
 */
function getSummary(tokens) {
  const summary = {};
  
  if (tokens.color && tokens.color.foundation) {
    Object.entries(tokens.color.foundation).forEach(([family, shades]) => {
      summary[family] = Object.keys(shades).length;
    });
  }
  
  return summary;
}

module.exports = {
  rgbToHex,
  parseVariableName,
  buildTokenStructure,
  countColors,
  getSummary
};
