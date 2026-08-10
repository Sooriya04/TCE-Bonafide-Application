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

async function generateBonafideDocx(formData) {
  try {
    const templatePath = path.resolve(__dirname, '../templates/Bonafide_Certificate.docx');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const scholarshipType = formData.scholarshipType ? formData.scholarshipType.trim() : '';

    const titleValue = sanitizeForDocx(formData.title);
    const titleWithDot = titleValue && !titleValue.endsWith('.') ? `${titleValue}.` : titleValue;

    let finalName = sanitizeForDocx(formData.name).replace(/\.+$/, "").trim();
    // If the name already starts with "Mr. " or "Ms. ", strip it for the template 
    // because the template likely has a separate {title} placeholder.
    const prefix = `${titleWithDot} `;
    if (finalName.startsWith(prefix)) {
      finalName = finalName.replace(prefix, "");
    }

    const yearValue = sanitizeForDocx(formData.year);
    const branchValue = sanitizeForDocx(formData.branch);

    const data = {
      title: titleWithDot,
      name: finalName,
      rollno: sanitizeForDocx(formData.rollno),
      relation: sanitizeForDocx(formData.relation),
      parentName: sanitizeForDocx(formData.parentName),
      year: yearValue,
      course: sanitizeForDocx(formData.course),
      branch: branchValue,
      certificateFor: sanitizeForDocx(formData.certificateFor),
      scholarshipType: scholarshipType,
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

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
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