var cp = require('child_process')
var path = require('path')
const chalk = require('chalk')

console.log('Starting...')

console.log('Starting backend compilation.')
const backend = cp.spawn('yarn', ['build'], {
  cwd: path.join(__dirname, '/backend'),
})
backend.stdout.on('data', (data) => {
  console.log('backend compilation: ' + data.toString())
})
backend.stderr.on('data', (data) => {
  console.error(chalk.red('backend compilation error: ' + data.toString()))
})
backend.on('exit', (code) => {
  if (code === 0) {
    console.log('backend compiled')
  } else {
    console.error(
      chalk.red('backend failed compiling with code ' + code.toString())
    )
    process.exitCode = 1
  }
  console.log('Starting building frontend.')
  const frontend = cp.spawn('yarn', ['build'], {
    cwd: path.join(__dirname, '/frontend'),
  })
  frontend.stdout.on('data', (data) => {
    console.log('building frontend: ' + data.toString())
  })
  frontend.stderr.on('data', (data) => {
    console.error(chalk.red('frontend building error: ' + data.toString()))
  })
  frontend.on('exit', (code) => {
    if (code === 0) {
      console.log('frontend built')
    } else {
      console.error(
        chalk.red('frontend failed building with code ' + code.toString())
      )
      process.exitCode = 1
    }
  })
})
