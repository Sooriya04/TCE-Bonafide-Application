/**
 * Run this script once to generate the Bonafide_Certificate.docx template.
 * Usage: node scripts/generateTemplate.js
 * 
 * The template uses {placeholder} syntax for docxtemplater.
 * {name}, {year}, and {branch} are set to BOLD so docxtemplater preserves the formatting.
 */

const {
    Document, Packer, Paragraph, TextRun,
    AlignmentType, TabStopPosition, TabStopType,
    convertInchesToTwip
} = require('docx');
const fs = require('fs');
const path = require('path');

async function createTemplate() {
    const fontSize = 24; // 12pt
    const fontName = 'Times New Roman';

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1.2),
                            right: convertInchesToTwip(1.2),
                        },
                    },
                },
                children: [
                    // Dashed line
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: '-----------------------------------------------------------------------------------------------------------------------------',
                                font: fontName,
                                size: fontSize,
                            }),
                        ],
                    }),

                    // No.D/{cYear}                                         Date:{date}
                    new Paragraph({
                        tabStops: [
                            {
                                type: TabStopType.RIGHT,
                                position: TabStopPosition.MAX,
                            },
                        ],
                        children: [
                            new TextRun({
                                text: 'No.D/{cYear}',
                                font: fontName,
                                size: fontSize,
                            }),
                            new TextRun({
                                text: '\tDate:{date}',
                                font: fontName,
                                size: fontSize,
                            }),
                        ],
                    }),

                    // Empty line
                    new Paragraph({ children: [new TextRun({ text: '', size: fontSize })] }),

                    // BONAFIDE CERTIFICATE heading
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                        children: [
                            new TextRun({
                                text: 'BONAFIDE CERTIFICATE',
                                bold: true,
                                font: fontName,
                                size: 28, // 14pt
                            }),
                        ],
                    }),

                    // Empty line
                    new Paragraph({ children: [new TextRun({ text: '', size: fontSize })] }),

                    // Certificate body paragraph 1 with {name}, {year}, {branch} in BOLD
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { line: 360 }, // 1.5 line spacing
                        indent: { firstLine: convertInchesToTwip(0.5) },
                        children: [
                            new TextRun({
                                text: 'Certified that {title}. ',
                                font: fontName,
                                size: fontSize,
                            }),
                            // {name} placeholder in BOLD
                            new TextRun({
                                text: '{name}',
                                bold: true,
                                font: fontName,
                                size: fontSize,
                            }),
                            new TextRun({
                                text: '{name}, (Roll No : {rollno}) of {relation}{parentName} is a bonafide student of this College studying in ',
                                font: fontName,
                                size: fontSize,
                            }),
                            // {year} placeholder in BOLD
                            new TextRun({
                                text: '{year}',
                                bold: true,
                                font: fontName,
                                size: fontSize,
                            }),
                            new TextRun({
                                text: ' Year, {course} - ',
                                font: fontName,
                                size: fontSize,
                            }),
                            // {branch} placeholder in BOLD
                            new TextRun({
                                text: '{branch}',
                                bold: true,
                                font: fontName,
                                size: fontSize,
                            }),
                            new TextRun({
                                text: ' during the year {academicYear}.',
                                font: fontName,
                                size: fontSize,
                            }),
                        ],
                    }),

                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { line: 360 },
                        indent: { firstLine: convertInchesToTwip(0.5) },
                        children: [
                            new TextRun({
                                text: 'This Certificate is issued to enable {himHer} to apply for {certificateFor}{#scholarshipType} ({scholarshipType}){/scholarshipType}.',
                                font: fontName,
                                size: fontSize,
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.resolve(__dirname, '../templates/Bonafide_Certificate.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Template written to: ${outputPath}`);
}

createTemplate().catch(console.error);
