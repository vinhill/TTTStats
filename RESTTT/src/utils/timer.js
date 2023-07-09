const { performance } = require('perf_hooks')

class Timer {
    constructor() {}

    start() {
        this.start_time = performance.now()
    }

    stop() {
        this.stop_time = performance.now()
    }

    ms() {
        return this.stop_time - this.start_time
    }
}

function startTimer() {
    const timer = new Timer()
    timer.start()
    return timer
}

module.exports = {
    Timer,
    startTimer
}