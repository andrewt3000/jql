# jql

npm install jq-lang


### JQL
JSON Query Language (JQL) conventions  
Post body for query contains json object with these fields. JQL is influenced by mongo db.  

Property | Description |Type |
---|--- |---|
fields| table column names. If not set, returns tableName.* | string[]
joins| Tables on which inner joins are performed.   Use -tableName for left outer join.<br/>  By default adds {joinTableName}Name to columns and joins based on [naming convention](https://github.com/andrewt3000/generalEndPoint/blob/master/README.md#naming-conventions).  Pass an object to specify fields  {model:"joinTable", fields\["myField1", "myField2"\]} | string[] or object[]
where| object containing fields to form where clause. Example {x:1, y:2} translates to "where x=1 and y=2" See Where clause operators | object
orderBy| array of strings of field names to order by. '-fieldName' for descending.| string[]
children | table name for child records. if children property exists, it will return an additional array of objects for each child table in input array.  pulls based on foreign key convention | string[]
offset | offset for starting select (requires order by and limit) | int 
limit | limit the number of rows returned (requires order by and limit) typically used for paging. | int

#### Where clause operators
The default is Example {x:1, y:2} translates to "where x=1 and y=2"
JQL has mongo db style where clause operators.
Example: where: { qty: { $gt: 20 } } = where qty > 20

property | effect |
---|---|
$ne | not equal <>
$gt | greater than >
$gte | greater than or equal to >=
$lt | less than <
$lte | less than or equal to  <=

