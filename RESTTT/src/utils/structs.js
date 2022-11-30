const { performance } = require('perf_hooks')
const logger = require('./logger.js')

class CacheObject {
  constructor(key, value, priority, index) {
    this.key = key
    this.value = value
    this.priority = priority
    this.index = index
  }
}

class Heap {
  /*Simple js min / max heap implementation*/
  constructor(isMin=false) {
    this._nodes = []
    this._isMin = isMin
  }

  size() {
    return this._nodes.length
  }

  insert(node) {
    this._nodes.push(node)
    node.index = this.size() -1
    this._moveUp(node.index)
  }

  pop() {
    let count = this.size()
    if (count === 0) {
      return null
    }

    let root = this._nodes[0]
    root.index = -1

    // remove node
    if (count === 1) {
      // remove heap root
      this._nodes.pop()
    }
    else {
      // replace heap root with right leaf
      this._nodes[0] = this._nodes.pop()
      // move new root to the right position
      this._moveDown(0)
    }

    return root
  }

  _getLeftChildIndex(index) {
    return index * 2 + 1
  }

  _getRightChildIndex(index) {
    return index * 2 + 2
  }

  _getParentIndex(index) {
    return (index - 1) >> 1
  }

  _comp(a, b) {
    if (this._isMin) {
      return a.priority < b.priority
    }else {
      return a.priority > b.priority
    }
  }

  _moveUp(index) {
    let nodes = this._nodes
    let node = nodes[index]

    // While the node being moved up is not at the root.
    while (index > 0) {
      let parentIndex = this._getParentIndex(index)
      let parent = nodes[parentIndex]
      // min (max): if node less (larger) than parent, swap them
      if (this._comp(node, parent)) {
        nodes[index] = parent
        parent.index = index
        index = parentIndex
      } else {
        break
      }
    }

    nodes[index] = node
    node.index = index
  }

  _moveDown(index) {
    let count = this.size()
    let nodes = this._nodes
    let node = nodes[index]

    // While current node is not a leaf
    while (index < (count >> 1)) {
      let rightChildIdx = this._getRightChildIndex(index)
      let leftChildIdx = this._getLeftChildIndex(index)

      // check if right child exists and if so,
      // check which of them should be moved up (larger for max / smaller for min)
      let moveRight = rightChildIdx < count && this._comp(nodes[rightChildIdx], nodes[leftChildIdx])
      let moveChildIdx = moveRight ? rightChildIdx : leftChildIdx

      // check if node and nodes[moveChildIdx] should be swapped
      if (this._comp(node, nodes[moveChildIdx])) {
        break
      }

      // swap node and child
      nodes[index] = nodes[moveChildIdx]
      nodes[moveChildIdx].index = index
      index = moveChildIdx
    }

    nodes[index] = node
    node.index = index
  }
}

class BoundedCache {
  /*
  Priority max heap with limited size.
  If size is surpassed, elements of lowest priority are removed.

  Destined to be used as query cache:
  Query: result - pairs are inserted and their priority
  should be incremented with each request. Frequently used
  queries thus stay in the cache while rather one-time queries
  will be overwritten.
  */
  constructor(max_elements) {
    this._max_elements = max_elements
    this.clear()
  }

  size() {
    return this._minHeap.size()
  }

  get(key) {
    /* Get value associated with key */
    return this._map.get(key).value
  }

  has(key) {
    return this._map.has(key)
  }

  update(key, value) {
    let cache = this._map.get(key)
    cache.value = value
  }

  clear() {
    this._map = new Map()
    this._minHeap = new Heap(true)
  }

  increment(key) {
    /* Increment priority of key */
    let cache = this._map.get(key)
    cache.priority++
    this._minHeap._moveDown(cache.index)
  }

  set(key, value) {
    /* Insert new k,v pair with priority 1 */
    if (this.size() >= this._max_elements) {
      let popped = this._minHeap.pop().key
      this._map.delete(popped)
    }

    let cache = new CacheObject(key, value, 1, -1)
    this._map.set(key, cache)
    this._minHeap.insert(cache)
  }
}

class LogParser {
  /*
  Class to make parsing logfiles easier.

  It handles iterating the lines and testing the regexes.
  So one only has to provide the regexes and callbacks.
  */

  constructor(state={}, break_on_error=true) {
    this.state = state
    this.workers = []
    this.prepared = true
    this.break_on_error = break_on_error
  }

  /*
  Attach a callback(match, state) to the parser
  that is executed whenever the regex matches a line (without \n)
  Callback can return false, if the remaining callbacks shouldn't be executed
  */
  attach(regex, callback, priority=0) {
    // if regex then callback(match, state)
    this.prepared = false
    this.workers.push({
      regex: regex,
      callback: callback,
      priority: priority
    })
    logger.debug("LogParser", `attached callback ${callback.name} to regex ${regex}`)
  }

  prepare() {
    // sort workers by priorities descending
    this.workers.sort((a, b) => b.priority - a.priority)
    this.prepared = true
  }

  async exec_line(line) {
    if (!this.prepared)
      throw "LogParser wasn't prepared, call prepare"

    logger.debug("LogParser", `Executing line ${line}`)

    for (let worker of this.workers) {
      let match = worker.regex.exec(line)
      if (match) {
        logger.debug("LogParser", `callback ${worker.callback.name} matched`)

        if (this.break_on_error) {
          let ret = await worker.callback(match.groups, this.state)

          if (ret === false)
            return
        }else {
          try {
            let ret = await worker.callback(match.groups, this.state)

            if (ret === false)
              return
          }catch(err) {
            logger.error("LogParser", `Error during logparse: ${err}`)
          }
        }
      }
    }
  }

  async exec(lines) {
    if(!this.prepared)
      this.prepare()

    let startTime = performance.now()
    for(let line of lines) {
      await this.exec_line(line)
    }
    let endTime = performance.now()

    logger.info("LogParser", `Logfile finished parsing (took ${endTime-startTime} ms).`)
  }
}

module.exports = {
  Heap,
  BoundedCache,
  LogParser
}