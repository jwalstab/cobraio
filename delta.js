var express = require('express');
var path= require('path');
const bodyParser = require('body-parser');
var app = express();
var expressLayouts = require('express-ejs-layouts');
app.use(bodyParser.json());

const nodemailer = require("nodemailer");


//MongoClient.connect("mongodb+srv://quantum:Quantumdata123@cluster0-jjukt.mongodb.net/test?retryWrites=true", {useNewUrlParser: true}, function(err, database) {
var MongoClient = require('mongodb').MongoClient;
//var db;
var outsideDatabase;
  //MongoClient.connect("mongodb://165.22.241.11:27017", {useNewUrlParser: true}, function(err, database) {
  MongoClient.connect("mongodb://127.0.0.1:27017", {useNewUrlParser: true}, function(err, database) {
  if(err)
  throw err;
  iotdb = database.db('iot');
  devicedb = database.db('devices');
  outsideDatabase = database;
  
  //db = database;
  app.listen(3000);
  console.log("Delta is up and running on port 3000 since " + new Date().toLocaleDateString() + "  " + new Date().toLocaleTimeString());
});

var transporter = nodemailer.createTransport({
  host: "webcloud42.au.syrahost.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'alarmsystem@quantumdata.com.au',
    pass: 'Quantum4277' 
  }
});

//SendEmail("test subject","<h1>hello</h1>");

async function SendEmail(emailAddress,subjectToUse,htmlToUse){
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"QTM Data Alarm System" <alarmsystem@quantumdata.com.au>', // sender address
    to: emailAddress, // list of receivers
    subject: subjectToUse, // Subject line
    //text: "Hello world?", // plain text body
    html: htmlToUse//"<b>Hello world?</b>" // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

/*   // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou... */
}


//////////API SERVER
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//users and devices api stuff/////////////////////////////////////////////////////

app.post("/:username/register_device", function(req, res) {
  devicedb.collection(req.params.username).insertOne(req.body).then (function() {
    res.send(req.body);
    res.end();
  });
});


//returns list of IDs/Names based on username
app.get("/:username/lookup_devices", function(req, res) {
  devicedb.collection(req.params.username).find({}).toArray(function(err, docs){
  idArrayToReturn = [];
  docs.forEach(element => {
    if (element.devicename != null){
      idArrayToReturn.push(element);
    }
  });
  res.send(idArrayToReturn);
  res.end();
});
});
///////////////////////////////////////////////////////////////////////////////



//iot api stuff


//used for iot to send data packets to api server, checks agaisnt alarm system
app.post("/:deviceid", function(req, res) {
  iotdb.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("Recieved:");
    AlarmProcessor(req.params.deviceid,req.body,"jwalstab");
    res.end();
  });
});

//get all data for this deviceID
app.get("/:deviceid/get", function(req, res) {
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});



//retrieve last known data with a packet amount
app.get("/:deviceid/last/:amount", function(req, res) {
  var limitAmount = parseInt(req.params.amount);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    res.send(docs);
    res.end();
  });
});

//retrieve data from a device between two dates LEGACY
app.post("/:deviceid/betweendatesLEGACY", function(req, res) {
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    arrayResult = [];
    console.log(req.body);
    to = new Date(req.body.to);
    console.log(to);
    from = new Date(req.body.from);
    console.log(from);
    docs.forEach(element => {
      var check = new Date(element.time);
      if((check.getTime() <= to.getTime() && check.getTime() >= from.getTime()))
      {
        arrayResult.push(element);
      }
    });
    res.send(arrayResult);
    res.end();
  });
});
//////////////////////////////////////////////////////////////////////////////


//API ALARMS

//alarm tester
app.get("/alarmtest", function(req, res) {
  var limitAmount = 1;
  iotdb.collection('55').find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    AlarmProcessor('55',docs[0],'jwalstab');
    res.send('ok!' + docs[0]);
    res.end();
  });
});

