// script.js

let loadedData = [];  // Will hold the JSON array after loading (for the selected dataset).

document.addEventListener('DOMContentLoaded', () => {
  // HTML elements
  const datasetSelect = document.getElementById('datasetSelect');
  const loadBtn = document.getElementById('loadBtn');

  // Filter elements
  const featureSelect = document.getElementById('featureSelect');
  const groupSelect = document.getElementById('groupSelect');
  const subSourceSelect = document.getElementById('subSourceSelect');
  const modelSelect = document.getElementById('modelSelect');
  const labelSelect = document.getElementById('labelSelect');
  const sortOrderSelect = document.getElementById('sortOrderSelect');
  const filterBtn = document.getElementById('filterBtn');
  
  // When user clicks "Load" for a particular dataset
  loadBtn.addEventListener('click', async () => {
    const fileName = datasetSelect.value;

    // 1) Load + decompress the dataset
    loadedData = await loadAndDecompress(`./data/${fileName}`);
    if (!loadedData || loadedData.length === 0) {
      alert('No data found or failed to load data.');
      return;
    }

    // 2) Compute the featureActivation for each entry
    loadedData.forEach(entry => {
      const sum = entry.firing_magnitudes.reduce((acc, val) => acc + val, 0);
      entry.featureActivation = sum;
    });

    // 3) Gather unique sets for each filter
    const features = new Set();
    const groups = new Set();
    const subSources = new Set();
    const models = new Set();
    const labels = new Set();

    loadedData.forEach(entry => {
      features.add(entry.feature);
      groups.add(entry.group);
      subSources.add(entry.sub_source);
      models.add(entry.model);
      labels.add(entry.label);
    });

    // Convert sets to arrays and sort them (so dropdowns are in sorted order)
    const featuresArray = Array.from(features).sort((a, b) => a - b);
    const groupsArray = Array.from(groups).sort();
    const subSourcesArray = Array.from(subSources).sort();
    const modelsArray = Array.from(models).sort();
    const labelsArray = Array.from(labels).sort((a, b) => a - b);

    // 4) Populate filter dropdowns
    populateDropdown(featureSelect, featuresArray, 'All Features');
    populateDropdown(groupSelect, groupsArray, 'All Groups');
    populateDropdown(subSourceSelect, subSourcesArray, 'All Sub Sources');
    populateDropdown(modelSelect, modelsArray, 'All Models');
    populateDropdown(labelSelect, labelsArray, 'All Labels');

    // 5) Sort loadedData by featureActivation desc by default
    loadedData.sort((a, b) => b.featureActivation - a.featureActivation);

    // 6) Render
    renderData(loadedData);
  });
  
  // When user clicks "Apply Filters & Sort"
  filterBtn.addEventListener('click', () => {
    // Filter the loaded data
    const filtered = filterData(loadedData, {
      feature: featureSelect.value,
      group: groupSelect.value,
      subSource: subSourceSelect.value,
      model: modelSelect.value,
      label: labelSelect.value
    });

    // Sort by featureActivation ascending or descending
    const sortOrder = sortOrderSelect.value; // "desc" or "asc"
    sortData(filtered, sortOrder);

    renderData(filtered);
  });
});

/**
 * Fetches a .json.gz file, decompresses using Pako, and returns parsed JSON.
 * @param {string} url - The URL to the .json.gz file
 * @returns {Promise<Object[]>} - Parsed JSON array
 */
async function loadAndDecompress(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    // Decompress using pako
    const data = new Uint8Array(arrayBuffer);
    const decompressed = pako.ungzip(data, { to: 'string' });
    
    // Parse JSON
    const jsonData = JSON.parse(decompressed);
    return jsonData;
  } catch (error) {
    console.error('Error loading or decompressing data:', error);
    return [];
  }
}

/**
 * Populates a <select> element with the given options,
 * plus an "All ..." option as the default.
 */
function populateDropdown(selectEl, items, allLabel) {
  // Clear existing options
  selectEl.innerHTML = '';
  
  // Add "All" option
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = allLabel;
  selectEl.appendChild(allOpt);

  // Add each item
  items.forEach(value => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    selectEl.appendChild(opt);
  });

  // Reset selection to "All"
  selectEl.value = 'all';
}

/**
 * Filters the data array based on the user's dropdown selections.
 * If a dropdown is set to 'all', we ignore that field.
 */
function filterData(data, filters) {
  return data.filter(item => {
    if (filters.feature !== 'all' && item.feature !== parseInt(filters.feature)) {
      return false;
    }
    if (filters.group !== 'all' && item.group !== filters.group) {
      return false;
    }
    if (filters.subSource !== 'all' && item.sub_source !== filters.subSource) {
      return false;
    }
    if (filters.model !== 'all' && item.model !== filters.model) {
      return false;
    }
    if (filters.label !== 'all' && item.label !== parseInt(filters.label)) {
      return false;
    }
    return true;
  });
}

/**
 * Sorts the data array by the 'featureActivation' in ascending or descending order.
 */
function sortData(data, sortOrder) {
  if (sortOrder === 'asc') {
    data.sort((a, b) => a.featureActivation - b.featureActivation);
  } else {
    // "desc"
    data.sort((a, b) => b.featureActivation - a.featureActivation);
  }
}

/**
 * Renders the data into the #visualizationContainer.
 * Shows tokens colored by firing_magnitudes,
 * and displays featureActivation for each entry.
 */
function renderData(data) {
  const container = document.getElementById('visualizationContainer');
  container.innerHTML = ''; // Clear current display
  
  data.forEach(entry => {
    const { tokens, firing_magnitudes, featureActivation } = entry;
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    
    // Metadata row
    const metaDiv = document.createElement('div');
    metaDiv.className = 'meta-row';
    metaDiv.textContent =
      `Feature: ${entry.feature}, Group: ${entry.group}, SubSource: ${entry.sub_source}, ` +
      `Model: ${entry.model}, Label: ${entry.label}, ` +
      `Feature Activation: ${featureActivation.toFixed(2)}`;
    entryDiv.appendChild(metaDiv);
    
    // Max magnitude for normalizing color
    const maxVal = Math.max(...firing_magnitudes);
    
    // Tokens row
    const textPara = document.createElement('p');
    tokens.forEach((word, idx) => {
      const magnitude = firing_magnitudes[idx];
      let norm = (maxVal === 0) ? 0 : magnitude / maxVal;
      
      const wordSpan = document.createElement('span');
      wordSpan.className = 'token';
      wordSpan.textContent = word;
      wordSpan.title = `Magnitude: ${magnitude.toFixed(4)}`;
      
      // background from white to green depending on norm
      wordSpan.style.backgroundColor = `rgba(0, 255, 0, ${norm})`;
      
      textPara.appendChild(wordSpan);
      textPara.appendChild(document.createTextNode(' '));
    });
    entryDiv.appendChild(textPara);
    
    container.appendChild(entryDiv);
  });
}
