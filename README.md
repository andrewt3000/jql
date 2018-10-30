# Install jql

npm install jq-lang

### JQL
JQL = JSON Query Language translates json to sql code. JQL is heavily influenced by mongo db.  

### Normalization Conventions
jql has 3 normalization conventions:  
1. All tables must have an ID field that is primary key and autoincrement. This convention is **mandatory**.    
2. FKs follow naming convention {tableName}ID.  
3. FK lookup tables have a "name" field for display. Use a computed column for names that are composites.   

### JQL query object
Post body for query contains json object with these fields. 

Property | Description |Type |
---|--- |---|
fields| table column names. If not set, returns tableName.* | string[]
joins| Tables on which inner joins are performed.   | string[] or object[]
where| Object containing fields to form where clause. See Where clause operators below. | object
orderBy| array of strings of field names to order by. '-fieldName' for descending.| string[]
children | table name for child records. if children property exists, it will return an additional array of objects for each child table in input array.  pulls based on foreign key convention | string[]
offset | offset for starting select (requires order by and limit) | int 
limit | limit the number of rows returned (requires order by and limit) typically used for paging. | int

#### Join Operator object
By default, pass a string. Use -tableName for left outer join. Default adds {joinTableName}Name to columns and joins based on naming convention. Pass an object to specify select fields.  

jql | sql |
---|---|
joins: ["mytable"] | select myTableName... inner join  [mytable] on [mytable].id = mytableID
joins: ["-mytable"] | left outer join  [mytable] on [mytable].id = mytableID
joins: [{model:"mytable", fields:["myField1", "myField2"]}] | select myField1, myField2... iinner join  [mytable] on [mytable].id = mytableID
joins: [{model:"machine",on:{"[machine].ID":"[mytable].machineID"}}] | inner join  [machine] on  [machine].ID = [mytable].machineID

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