//create a new alarm from req.body
app.post("/alarms/:username/:deviceid", function(req, res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//delete an alarm based of req.body
app.post("/alarms/delete/:username/:deviceid/", function(req, res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.username);
  console.log(req.body);
  var name = "alarmName";
  var value = (req.body.alarmName);
  var query = {};
  query[name] = value;
  console.log(query);
  alarmdb.collection(req.params.deviceid).deleteOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//delete a device based of req.body
app.post("/devices/delete/:username/", function(req, res) {
  deviceDB = outsideDatabase.db('devices');
  var name = "deviceID";
  var value = (req.body.deviceID);
  var query = {};
  query[name] = value;
  deviceDB.collection(req.params.username).deleteOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//returns list of alarms for that user and that device
app.get("/alarmlist/:username/:deviceid", function(req,res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).find({}).toArray(function(err, alarmsList){
    res.send(alarmsList);
    res.end();
  });
});

//returns list of triggered alarms for that user and that device
app.get("/triggeredalarmlist/:username/:deviceid", function(req,res) {
  alarmdb = outsideDatabase.db('triggered_alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).find({}).toArray(function(err, triggeredAlarmsList){
    res.send(triggeredAlarmsList);
    res.end();
  });
});

//deletes entire list of triggered alarms for one device
app.get("/deletetriggeredalarmlist/:username/:deviceid", function(req, res) {
  alarmdb = outsideDatabase.db('triggered_alarms_' + req.params.username);
  alarmdb.collection(req.params.deviceid).deleteMany({}).then (function(err, triggeredAlarmsList){
    res.send("OK!");
    res.end();
  });
});

//returns list of triggered bell alarms for that user and all devices
app.get("/triggeredbellalarmlist/:username/", function(req,res) {
  alarmdb = outsideDatabase.db('triggered_bell_alarms_' + req.params.username);
  alarmdb.collection('all').find({}).toArray(function(err, triggeredBellAlarmsList){
    res.send(triggeredBellAlarmsList);
    res.end();
  });
});

//deletes entire list of triggered bell alarms
app.get("/deletebellalarms/:username/", function(req, res) {
  bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + req.params.username);
  bellTriggeredAlarmsDB.collection('all').deleteMany({}).then (function() {
  });
  res.send("ok!");
  res.end();
});


////////////////////////////////////////////////






//ALARM SYSTEM
function ReturnDeviceNameFromID(username,deviceID){
  devicedb.collection(username).find({}).toArray(function(err, docs){
    docs.forEach(element => {
      if (element.deviceID == deviceID){
      }
    });
});
}

function AlarmProcessor(deviceID, deviceData, username){
  alarmdb = outsideDatabase.db('alarms_' + username);
  var dataValues = Object.keys(deviceData);
  alarmdb.collection(deviceID).find({}).toArray(function(err, alarmsList){
    console.log(alarmsList);
    dataValues.forEach(deviceValue => {
      alarmsList.forEach(alarm => {
        if (alarm.alarmValue == deviceValue)
        {
          console.log("alarmvalue: " + alarm.alarmValue + "  DeviceValue: " + deviceValue)
          if (alarm.alarmOperator == "Greater than")
          {
            if (deviceData[deviceValue] > alarm.alarmNumber)
            {
              devicedb.collection(username).find({}).toArray(function(err, deviceList)
              {
                deviceList.forEach(device => {if (device.deviceID == deviceID)
                  {
                    if(alarm.alarmEmailAlerts == "On")
                    {
                      SendEmail
                      (alarm.alarmEmailAddress, device.devicename + "" + alarm.alarmName + " Alarm",
                      "<h1>" + alarm.alarmName + " Alarm Triggered for " + device.devicename +"</h1>" + 
                      "<p> The IoT device " + device.devicename + " has triggered the following alarm (" + alarm.alarmName +") as "  
                      + deviceValue + " with a value of (" + deviceData[deviceValue] +") was greater than the value of " 
                      + alarm.alarmNumber +" at the local device time of " + deviceData.time + "</p>");
                    }
                    var alarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      alarmEmailAddress: alarm.alarmEmailAddress
                    }
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + username);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {console.log(alarmRecord);});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + username);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {console.log(alarmRecord);});
                  }
                });
              });
            }
          }
          if (alarm.alarmOperator == "Less than")
          {
            if (deviceData[deviceValue] < alarm.alarmNumber)
            {
              devicedb.collection(username).find({}).toArray(function(err, deviceList)
              {
                deviceList.forEach(device => {if (device.deviceID == deviceID)
                  {
                    if(alarm.alarmEmailAlerts == "On")
                    {
                      SendEmail
                      (alarm.alarmEmailAddress, device.devicename + "" + alarm.alarmName + " Alarm",
                      "<h1>" + alarm.alarmName + " Alarm Triggered for " + device.devicename +"</h1>" + 
                      "<p> The IoT device " + device.devicename + " has triggered the following alarm (" + alarm.alarmName +") as "  
                      + deviceValue + " with a value of (" + deviceData[deviceValue] +") was less than the value of " 
                      + alarm.alarmNumber +" at the local device time of " + deviceData.time + "</p>");
                    }
                    var alarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      alarmEmailAddress: alarm.alarmEmailAddress
                    }
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + username);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {console.log(alarmRecord);});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + username);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {console.log(alarmRecord);});
                  }
                });
              });
            }
          }
          if (alarm.alarmOperator == "Equal to")
          {
            if (deviceData[deviceValue] == alarm.alarmNumber)
            {
              devicedb.collection(username).find({}).toArray(function(err, deviceList)
              {
                deviceList.forEach(device => {if (device.deviceID == deviceID)
                  {
                    if(alarm.alarmEmailAlerts == "On")
                    {
                      SendEmail
                      (alarm.alarmEmailAddress, device.devicename + "" + alarm.alarmName + " Alarm",
                      "<h1>" + alarm.alarmName + " Alarm Triggered for " + device.devicename +"</h1>" + 
                      "<p> The IoT device " + device.devicename + " has triggered the following alarm (" + alarm.alarmName +") as "  
                      + deviceValue + " with a value of (" + deviceData[deviceValue] +") was equal to the value of " 
                      + alarm.alarmNumber +" at the local device time of " + deviceData.time + "</p>");
                    }
                    var alarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      alarmEmailAddress: alarm.alarmEmailAddress
                    }
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + username);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {console.log(alarmRecord);});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + username);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {console.log(alarmRecord);});
                  }
                });
              });
            }
          }
        }
      });
    });
  });
}





