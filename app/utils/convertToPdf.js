// const convert = require('docx-pdf');
import libreOffice from 'libreoffice-convert';
const convertToPDF = (docxbuff) => {
    return new Promise((resolve, reject) => { 
                libreOffice.convert(docxbuff,'.pdf',undefined, function (err, result) {
                     if (err) {
                          console.error("Conversion Error:", err);
                          reject(err);
                     } else {
                         resolve(result);
                         console.log(`Converted PDF `);
                      }
                     });
                   });
};


 export default  convertToPDF ;
