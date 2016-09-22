// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var auth = require('http-auth');

var basic = auth.basic({
    realm: 'SUPER SECRET STUFF'
}, function(username, password, callback) {
    callback(username == 'APIKEY');
});

var authMiddleware = auth.connect(basic);

var mongoose   = require('mongoose');
mongoose.connect('mongodb://localhost:27017/imgbox');

var Task= require('./app/models/task');

// Before any of the relevant routes...

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// Front End

app.get('/', function(req, res){
  Task.find({}, function(err, tasks) {
    res.sendfile('index.html');
  });
});

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.post('/annotate', authMiddleware, function(req, res) {
    // create database entry
    console.log(req);
    var task = new Task();
    task.instruction = req.body.instruction;
    task.attachment = req.body.attachment;
    task.attachment_type = req.body.attachment_type;
    task.objects_to_annotate = req.body.objects_to_annotate;
    task.with_labels = req.body.with_labels;
    task.urgency = "day";
    if (req.body.urgency)
        task.urgency = req.body.urgency;
    task.callback_url = req.body.callback_url;
    task.created_at = new Date();
    task.api_key = req.user;

    task.save(function(err) {
        if (err)
            res.send(err);
        
        var jsonResponse = {};
        jsonResponse.task_id = task.id;
        jsonResponse.created_at = task.created_at;
        jsonResponse.callback_url = task.callback_url;
        jsonResponse.type = "image_annotation";
        jsonResponse.status = "pending";
        jsonResponse.instruction = task.instruction;
        jsonResponse.urgency = task.urgency;
        var params = {};
        params.attachment = task.attachment;
        params.attachment_type = task.attachment_type;
        params.objects_to_annotate = task.objects_to_annotate;
        params.with_labels = task.with_labels;
        jsonResponse.params = params;
        
        res.json(jsonResponse);
    });
});

////////// WEB SOCKET ///////////////


io.on('connection', function(socket){
  console.log("someone connected");
  Task.find({}, function(err, users) {
    if (err) throw err;
    io.emit("task", users[0]);
    io.emit("tasks", users);
  });
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api/task', router);

app.use(express.static('public'));

// START THE SERVER
// =============================================================================
http.listen(port);
console.log('Magic happens on port ' + port);
