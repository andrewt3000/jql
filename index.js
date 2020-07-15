const { isNumber } = require("util")
const { isValidTable, isValidColumn, isComputedColumn } = require("./validation")

exports.getSelectSql = function(model, body) {
  var sql = buildSelectFrom(model, body)
  sql += exports.buildJoins(model, body)
  sql += exports.buildWhere(model, body)
  sql += buildOrderBy(model, body)
  sql += buildLimits(model, body)

  return sql
}

exports.getCountSql = function(model, body) {
  let sql = `select count(*) as count from [${model}] `
  sql += exports.buildWhere(model, body)
  return sql
}

exports.getUpdateSql = function(model, body) {
  let sql = `update [${model}] set `
  for (const key in body) {
    if (key.toLowerCase() !== "id" && isValidColumn(model, key) && !isComputedColumn(model, key)) {
      sql += `[${key}] = @${key}, `
    }
  }
  sql = `${sql.slice(0, -2)} where id = @id`
  return sql
}

exports.getInsertSql = function(model, body) {
  let values = ""
  let sql = `insert into [${model}] (`
  for (const key in body) {
    if (isValidColumn(model, key) && !isComputedColumn(model, key)) {
      sql += `[${key}], `
      values += `@${key}, `
    }
  }
  sql = `${sql.slice(0, -2)} ) values (${values.slice(
    0,
    -2
  )} ); SELECT SCOPE_IDENTITY() AS id`
  return sql
}

function buildSelectFrom(model, body) {
  const { fields } = body
  const { joins } = body

  let sql = "select "
  if (fields && fields.length > 0) {
    for (const f of fields) {
      if (!isValidColumn(model, f, joins)) {
        throw new Error(`invalid ${model} variable name: ${f}`)
      }
      sql += `[${model}].[${f}], `
    }
    // cut off last comma
    sql = `${sql.slice(0, -2)} `
  } else {
    sql += `[${model}].*  `
  }
  sql += buildJoinFields(joins)
  sql += ` from [${model}] `
  return sql
}

function buildJoinFields(joins) {
  let sql = ""
  if (joins && joins.length > 0) {
    for (let j of joins) {
      if(typeof j === "object"){
        if('fields' in j){
          for(fld of j.fields){
            joinTable = sliceMinus(j.model)
            sql += `, ${joinTable}.${fld}  `  
          } 
        }else{
          sql += defaultFieldsForJoin(j.model)
        }
      }else{
        sql += defaultFieldsForJoin(j)
      }
    }
  }
  return sql
}

function sliceMinus(tbl){
  if (tbl.charAt(0) === "-") {
    tbl = tbl.slice(1)
  }
  return tbl
}

function defaultFieldsForJoin(joinTable){
  joinTable = sliceMinus(joinTable)
  if (!isValidTable(joinTable)) {
    throw new Error(`invalid join variable name: ${joinTable}`)
  }
  return `, [${joinTable}].name as ${joinTable}Name `

}

exports.buildJoins = function(model, body) {
  const { joins } = body

  if (!joins) {
    return ""
  }

  if (joins.length === 0) {
    return ""
  }

  let sql = ""
  for (let j of joins) {
    let outer = false
    let joinTable = ''

    if(typeof j === "object"){
      joinTable = j.model
    }else{
      joinTable = j
    }
    if (joinTable.charAt(0) === "-") {
      joinTable = joinTable.slice(1)
      outer = true
    }
    if (!isValidTable(joinTable)) {
      throw new Error(`invalid table: ${joinTable}`)
    }
    if (outer) {
      sql += " left outer join "
    } else {
      sql += " inner join "
    }
    sql += buildJoinOn(joinTable, j)
  }

  return sql
}

function buildJoinOn(joinTable, joinObject){
  if(typeof joinObject === "object" && 'on' in joinObject){
    let joinClause =  ` [${joinTable}] on `

    let first = true
    for(const key in joinObject['on']){
      if(!first){
        joinClause += ' and '
      }
      joinClause += ` ${key} = ${joinObject['on'][key]} `
      first = false
    }
    

    return joinClause
  }

  return ` [${joinTable}] on [${joinTable}].id = ${joinTable}ID `

}

