var express = require('express');
var path= require('path');
const bodyParser = require('body-parser');
var app = express();
var expressLayouts = require('express-ejs-layouts');
app.use(bodyParser.json());

var session = require('express-session')
var MongoDBStore = require('connect-mongodb-session')(session);

var store = new MongoDBStore({
  uri: 'mongodb://165.22.241.11:27017',
  databaseName: 'sessions',
  collection: 'mySessions'
});






app.use(session({
  secret: 'adgaigdj3wakg23o2323_3311fasa',
  resave: false,
  saveUninitialized: false,
  store: store
}));

//return res.sendStatus(401);
var auth = function(req, res, next) {
  if (req.session && req.session.user && req.session.pool)
    return next();
  else
    return res.render('sign_in', { layout: 'emptylayout' });
};

app.post('/logincheck', function (req, res) {
  usersdb.collection('users').find({}).toArray(function(err, docs){
    loggedIn = false;
    docs.forEach(element => {
      if (element.user === req.body.user){
        if (element.pass === req.body.pass){
          req.session.user = element.user;
          req.session.name = element.name;
          req.session.level = element.level;
          req.session.tag = element.tag;
          req.session.pool = element.pool;
          loggedIn = true;
        }
      }
    });
    if (loggedIn == true){
      res.send("OK");
    }
    else{
      res.send("NO ACCESS!");
    }
  });
});



var MongoClient = require('mongodb').MongoClient;

var outsideDatabase;
  MongoClient.connect("mongodb://165.22.241.11:27017", {useNewUrlParser: true}, function(err, database) {
  //MongoClient.connect("mongodb://127.0.0.1:27017", {useNewUrlParser: true}, function(err, database) {
  if(err)
  throw err;
  iotdb = database.db('iot');
  devicedb = database.db('devices');
  usersdb = database.db('users');
  outsideDatabase = database;
  
  //db = database;
  app.listen(3000);
  console.log("Cobra is up and running on port 3000 since " + new Date().toLocaleDateString() + "  " + new Date().toLocaleTimeString());
});

/*   app.post('/logincheck', function (req, res) {
    console.log(req.body)
    if (req.body.user == "Jwalstab" && req.body.pass == "Quantum4277"){
      console.log("USER LOGGED IN AT ");
      req.session.user = "Jay Walstab";
      req.session.level = "1";
      req.session.tag = "Engineer"
      res.send("OK");
    }
    else{
      console.log("USER LOGIN DENIED!");
      res.send("NO ACCESS!");
    }
    
  }); */


const nodemailer = require("nodemailer");




var transporter = nodemailer.createTransport({
  host: "webcloud42.au.syrahost.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'alarmsystem@quantumdata.com.au',
    pass: 'Quantum4277' 
  }
});

async function SendEmail(emailAddress,subjectToUse,htmlToUse){
  let info = await transporter.sendMail({
    from: '"QTM Data Alarm System" <alarmsystem@quantumdata.com.au>', // sender address
    to: emailAddress, // list of receivers
    subject: subjectToUse, // Subject line
    html: htmlToUse//"<b>Hello world?</b>" // html body
  });

  console.log("Message sent: %s", info.messageId);
}


//////////API SERVER
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//users and devices api stuff/////////////////////////////////////////////////////


//registers a new device
app.post("/:iotpool/register_device", function(req, res) {
  devicedb.collection(req.params.iotpool).insertOne(req.body).then (function() {
    res.send(req.body);
    res.end();
  });
});


