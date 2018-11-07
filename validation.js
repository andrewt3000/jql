//schema variable can be set by database, hard coded for testing, etc.
var schema = {}

exports.setSchema = function(mySchema) {
  schema = mySchema
}

exports.isValidTable = function(tableName){
  if (schema[tableName.toLowerCase()]) {
    return true
  }
  return false
}

exports.isComputedColumn = function(tableName, columnName) {
  const column = schema[tableName.toLowerCase()].columns.find(
    col => col.name.toLowerCase() === columnName.toLowerCase()
  )
  if (column && column.isComputed) {
    return true
  }
  return false
}

exports.isValidColumn = function(tableName, columnName, joins = []){

  if(columnName.includes(".")){
    let tableColumnArray = columnName.split('.')
    if(tableColumnArray.length != 2){
      return false
    }
    if(!exports.isValidTable(tableColumnArray[0])){
      return false
    }
    tableName = tableColumnArray[0]
    columnName = tableColumnArray[1]
  }

  const column = schema[tableName.toLowerCase()].columns.find(
    col => col.name === columnName.toLowerCase()
  )
  if (column) return true
  for (const joinTable of joins) {
    if (columnName.toLowerCase() === `${joinTable}name`.toLowerCase())
      return true
  }
  return false
}
