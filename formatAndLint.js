var cp = require('child_process')
var path = require('path')
const chalk = require('chalk')

console.log('Formatting and linting...')

console.log('Starting formatting backend.')
const backendFormat = cp.spawn('yarn', ['format:all'], {
  cwd: path.join(__dirname, '/backend'),
})
backendFormat.stdout.on('data', (data) => {
  console.log('formatting backend: ' + data.toString())
})
backendFormat.stderr.on('data', (data) => {
  console.error(chalk.red('backend formatting error: ' + data.toString()))
})
backendFormat.on('exit', (code) => {
  console.log('backend formatted')
  setTimeout(() => {
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
      console.log('backend linted')
      setTimeout(() => {
        console.log('Starting formatting frontend.')
        const frontendFormat = cp.spawn('yarn', ['format:all'], {
          cwd: path.join(__dirname, '/frontend'),
        })
        frontendFormat.stdout.on('data', (data) => {
          console.log('formatting frontend: ' + data.toString())
        })
        frontendFormat.stderr.on('data', (data) => {
          console.error(
            chalk.red('frontend formatting error: ' + data.toString())
          )
        })
        frontendFormat.on('exit', (code) => {
          console.log('frontend formatted')
          setTimeout(() => {
            console.log('Starting linting frontend.')
            const frontendLint = cp.spawn('yarn', ['lint:all'], {
              cwd: path.join(__dirname, '/frontend'),
            })
            frontendLint.stdout.on('data', (data) => {
              if (data.includes('warning')) {
                console.warn(
                  chalk.yellow('frontend linting error: ' + data.toString())
                )
              } else {
                console.log('linting frontend: ' + data.toString())
              }
            })
            frontendLint.stderr.on('data', (data) => {
              console.error(
                chalk.red('frontend linting error: ' + data.toString())
              )
            })
            frontendLint.on('exit', (code) => {
              if (code !== 0) {
                process.exitCode = 1
              }
              console.log('frontend linted')
            })
          }, 100)
        })
      }, 100)
    })
  }, 100)
})
