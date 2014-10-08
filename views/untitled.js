$(function(){
$('#fieldPhoto').fileupload({
dataType: 'json',
done: function(e, data){
$.each(data.result.files, function(index, file){
$('#fileUploads').append($('<div class="upload">' +
'<span class="glyphicon glyphicon-ok"></span>' +
'&nbsp;' + file.originalName + '</div>'));
});
}
});
});