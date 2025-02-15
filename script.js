const METADATA_FOLDER = 'metadata/';
const DATA_FOLDER = 'data/';
const TEXTS_FOLDER = 'texts/';
const AVAILABLE_LAYERS = [8, 10, 12, 14, 16, 18, 20];

const layerSelectEl = document.getElementById('layerSelect');
const featureSelectEl = document.getElementById('featureSelect');
const featureTagsEl = document.getElementById('featureTags');
const textsContainerEl = document.getElementById('textsContainer');
const featureInfoEl = document.getElementById('featureInfo');
const featureDomainTablesEl = document.getElementById('featureDomainTables');
const groupSelectEl = document.getElementById('groupSelect');

let currentLayerMetadata = null;
let currentLayer = null;
let currentFeature = null;
let currentDataForTexts = [];

function initPage() {
  fillLayerSelect();
  layerSelectEl.addEventListener('change', onLayerChange);
  featureSelectEl.addEventListener('change', onFeatureChange);
  groupSelectEl.addEventListener('change', renderTextsList);


  layerSelectEl.value = AVAILABLE_LAYERS[0];
  onLayerChange();
}

function fillLayerSelect() {
  layerSelectEl.innerHTML = '';
  AVAILABLE_LAYERS.forEach(layer => {
    const option = document.createElement('option');
    option.value = layer;
    option.textContent = `Layer ${layer}`;
    layerSelectEl.appendChild(option);
  });
}

async function onLayerChange() {
  currentLayer = layerSelectEl.value;
  featureSelectEl.innerHTML = '';
  currentLayerMetadata = null;
  
  const url = `${METADATA_FOLDER}${currentLayer}.json`;
  try {
    const response = await fetch(url);
    currentLayerMetadata = await response.json();
  } catch (err) {
    console.error('Failed downloading metadata:', err);
    currentLayerMetadata = {};
  }

  const featureKeys = Object.keys(currentLayerMetadata);
  featureKeys.forEach(fKey => {
    const featObj = currentLayerMetadata[fKey] || {};

    const labels = [];


    if (featObj["Top 20 XGBoost"]) {
      labels.push('XGBoost');
    }


    if (Array.isArray(featObj["Domains"]) && featObj["Domains"].length > 0) {
      labels.push(`Domains: ${featObj["Domains"].join(', ')}`);
    }


    if (Array.isArray(featObj["Models"]) && featObj["Models"].length > 0) {
      labels.push(`Models: ${featObj["Models"].join(', ')}`);
    }


    const suffix = labels.length ? ` (${labels.join(' | ')})` : '';

    const option = document.createElement('option');
    option.value = fKey;
    option.textContent = `Feature ${fKey}${suffix}`;
    featureSelectEl.appendChild(option);
  });


  if (featureSelectEl.options.length > 0) {
    featureSelectEl.selectedIndex = 0;
  }

  onFeatureChange();
}

async function onFeatureChange() {
  currentFeature = featureSelectEl.value;
  updateFeatureTags();

  const dataUrl = `${DATA_FOLDER}layer${currentLayer}_feature${currentFeature}.json`;
  try {
    const resp = await fetch(dataUrl);
    currentDataForTexts = await resp.json();
  } catch (err) {
    console.error('Ошибка при загрузке данных по текстам:', err);
    currentDataForTexts = [];
  }

  currentDataForTexts.forEach(obj => {
    obj.sumActivations = obj.activations.reduce((a, b) => a + b, 0);
  });
  currentDataForTexts.sort((a, b) => b.sumActivations - a.sumActivations);

  showFeatureMetadata();
  renderTextsList();
}

function updateFeatureTags() {
  featureTagsEl.textContent = '';
  if (!currentLayerMetadata || !currentFeature) return;

  const featObj = currentLayerMetadata[currentFeature];
  if (!featObj) return;


  const labels = [];


  if (featObj["Top 20 XGBoost"]) {
    labels.push('XGBoost');
  }

  if (Array.isArray(featObj["Domains"]) && featObj["Domains"].length > 0) {
    labels.push(`Domains: ${featObj["Domains"].join(', ')}`);
  }

  if (Array.isArray(featObj["Models"]) && featObj["Models"].length > 0) {
    labels.push(`Models: ${featObj["Models"].join(', ')}`);
  }

  if (labels.length > 0) {
    featureTagsEl.textContent = labels.join(' | ');
  }
}

