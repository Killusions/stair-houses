var cp = require('child_process')
var path = require('path')
const chalk = require('chalk')

console.log('Linting...')

console.log('Starting linting backend.')
const backendLint = cp.spawn('yarn', ['lint:all'], {
  cwd: path.join(__dirname, '/backend'),
})
backendLint.stdout.on('data', (data) => {
  if (data.includes('warning')) {
    console.warn(chalk.yellow('backend linting error: ' + data.toString()))
  } else {
    console.log('linting backend: ' + data.toString())
  }
})
backendLint.stderr.on('data', (data) => {
  console.error(chalk.red('backend linting error: ' + data.toString()))
})
backendLint.on('exit', (code) => {
  if (code !== 0) {
    process.exitCode = 1
  }
  console.log('frontend formatted')
  setTimeout(() => {
    console.log('Starting linting frontend.')
    const frontendLint = cp.spawn('yarn', ['lint:all'], {
      cwd: path.join(__dirname, '/frontend'),
    })
    frontendLint.stdout.on('data', (data) => {
      if (data.includes('warning')) {
        console.warn(chalk.yellow('frontend linting error: ' + data.toString()))
      } else {
        console.log('linting frontend: ' + data.toString())
      }
    })
    frontendLint.stderr.on('data', (data) => {
      console.error(chalk.red('frontend linting error: ' + data.toString()))
    })
    frontendLint.on('exit', (code) => {
      if (code !== 0) {
        process.exitCode = 1
      }
      console.log('frontend linted')
    })
  }, 100)
})
