// script.js

let loadedData = [];  // Will hold the JSON array after loading

document.addEventListener('DOMContentLoaded', () => {
  const loadBtn = document.getElementById('loadBtn');
  const datasetSelect = document.getElementById('datasetSelect');
  
  // Filter controls
  const layerFilter = document.getElementById('layerFilter');
  const featureFilter = document.getElementById('featureFilter');
  const groupFilter = document.getElementById('groupFilter');
  const subSourceFilter = document.getElementById('subSourceFilter');
  const modelFilter = document.getElementById('modelFilter');
  const labelFilter = document.getElementById('labelFilter');
  const filterBtn = document.getElementById('filterBtn');
  
  loadBtn.addEventListener('click', async () => {
    const fileName = datasetSelect.value;
    loadedData = await loadAndDecompress(`./data/${fileName}`);
    renderData(loadedData);
  });
  
  filterBtn.addEventListener('click', () => {
    // On apply filters, we filter the loadedData
    const filtered = filterData(loadedData, {
      layer: layerFilter.value,
      feature: featureFilter.value,
      group: groupFilter.value,
      sub_source: subSourceFilter.value,
      model: modelFilter.value,
      label: labelFilter.value
    });
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
 * Renders the data into the #visualizationContainer
 * Each entry is shown with tokens colored by firing_magnitudes.
 * @param {Object[]} data - Array of data entries
 */
function renderData(data) {
  const container = document.getElementById('visualizationContainer');
  container.innerHTML = ''; // Clear current display
  
  data.forEach((entry) => {
    const { tokens, firing_magnitudes } = entry;
    // Find max magnitude for the entry to normalize color intensity
    const maxVal = Math.max(...firing_magnitudes);
    
    // Create a container for the entire entry
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    
    // Render any metadata (layer, feature, etc.) at the top if you want
    const metaDiv = document.createElement('div');
    metaDiv.textContent = `Layer: ${entry.layer}, Feature: ${entry.feature}, Group: ${entry.group}, SubSource: ${entry.sub_source}, Model: ${entry.model}, Label: ${entry.label}`;
    entryDiv.appendChild(metaDiv);
    
    // Create a paragraph for the text
    const textPara = document.createElement('p');
    
    tokens.forEach((word, idx) => {
      const magnitude = firing_magnitudes[idx];
      let norm = 0;
      if (maxVal > 0) {
        norm = magnitude / maxVal;  // 0 to 1
      }
      
      // Create a span for each token
      const wordSpan = document.createElement('span');
      wordSpan.className = 'token';
      wordSpan.textContent = word;
      
      // Tooltip showing the magnitude
      wordSpan.title = `Magnitude: ${magnitude.toFixed(4)}`;
      
      // Background color: from white to green
      // Using RGBA: alpha = norm
      // Alternatively, you could keep alpha=1 and vary the intensity of green
      // e.g. backgroundColor = `rgb(0, ${Math.floor(norm * 255)}, 0)`
      wordSpan.style.backgroundColor = `rgba(0, 255, 0, ${norm})`;
      
      // Alternatively:
      // wordSpan.style.backgroundColor = '#fff'; // default to white
      // const greenVal = Math.floor(norm * 255);
      // wordSpan.style.backgroundColor = `rgb(${255 - greenVal}, 255, ${255 - greenVal})`
      
      textPara.appendChild(wordSpan);
      textPara.appendChild(document.createTextNode(' ')); // space
    });
    
    entryDiv.appendChild(textPara);
    container.appendChild(entryDiv);
  });
}

/**
 * Filters the data array based on the non-empty filter fields.
 * @param {Object[]} data - The data array to filter
 * @param {Object} filterObj - Contains potential filter values
 */
function filterData(data, filterObj) {
  return data.filter(item => {
    // For each property in filterObj, if it has a value, we compare
    // Example: if filterObj.layer is "16", then item.layer must be 16
    if (filterObj.layer && item.layer !== parseInt(filterObj.layer)) return false;
    if (filterObj.feature && item.feature !== parseInt(filterObj.feature)) return false;
    if (filterObj.group && item.group !== filterObj.group) return false;
    if (filterObj.sub_source && item.sub_source !== filterObj.sub_source) return false;
    if (filterObj.model && item.model !== filterObj.model) return false;
    if (filterObj.label && item.label !== parseInt(filterObj.label)) return false;
    
    return true;
  });
}
