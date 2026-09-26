const fs = require('fs');
const code = fs.readFileSync('src/screens/aligned/Rhythms.tsx', 'utf8');
const babel = require('@babel/parser');
try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("No syntax errors found by Babel.");
} catch (e) {
  console.error(e);
}