exports.buildWhere = function(model, body) {
  const { where } = body
  const { joins } = body

  if (!where) {
    return ""
  }

  if (Object.keys(where).length === 0) {
    return ""
  }

  let sql = "where "
  let firstPass = true
  for (const jsonColumnName in where) {

    tableName = model
    columnName = jsonColumnName
    sqlColumnName = `[${tableName}].[${jsonColumnName}]`

    if(jsonColumnName.includes(".")){
      let tableColumnArray = columnName.split('.')
      if(tableColumnArray.length != 2){
        throw new Error(`buildWhere: invalid column name(1): ${jsonColumnName}`)
      }
      tableName = tableColumnArray[0]
      columnName = tableColumnArray[1]
      sqlColumnName = `[${tableName}].[${columnName}]`
    }
    
  
    if (!isValidColumn(tableName, columnName, joins)) {
      throw new Error(`buildWhere: invalid column name(2): ${columnName}`)
    }

    if (!firstPass) {
      sql += " and "
    }

    const value = where[jsonColumnName]
    //console.log
    if (isNumber(value)) {
      sql += `${sqlColumnName} = ${value} `
    }
    else if (value === null) {
      sql += `${sqlColumnName} IS NULL `
    }  
    else if (typeof value === "object") {
      let firstValue = true
      for(operatorVal in value){
        if(!firstValue){
          sql += ' and '
        }
        setValue =  value[operatorVal]
        if (typeof setValue === 'string' || setValue instanceof String)
          setValue = "'" + setValue + "'"
        if (operatorVal === "$ne") {
          sql += `${sqlColumnName} <> ${setValue} `
        } else if (operatorVal === "$gt") {
          sql += `${sqlColumnName} > ${setValue} `
        } else if (operatorVal === "$lt") {
          sql += `${sqlColumnName} < ${setValue} `
        } else if (operatorVal === "$gte") {
          sql += `${sqlColumnName} >= ${setValue} `
        } else if (operatorVal === "$lte") {
          sql += `${sqlColumnName} <= ${setValue} `
        }
        firstValue = false
      }
    } else {
      sql += `${sqlColumnName} = '${value}' `
    }
    firstPass = false
  }
  return sql
}

function buildOrderBy(model, body) {
  const { orderBy } = body
  const { joins } = body

  if (!orderBy) {
    return ""
  }
  if (orderBy.length === 0) {
    return ""
  }

  let sql = "order by "
  if(typeof orderBy === 'string'){
    sql += processOrderByField(model, orderBy, joins)
  } else {
    for (let fieldName of orderBy) {
      sql += processOrderByField(model, fieldName, joins)
    }
  }
  //cut off the comma
  sql = sql.slice(0, -2)
  return sql
}

function processOrderByField(model, fieldName, joins){
  let postFix = 'ASC'
    //- is for desc
    if (fieldName.charAt(0) === "-") {
      //cut off the -
      fieldName = fieldName.slice(1)
      postFix = 'DESC'
    } 
    if (!isValidColumn(model, fieldName, joins)) {
      throw new Error(`invalid orderBy field name: ${fieldName}`)
    }
    return `${exports.formatField(fieldName)} ${postFix}, `
}

exports.formatField = function(field){
  if(field.includes('.')){
    //split 
    fldArray = field.split('.', 2)
    return `[${fldArray[0]}].[${fldArray[1]}]`
  }else{
    return `[${field}]`
  }
}

function buildLimits(model, body) {
  const { orderBy } = body
  let sql = ""
  if (orderBy && orderBy.length > 0 && body.offset >= 0 && body.limit >= 0) {
    const { offset } = body
    if (isNumber(offset)) {
      sql += ` OFFSET ${offset} ROWS `
    } else {
      throw new Error(`offset must be a number.`)
    }

    const { limit } = body
    if (isNumber(limit)) {
      sql += ` FETCH NEXT ${limit} ROWS ONLY `
    } else {
      throw new Error(`offset must be a number.`)
    }
  }
  return sql
}
