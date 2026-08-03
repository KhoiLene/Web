const fs = require('fs');
let p = 'D:/Web1/backend/server.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('cols.map((c, i) => `${c} = ${i + 1}`)', 'cols.map((c, i) => `${c} = $${i + 1}`)');
s = s.replace('WHERE id = ${cols.length + 1} RETURNING *', 'WHERE id = $${cols.length + 1} RETURNING *');
fs.writeFileSync(p, s);
console.log('fixed');
