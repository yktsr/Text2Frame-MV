const TF = require("Text2Frame-MV/Text2Frame.cjs.js")

const date = new Date().toLocaleString()
const text = `<comment>
for common js module:
出力日時: ${date}
</comment>`

console.log(TF.compile(text))