function showFeatureMetadata() {
  featureInfoEl.innerHTML = '';
  featureDomainTablesEl.innerHTML = '';
  if (!currentLayerMetadata || !currentFeature) return;

  const featObj = currentLayerMetadata[currentFeature];
  if (!featObj) return;

  
  const p = document.createElement('p');
  const macroF1 = featObj["Macro F1"];
  if (macroF1 !== undefined) {
    p.textContent = `Macro F1: ${macroF1}`;
  } else {
    p.textContent = 'No Macro F1 data';
  }
  featureInfoEl.appendChild(p);


  const domainF1Obj = featObj["Domain F1"] || {};
  const domainRanksObj = featObj["Domain Ranks"] || {};
  if (Object.keys(domainF1Obj).length > 0) {
    const domainTable = createF1RankTable(domainF1Obj, domainRanksObj, "Domain");
    featureDomainTablesEl.appendChild(domainTable);
  }


  const modelF1Obj = featObj["Models F1"] || {};
  const modelRanksObj = featObj["Models Ranks"] || {};
  if (Object.keys(modelF1Obj).length > 0) {
    const modelTable = createF1RankTable(modelF1Obj, modelRanksObj, "Model");
    featureDomainTablesEl.appendChild(modelTable);
  }
}


function createF1RankTable(f1Obj, rankObj, label) {
  const table = document.createElement('table');
  table.classList.add('domain-table');
  const header = document.createElement('tr');
  header.innerHTML = `<th>${label}</th><th>F1</th><th>Rank</th>`;
  table.appendChild(header);

  for (const key of Object.keys(f1Obj)) {
    const f1Val = f1Obj[key];
    const rankVal = rankObj[key];

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${key}</td>
      <td>${(typeof f1Val === 'number' ? f1Val.toFixed(4) : f1Val)}</td>
      <td>${rankVal !== undefined ? rankVal : ''}</td>
    `;
    table.appendChild(row);
  }

  return table;
}

async function renderTextsList() {
  textsContainerEl.innerHTML = '';
  const selectedGroup = groupSelectEl.value;
  let filtered = currentDataForTexts;

  if (selectedGroup !== 'all') {
    filtered = filtered.filter(item => item.group === selectedGroup);
  }

  for (const item of filtered) {
    const textId = item.text_id;
    let textData;
    try {
      const resp = await fetch(`${TEXTS_FOLDER}${textId}.json`);
      textData = await resp.json();
    } catch (err) {
      console.error(`Failed while loading ${textId}:`, err);
      continue;
    }

    const textDiv = document.createElement('div');
    textDiv.classList.add('text-item');

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('text-meta');
    metaDiv.textContent =
      `(text_id=${textData.text_id}), ` +
      `Activations Sum=${item.sumActivations}, ` +
      `sub_source=${textData.sub_source}, ` +
      `model=${textData.model}, ` +
      `label=${textData.label}`;
    textDiv.appendChild(metaDiv);

    
    const tokensContainer = document.createElement('div');
    tokensContainer.classList.add('tokens-container');

    const maxVal = Math.max(...item.activations, 0);
    textData.tokens.forEach((token, idx) => {
      const span = document.createElement('span');
      span.classList.add('token');
      span.textContent = token;

      const actVal = item.activations[idx] || 0;
      let alpha = 0;
      if (maxVal > 0) alpha = actVal / maxVal;
      span.style.backgroundColor = `rgba(0, 255, 0, ${alpha})`;

      tokensContainer.appendChild(span);
    });

    textDiv.appendChild(tokensContainer);
    textsContainerEl.appendChild(textDiv);
  }
}

window.addEventListener('DOMContentLoaded', initPage);

