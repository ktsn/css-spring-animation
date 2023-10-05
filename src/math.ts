export type Expression =
  | Value
  | Variable
  | Cosine
  | BinaryOperation
  | Exponential

interface Value {
  type: 'value'
  value: number
}

interface Variable {
  type: 'variable'
  name: string
}

interface Cosine {
  type: 'cosine'
  radian: Expression
}

interface BinaryOperation {
  type: 'binary'
  left: Expression
  right: Expression
  operator: '+' | '*'
}

interface Exponential {
  type: 'exponential'
  exponent: Expression
}

export function v(value: number): Value {
  return { type: 'value', value }
}

export function var_(name: string): Variable {
  return { type: 'variable', name }
}

export function cos(radian: Expression): Cosine {
  return { type: 'cosine', radian }
}

export function add(left: Expression, right: Expression): BinaryOperation {
  return { type: 'binary', left, right, operator: '+' }
}

export function mul(left: Expression, right: Expression): BinaryOperation {
  return { type: 'binary', left, right, operator: '*' }
}

export function exp(exponent: Expression): Exponential {
  return { type: 'exponential', exponent }
}

export function generateCSSValue(expression: Expression): string {
  switch (expression.type) {
    case 'value':
      return `${expression.value}`
    case 'variable':
      return `var(${expression.name})`
    case 'cosine':
      return `cos(1rad * (${generateCSSValue(expression.radian)}))`
    case 'exponential':
      return `exp(${generateCSSValue(expression.exponent)})`
    case 'binary':
      return `(${generateCSSValue(expression.left)} ${
        expression.operator
      } ${generateCSSValue(expression.right)})`
  }
}