//returns list of IDs/Names based on iot pool
app.get("/:iotpool/lookup_devices", function(req, res) {
  devicedb.collection(req.params.iotpool).find({}).toArray(function(err, docs){
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


//returns an object with device ID, name and whether its sent data in last sixty seconds
app.get("/:iotpool/lookup_devices_time", function(req, res) {
  idArrayToReturn = [];

  devicedb.collection(req.params.iotpool).find({}).toArray(function(err, docs){
  var amountOfDevices = docs.length;
  var currentCount = 0;
  docs.forEach(element => { //FIRST LOOP GETS THE DEVICEID
    if (element.devicename != null){
      iotdb.collection("" + element.deviceID).find({}).sort( { _id : -1 } ).limit(1).toArray(function(err, docs){
        if (err){console.log(err);}//SECOND LOOP GETS A DATA PACKET THEN CHECKS THE ID TIME
        if (docs[0] != null){
          var timestamp = (docs[0]._id).toString().substring(0,8);
          var idTime = new Date( parseInt( timestamp, 16 ) * 1000 );
          var clientTime = Date.now();
          var deviceStatus = 'empty';
          if (clientTime - 60000 < idTime){ ///SET TO 60 SECONDS TO SHOW ONLINE OR OFFLINE
            deviceStatus = "Online"
          }
          else{
            deviceStatus = "Offline";
          }
        }
        else{
          deviceStatus = "Offline";
        }

        var deviceObject = {
          deviceName: element.devicename,
          deviceID: element.deviceID,
          deviceStatus: deviceStatus
        }
        idArrayToReturn.push(deviceObject);
        if (amountOfDevices != currentCount + 1){
          currentCount++;
        }
        else{
          res.send(idArrayToReturn);
          res.end();
        }
      });
    }
  });
});

});
///////////////////////////////////////////////////////////////////////////////




//used for iot to send data packets to api server, checks agaisnt alarm system
app.post("/:deviceid", function(req, res) {
  iotdb.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("o");
    AlarmProcessor(req.params.deviceid,req.body,"Quantum");
    res.end();
  });
});


//post a control change to legioguard device
app.post("/legioguard/control/:iotpool/:deviceid", function(req, res) {
  changeDB = outsideDatabase.db('control_' + req.params.iotpool);
  changeDB.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("ok");
    res.end();
  });
});
app.get("/legioguard/control/:iotpool/:deviceid", function(req, res) {
  changeDB = outsideDatabase.db('control_' + req.params.iotpool);
  //changeDB.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(1).toArray(function(err, docs){
  changeDB.collection(req.params.deviceid).find({}).limit(1).toArray(function(err, docs){
    if (docs[0] != null){
      res.send(docs[0]);
      recordid = docs[0]._id;
      DeleteControlChange(req.params.iotpool,req.params.deviceid,recordid);
      res.end();
    }
    else
    {
      res.send('n');
      res.end();
    }
  });
});
function DeleteControlChange(iotpool,deviceid,recordid){
  console.log(recordid);
  var query = {
    _id: recordid
  };
  console.log(query);
  changeDB = outsideDatabase.db('control_' + iotpool);
  changeDB.collection(deviceid).deleteOne(query).then(function(err, docs){
  });
}


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
app.post("/alarms/:iotpool/:deviceid", function(req, res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.iotpool);
  alarmdb.collection(req.params.deviceid).insertOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//delete an alarm based of req.body
app.post("/alarms/delete/:iotpool/:deviceid/", function(req, res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.iotpool);
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
app.post("/devices/delete/:iotpool/", function(req, res) {
  deviceDB = outsideDatabase.db('devices');
  var name = "deviceID";
  var value = (req.body.deviceID);
  var query = {};
  query[name] = value;
  deviceDB.collection(req.params.iotpool).deleteOne(req.body).then (function() {
    res.send("Recieved");
    res.end();
  });
});

//returns list of alarms for that user and that device
app.get("/alarmlist/:iotpool/:deviceid", function(req,res) {
  alarmdb = outsideDatabase.db('alarms_' + req.params.iotpool);
  alarmdb.collection(req.params.deviceid).find({}).toArray(function(err, alarmsList){
    res.send(alarmsList);
    res.end();
  });
});

//returns list of triggered alarms for that user and that device
app.get("/triggeredalarmlist/:iotpool/:deviceid", function(req,res) {
  alarmdb = outsideDatabase.db('triggered_alarms_' + req.params.iotpool);
  alarmdb.collection(req.params.deviceid).find({}).toArray(function(err, triggeredAlarmsList){
    res.send(triggeredAlarmsList);
    res.end();
  });
});

//deletes entire list of triggered alarms for one device
app.get("/deletetriggeredalarmlist/:iotpool/:deviceid", function(req, res) {
  alarmdb = outsideDatabase.db('triggered_alarms_' + req.params.iotpool);
  alarmdb.collection(req.params.deviceid).deleteMany({}).then (function(err, triggeredAlarmsList){
    res.send("OK!");
    res.end();
  });
});

//returns list of triggered bell alarms for that user and all devices
app.get("/triggeredbellalarmlist/:iotpool/", function(req,res) {
  alarmdb = outsideDatabase.db('triggered_bell_alarms_' + req.params.iotpool);
  alarmdb.collection('all').find({}).toArray(function(err, triggeredBellAlarmsList){
    res.send(triggeredBellAlarmsList);
    res.end();
  });
});

//deletes entire list of triggered bell alarms
app.get("/deletebellalarms/:iotpool/", function(req, res) {
  bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + req.params.iotpool);
  bellTriggeredAlarmsDB.collection('all').deleteMany({}).then (function() {
  });
  res.send("ok!");
  res.end();
});


////////////////////////////////////////////////






//ALARM SYSTEM
function ReturnDeviceNameFromID(iotpool,deviceID){
  devicedb.collection(iotpool).find({}).toArray(function(err, docs){
    docs.forEach(element => {
      if (element.deviceID == deviceID){
      }
    });
});
}

function AlarmProcessor(deviceID, deviceData, iotpool){
  alarmdb = outsideDatabase.db('alarms_' + iotpool);
  var dataValues = Object.keys(deviceData);
  alarmdb.collection(deviceID).find({}).toArray(function(err, alarmsList){
    if (alarmsList == null){return;} // checks if no alarms db exists for this device, then quits
    dataValues.forEach(deviceValue => {
      alarmsList.forEach(alarm => {
        if (alarm.alarmValue == deviceValue)
        {
          console.log("alarmvalue: " + alarm.alarmValue + "  DeviceValue: " + deviceValue)
          if (alarm.alarmOperator == "Greater than")
          {
            if (deviceData[deviceValue] > alarm.alarmNumber)
            {
              devicedb.collection(iotpool).find({}).toArray(function(err, deviceList)
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
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + iotpool);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + iotpool);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {});
                  }
                });
              });
            }
          }
          if (alarm.alarmOperator == "Less than")
          {
            if (deviceData[deviceValue] < alarm.alarmNumber)
            {
              devicedb.collection(iotpool).find({}).toArray(function(err, deviceList)
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
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + iotpool);
                    triggeredAlarmsDB.collection(deviceID).insertOne(alarmRecord).then (function() {});

                    var bellAlarmRecord = {
                      alarmName: alarm.alarmName,
                      deviceValue: deviceValue,
                      deviceValueNumber: deviceData[deviceValue],
                      alarmOperator: alarm.alarmOperator,
                      alarmNumber: alarm.alarmNumber,
                      alarmTriggeredAt: deviceData.time,
                      deviceName: device.devicename
                    }

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + iotpool);
                    bellTriggeredAlarmsDB.collection('all').insertOne(bellAlarmRecord).then (function() {});
                  }
                });
              });
            }
          }
          if (alarm.alarmOperator == "Equal to")
          {
            if (deviceData[deviceValue] == alarm.alarmNumber)
            {
              devicedb.collection(iotpool).find({}).toArray(function(err, deviceList)
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
                    triggeredAlarmsDB = outsideDatabase.db('triggered_alarms_' + iotpool);
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

                    bellTriggeredAlarmsDB = outsideDatabase.db('triggered_bell_alarms_' + iotpool);
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
  res.render('index');
});



app.get("/phaser", function(req, res) {
  res.render('phaser', { layout: 'emptylayout' });
});

app.get("/", function(req, res) {
  if (req.session.user){
  res.render('devices');
  }
  else{
    res.render('sign_in', { layout: 'emptylayout' });
  }
});

app.get("/sign_out", function(req, res) {
  req.session.destroy();
  res.render('sign_in', { layout: 'emptylayout' });
});

app.get("/live_charts", auth, function(req, res) {
  res.render('live_charts', {
    loggedInUser: req.session.user,
    loggedInName: req.session.name,
    loggedInLevel: req.session.level,
    loggedInTag: req.session.tag,
    loggedInPool: req.session.pool,
  });
});

app.get("/data_tables", auth, function(req, res) {
  res.render('data_tables', {
    loggedInUser: req.session.user,
    loggedInName: req.session.name,
    loggedInLevel: req.session.level,
    loggedInTag: req.session.tag,
    loggedInPool: req.session.pool
  });
});

app.get("/devices", auth, function(req, res) {
    res.render('devices', {
    loggedInUser: req.session.user,
    loggedInName: req.session.name,
    loggedInLevel: req.session.level,
    loggedInTag: req.session.tag,
    loggedInPool: req.session.pool
  });
});

app.get("/data_charts", function(req, res) {
  res.render('data_charts', {
    loggedInUser: req.session.user,
    loggedInName: req.session.name,
    loggedInLevel: req.session.level,
    loggedInTag: req.session.tag,
    loggedInPool: req.session.pool
  });
});

app.get("/calc", function(req, res) {
  res.render('calc', { layout: 'emptylayout' });
});

app.get("/control", function(req, res) {
  res.render('control', {
    loggedInUser: req.session.user,
    loggedInName: req.session.name,
    loggedInLevel: req.session.level,
    loggedInTag: req.session.tag,
    loggedInPool: req.session.pool
  });
});

app.get("/alarms", function(req, res) {
  res.render('alarms', {
    loggedInUser: req.session.user,
    loggedInName: req.session.name,
    loggedInLevel: req.session.level,
    loggedInTag: req.session.tag,
    loggedInPool: req.session.pool
  });
});

app.get("/phaser/:fileToGet", function(req, res) {
  res.sendFile(__dirname + '/public/assets/phaser/' + req.params.fileToGet);
});


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
  dataLabelsList = LGDataLabelsList;
  if (req.params.deviceid == 10555){
    dataLabelsList = testDataLabelsList;
  }
  var getAmount = parseInt(req.params.number);
  var limitAmount = getAmount - 1;
  var objectArray = [];
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(getAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    if (docs[0] == undefined){ //checks to make sure the iot device has actual data, if not returns
      console.log("was undefined");
      res.send("Null");
      res.end();
      return;
    }
    dataLabelsList.forEach(propname => {
      var isABool = false;
      if (typeof docs[limitAmount][propname] === "boolean")
      {
        isABool = true;
      }
      if (isABool == false){
        var returnData = {
          type: 'line',
          name: propname,
          data: null,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
      else{
        var returnData = {
          type: 'column',
          name: propname,
          data: null,
          marker: {symbol : 'square', radius : 2 },
          visible: false};
          objectArray.push(returnData);
        }
    });
    res.send(objectArray);
    res.end();
  });
});

