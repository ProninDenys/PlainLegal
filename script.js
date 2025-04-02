document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.querySelector('input[type="file"]');
    const explainButton = document.querySelector('button');
    const resultDiv = document.createElement('div');
    resultDiv.className = "mt-6 max-w-2xl mx-auto text-left p-4 bg-white border border-gray-200 rounded shadow";
    explainButton.parentNode.appendChild(resultDiv);
  
    let selectedFile = null;
    let extractedText = "";
  
    fileInput.addEventListener('change', (event) => {
      selectedFile = event.target.files[0];
      resultDiv.innerHTML = "";
    });
  
    explainButton.addEventListener('click', async () => {
      if (!selectedFile) {
        resultDiv.innerHTML = "<p class='text-red-600'>Please upload a file first.</p>";
        return;
      }
  
      const fileType = selectedFile.type;
  
      if (fileType === 'application/pdf') {
        await extractTextFromPDF(selectedFile);
      } else if (fileType.startsWith('image/')) {
        await extractTextFromImage(selectedFile);
      } else {
        resultDiv.innerHTML = "<p class='text-red-600'>Unsupported file type. Please upload a PDF or image.</p>";
        return;
      }
  
      // Отправка текста на сервер
      try {
        resultDiv.innerHTML = "<p>Asking AI to explain...</p>";
  
        const response = await fetch('http://127.0.0.1:5000/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText })
        });
  
        const data = await response.json();
  
        if (data.explanation) {
          resultDiv.innerHTML = `<h3 class='text-lg font-semibold mb-2'>Explanation:</h3><p>${data.explanation}</p>`;
        } else {
          resultDiv.innerHTML = `<p class='text-red-600'>Error: ${data.error || 'Something went wrong.'}</p>`;
        }
      } catch (err) {
        resultDiv.innerHTML = "<p class='text-red-600'>Failed to contact the server.</p>";
      }
    });
  
    async function extractTextFromPDF(file) {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async function () {
          const typedArray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let text = '';
  
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
          }
  
          extractedText = text;
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
  
      extractedText = text;
    }
  });