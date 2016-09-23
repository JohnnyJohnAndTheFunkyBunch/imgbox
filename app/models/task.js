var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var TaskSchema   = new Schema({
    created_at: Date,
    completed_at: Date,
    callback_url: String,
    status: String,
    instruction: String,
    with_labels: Boolean,
    urgency: String,
    attachment: String,
    attachment_type: String,
    objects_to_annotate: [String],
    api_key: String,
    response: {annotations: [{left: Number, top: Number, width: Number, height: Number, label: String}]}
});

module.exports = mongoose.model('Task', TaskSchema);