//retrieve last known data with a packet amount
app.get("/:deviceid/monitorgraphupdate/:number", function(req, res) {
  dataLabelsList = LGDataLabelsList;
  if (req.params.deviceid == 10555){
    dataLabelsList = testDataLabelsList;
  }
  var getAmount = parseInt(req.params.number);
  var limitAmount = getAmount - 1;
  iotdb.collection(req.params.deviceid).find({}).sort( { _id : -1 } ).limit(getAmount).toArray(function(err, docs){
    if (err){console.log(err);}
    if (docs[0] == undefined){ //checks to make sure the iot device has actual data, if not returns
      res.send("Null");
      res.end();
      return;
    }
    var returnArray = [];
    dataLabelsList.forEach(propname => {
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
  dataLabelsList = LGDataLabelsList;
  if (req.params.deviceid == 10555){
    dataLabelsList = testDataLabelsList;
  }
  console.log("Between dates fired!");
  var objectArray = [];
  iotdb.collection(req.params.deviceid).find(req.body).toArray(function(err, docs){
    if (docs[0] == null)
    {
      console.log("no data");
      res.send("No Data");
      res.end();
      return;
    }
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
    dataLabelsList.forEach(propname => {
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
    });
    res.send(objectArray);
    res.end();
    console.log("Finished!");
  });

});

var dataLabelsList = [];

var testDataLabelsList = ["Random_Data_1", "Random_Data_2", "Random_Data_3"];

var LGDataLabelsList = ["Hot_Fan","Suct_Temp", "Evap_Inlet_Temp","Cond_Outlet_Temp","Hot_Supply_Temp","Hot_Return_Temp","Cold_Supply_Temp","Cold_Return_Temp",
                        "Hot_Tank_Temp1","Hot_Tank_Temp2","Hot_Tank_Temp3","Cold_Tank_Temp1","Cold_Tank_Temp2","Cold_Tank_Temp3","Cold_SupToVlv_Temp",
                        "Warm_ToBuild_Temp","Warm_ReturnBuild_Temp","Hot_SupToVlv_Temp","Ele_Boost_Temp","Heat_Exchange_Cold","Heat_Exchange_Hot","Disc_Temp"]

app.post("/legioguard/postdatafordevice/:deviceid", function(req, res) {

  LegioGuardDataObject = {

    time: req.body.time,

    

    //COILS
    EleHeater_Mng_Hot_Ele_Man_Msk: req.body.coils[7],
    AlarmMng_AlrmResByBms: req.body.coils[8],
    OnOffUnitMng_KeybOnOff: req.body.coils[9],
    Flush_Valve_Op_ColdVlv_Al: req.body.coils[29],
    Flush_Valve_Manual_On_Flush: req.body.coils[51],
    Master_Ctrl_Mng_Rot_CP: req.body.coils[59],
    Master_Ctrl_Mng_Rot_HP: req.body.coils[60],

    //DISCRETE INPUT
    Cold_EleHeater: req.body.discreteInputs[0],
    Hot_P1: req.body.discreteInputs[1],
    Hot_Solend1: req.body.discreteInputs[2],
    Hot_EleHeater: req.body.discreteInputs[3],
    Glob_Al: req.body.discreteInputs[4],
    Hot_P2: req.body.discreteInputs[5],
    Hot_Fan: req.body.discreteInputs[6],
    Blance_Vlv: req.body.discreteInputs[7],
    Injection_Vlv: req.body.discreteInputs[8],
    Hot_Solend2: req.body.discreteInputs[9],
    Cold_P1: req.body.discreteInputs[10],
    HotW_FlowS1: req.body.discreteInputs[11],
    ColdW_FlowS: req.body.discreteInputs[12],
    High_P: req.body.discreteInputs[13],
    Low_P: req.body.discreteInputs[14],
    Comp_Overload: req.body.discreteInputs[15],
    Master_Slave: req.body.discreteInputs[16],
    Cold_P_Switch: req.body.discreteInputs[17],
    Al_retain_Active: req.body.discreteInputs[18],
    Al_Err_retain_write_Active: req.body.discreteInputs[19],
    Alrm_Prob1_Active: req.body.discreteInputs[20],
    Alrm_Prob2_Active: req.body.discreteInputs[21],
    Alrm_Prob3_Active: req.body.discreteInputs[22],
    Alrm_Prob4_Active: req.body.discreteInputs[23],
    Alrm_Prob5_Active: req.body.discreteInputs[24],
    Alrm_Prob6_Active: req.body.discreteInputs[25],
    Alrm_Prob7_Active: req.body.discreteInputs[26],
    Alrm_Prob8_Active: req.body.discreteInputs[27],
    Alrm_Prob9_Active: req.body.discreteInputs[28],
    Alrm_Prob10_Active: req.body.discreteInputs[29],
    Hot1_Flow_Al_Active: req.body.discreteInputs[30],
    Hot2_Flow_Al_Active: req.body.discreteInputs[31],
    ColdFlow_Al_Active: req.body.discreteInputs[32],
    HP_Al_Active: req.body.discreteInputs[33],
    LP_Al_Active: req.body.discreteInputs[34],
    Comp_Oload_Al_Active: req.body.discreteInputs[35],
    High_DiscT_Al_Active: req.body.discreteInputs[36],
    Fan_Over_Al_Active: req.body.discreteInputs[37],
    Low_SuctT_Al_Active: req.body.discreteInputs[38],
    Board2_Offline: req.body.discreteInputs[39],
    Comp_On: req.body.discreteInputs[40],
    Flush_Valve_Flush_Valve_On: req.body.discreteInputs[41],
    Flush_Valve_Cold_SuplyW_Vlv: req.body.discreteInputs[42],
    Alrm_Prob11_Active: req.body.discreteInputs[43],
    Alrm_Prob12_Active: req.body.discreteInputs[44],
    Alrm_Master_Unit_Active: req.body.discreteInputs[45],
    Alrm_Slave_Unit_Active: req.body.discreteInputs[46],
    Alrm_Low_EvapInT_Active: req.body.discreteInputs[47],
    Alrm_Low_HT1_Active: req.body.discreteInputs[48],
    Alrm_High_CT1_Active: req.body.discreteInputs[49],
    Al_Warm_Supply_Low_Active: req.body.discreteInputs[50],
    Al_Warm_Supply_High_Active: req.body.discreteInputs[51],
    AlarmMng_Read_Ain1_Al: req.body.discreteInputs[52],
    AlarmMng_Read_Ain2_Al: req.body.discreteInputs[53],
    AlarmMng_Read_Ain3_Al: req.body.discreteInputs[54],
    Read_Ain4_Al: req.body.discreteInputs[55],
    Read_Ain5_Al: req.body.discreteInputs[56],
    Read_Ain6_Al: req.body.discreteInputs[57],
    AlarmMng_Read_Ain11_Al: req.body.discreteInputs[58],
    AlarmMng_Read_Ain8_Al: req.body.discreteInputs[59],
    AlarmMng_Read_Ain9_Al: req.body.discreteInputs[60],
    Cold_P2: req.body.discreteInputs[61],
    LowP_SenserRead_Active: req.body.discreteInputs[62],
    HighP_SenserRead_Active: req.body.discreteInputs[63],

    //HOLDING REGISTERS
    Master_Ctrl_Mng_Fan_Setp: uInt16ToFloat32([req.body.holdingRegisters[0],req.body.holdingRegisters[1]]),
    Master_Ctrl_Mng_Cl_HotMainVlv_Delay: req.body.holdingRegisters[5],
    Master_Ctrl_Mng_Hot_S2_OpenT: req.body.holdingRegisters[6],
    Master_Ctrl_Mng_Comp_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[7],req.body.holdingRegisters[8]]),
    Master_Ctrl_Mng_Comp_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters[9],req.body.holdingRegisters[10]]),
    Master_Ctrl_Mng_Comp_MinOn_T: req.body.holdingRegisters[11],
    Master_Ctrl_Mng_Comp_MinOff_T: req.body.holdingRegisters[12],
    Master_Ctrl_Mng_Comp_Start_Delay: req.body.holdingRegisters[14],
    Master_Ctrl_Mng_BlanceVlv_Delay: req.body.holdingRegisters[16],
    Master_Ctrl_Mng_InjecVlv_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[17],req.body.holdingRegisters[18]]),
    Master_Ctrl_Mng_InjecVlv_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters[19],req.body.holdingRegisters[20]]),
    Master_Ctrl_Mng_Injec_MaxTime: req.body.holdingRegisters[22],
    Master_Ctrl_Mng_Injec_ReStart_Delay: req.body.holdingRegisters[24],
    EleHeater_Mng_EleH_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[25],req.body.holdingRegisters[26]]),
    EleHeater_Mng_EleH_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters[27],req.body.holdingRegisters[28]]),
    PVlv_Mng_HotVlv_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[29],req.body.holdingRegisters[30]]),
    PVlv_Mng_HotVlv_DeadBand: ReverseduInt16ToFloat32([req.body.holdingRegisters[31],req.body.holdingRegisters[32]]),
    PVlv_Mng_Hot_Min_Op: ReverseduInt16ToFloat32([req.body.holdingRegisters[33],req.body.holdingRegisters[34]]),
    PVlv_Mng_Hot_Max_Op: ReverseduInt16ToFloat32([req.body.holdingRegisters[35],req.body.holdingRegisters[36]]),
    PVlv_Mng_Cold_Min_Op: ReverseduInt16ToFloat32([req.body.holdingRegisters[37],req.body.holdingRegisters[38]]),
    PVlv_Mng_Cold_Max_Op: ReverseduInt16ToFloat32([req.body.holdingRegisters[39],req.body.holdingRegisters[40]]),
    PVlv_Mng_Hot_Op_ProAl: ReverseduInt16ToFloat32([req.body.holdingRegisters[41],req.body.holdingRegisters[42]]),
    PVlv_Mng_Cold_Op_ProAl: ReverseduInt16ToFloat32([req.body.holdingRegisters[43],req.body.holdingRegisters[44]]),
    PVlv_Mng_ColdVlv_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[45],req.body.holdingRegisters[46]]),
    PVlv_Mng_ColdVlv_DeadBand: ReverseduInt16ToFloat32([req.body.holdingRegisters[47],req.body.holdingRegisters[48]]),
    Master_Ctrl_Mng_Hot_S1_Inter: req.body.holdingRegisters[50],
    AlarmMng_High_DiscT_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[51],req.body.holdingRegisters[52]]),
    AlarmMng_High_DiscT_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters[53],req.body.holdingRegisters[54]]),
    AlarmMng_Low_SuctT_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[55],req.body.holdingRegisters[56]]),
    AlarmMng_Low_SuctT_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters[57],req.body.holdingRegisters[58]]),
    AlarmMng_High_DiscT_Delay: req.body.holdingRegisters[60],
    AlarmMng_Low_SuctT_Delay: req.body.holdingRegisters[62],
    Master_Ctrl_Mng_RunWFlow_Delay: req.body.holdingRegisters[64],
    Flush_Valve_Flush_Week_Set: req.body.holdingRegisters[91],
    Flush_Valve_Flush_Hour_Set: req.body.holdingRegisters[92],
    Flush_Valve_Flush_Minute_Set: req.body.holdingRegisters[93],
    Flush_Valve_Flush_Time: req.body.holdingRegisters[95],
    Flow_Switch_Low_Level_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[97],req.body.holdingRegisters[98]]),

    //holding registers 100 +
    Flush_Valve_Cold_SupplyVlv_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters[99],req.body.holdingRegisters2[0]]),
    PVlv_Mng_ColdVlv_Kp: ReverseduInt16ToFloat32([req.body.holdingRegisters2[1],req.body.holdingRegisters2[2]]),
    PVlv_Mng_ColdVlv_Ti: req.body.holdingRegisters2[3],
    PVlv_Mng_ColdVlv_Td: req.body.holdingRegisters2[4],
    PVlv_Mng_HotVlv_Kp: ReverseduInt16ToFloat32([req.body.holdingRegisters2[5],req.body.holdingRegisters2[6]]),
    PVlv_Mng_HotVlv_Ti: req.body.holdingRegisters2[7],
    PVlv_Mng_HotVlv_Td: req.body.holdingRegisters2[8],
    EleHeater_Mng_CRT_Ele_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters2[25],req.body.holdingRegisters2[26]]),
    EleHeater_Mng_CRT_Ele_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters2[27],req.body.holdingRegisters2[28]]),
    EleHeater_Mng_EBT_Ele_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters2[29],req.body.holdingRegisters2[30]]),
    EleHeater_Mng_EBT_Ele_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters2[31],req.body.holdingRegisters2[32]]),
    Flush_Valve_Hot_SupplyVlv_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    Flush_Valve_Hot_SupplyVlv_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters2[35],req.body.holdingRegisters2[36]]),
    Flush_Valve_WSB_Supply_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters2[37],req.body.holdingRegisters2[38]]),
    Flush_Valve_WSB_Supply_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters2[39],req.body.holdingRegisters2[40]]),
    Flush_Valve_Cold_SupplyVlv_Offset: ReverseduInt16ToFloat32([req.body.holdingRegisters2[47],req.body.holdingRegisters2[48]]),
    Input_Mng_Ain1_Type_Sel: req.body.holdingRegisters2[55],
    //holding registers 200+
    

    Master_Ctrl_Mng_Rot_Type: req.body.holdingRegisters3[28],
    Master_Ctrl_Mng_Fan_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    Master_Ctrl_Mng_Fan_HRT_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[35],req.body.holdingRegisters3[36]]),
    Master_Ctrl_Mng_Fan_CRT_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[37],req.body.holdingRegisters3[38]]),
    Master_Ctrl_Mng_Comp_CRT_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[39],req.body.holdingRegisters3[40]]),
    Master_Ctrl_Mng_Comp_HRT_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[41],req.body.holdingRegisters3[42]]),
    EVD_Emb_1_Min_OpPosc: ReverseduInt16ToFloat32([req.body.holdingRegisters3[43],req.body.holdingRegisters3[44]]),
    AlarmMng_LP_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters3[45],req.body.holdingRegisters3[46]]),
    AlarmMng_LP_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[47],req.body.holdingRegisters3[48]]),
    AlarmMng_HP_Setp: ReverseduInt16ToFloat32([req.body.holdingRegisters3[49],req.body.holdingRegisters3[50]]),
    AlarmMng_HP_Diff: ReverseduInt16ToFloat32([req.body.holdingRegisters3[51],req.body.holdingRegisters3[52]]),

    //eev holding registers

