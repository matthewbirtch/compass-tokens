/**
 * Figma API Client
 * Fetches color variables from Figma using the REST API
 */

/**
 * Fetch all local variables from a Figma file
 * @param {string} fileId - The Figma file ID
 * @param {string} token - Figma Personal Access Token
 * @returns {Promise<Object>} - The variables data
 */
async function fetchVariables(fileId, token) {
  const url = `https://api.figma.com/v1/files/${fileId}/variables/local`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Figma-Token': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.message.includes('401')) {
      throw new Error('Invalid Figma API token. Please check your .env file.');
    } else if (error.message.includes('404')) {
      throw new Error('Figma file not found. Please check your FIGMA_FILE_ID in .env');
    }
    throw error;
  }
}

/**
 * Extract foundation color variables from Figma API response
 * @param {Object} data - Raw Figma API response
 * @param {string} collectionName - Optional collection name filter
 * @returns {Array} - Array of foundation color variables
 */
function extractFoundationColors(data, collectionName = null) {
  const { meta } = data;
  if (!meta || !meta.variables) {
    throw new Error('No variables found in Figma file');
  }

  const variables = [];
  
  // Get the collection ID if filtering by name
  let targetCollectionId = null;
  if (collectionName && meta.variableCollections) {
    const collections = Object.entries(meta.variableCollections);
    const foundCollection = collections.find(([_, coll]) => 
      coll.name === collectionName
    );
    
    if (foundCollection) {
      targetCollectionId = foundCollection[0];
      console.log(`✓ Found collection: "${collectionName}" (${targetCollectionId})`);
    } else {
      console.warn(`⚠ Collection "${collectionName}" not found, processing all variables`);
    }
  }

  // Process all variables
  Object.entries(meta.variables).forEach(([id, variable]) => {
    // Filter by collection if specified
    if (targetCollectionId && variable.variableCollectionId !== targetCollectionId) {
      return;
    }

    // Only process COLOR type variables
    if (variable.resolvedType !== 'COLOR') {
      return;
    }

    // Only process foundation colors (matching pattern: colorFamily/shade)
    if (!isFoundationColor(variable.name)) {
      return;
    }

    variables.push({
      id,
      name: variable.name,
      value: variable.valuesByMode,
      collectionId: variable.variableCollectionId
    });
  });

  return variables;
}

/**
 * Check if a variable name matches the foundation color pattern
 * Pattern: colorFamily/shade (e.g., blue/500, neutral/1000)
 * 
 * Valid families: blue, indigo, neutral, cyan, purple, teal, yellow, orange, green, red
 * 
 * @param {string} name - Variable name to check
 * @returns {boolean}
 */
function isFoundationColor(name) {
  const FOUNDATION_COLOR_PATTERN = /^(blue|indigo|neutral|cyan|purple|teal|yellow|orange|green|red)\/\d+$/;
  return FOUNDATION_COLOR_PATTERN.test(name);
}

module.exports = {
  fetchVariables,
  extractFoundationColors,
  isFoundationColor
};
