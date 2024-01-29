import TF from "Text2Frame-MV/Text2Frame.es.mjs"

const date = new Date().toLocaleString()
const text = `<comment>
for ES Module:
出力日時: ${date}
</comment>`

console.log(TF.compile(text))
