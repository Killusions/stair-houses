var cp = require('child_process')
var path = require('path')
const chalk = require('chalk')

console.log('Starting...')

console.log('Starting backend compilation.')
let backendTSErroredOrStopped = true
let backendTSNoErrorsCallback = null
const backendTS = cp.spawn('yarn', ['watch'], {
  cwd: path.join(__dirname, '/backend'),
})
backendTS.stdout.on('data', (data) => {
  console.log('backend compilation: ' + data.toString())
  if (data.includes('0 errors')) {
    if (backendTSErroredOrStopped) {
      setTimeout(() => {
        if (backendTSNoErrorsCallback) {
          backendTSNoErrorsCallback()
          backendTSNoErrorsCallback = null
        }
      }, 1000)
    }
    backendTSErroredOrStopped = false
  }
})
backendTS.stderr.on('data', (data) => {
  console.error(chalk.red('backend compilation error: ' + data.toString()))
  backendTSErroredOrStopped = true
})
backendTS.on('exit', (code) => {
  console.error(
    chalk.red('backend stopped compiling with code ' + code.toString())
  )
  backendTSErroredOrStopped = true
  process.exitCode = 1
})

setTimeout(() => {
  if (!backendTSErroredOrStopped) {
    backendNodeAndFrontend()
  } else {
    backendTSNoErrorsCallback = backendNodeAndFrontend
  }
}, 100)

const backendNodeAndFrontend = () => {
  let backendNodeErroredOrStopped = false
  let backendNodeNoErrorsCallback = null
  console.log('Starting backend execution.')
  const backendNode = cp.spawn('yarn', ['serve'], {
    cwd: path.join(__dirname, '/backend'),
  })
  backendNode.stdout.on('data', (data) => {
    if (!data.includes('crashed')) {
      console.log('backend executing: ' + data.toString())
      if (backendNodeErroredOrStopped) {
        setTimeout(() => {
          if (backendNodeNoErrorsCallback) {
            backendNodeNoErrorsCallback()
            backendNodeNoErrorsCallback = null
          }
        }, 1000)
      }
      backendNodeErroredOrStopped = false
    }
  })
  backendNode.stderr.on('data', (data) => {
    console.error(
      chalk.red('backend execution produced error: ' + data.toString())
    )
    backendNodeErroredOrStopped = true
  })
  backendNode.on('exit', (code) => {
    console.error(
      chalk.red('backend execution stopped with code ' + code.toString())
    )
    backendNodeErroredOrStopped = true
    process.exitCode = 1
  })

  setTimeout(() => {
    if (!backendNodeErroredOrStopped) {
      frontendDev()
    } else {
      backendNodeNoErrorsCallback = frontendDev
    }
  }, 2000)
}

const frontendDev = () => {
  console.log('Starting frontend.')
  const frontend = cp.spawn('yarn', ['dev'], {
    cwd: path.join(__dirname, '/frontend'),
  })
  frontend.stdout.on('data', (data) => {
    console.log('frontend: ' + data.toString())
  })
  frontend.stderr.on('data', (data) => {
    console.error(chalk.red('frontend building error: ' + data.toString()))
  })
  frontend.on('exit', (code) => {
    console.error(chalk.red('frontend exited with code ' + code.toString()))
    process.exitCode = 1
  })
}
