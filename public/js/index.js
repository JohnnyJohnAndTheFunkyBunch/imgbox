/*
============ Initializing Annotator ============
*/
var annotator;
var annotations = []

function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

function addAnnotation(left, top, width, height, label) {
    var html = '<div class="entry">' +
        '<p class="line"><span class="boldme">Object: </span>' + label + '</p>' +
        '<p class="line"><span class="boldme">Corner: </span>' + left + 'x' + top + '</p>' +
        '<p class="line"><span class="boldme">Size: </span>' + width + 'x' + height + '</p>' +
        '</div>'
    $('#annotated_box').append(html);
}

function renderTask(task) {
    // Can be one of ['text', 'select', 'fixed']
    var inputMethod = getParameterByName("input");
    $("#bbox_annotator").empty()
    $("#annotated_box").empty().append("<h3>Annotations</h3>");
    // Initialize the bounding-box annotator.
    annotator = new BBoxAnnotator({
        url: task.params.attachment,
        input_method: "fixed",
        //input_method: "select",
        labels: task.objects_to_annotate,
        onchange: function(entries) {
            // Input the text area on change. Use "hidden" input tag unless debugging.
            // <input id="annotation_data" name="annotation_data" type="hidden" />
            // $("#annotation_data").val(JSON.stringify(entries))
            //$("#annotation_data").text(JSON.stringify(entries, null, "  "));
            $("#annotated_box").empty().append("<h3>Annotations</h3>");
            for (i = 0; i < entries.length; i++) {
                addAnnotation(entries[i].left, entries[i].top, entries[i].width, entries[i].height, entries[i].label);
            }
            annotations = entries;
            console.log(entries);
        },
        radio: $('input:radio:checked')
    });
    // Initialize the reset button.
    $("#reset_button").click(function(e) {
        annotator.clear_all();
    })
    $(document).keypress(function(e) {
        if (e.which == 114) { // r key press
            annotator.clear_all();
        }
    });
}

/*
============ Initializing Angular ============
*/

var current_task = {};
var current_index = 0;
var all_tasks = [];
var app = angular.module('myApp', []);

app.factory('socket', ['$rootScope', function($rootScope) {
    var socket = io.connect();

    return {
        on: function(eventName, callback) {
            socket.on(eventName, callback);
        },
        emit: function(eventName, data) {
            socket.emit(eventName, data);
        }
    };
}]);

app.controller('TaskController', function($scope, socket) {
    function load_task() {
        $scope.task_id = current_task._id;
        $scope.callback_url = current_task.callback_url;
        $scope.attachment = current_task.params.attachment;
        $scope.created_at = current_task.created_at;
        $scope.instruction = current_task.instruction;
        $scope.objects_to_annotate = current_task.params.objects_to_annotate;
        $scope.urgency = current_task.urgency;
        $scope.with_labels = current_task.params.with_labels;
        renderTask(current_task);
    }

/*
============ DOM Element Actions ============
*/

    $(document).keypress(function(e) {
        if (e.which == 13 || e.which == 32) { // enter or space
            e.preventDefault();
            //current_task = all_tasks[4];
            //$scope.$apply(load_task);
            current_task.annotations = annotations;
            socket.emit("task", current_task);
        } else if (e.which == 114) { // r key press
            socket.emit('reset', 'hello');
        } else if (e.which == 33) {
            socket.emit('reset', 'hello');
        }
    });

    $("#submit-btn").click(function(event) {
        event.preventDefault();
        current_task.annotations = annotations;
        socket.emit("task", current_task);
    });

    $("#most_important").click(function(event) {
        socket.emit("most_important");
    });

    $("#date_created").click(function(event) {
        socket.emit("date_created");
    });

    $("#submit_error").click(function(event) {
        console.log($("#error_message").val());
        socket.emit("error_msg", {
            'task': current_task,
            'error': $("#error_message").val()
        });
    });

    $scope.changeTask = function(index) {
        current_task = all_tasks[index];
        load_task();
    };

/*
============ WebSocket Controller ============
*/
    
    // On connection, just output on console
    socket.on('connect', function() {
        $scope.$apply(function() {
            console.log("Connected to WebSocket Server");
        });
    });

    // All messages or errors will be outputed in the message box
    socket.on('message', function(msg) {
        $scope.$apply(function() {
            var now = new Date();
            $scope.message = msg;
            var old_text = $("#output_message").text();
            $("#output_message").text(old_text + now + " - " + msg + "\n");
            $(document).ready(function(){
                $('#output_message').scrollTop($('#output_message')[0].scrollHeight);
            });
        });
    });

    // All tasks get sent to front end, and will load task 
    // (for scalability, do not send all tasks)
    socket.on('tasks', function(msg) {
        $scope.$apply(function() {
            all_tasks = msg.slice();
            if (all_tasks.length == 0) {
                $scope.task_id = '';
                $scope.callback_url = '';
                $scope.attachment = '';
                $scope.created_at = '';
                $scope.instruction = '';
                $scope.objects_to_annotate = '';
                $scope.urgency = '';
                $scope.with_labels = false;
                all_tasks = [];
                current_task = {};
                $scope.tasks = all_tasks;
                $("#bbox_annotator").empty().append("<h1>You're all done. You can go home now</h1>");
                $("#annotated_box").empty().append("<h3>Annotations</h3>");
            }
            current_task = msg[0];
            console.log(current_task);
            load_task();
            $scope.tasks = msg;
            console.log(msg);
        });
    });
});
