const { isNumber } = require("util")
const { isValidTable, isValidColumn, isComputedColumn } = require("./validation")

exports.getSelectSql = function(model, body) {
  var sql = buildSelectFrom(model, body)
  sql += buildJoins(model, body)
  sql += buildWhere(model, body)
  sql += buildOrderBy(model, body)
  sql += buildLimits(model, body)

  return sql
}

exports.getCountSql = function(model, body) {
  let sql = `select count(*) as count from [${model}] `
  sql += buildWhere(model, body)
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

function buildJoins(model, body) {
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

buildWhere = function(model, body) {
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
  for (const key in where) {
    if (!isValidColumn(model, key, joins)) {
      throw new Error(`invalid column name: ${key}`)
    }

    if (!firstPass) {
      sql += " and "
    }

    const value = where[key]
    if (isNumber(value)) {
      sql += `[${model}].[${key}] = ${value} `
    }
      else if (value === null) {
      sql += `[${model}].[${key}] IS NULL `
    }  
    else if (typeof value === "object") {
      if (value.hasOwnProperty("$ne")) {
        sql += `[${model}].[${key}] <> ${value["$ne"]} `
      } else if (value.hasOwnProperty("$gt")) {
        sql += `[${model}].[${key}] > ${value["$gt"]} `
      } else if (value.hasOwnProperty("$lt")) {
        sql += `[${model}].[${key}] < ${value["$lt"]} `
      } else if (value.hasOwnProperty("$gte")) {
        sql += `[${model}].[${key}] >= ${value["$gte"]} `
      } else if (value.hasOwnProperty("$lte")) {
        sql += `[${model}].[${key}] <= ${value["$lte"]} `
      }
    } else {
      sql += `[${model}].[${key}] = '${value}' `
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
  for (const item of orderBy) {
    if (item.charAt(0) === "-") {
      const fieldName = item.slice(1)
      if (!isValidColumn(model, fieldName, joins)) {
        throw new Error(`invalid orderBy field name: ${fieldName}`)
      }
      sql += `[${fieldName}] DESC, `
    } else {
      if (!isValidColumn(model, item, joins)) {
        throw new Error(
          `invalid: Model: ${model} orderBy variable name: ${item}`
        )
      }
      sql += `[${item}], `
    }
  }
  sql = sql.slice(0, -2)
  return sql
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
