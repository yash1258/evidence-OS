const fs = require('fs');
const path = require('path');

async function uploadFile(filename) {
  const filePath = path.join(__dirname, 'test_docs', filename);
  const buffer = fs.readFileSync(filePath);
  
  const blob = new Blob([buffer], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, filename);

  console.log(`Uploading ${filename}...`);
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Upload failed for ${filename}: ${response.status} ${text}`);
      return;
    }
    
    const data = await response.json();
    console.log(`Success! Graph stats for ${filename}:`, JSON.stringify(data.graphStats, null, 2));
    if (data.insights && data.insights.length > 0) {
      console.log(`\nProactive Insights discovered during ingestion:\n`, data.insights.map(i => `- ${i}`).join('\n'));
    }
  } catch (error) {
    console.error(`Error uploading ${filename}:`, error);
  }
}

async function main() {
  await uploadFile('q3_report.txt');
  console.log('\n-------------------\n');
  await uploadFile('board_meeting_notes.txt');
}

main();
