const validation = require("./validation")
const { getSelectSql, getCountSql, getUpdateSql, getInsertSql, buildJoins, buildWhere, formatField } = require("./")

var schema = {
  machine: {columns:[{name:"ID"}, {name:"shortName"}]},
  statustable: {columns:[{name:"name"}]},
  lookuptable: {columns:[{name:"name"}]},
  mytable: {
    columns: [
      { name: "id" },
      { name: "name" },
      { name: "machineID" },
      { name: "test" },
      { name: "f1" },
      { name: "f2" },
      { name: "filter" },
      { name: "val" },
      { name: "status"},
      { name: "qty"},
      { name: "qty2"},
      { name: 'price'},
      { name: 'mydate'}
    ]
  }
}

validation.setSchema(schema)

const model = "mytable"
const body = {
  fields: ["id", "name", "test"],
  where: { filter: 1, val: 2 },
  joins: ["statusTable", "-lookupTable",{model:"machine",on:{"[machine].ID":"[mytable].machineID"}}],
  orderBy: ["name", "-status"],
  limit: 10,
  offset: 3
}

test("test select", () => {
  expect(getSelectSql(model, body)).toMatch(
    `select [mytable].[id], [mytable].[name], [mytable].[test] , [statusTable].name as statusTableName , [lookupTable].name as lookupTableName , [machine].name as machineName  from [mytable]  inner join  [statusTable] on [statusTable].id = statusTableID  left outer join  [lookupTable] on [lookupTable].id = lookupTableID  inner join  [machine] on  [machine].ID = [mytable].machineID where [mytable].[filter] = 1  and [mytable].[val] = 2 order by [name] ASC, [status] DESC OFFSET 3 ROWS  FETCH NEXT 10 ROWS ONLY `
  )

  const whereNotEqual = {where: {qty:{$ne: 1}}}
  expect(getSelectSql(model, whereNotEqual)).toMatch("select [mytable].*   from [mytable] where [mytable].[qty] <> 1 ")

  const greaterThan = {where: { qty: { $gt: 20 } }}
  expect(getSelectSql(model, greaterThan)).toMatch("select [mytable].*   from [mytable] where [mytable].[qty] > 20 ")

  const greaterThanEqual = {where: { qty: { $gte: 20 } }}
  expect(getSelectSql(model, greaterThanEqual)).toMatch("select [mytable].*   from [mytable] where [mytable].[qty] >= 20 ")

  const multiCondition = {where: {qty:{$ne: 1}, status:1, qty2:{$gte:2}}}
  expect(getSelectSql(model, multiCondition)).toMatch("select [mytable].*   from [mytable] where [mytable].[qty] <> 1  and [mytable].[status] = 1  and [mytable].[qty2] >= 2 ")

  const newJoin = {joins:[{model:"machine", fields:["ID", "shortName"]}]}
  expect(getSelectSql(model, newJoin)).toMatch("select [mytable].*  , machine.ID  , machine.shortName   from [mytable]  inner join  [machine] on [machine].id = machineID ")

  const stringOrderBy = {orderBy: 'name'}
  expect(getSelectSql(model, stringOrderBy)).toMatch("select [mytable].*   from [mytable] order by [name] ASC")


})

test("test join", () => {
  const testBody = {joins: ["mytable"]}
  expect(buildJoins(model, testBody)).toMatch(
    " inner join  [mytable] on [mytable].id = mytableID "
  )

  const outerJoinBody = {joins: ["-mytable"]}
  expect(buildJoins(model, outerJoinBody)).toMatch(
    " left outer join  [mytable] on [mytable].id = mytableID "
  )

  const fieldJoinBody = {joins: [{model:"mytable", fields:["myField1", "myField2"]}]}
  expect(buildJoins(model, fieldJoinBody)).toMatch(
    " inner join  [mytable] on [mytable].id = mytableID "
  )

  const onJoinBody = {joins: [{model:"machine",on:{"[machine].ID":"[mytable].machineID"}}]}
  expect(buildJoins(model, onJoinBody)).toMatch(
    " inner join  [machine] on  [machine].ID = [mytable].machineID "
  )

})

test("test buildWhere", () => {
  const basichWhere = {where: {price:200}}
  expect(buildWhere(model, basichWhere)).toMatch(
    "where [mytable].[price] = 200 "
  )
  
  const whereWithDot = {where: {'mytable.price':200}}
  expect(buildWhere(model, whereWithDot)).toMatch(
    "where [mytable].[price] = 200 "
  )
  const testBody = {where: {price:{$gt:100, $lt:200}}}
  expect(buildWhere(model, testBody)).toMatch(
    "where [mytable].[price] > 100  and [mytable].[price] < 200 "
  )
  const dateBodyTest = {where: {mydate:{$gt:'2018', $lt:'2019'}}}
  expect(buildWhere(model, dateBodyTest)).toMatch(
    "where [mytable].[mydate] > '2018'  and [mytable].[mydate] < '2019' "
  )
  const likeBodyTest = {where: {name:{like:'ts%'}}}
  expect(buildWhere(model, likeBodyTest)).toMatch(
    "where [mytable].[name] like 'ts%' "
  )
})

test("test count", () => {
  expect(getCountSql(model, body)).toMatch(
    "select count(*) as count from [mytable] where [mytable].[filter] = 1  and [mytable].[val] = 2 "
  )
})

test("test top", () => {
  expect(getSelectSql(model, {top: 3})).toMatch(
    "select top 3 [mytable].*   from [mytable] "
  )
})


const dataBody = {f1: "yo", f2:"fubar"}
test("test insert", () => {
  expect(getInsertSql(model, dataBody)).toMatch(
    "insert into [mytable] ([f1], [f2] ) values (@f1, @f2 ); SELECT SCOPE_IDENTITY() AS id"
  )
})

test("test update", () => {
  expect(getUpdateSql(model, dataBody)).toMatch(
    "update [mytable] set [f1] = @f1, [f2] = @f2 where id = @id"
  )
})

test("test formatField", () => {
  expect(formatField('tbl.fld')).toMatch(
    "[tbl].[fld]"
  )
  expect(formatField('fld')).toMatch(
    "[fld]"
  )
})

