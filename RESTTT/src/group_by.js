
function extractCols(row, cols) {
  return row.filter((_, i) => cols.includes(i))
}

function extractCol(rows, col) {
  return rows.map(row => row[col])
}

function rowsEqForCols(a, b, cols) {
  for (let col of cols) {
    if (a[col] !== b[col])
      return false
  }
  return true
}

function sortByCols(rows, cols) {
  rows.sort((a, b) => {
    for (let col of cols) {
      if (a[col] < b[col])
        return -1
      if (a[col] > b[col])
        return 1
    }
    return 0
  })
}

// rows is a list of lists
// cols is a list of indices representing columns
function groupBy(rows, cols, ...aggregators) {
  sortByCols(rows, cols)

  const newvals = []
  let idx = 0, oldidx = 0
  while (idx < rows.length) {
    while(idx+1 < rows.length && rowsEqForCols(rows[idx], rows[idx+1], cols))
      idx++

    const newrow = extractCols(rows[idx], cols)
    const slice = rows.slice(oldidx, idx+1)
    for (let aggregate of aggregators) {
      const colslice = extractCol(slice, newrow.length)
      newrow.push(aggregate(colslice))
    }
    newvals.push(newrow)
    idx++
    oldidx = idx
  }
  return newvals
}

module.exports = {
  groupBy
}