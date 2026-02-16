const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function sanitizeForDocx(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Input is YYYY-MM-DD from HTML date input → convert to DD-MM-YYYY
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Post-process the rendered document XML to make specific values bold.
 * Finds <w:r> runs containing the target value in their <w:t> text,
 * then splits the run and applies <w:b/> only to the value portion.
 */
function makeBoldInXml(xml, value) {
  if (!value || !value.trim()) return xml;

  // Match each <w:r ...>...</w:r> element
  const runRegex = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;

  return xml.replace(runRegex, (run) => {
    // Extract text from <w:t> inside this run
    const tMatch = run.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    if (!tMatch) return run;

    const textContent = tMatch[1];
    const valueIndex = textContent.indexOf(value);
    if (valueIndex === -1) return run;

    // Extract existing run properties (everything between <w:rPr> and </w:rPr>)
    const rPrMatch = run.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const innerRPr = rPrMatch ? rPrMatch[1] : '';

    // Build run properties: normal (as-is) and bold (with <w:b/> added)
    const normalRPr = innerRPr ? `<w:rPr>${innerRPr}</w:rPr>` : '';
    const boldInnerRPr = innerRPr.includes('<w:b/>')
      ? innerRPr
      : `<w:b/>${innerRPr}`;
    const boldRPr = `<w:rPr>${boldInnerRPr}</w:rPr>`;

    const before = textContent.substring(0, valueIndex);
    const after = textContent.substring(valueIndex + value.length);

    let result = '';

    // Run for text before the bold value
    if (before) {
      result += `<w:r>${normalRPr}<w:t xml:space="preserve">${before}</w:t></w:r>`;
    }

    // Run for the bold value
    result += `<w:r>${boldRPr}<w:t xml:space="preserve">${value}</w:t></w:r>`;

    // Run for text after the bold value
    if (after) {
      result += `<w:r>${normalRPr}<w:t xml:space="preserve">${after}</w:t></w:r>`;
    }

    return result;
  });
}

async function generateBonafideDocx(formData) {
  try {
    const templatePath = path.resolve(__dirname, '../templates/Bonafide_Certificate.docx');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const formattedScholarshipType = formData.scholarshipType
      ? ` (${formData.scholarshipType})`
      : '';

    const nameValue = sanitizeForDocx(formData.name);
    const yearValue = sanitizeForDocx(formData.year);
    const branchValue = sanitizeForDocx(formData.branch);

    const data = {
      title: sanitizeForDocx(formData.title),
      name: nameValue,
      rollno: sanitizeForDocx(formData.rollno),
      relation: sanitizeForDocx(formData.relation),
      parentName: sanitizeForDocx(formData.parentName),
      year: yearValue,
      course: sanitizeForDocx(formData.course),
      branch: branchValue,
      certificateFor: sanitizeForDocx(formData.certificateFor),
      scholarshipType: formattedScholarshipType,
      date: formatDate(sanitizeForDocx(formData.date)),
      academicYear: sanitizeForDocx(formData.academicYear),
      himHer: sanitizeForDocx(formData.himHer || 'him/her'),
      cYear: sanitizeForDocx(formData.cYear || ''),
    };

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    doc.render(data);

    // Post-process: make name, year, branch bold in the rendered XML
    const renderedZip = doc.getZip();
    let docXml = renderedZip.file('word/document.xml').asText();

    docXml = makeBoldInXml(docXml, nameValue);
    docXml = makeBoldInXml(docXml, yearValue);
    docXml = makeBoldInXml(docXml, branchValue);

    renderedZip.file('word/document.xml', docXml);

    const buf = renderedZip.generate({ type: 'nodebuffer' });
    return buf;
  } catch (error) {
    console.error('Error in generateBonafideDocx:', error);

    if (error.properties && error.properties.errors instanceof Array) {
      error.properties.errors.forEach((err, index) => {
        console.error(`Error ${index + 1}:`, {
          id: err.properties.id,
          explanation: err.properties.explanation,
          context: err.properties.context,
          file: err.properties.file,
        });
      });

      const friendlyError = new Error(
        'Template syntax error. Please check that all placeholders use {variable} format.'
      );
      friendlyError.originalError = error;
      throw friendlyError;
    }

    throw error;
  }
}

module.exports = generateBonafideDocx;