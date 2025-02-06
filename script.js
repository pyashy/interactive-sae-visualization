// Fetch data from the JSON file (or URL if hosted externally)
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    const words = data.words;  // Assuming each word in 'data.json' has 'text' and 'intensity'

    const container = document.getElementById('word-container');
    
    words.forEach((word, i) => {
      const wordElement = document.createElement('span');
      wordElement.textContent = word.text;
      wordElement.style.color = `rgb(${255 - word.intensity * 50}, ${word.intensity * 50}, 100)`; // Color by intensity
      wordElement.style.margin = '5px';

      // Add tooltip on hover
      wordElement.title = `Intensity: ${word.intensity}`;

      container.appendChild(wordElement);
    });
  })
  .catch(err => console.error("Error loading data:", err));
