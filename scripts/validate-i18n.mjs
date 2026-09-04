import fs from 'node:fs'
import process from 'node:process'
import ts from 'typescript'

const errors = []

function parseSource(path, scriptKind) {
  return ts.createSourceFile(
    path,
    fs.readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  )
}

function findVariableInitializer(sourceFile, variableName) {
  let initializer

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === variableName) {
      initializer = node.initializer
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return initializer
}

function unwrapExpression(expression) {
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return unwrapExpression(expression.expression)
  }
  return expression
}

function stringValue(expression) {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression.text.trim()
    : undefined
}

const i18nSource = parseSource('src/i18n.tsx', ts.ScriptKind.TSX)
const uiCopyExpression = findVariableInitializer(i18nSource, 'uiCopy')
const uiCopy = uiCopyExpression ? unwrapExpression(uiCopyExpression) : undefined
let uiKeyCount = 0

if (!uiCopy || !ts.isObjectLiteralExpression(uiCopy)) {
  errors.push('Không tìm thấy đối tượng uiCopy trong src/i18n.tsx.')
} else {
  for (const property of uiCopy.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    uiKeyCount += 1
    const key = property.name.getText(i18nSource)
    const pair = unwrapExpression(property.initializer)

    if (!ts.isArrayLiteralExpression(pair) || pair.elements.length !== 2) {
      errors.push(`${key} phải có đúng hai giá trị [vi, en].`)
      continue
    }

    const [vi, en] = pair.elements.map(stringValue)
    if (!vi) errors.push(`${key} đang thiếu nội dung tiếng Việt.`)
    if (!en) errors.push(`${key} đang thiếu nội dung tiếng Anh.`)
  }
}

const dataSource = parseSource('src/data.ts', ts.ScriptKind.TS)
let localizedValueCount = 0

function validateLocalizedCalls(node) {
  if (
    ts.isCallExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text === 'localized'
  ) {
    localizedValueCount += 1
    const location = dataSource.getLineAndCharacterOfPosition(node.getStart(dataSource))
    const prefix = `src/data.ts:${location.line + 1}`

    if (node.arguments.length !== 2) {
      errors.push(`${prefix}: localized() phải có đúng hai đối số vi và en.`)
    } else {
      const [vi, en] = node.arguments.map(stringValue)
      if (!vi) errors.push(`${prefix}: thiếu nội dung tiếng Việt.`)
      if (!en) errors.push(`${prefix}: thiếu nội dung tiếng Anh.`)
    }
  }

  ts.forEachChild(node, validateLocalizedCalls)
}

validateLocalizedCalls(dataSource)

if (localizedValueCount === 0) {
  errors.push('Không tìm thấy dữ liệu localized() trong src/data.ts.')
}

if (errors.length) {
  console.error('Kiểm tra VI/EN không đạt:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`VI/EN hợp lệ: ${uiKeyCount} khóa giao diện, ${localizedValueCount} giá trị nội dung song ngữ.`)
