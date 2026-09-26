const fs = require('fs');
const code = fs.readFileSync('src/screens/aligned/Rhythms.tsx', 'utf8');

let stack = [];
let i = 0;
while (i < code.length) {
  // skip strings
  if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
    const q = code[i];
    i++;
    while (i < code.length && (code[i] !== q || code[i-1] === '\\')) i++;
    i++;
    continue;
  }
  // skip comments
  if (code.slice(i, i+2) === '//') {
    while(i < code.length && code[i] !== '\n') i++;
    continue;
  }
  if (code.slice(i, i+2) === '/*') {
    while(i < code.length && code.slice(i, i+2) !== '*/') i++;
    i+=2;
    continue;
  }
  
  if (code.slice(i, i+2) === '</') {
    let end = code.indexOf('>', i);
    let tag = code.slice(i+2, end).trim();
    if (stack.length > 0 && stack[stack.length-1].tag === tag) {
      stack.pop();
    } else {
      console.log(`Unmatched closing tag at line ${code.slice(0, i).split('\n').length}: </${tag}>`);
    }
    i = end + 1;
    continue;
  }
  
  if (code[i] === '<' && /[A-Za-z]/.test(code[i+1])) {
    let end = i + 1;
    let tag = "";
    while(end < code.length && /[A-Za-z0-9_]/.test(code[end])) {
      tag += code[end];
      end++;
    }
    
    // now skip attributes until '>'
    let isSelfClosing = false;
    let attrEnd = end;
    let inString = false;
    let q = '';
    let braces = 0;
    while(attrEnd < code.length) {
      if (inString) {
        if (code[attrEnd] === q && code[attrEnd-1] !== '\\') inString = false;
      } else if (braces > 0) {
        if (code[attrEnd] === '{') braces++;
        if (code[attrEnd] === '}') braces--;
      } else {
        if (code[attrEnd] === '"' || code[attrEnd] === "'") { inString = true; q = code[attrEnd]; }
        if (code[attrEnd] === '{') braces++;
        if (code.slice(attrEnd, attrEnd+2) === '/>') {
          isSelfClosing = true;
          attrEnd += 1;
          break;
        }
        if (code[attrEnd] === '>') {
          break;
        }
      }
      attrEnd++;
    }
    
    if (!isSelfClosing) {
      stack.push({tag: tag, line: code.slice(0, i).split('\n').length});
    }
    i = attrEnd + 1;
    continue;
  }
  
  i++;
}

console.log("Unclosed tags remaining in stack:");
console.log(stack);
