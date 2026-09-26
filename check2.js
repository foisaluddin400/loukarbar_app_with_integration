const fs = require('fs');
const code = fs.readFileSync('src/screens/aligned/Rhythms.tsx', 'utf8');
const stack = [];
let i = 0;
while (i < code.length) {
  if (code.slice(i, i + 2) === '</') {
    const end = code.indexOf('>', i);
    const tag = code.slice(i + 2, end).trim();
    if (stack.length && stack[stack.length - 1].tag === tag) {
      stack.pop();
    } else {
      console.log(`Mismatched close tag: ${tag} at index ${i}`);
    }
    i = end + 1;
    continue;
  }
  
  if (code.slice(i, i + 1) === '<' && code[i+1] !== ' ' && code[i+1] !== '=' && !/[0-9]/.test(code[i+1])) {
    const end = code.indexOf('>', i);
    if (end > -1) {
      const tagContent = code.slice(i + 1, end);
      const isSelfClosing = tagContent.endsWith('/');
      if (!isSelfClosing && !tagContent.startsWith('!')) {
        const tagName = tagContent.split(/[\s>]/)[0];
        stack.push({tag: tagName, index: i});
      }
      i = end + 1;
      continue;
    }
  }
  i++;
}
console.log('Unclosed tags:', stack);
