var isAdvancedUpload = function () {
	var div = document.createElement('div');
	return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
}();

var $form = $('#form'),
	$box = $('.box'),
	$input = $box.find('input[type="file"]'),
	$label = $box.find('label'),
	showFiles = function (files) {
		$label.text(files.length > 1 ? ($input.attr('data-multiple-caption') || '').replace('{count}', files.length) : files[0].name);
	};

var $errorMsg = $('#error_msg');
var $downloadLink = $('#download_link');
var $uploadProgress = $('#upload_progress');

if (isAdvancedUpload) {
	$box.addClass('has-advanced-upload');

	var droppedFiles = false;

	$box
		.on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
			e.preventDefault();
			e.stopPropagation();
		})
		.on('dragover dragenter', function () {
			$box.addClass('is-dragover');
		})
		.on('dragleave dragend drop', function () {
			$box.removeClass('is-dragover');
		})
		.on('drop', function (e) {
			droppedFiles = e.originalEvent.dataTransfer.files; // the files that were dropped
			showFiles(droppedFiles);
		});
	$input.on('change', function (e) {
		showFiles(e.target.files);
	});
}

$form.on('submit', function (e) {
	if ($box.hasClass('is-uploading')) return false;

	$box.addClass('is-uploading').removeClass('is-error');

	if (isAdvancedUpload) {
		e.preventDefault();

		var ajaxData = new FormData($form.get(0));

		if (droppedFiles) {
			$.each(droppedFiles, function (i, file) {
				ajaxData.append($input.attr('name'), file);
			});
		}

		$.ajax({
			url: $form.attr('action'),
			type: $form.attr('method'),
			data: ajaxData,
			dataType: 'json',
			cache: false,
			contentType: false,
			processData: false,
			xhr: function () {
				var myXhr = $.ajaxSettings.xhr();
				// Compute upload progress
				if (myXhr.upload) {
					myXhr.upload.addEventListener('progress', function (e) {
						if (e.lengthComputable) {
							var percentage = e.loaded / e.total * 100;
							$uploadProgress.text(Math.round(percentage));
						}
					});
				}
				return myXhr;
			},
			complete: function () {
				$box.removeClass('is-uploading');
			},
			success: function (data) {
				$box.addClass(data.success == true ? 'is-success' : 'is-error');
				if (data.success) {
					$downloadLink.attr('href', data.link);
					$downloadLink.text(data.link);
				} else {
					$errorMsg.text(data.error);
				}
			},
			error: function (xhr) {
				$box.addClass('is-error');
				$errorMsg.text(xhr.responseJSON.error || 'Unexpected error, try again later');
			}
		});
	} else {
		var iframeName = 'uploadiframe' + new Date().getTime();
		$iframe = $('<iframe name="' + iframeName + '" style="display: none;"></iframe>');

		$('body').append($iframe);
		$form.attr('target', iframeName);

		$iframe.one('load', function () {
			var data = JSON.parse($iframe.contents().find('body').text());
			$box
				.removeClass('is-uploading')
				.addClass(data.success == true ? 'is-success' : 'is-error')
			$form.removeAttr('target');
			if (!data.success) $errorMsg.text(data.error);
			$form.removeAttr('target');
			$iframe.remove();
		});
	}
});