document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.querySelector('input[type="file"]');
  const explainButton = document.querySelector('#explainBtn');
  const resultDiv = document.querySelector('#resultContainer');

  let selectedFile = null;
  let extractedText = "";

  // Скрыть результат по умолчанию
  resultDiv.classList.add('hidden');

  fileInput.addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    resultDiv.classList.add('hidden'); // скрыть результат при новом выборе файла
    resultDiv.innerHTML = "";
  });

  explainButton.addEventListener('click', async () => {
    if (!selectedFile) {
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = "<p class='text-red-600'>Please upload a file first.</p>";
      return;
    }

    const fileType = selectedFile.type;

    if (fileType === 'application/pdf') {
      await extractTextFromPDF(selectedFile);
    } else if (fileType.startsWith('image/')) {
      await extractTextFromImage(selectedFile);
    } else {
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = "<p class='text-red-600'>Unsupported file type. Please upload a PDF or image.</p>";
      return;
    }

    // Показать результат
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = "<p>Asking AI to explain...</p>";

    try {
      const response = await fetch('http://127.0.0.1:5001/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText })
      });

      const data = await response.json();

      if (data.explanation) {
        resultDiv.innerHTML = `
          <h3 class='text-lg font-semibold mb-2'>Explanation:</h3>
          <p class='leading-relaxed text-gray-800'>${data.explanation}</p>`;
      } else {
        resultDiv.innerHTML = `<p class='text-red-600'>Error: ${data.error || 'Something went wrong.'}</p>`;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      resultDiv.innerHTML = "<p class='text-red-600'>Failed to contact the server.</p>";
    }
  });

  // Обработка PDF
  async function extractTextFromPDF(file) {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          text += pageText + '\n';
        }

        extractedText = text.trim();
        resolve();
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Обработка изображения
  async function extractTextFromImage(file) {
    const imageURL = URL.createObjectURL(file);
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = "<p>Scanning image, please wait...</p>";

    const { data: { text } } = await Tesseract.recognize(imageURL, 'eng', {
      logger: m => console.log(m)
    });

    extractedText = text.trim();
  }
});