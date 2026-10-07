// Fails if raw color values appear in src/ outside the files allowed to hold
// artwork colors. UI color must come from Gestalt semantic tokens.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = join(import.meta.dirname, "..")
const allowed = new Set(["src/theme/artworkPalette.ts", "src/data/templates.json"])
const extensions = /\.(tsx?|jsx?|css|json|svg|html)$/
const patterns = [
  { name: "hex color", regex: /#[0-9a-fA-F]{3,8}\b/g },
  { name: "rgb()/rgba()", regex: /\brgba?\(\s*\d/g },
  { name: "hsl()/hsla()", regex: /\bhsla?\(\s*\d/g },
]

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const problems = []
for (const file of walk(join(root, "src"))) {
  const path = relative(root, file)
  if (!extensions.test(path) || allowed.has(path)) continue
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      for (const { name, regex } of patterns) {
        for (const match of line.matchAll(regex)) {
          problems.push(`${path}:${index + 1}  ${name} "${match[0]}"`)
        }
      }
    })
}

if (problems.length) {
  console.error(`Raw color values found (use a semantic token, or artworkPalette.ts for artwork):\n`)
  console.error(problems.map((problem) => `  ${problem}`).join("\n"))
  process.exit(1)
}
console.log("check:tokens passed: no raw color values outside allowed files")