/* 
    EVD_Emb_1_Params_EVDEMB_1_Superparameters_EEVtype_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_Superparameters_MainRegulation_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_Superparameters_AuxRegulationCom_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_GasTyp_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Configuration_GasTypAux_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_SH_Set_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_StartEEV_OpRatio_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_SH_WaitDT_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_StandByEEV_OpEn_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_StandByEEV_OpPos_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_CtrlRevTempSet_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_CtrlRevP_Set_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[33],req.body.holdingRegisters2[34]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_CtrlDirP_Set_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[71],req.body.holdingRegisters2[72]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_CtrlLiqdSet_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[73],req.body.holdingRegisters2[74]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_PID_Kp_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[75],req.body.holdingRegisters2[76]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_PID_Ti_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[77],req.body.holdingRegisters2[78]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_PID_Td_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[79],req.body.holdingRegisters2[80]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_LowSH_Thrsh_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[81],req.body.holdingRegisters2[82]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_LowSH_Ti_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[83],req.body.holdingRegisters2[84]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_LowSH_AlrmDT_Val: req.body.holdingRegisters2[85],
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_LOP_Thrsh_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[86],req.body.holdingRegisters2[87]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_LOP_Ti_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[88],req.body.holdingRegisters2[89]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_LOP_AlrmDT_Val: req.body.holdingRegisters2[90],
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_MOP_Thrsh_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[91],req.body.holdingRegisters2[92]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_MainRegulation_MOP_Ti_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[93],req.body.holdingRegisters2[94]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_MOP_AlrmDT_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[95],req.body.holdingRegisters2[96]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Manual_ManPositSteps_Val: req.body.holdingRegisters2[97],
    EVD_Emb_1_Params_EVDEMB_1_EVD_AuxRegulation_HiTempCondThrsh_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters2[98],req.body.holdingRegisters2[99]]),
 */
    /*200EVD_Emb_1_Params_EVDEMB_1_EVD_AuxRegulation_HiTempCondTi_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    202EVD_Emb_1_Params_EVDEMB_1_EVD_AuxRegulation_HiTempCondAlrmDT_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    203EVD_Emb_1_Params_EVDEMB_1_EVD_AuxRegulation_ModThermSet_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    205EVD_Emb_1_Params_EVDEMB_1_EVD_AuxRegulation_ModThermDiff_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    207EVD_Emb_1_Params_EVDEMB_1_EVD_AuxRegulation_ModThermSH_Offset_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    209EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_CO2_A_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    211EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_CO2_B_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    213EVD_Emb_1_Params_EVDEMB_1_EVD_SelfTuning_SelfTuningMethod_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    214EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_LowSuctAlrmThrsh_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    216EVD_Emb_1_Params_EVDEMB_1_EVD_Regulation_LowSuctAlrmDT_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    217EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_RegMinPos_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    218EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_RegMaxPos_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    219EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_FullClosSteps_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    220EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_MoveRate_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    221EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_FastClosMoveRate_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    222EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_MoveDuty_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    223EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_MoveCurr_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]),
    224EVD_Emb_1_Params_EVDEMB_1_EVD_EEV_Config_HoldCurr_Val: ReverseduInt16ToFloat32([req.body.holdingRegisters3[33],req.body.holdingRegisters3[34]]), */

    //INPUT REGISTERS
    Suct_Temp: uInt16ToFloat32([req.body.inputRegisters[0],req.body.inputRegisters[1]]),
    Evap_Inlet_Temp: uInt16ToFloat32([req.body.inputRegisters[2],req.body.inputRegisters[3]]),
    Cond_Outlet_Temp: uInt16ToFloat32([req.body.inputRegisters[4],req.body.inputRegisters[5]]),
    Hot_Supply_Temp: uInt16ToFloat32([req.body.inputRegisters[6],req.body.inputRegisters[7]]),
    Hot_Return_Temp: uInt16ToFloat32([req.body.inputRegisters[8],req.body.inputRegisters[9]]),
    Cold_Supply_Temp: uInt16ToFloat32([req.body.inputRegisters[10],req.body.inputRegisters[11]]),
    Cold_Return_Temp: uInt16ToFloat32([req.body.inputRegisters[12],req.body.inputRegisters[13]]),
    Hot_Tank_Temp1: uInt16ToFloat32([req.body.inputRegisters[14],req.body.inputRegisters[15]]),
    Hot_Tank_Temp2: uInt16ToFloat32([req.body.inputRegisters[16],req.body.inputRegisters[17]]),
    HP_Yout1_Act: uInt16ToFloat32([req.body.inputRegisters[18],req.body.inputRegisters[19]]),
    HP_Yout2_Act: uInt16ToFloat32([req.body.inputRegisters[20],req.body.inputRegisters[21]]),
    Disc_Temp: uInt16ToFloat32([req.body.inputRegisters[22],req.body.inputRegisters[23]]),
    Flow_Switch_Read_Cold_FlowS1: uInt16ToFloat32([req.body.inputRegisters[29],req.body.inputRegisters[30]]),
    Flow_Switch_Read_Hot_FlowS1: uInt16ToFloat32([req.body.inputRegisters[31],req.body.inputRegisters[32]]),
    Flow_Switch_Read_Hot_FlowS2: uInt16ToFloat32([req.body.inputRegisters[33],req.body.inputRegisters[34]]),
    ColdFlow_Senser_Al_Active: req.body.inputRegisters[35],
    HotFlow1_Senser_Al_Active: req.body.inputRegisters[36],
    HotFlow2_Senser_Al_Active: req.body.inputRegisters[37],

    
    Flow_Switch_ColdFS1_Feq: uInt16ToFloat32(req.body.inputRegisters[38]),
    Flow_Switch_ColdFS_Char: uInt16ToFloat32([req.body.inputRegisters[40],req.body.inputRegisters[41]]),
    Flow_Switch_HotFS1_Feq: uInt16ToFloat32(req.body.inputRegisters[42]),
    Flow_Switch_HotFS1_Char: uInt16ToFloat32([req.body.inputRegisters[44],req.body.inputRegisters[45]]),
    Flow_Switch_HotFS2_Feq: uInt16ToFloat32(req.body.inputRegisters[46]),
    Flow_Switch_HotFS2_Char: uInt16ToFloat32([req.body.inputRegisters[48],req.body.inputRegisters[49]]),


    Hot_Tank_Temp3: uInt16ToFloat32([req.body.inputRegisters[50],req.body.inputRegisters[51]]),
    Cold_Tank_Temp1: uInt16ToFloat32([req.body.inputRegisters[52],req.body.inputRegisters[53]]),
    Cold_Tank_Temp2: uInt16ToFloat32([req.body.inputRegisters[54],req.body.inputRegisters[55]]),
    Cold_Tank_Temp3: uInt16ToFloat32([req.body.inputRegisters[56],req.body.inputRegisters[57]]),
    Cold_SupToVlv_Temp: uInt16ToFloat32([req.body.inputRegisters[58],req.body.inputRegisters[59]]),
    Warm_ToBuild_Temp: uInt16ToFloat32([req.body.inputRegisters[60],req.body.inputRegisters[61]]),
    Warm_ReturnBuild_Temp: uInt16ToFloat32([req.body.inputRegisters[62],req.body.inputRegisters[63]]),
    Hot_SupToVlv_Temp: uInt16ToFloat32([req.body.inputRegisters[64],req.body.inputRegisters[65]]),

    // input registers 2
    Ele_Boost_Temp: uInt16ToFloat32([req.body.inputRegisters2[19],req.body.inputRegisters2[20]]),
    Heat_Exchange_Cold: uInt16ToFloat32([req.body.inputRegisters2[21],req.body.inputRegisters2[22]]),
    Heat_Exchange_Hot: uInt16ToFloat32([req.body.inputRegisters2[23],req.body.inputRegisters2[24]]),
    EVD_Emb_1_Params_EVDEMB_1_EVD_Variables_EEV_PosSteps_Val: req.body.inputRegisters2[25],
    EVD_Emb_1_Params_EVDEMB_1_EVD_Variables_EEV_PosPercent_Val: uInt16ToFloat32([req.body.inputRegisters2[26],req.body.inputRegisters2[27]]),
    CP_Yout1_Act: uInt16ToFloat32([req.body.inputRegisters2[56],req.body.inputRegisters2[57]]),
    CP_Yout2_Act: uInt16ToFloat32([req.body.inputRegisters2[58],req.body.inputRegisters2[59]]),
    Flow_Switch_ColdFS2_Char: uInt16ToFloat32([req.body.inputRegisters2[62],req.body.inputRegisters2[63]]),
    Low_Pressure: uInt16ToFloat32([req.body.inputRegisters2[64],req.body.inputRegisters2[65]]),
    High_Pressure: uInt16ToFloat32([req.body.inputRegisters2[66],req.body.inputRegisters2[67]])
  }

