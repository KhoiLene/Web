import re
p = 'D:/Web1/backend/server.js'
s = open(p).read()
s = s.replace('cols.map((c, i) => `${c} = ${i + 1}`)', 'cols.map((c, i) => `${c} = $${i + 1}`)')
s = s.replace('WHERE id = ${cols.length + 1} RETURNING *', 'WHERE id = $${cols.length + 1} RETURNING *')
open(p, 'w').write(s)
print('fixed')
