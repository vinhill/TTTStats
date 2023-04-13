const { performance } = require('perf_hooks')
const logger = require("./utils/logger.js")

class DuplicateFilter {
    constructor(andfilter = undefined) {
      this.last = undefined
      this.andfilter = andfilter
    }
  
    filter(match) {
      if (this.andfilter !== undefined && !this.andfilter(match))
        return true
  
      const current = JSON.stringify(match)
      if (current !== this.last) {
        this.last = current
        return true
      } else {
        return false
      }
    }
  }
    
  class LogParser {
    /*
    Class to make parsing logfiles easier.
  
    It handles iterating lines and testing regexes.
    So one only has to provide the regexes and callbacks.
    */
  
    constructor(state={}) {
      this.state = state
      this.events = []
      this.prepared = true
    }
  
    // higher priority events are tested first
    register(regex, eventname, priority=0) {
      if (this.events.filter(e => e.name === eventname).length > 0)
        throw `Event ${eventname} already registered`
      this.events.push({
        regex: regex,
        name: eventname,
        listeners: [],
        priority: priority
      })
      logger.debug("LogParser", `registered event '${eventname}' to regex ${regex}`)
    }
  
    // this.listen, but for object.method instead of callback
    subscribe(event, object, method, priority=0) {
      const callback = object[method].bind(object)
      return this.listen(event, callback, priority)
    }
  
    /*
    Higher priority callbacks are called first, as with events
    If cb returns false, parser moves on to next line
     */
    listen(event, callback, priority=0) {
      this.prepared = false
      const e = this.events.find(e => e.name === event)
      if (e === undefined)
        throw `Event ${event} not found`
      e.listeners.push({callback: callback, priority: priority})
      logger.debug("LogParser", `attached callback ${callback.name} to event ${e.name}`)
    }
  
    prepare() {
      for (let event of this.events)
        event.listeners.sort((a, b) => b.priority - a.priority)
      this.events.sort((a, b) => b.priority - a.priority)
      this.prepared = true
    }
  
    async read_line(line) {
      if (!this.prepared)
        throw "LogParser wasn't prepared, call prepare"
  
      logger.info("LogParser", `Executing line ${line}`)
  
      for (let event of this.events) {
        const match = event.regex.exec(line)
        if (match === null)
          continue
        
        logger.debug("LogParser", `emitting event ${event.name}`)
  
        for (let listener of event.listeners) {
          logger.debug("LogParser", `executing callback ${listener.callback.name}`)
          if (await listener.callback(match.groups, this.state) === false) {
            return
          }
        }
      }
    }
  
    // can be used with TrackableIterator
    async read(lines) {
      if(!this.prepared)
        this.prepare()
  
      let startTime = performance.now()
      for (let line of lines) {
        await this.read_line(line)
      }
      let endTime = performance.now()
  
      logger.info("LogParser", `Logfile finished parsing (took ${endTime-startTime} ms).`)
    }
  }

module.exports = {
  LogParser,
  DuplicateFilter
}