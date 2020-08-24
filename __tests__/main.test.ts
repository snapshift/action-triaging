import minimatch from 'minimatch'

const tests = [{
  target: "zerzer\r\n\r\nzer\r\n\r\nzer\r\n\r\n\r\nGENERATED_BY_TEMPLATE\r\n",
  pattern: "*GENERATED_BY_TEMPLATE*",
  expected: true
}, {
  target: "zerzer\r\n\r\nzer\r\n\r\nzer\r\n\r\n\r\n",
  pattern: "*GENERATED_BY_TEMPLATE*",
  expected: false
}, {
  target: "zerzer\r\n\r\nzer\r\n\r\nzer\r\n\r\n\r\n",
  pattern: "!*GENERATED_BY_TEMPLATE*",
  expected: true
}, {
  target: "zerzer\r\n\r\nzer\r\n\r\nzer\r\n\r\n\r\nGENERATED_BY_TEMPLATE\r\n",
  pattern: "!*GENERATED_BY_TEMPLATE*",
  expected: false
}]

test('1.', () => {
  tests.forEach((test, _i, _arr) => {
    expect(minimatch(test.target, test.pattern)).toBe(test.expected)

  })
})

