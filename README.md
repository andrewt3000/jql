# Install jql

npm install jq-lang

### JQL
JQL = JSON Query Language translates json to sql code. JQL is heavily influenced by mongo db.  

### Normalization Conventions
jql depends on 3 normalization conventions:  
1. All tables must have an ID field that is primary key and autoincrement.  
2. FKs follow naming convention {tableName}ID.  
3. FK lookup tables have a "name" field for display. Use a computed column for names that are composites.   

### JQL query object
Post body for query contains json object with these fields. 

Property | Description |Type |
---|--- |---|
fields| table column names. If not set, returns tableName.* | string[]
joins| Tables on which inner joins are performed.   Use -tableName for left outer join.<br/>  By default adds {joinTableName}Name to columns and joins based on naming convention.  Pass an object to specify fields  {model:"joinTable", fields\["myField1", "myField2"\]} | string[] or object[]
where| object containing fields to form where clause. Example {x:1, y:2} translates to "where x=1 and y=2" See Where clause operators | object
orderBy| array of strings of field names to order by. '-fieldName' for descending.| string[]
children | table name for child records. if children property exists, it will return an additional array of objects for each child table in input array.  pulls based on foreign key convention | string[]
offset | offset for starting select (requires order by and limit) | int 
limit | limit the number of rows returned (requires order by and limit) typically used for paging. | int

#### Where clause operators
JQL has mongo db style where clause operators.

property | effect |   
---|---|
$ne | not equal <>
$gt | greater than >
$gte | greater than or equal to >=
$lt | less than <
$lte | less than or equal to  <=

##### Examples
jql | sql |
---|---|
where: { active: 1, deleted: 0} | where active =1 and deleted = 0
where: { qty: { $gt: 20 } } | where qty > 20
where: { price: { $gt: 1, $lt: 2 } | where price > 1 and price < 2
