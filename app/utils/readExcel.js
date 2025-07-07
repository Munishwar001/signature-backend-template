import xlsx from 'xlsx';
const extractExcelData = (excelPath) => {
                const workbook = xlsx.readFile(excelPath);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = xlsx.utils.sheet_to_json(worksheet);
    
                return data;
}

export default extractExcelData;