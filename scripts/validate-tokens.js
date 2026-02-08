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

// Expected semantic attachment colors
const EXPECTED_SEMANTIC_ATTACHMENT = ['blue', 'green', 'orange', 'red', 'grey'];

/**
 * Validate foundation color tokens
 * @param {Object} tokens - Token structure to validate
 * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
 */
function validateFoundationTokens(tokens) {
  const errors = [];
  const warnings = [];

  // Check for $schema
  if (!tokens.$schema) {
    warnings.push('Foundation: Missing $schema field');
  } else if (!tokens.$schema.includes('tr.designtokens.org')) {
    warnings.push('Foundation: $schema does not reference DTCG spec');
  }

  // Check structure
  if (!tokens.color) {
    errors.push('Foundation: Missing "color" top-level key');
    return { valid: false, errors, warnings };
  }

  if (!tokens.color.foundation) {
    errors.push('Foundation: Missing "color.foundation" key');
    return { valid: false, errors, warnings };
  }

  const foundation = tokens.color.foundation;

  // Validate each color family
  Object.entries(foundation).forEach(([family, shades]) => {
    // Check if family is expected
    if (!EXPECTED_FAMILIES[family]) {
      warnings.push(`Foundation: Unexpected color family: "${family}"`);
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
        `Foundation ${family}: Expected ${expectedCount} shades, found ${shadeCount}`
      );
    }
  });

  // Check for missing families
  Object.keys(EXPECTED_FAMILIES).forEach(family => {
    if (!foundation[family]) {
      warnings.push(`Foundation: Missing expected color family: "${family}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate semantic attachment tokens
 * @param {Object} tokens - Token structure to validate
 * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
 */
function validateSemanticAttachmentTokens(tokens) {
  const errors = [];
  const warnings = [];

  // Check for $schema
  if (!tokens.$schema) {
    warnings.push('Semantic: Missing $schema field');
  } else if (!tokens.$schema.includes('tr.designtokens.org')) {
    warnings.push('Semantic: $schema does not reference DTCG spec');
  }

  // Check structure
  if (!tokens.color) {
    errors.push('Semantic: Missing "color" top-level key');
    return { valid: false, errors, warnings };
  }

  if (!tokens.color.semantic || !tokens.color.semantic.attachment) {
    errors.push('Semantic: Missing "color.semantic.attachment" key');
    return { valid: false, errors, warnings };
  }

  const attachment = tokens.color.semantic.attachment;

  // Validate each attachment color
  Object.entries(attachment).forEach(([colorName, token]) => {
    const tokenPath = `color.semantic.attachment.${colorName}`;

    // Check for required fields
    if (!token.$type) {
      errors.push(`${tokenPath}: Missing $type field`);
    } else if (token.$type !== 'color') {
      errors.push(`${tokenPath}: Invalid $type "${token.$type}" (expected "color")`);
    }

    if (!token.$value) {
      errors.push(`${tokenPath}: Missing $value field`);
    } else {
      // Check if it's a reference or direct value
      const isReference = typeof token.$value === 'string' && 
                         token.$value.startsWith('{') && 
                         token.$value.endsWith('}');
      const isHex = typeof token.$value === 'string' && 
                   /^#[0-9A-F]{6}$/i.test(token.$value);
      
      if (!isReference && !isHex) {
        errors.push(
          `${tokenPath}: Value must be either a reference like {color.foundation.blue.300} or a HEX color`
        );
      }
      
      // Warn if using direct hex instead of reference
      if (isHex) {
        warnings.push(
          `${tokenPath}: Using direct HEX value instead of reference. ` +
          `Consider using foundation color references for better maintainability.`
        );
      }
    }
  });

  // Check for missing expected colors
  EXPECTED_SEMANTIC_ATTACHMENT.forEach(colorName => {
    if (!attachment[colorName]) {
      warnings.push(`Semantic: Missing expected attachment color: "${colorName}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a token file
 * @param {string} filePath - Path to token file
 * @param {string} type - Type of token file ('foundation' or 'semantic')
 * @returns {Object} - Validation result
 */
function validateTokenFile(filePath, type) {
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
    
    if (type === 'foundation') {
      return validateFoundationTokens(tokens);
    } else if (type === 'semantic') {
      return validateSemanticAttachmentTokens(tokens);
    } else {
      return {
        valid: false,
        errors: [`Unknown validation type: ${type}`],
        warnings: []
      };
    }
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
 * @param {string} filename - Name of the file being validated
 * @param {Object} result - Validation result
 */
function printResults(filename, result) {
  console.log(`\n📄 ${filename}`);
  console.log('-'.repeat(60));

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✅ All validations passed!');
    return;
  }

  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    result.errors.forEach(error => {
      console.log(`  • ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.forEach(warning => {
      console.log(`  • ${warning}`);
    });
  }
}

// Main execution when run directly
if (require.main === module) {
  const foundationColorPath = path.join(__dirname, '../tokens/src/foundation/color.json');
  const semanticAttachmentPath = path.join(__dirname, '../tokens/src/semantic/attachment.json');
  
  console.log('\n' + '='.repeat(60));
  console.log('TOKEN VALIDATION');
  console.log('='.repeat(60));

  // Validate foundation colors
  const foundationResult = validateTokenFile(foundationColorPath, 'foundation');
  printResults('Foundation Colors', foundationResult);

  // Validate semantic attachment
  const semanticResult = validateTokenFile(semanticAttachmentPath, 'semantic');
  printResults('Semantic Attachment Colors', semanticResult);

  console.log('\n' + '='.repeat(60) + '\n');

  // Exit with error code if any validation failed
  if (!foundationResult.valid || !semanticResult.valid) {
    process.exit(1);
  }
}

module.exports = {
  validateFoundationTokens,
  validateSemanticAttachmentTokens,
  validateTokenFile,
  printResults
};
