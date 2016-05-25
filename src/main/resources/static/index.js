$(function () {
    function ajax(request) {
        var userToken = /userToken=(\w+)/.exec(document.cookie)[1];
        if (!userToken) {
            var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            userToken = "";
            while (userToken.length < 64) {
                userToken += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            var expiryTime = new Date();
            expiryTime.setTime(expiryTime.getTime() + (120 * 24 * 60 * 60 * 1000)); // 4 months
            document.cookie = "userToken=" + userToken + "; expires=" + expiryTime.toUTCString();
        }

        var oldBeforeSend = request.beforeSend;
        request.beforeSend = function (xhr) {
            xhr.setRequestHeader("X-User-Token", userToken);
            if (oldBeforeSend) {
                oldBeforeSend(xhr);
            }
        };
        return $.ajax(request);
    }

    function showDialog(title, message) {
        var dialog = $("#dialog-message");
        dialog.attr("title", title);
        dialog.text(message);
        dialog.dialog({
            modal: true,
            buttons: {
                Ok: function () {
                    $(this).dialog("close");
                }
            }
        });
    }

    function handleError(xhr, status, msg) {
        var message = msg;
        //noinspection JSUnresolvedVariable
        if (xhr.responseJSON && xhr.responseJSON.message) {
            //noinspection JSUnresolvedVariable
            message = xhr.responseJSON.message;
        }
        showDialog("Error", message);
    }

    var codeEditor = ace.edit("code-editor");
    codeEditor.getSession().setMode("ace/mode/java");
    var resultEditor = ace.edit("result-editor");
    resultEditor.getSession().setMode("ace/mode/java");
    resultEditor.setReadOnly(true);

    function setEditorValue(editor, value) {
        var selection = editor.selection.getRange();
        editor.setValue(value);
        editor.selection.setRange(selection);
    }

    var currentPaste = null;

    function displayPaste(paste) {
        currentPaste = paste;
        if (paste.id == "default") {
            delete window.location.hash;
        } else {
            window.location.hash = paste.id;
        }

        setEditorValue(codeEditor, paste.input.code);
        setEditorValue(resultEditor, paste.output.javap || "");
    }

    ajax({
        method: "GET",
        url: "/api/paste/" + (window.location.hash || "#default").substr(1)
    }).then(function (data) {
        displayPaste(data)
    }, handleError);

    $("#compile").click(function () {
        $("body").addClass("compiling");
        ajax({
            method: currentPaste.editable ? "PUT" : "POST",
            url: "/api/paste" + (currentPaste.editable ? "/" + currentPaste.id : ""),
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({
                input: {
                    code: codeEditor.getValue()
                }
            })
        }).then(function (data) {
            displayPaste(data);
        }, handleError).always(function () {
            $("body").removeClass("compiling");
        });
    });
});