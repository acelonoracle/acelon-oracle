export function bigIntReplacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}