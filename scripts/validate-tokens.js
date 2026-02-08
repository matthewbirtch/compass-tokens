/**
 * Token Validation Script
 * Validates color tokens against DTCG format and project rules
 */

const fs = require('fs');
const path = require('path');

// Expected color families and their shade counts
const EXPECTED_FAMILIES = {
  'blue': 8,      // 100-800
  'indigo': 8,    // 100-800
  'neutral': 25,  // 0, 50-1200 (50 increments)
  'cyan': 8,      // 100-800
  'purple': 8,    // 100-800
  'teal': 8,      // 100-800
  'yellow': 8,    // 100-800
  'orange': 8,    // 100-800
  'green': 8,     // 100-800
  'red': 8        // 100-800
};

/**
 * Validate token structure and format
 * @param {Object} tokens - Token structure to validate
 * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
 */
function validateTokens(tokens) {
  const errors = [];
  const warnings = [];

  // Check for $schema
  if (!tokens.$schema) {
    warnings.push('Missing $schema field');
  } else if (!tokens.$schema.includes('tr.designtokens.org')) {
    warnings.push('$schema does not reference DTCG spec');
  }

  // Check structure
  if (!tokens.color) {
    errors.push('Missing "color" top-level key');
    return { valid: false, errors, warnings };
  }

  if (!tokens.color.foundation) {
    errors.push('Missing "color.foundation" key');
    return { valid: false, errors, warnings };
  }

  const foundation = tokens.color.foundation;

  // Validate each color family
  Object.entries(foundation).forEach(([family, shades]) => {
    // Check if family is expected
    if (!EXPECTED_FAMILIES[family]) {
      warnings.push(`Unexpected color family: "${family}"`);
    }

    // Validate each shade
    Object.entries(shades).forEach(([shade, token]) => {
      const tokenPath = `color.foundation.${family}.${shade}`;

      // Check for required fields
      if (!token.$type) {
        errors.push(`${tokenPath}: Missing $type field`);
      } else if (token.$type !== 'color') {
        errors.push(`${tokenPath}: Invalid $type "${token.$type}" (expected "color")`);
      }

      if (!token.$value) {
        errors.push(`${tokenPath}: Missing $value field`);
      } else {
        // Validate HEX format
        const hexPattern = /^#[0-9A-F]{6}$/;
        if (!hexPattern.test(token.$value)) {
          errors.push(`${tokenPath}: Invalid HEX format "${token.$value}" (must be uppercase 6-digit HEX)`);
        }
      }

      // Check for derived tokens (opacity variants)
      if (shade.includes('-') || shade.match(/\d{1,2}%?$/)) {
        const potentialOpacityVariant = shade.match(/[-](\d+)$/);
        if (potentialOpacityVariant) {
          errors.push(
            `${tokenPath}: Opacity variant detected "${shade}". ` +
            `Source tokens should not contain opacity variants like -8, -16, etc. ` +
            `These are generated at build time.`
          );
        }
      }
    });

    // Check shade count
    const shadeCount = Object.keys(shades).length;
    const expectedCount = EXPECTED_FAMILIES[family];
    if (expectedCount && shadeCount !== expectedCount) {
      warnings.push(
        `${family}: Expected ${expectedCount} shades, found ${shadeCount}`
      );
    }
  });

  // Check for missing families
  Object.keys(EXPECTED_FAMILIES).forEach(family => {
    if (!foundation[family]) {
      warnings.push(`Missing expected color family: "${family}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate color.json file
 * @param {string} filePath - Path to color.json
 * @returns {Object} - Validation result
 */
function validateColorFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File not found: ${filePath}`],
      warnings: []
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tokens = JSON.parse(content);
    return validateTokens(tokens);
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse JSON: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * Print validation results
 * @param {Object} result - Validation result
 */
function printResults(result) {
  console.log('\n' + '='.repeat(60));
  console.log('TOKEN VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✅ All validations passed!\n');
    return;
  }

  if (result.errors.length > 0) {
    console.log('❌ ERRORS:\n');
    result.errors.forEach(error => {
      console.log(`  • ${error}`);
    });
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    result.warnings.forEach(warning => {
      console.log(`  • ${warning}`);
    });
    console.log();
  }

  console.log('='.repeat(60) + '\n');
}

// Main execution when run directly
if (require.main === module) {
  const colorJsonPath = path.join(__dirname, '../tokens/src/foundation/color.json');
  
  console.log('Validating color tokens...');
  console.log(`File: ${colorJsonPath}\n`);

  const result = validateColorFile(colorJsonPath);
  printResults(result);

  // Exit with error code if validation failed
  if (!result.valid) {
    process.exit(1);
  }
}

module.exports = {
  validateTokens,
  validateColorFile,
  printResults
};
