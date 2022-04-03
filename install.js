const cp = require('child_process')
const path = require('path')
const chalk = require('chalk')

console.log('Installing...')

console.log('Starting installing backend.')
const backend = cp.spawn('yarn', { cwd: path.join(__dirname, '/backend') })
backend.stdout.on('data', (data) => {
  console.log('backend installing: ' + data.toString())
})
backend.stderr.on('data', (data) => {
  console.error(chalk.red('backend installing error: ' + data.toString()))
})
backend.on('exit', (code) => {
  if (code === 0) {
    console.log('backend installed')
    setTimeout(() => {
      console.log('Starting installing frontend.')
      const frontend = cp.spawn('yarn', {
        cwd: path.join(__dirname, '/frontend'),
      })
      frontend.stdout.on('data', (data) => {
        console.log('frontend installing: ' + data.toString())
      })
      frontend.stderr.on('data', (data) => {
        console.error(
          chalk.red('installing frontend error: ' + data.toString())
        )
      })
      frontend.on('exit', (code) => {
        if (code === 0) {
          console.log('installed frontend')
        } else {
          console.error(
            chalk.red('frontend failedinstalling  with code ' + code.toString())
          )
          process.exitCode = 1
        }
      })
    }, 100)
  } else {
    console.error(
      chalk.red('backend failed installing with code ' + code.toString())
    )
    console.log('not attempting installing frontend due to previous error.')
    process.exitCode = 1
  }
})