/*   var dataValues = Object.keys(LegioGuardDataObject);
  dataValues.forEach(element => {
    console.log(element);
  }); */

  var hardcodedIoTPool = 'Quantum'
  AlarmProcessor(req.params.deviceid,LegioGuardDataObject,hardcodedIoTPool);
  iotdb.collection(req.params.deviceid).insertOne(LegioGuardDataObject).then (function() {
  });
  
  iotdb.collection(req.params.deviceid + "raw").insertOne(req.body).then (function() {
  });

  res.send("o");
  res.end();

  //AlarmProcessor(req.params.deviceid,req.body,"jwalstab");
});

app.post("/testdevice/postdatafordevice/:deviceid", function (req, res) {
  testDataObect = {
    time: req.body.time,
    Random_Data_1: req.body.Random_Data_1,
    Random_Data_2: req.body.Random_Data_2,
    Random_Data_3: req.body.Random_Data_3,
  }
  iotdb.collection(req.params.deviceid).insertOne(testDataObect).then (function() {
    res.send("Recieved!");
  });
});

function uInt16ToFloat32(uint16array) {
  var buffer = new ArrayBuffer(4);
  var intView = new Uint16Array(buffer);
  var floatView = new Float32Array(buffer);

  intView[0] = uint16array[0];
  intView[1] = uint16array[1];

  //var realNumber = floatView[0].toFixed(2);
  var realNumber = Math.round(floatView[0] * 1e2 ) / 1e2;
  return realNumber;
}

function uInt16ToFloat32(uint16array) {
  var buffer = new ArrayBuffer(4);
  var intView = new Uint16Array(buffer);
  var floatView = new Float32Array(buffer);

  intView[0] = uint16array[0];
  intView[1] = uint16array[1];

  //var realNumber = floatView[0].toFixed(2);
  var realNumber = Math.round(floatView[0] * 1e2 ) / 1e2;
  return realNumber;
}

function ReverseduInt16ToFloat32(uint16array) {
  uint16array.reverse();
  var buffer = new ArrayBuffer(4);
  var intView = new Uint16Array(buffer);
  var floatView = new Float32Array(buffer);

  intView[0] = uint16array[0];
  intView[1] = uint16array[1];

  //var realNumber = floatView[0].toFixed(2);
  var realNumber = Math.round(floatView[0] * 1e2 ) / 1e2;
  return realNumber;
}