////////WEB SERVER

app.use(express.static(path.join(__dirname,'public')));
app.use(expressLayouts);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/public/assets/images/favico.ico' , function(req , res){/*code*/});

app.get("/index", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('index');
});

app.get("/monitor", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('monitor');
});

app.get("/", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('login', { layout: 'loginlayout' });
});


app.get("/data_tables", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('data_tables');
});

app.get("/devices", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('devices');
});

app.get("/data_charts", function(req, res) {
  res.render('data_charts');
});

app.get("/register_iot", function(req, res) {
  res.render('register_iot');
});

app.get("/alarms", function(req, res) {
  res.render('alarms');
});

app.post("/register_iot", function(req, res) {
  //res.sendFile(__dirname + '/Index.html');
  res.render('register_iot');
});















/* app.get("/:url", function(req, res) {
  //res.sendFile(__dirname + '/' + req.params.url + '.html');
  res.render(req.params.url);
}); */







//legacy

/* app.post("/:deviceid/last1/:amount", function(req, res) {
  console.log(req.body);
  var limitAmount = parseInt(req.params.amount);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    res.send(docs);
    res.end();
  });
});

app.get("/:deviceid/date", function(req, res) {
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    arrayResult = [];
    to = new Date(2021,10,30);
    from = new Date(2011,10,30);
    docs.forEach(element => {
      var check = new Date(element.time);
      if((check.getTime() <= to.getTime() && check.getTime() >= from.getTime()))
      {
        arrayResult.push(check);
      }
    });
    arrayResult.forEach(element => {
      console.log(element);
    });
    res.send("finished!");
    res.end();
  });
}); */

/////////////////////////////////check for other datab
/* app.post("/:username/register_device", function(req, res) {
  adminDb.listDatabases(function(err, result) {
  var allDatabases = result.databases;
  allDatabases.forEach(element => {
    console.log(element);
    });
  });
res.send(req.body);
res.end();
});
 */



 ///can lookup individual devices using a query..not needed idiot
/* app.get("/:username/lookup_device/:deviceid", function(req, res) {
    var name = "deviceID";
    var value = parseInt(req.params.deviceid);
    var query = {};
    query[name] = value;
    devicedb.collection(req.params.username).find(query).toArray(function(err, docs){
    if (docs[0] == null) {console.log("A!");}
    res.send(docs);
    res.end();
  });
}); */


//graph API 

//retrieve last known data with a packet amount
app.get("/:deviceid/getmonitorlabels", function(req, res) {
  var limitAmount = 1;
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    keyNames = [];
    var getLabelsSmall = Object.keys(docs[0]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    res.send(keyNames);
    res.end();
  });
});


