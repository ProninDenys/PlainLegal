document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.querySelector('input[type="file"]');
  const explainButton = document.querySelector('button');
  const resultDiv = document.getElementById('resultContainer');

  let selectedFile = null;
  let extractedText = "";

  // Скрываем результат по умолчанию
  resultDiv.classList.add('hidden');

  fileInput.addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    resultDiv.classList.add('hidden');
    resultDiv.innerHTML = "";
  });

  explainButton.addEventListener('click', async () => {
    if (!selectedFile) {
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = "<p class='text-red-600'>Please upload a file first.</p>";
      return;
    }

    const fileType = selectedFile.type;
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = "<p>Scanning, please wait...</p>";

    if (fileType === 'application/pdf') {
      await extractTextFromPDF(selectedFile);
    } else if (fileType.startsWith('image/')) {
      await extractTextFromImage(selectedFile);
    } else {
      resultDiv.innerHTML = "<p class='text-red-600'>Unsupported file type. Please upload a PDF or image.</p>";
      return;
    }

    try {
      resultDiv.innerHTML = "<p>Asking AI to explain...</p>";

      const response = await fetch('http://127.0.0.1:5001/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText })
      });

      const data = await response.json();

      if (data.explanation) {
        const fullText = data.explanation.trim();
        const words = fullText.split(" ");
        const preview = words.slice(0, 30).join(" ");

        resultDiv.innerHTML = `
          <h3 class='text-lg font-semibold mb-2'>Explanation:</h3>
          <p class='leading-relaxed text-gray-800'>
            ${preview}...<br/><br/>
            <span class="text-blue-600 font-medium">To read the full explanation, please upgrade your access.</span>
          </p>
          <div class="mt-4">
            <a href="/checkout.html" class="bg-black hover:bg-gray-800 text-white py-2 px-4 rounded transition">
              Upgrade Now
            </a>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `<p class='text-red-600'>Error: ${data.error || 'Something went wrong.'}</p>`;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      resultDiv.innerHTML = "<p class='text-red-600'>Failed to contact the server.</p>";
    }
  });

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

  async function extractTextFromImage(file) {
    const imageURL = URL.createObjectURL(file);
    resultDiv.innerHTML = "<p>Scanning image, please wait...</p>";

    const { data: { text } } = await Tesseract.recognize(imageURL, 'eng', {
      logger: m => console.log(m)
    });

    extractedText = text.trim();
  }
});