//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphstart/:number", function(req, res) {
  var getAmount = parseInt(req.params.number);
  var limitAmount = getAmount - 1;
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(getAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    if (docs[0] == undefined){ //checks to make sure the iot device has actual data, if not returns
      console.log("was undefined");
      res.send("Null");
      res.end();
      return;
    }
    console.log("fired anyway");
    keyNames = [];
    var objectArray = [];
    var returnArray = [];
    var getLabelsSmall = Object.keys(docs[limitAmount]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    keyNames.forEach(propname => {
      var isABool = false;
      if (typeof docs[limitAmount][propname] === "boolean")
      {
        isABool = true;
        if (docs[limitAmount][propname] == true)
        {
            docs[limitAmount][propname] = 20;
        }
        else
        {
            (docs[limitAmount][propname] = -20);
        }
      }
      var miniArray = [];
      var timeS = new Date(docs[limitAmount].time);
      var timeSR = timeS.getTime();
      miniArray.push(timeSR, docs[limitAmount][propname]);
      returnArray.push(miniArray);
      if (isABool == false){
        var returnData = {
          type: 'line',
          name: propname,
          data: returnArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
      else{
        var returnData = {
          type: 'column',
          name: propname,
          data: returnArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
          console.log(returnData);
        }
    });
    res.send(objectArray);
    res.end();
  });
});

//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphupdate/:number", function(req, res) {
  var getAmount = parseInt(req.params.number);
  var limitAmount = getAmount - 1;
  console.log(limitAmount);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(getAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    if (docs[0] == undefined){ //checks to make sure the iot device has actual data, if not returns
      console.log("was undefined");
      res.send("Null");
      res.end();
      return;
    }
    keyNames = [];
    var returnArray = [];
    var getLabelsSmall = Object.keys(docs[limitAmount]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    

    keyNames.forEach(propname => {
      if (typeof docs[limitAmount][propname] === "boolean")
      {
        if (docs[limitAmount][propname] == true)
        {
            docs[limitAmount][propname] = 20;
        }
        else
        {
            (docs[limitAmount][propname] = -20);
        }
      }
      var miniArray = [];
      var timeS = new Date(docs[limitAmount].time);
      var timeSR = timeS.getTime();
      miniArray.push(timeSR, docs[limitAmount][propname]);
      returnArray.push(miniArray);
    });
  res.send(returnArray);
  res.end();
  });
});



app.post("/:deviceid/betweendates", function(req, res) {
  console.log("Between dates fired!");
  var objectArray = [];
  iotdb.collection(req.params.deviceid).find({}).toArray(function(err, docs){
    arrayResult = [];
    console.log(req.body);
    to = new Date(req.body.to);
    console.log(to);
    from = new Date(req.body.from);
    console.log(from);
    docs.forEach(element => {
      console.log(element);
      var check = new Date(element.time);
      if((check.getTime() <= to.getTime() && check.getTime() >= from.getTime()))
      {
        arrayResult.push(element);
      }
    });
    
    keyNames = [];
    var getLabelsSmall = Object.keys(arrayResult[0]);
    getLabelsSmall.forEach(element => { //gets labels for buttons
        if (element == "time" || element == "_id"){//makes sure not to add buttons for time or datapacket ID
        }
        else
        {
        keyNames.push(element);
        }
    });
    console.log(keyNames);
    keyNames.forEach(propname => {
      console.log(propname);
      var keyArray = [];
      var isABool = false;
      docs.forEach(dataPiece => {
        if (typeof dataPiece[propname] === "boolean")
        {
          isABool = true;
          if (dataPiece[propname] == true)
          {
            dataPiece[propname] = 20;
          }
          else
          {
              dataPiece[propname] = -20;
          }
        }
        var miniArray = [];
        var timeS = new Date(dataPiece.time);
        var timeSR = timeS.getTime();
        miniArray.push(timeSR, dataPiece[propname]);
        keyArray.push(miniArray);
      });
      if (isABool == false){
        var returnData = {
          type: 'line',
          name: propname,
          data: keyArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
      else{
        var returnData = {
          type: 'column',
          name: propname,
          data: keyArray,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
    console.log(keyArray);
    });
    res.end();
    console.log("Finished!");
  });

});


/* 
app.get("/:deviceid/monitorgraphstart/:number", function(req, res) {
  var limitAmount = parseInt(req.params.number);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    console.log(docs);
    console.log(docs[req.params.number - 1]);
    res.send(docs[req.params.number - 1]);
    res.end();
  });
});


//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphupdate/:number", function(req, res) {
  var limitAmount = parseInt(req.params.number);
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(limitAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    console.log(docs);
    console.log(docs[req.params.number - 1]);
    res.send(docs[req.params.number - 1]);
    res.end();
  });
}); */