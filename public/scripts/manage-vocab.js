$(".view-btn").click(event => {
    $("body").append("<div id='popup-window'><div id='top-stripe'><p id='close-popup'>&#10005;</p></div>" + 
    "<div id='window-words'><div id='word-spinner' class='spinner-border text-dark' role='status'><span class='sr-only'>Loading...</span></div></div></div>");
    
    let exId = event.originalEvent.toElement.value;

    $("#window-cover").css("display", "unset");
    $("#popup-window").css("display", "unset");

    let exerciseId = { id: exId };

    $.ajax({
        url: "/enterprise/exercises/vocab/get-words",
        method: "GET",
        data: exerciseId,
        success: function(data){
            let wordList = data.words;

            let table = '<h2>WORD LIST</h2><table class="table table-striped"><thead><tr><th scope="col">#</th><th scope="col">Word</th><th scope="col">Translation</th><th scope="col">Example Sentence</th></tr></thead><tbody>';

            for(let i=0; i<wordList.length; i++) {
                table = table + "<tr><td>" + eval(i+1) + "</td><td>" + wordList[i].wordEnglish + "</td><td>" + wordList[i].wordForeign + "</td><td>" + wordList[i].exSentenceForeign + "</td></tr>";
            }

            table.concat("</tbody></table>");

            $("#word-spinner").remove();
            $("#window-words").css("justify-content", "unset");
            $("#window-words").append(table);
        }
    });

    $("#top-stripe").click(() => {
        document.getElementById("popup-window").animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], 300);
        setTimeout(() => { $("#popup-window").remove(); $("#window-cover").css("display", "none"); }, 300);
    })
});

$(".add-btn").click(event => {
    let wordCount = 0;
    let exId = event.originalEvent.toElement.value;

    $("body").append("<div id='popup-window'><div id='top-stripe'><p id='close-popup'>&#10005;</p></div>" + 
    "<div id='window-words'><p id='word-counter'>" + wordCount + " new words added</p><h2>ADD A NEW WORD</h2><form id='add-word-form'><div class='form-row'><div class='form-group col-md-6'><label for='wordEng'>Word in English <span style='color: #8F0C0C'>&#8727;</span></label><input type='text' class='form-control' name='wordEng' id='wordEng' required></div><div class='form-group col-md-6'><label for='wordForeign'>Translation <span style='color: #8F0C0C'>&#8727;</span></label><input type='text' class='form-control' name='wordForeign' id='wordForeign' required></div></div><div class='form-row'><div class='form-group col-md-12'><label for='exSentEng'>Example Sentence in English <span style='color: #8F0C0C'>&#8727;</span></label><textarea class='form-control' row='1' name='exSentEng' id='exSentEng' required></textarea></div></div><div class='form-row'><div class='form-group col-md-12'><label for='exSentForeign'>Translated Example Sentence <span style='color: #8F0C0C'>&#8727;</span></label><textarea class='form-control' row='1' name='exSentForeign' id='exSentForeign' required></textarea></div></div><button type='button' id='submit-word-button' class='btn btn-success'>Save</button></form></div>");
    
    $("#window-words").css("justify-content", "flex-start");
    $("#window-cover").css("display", "unset");
    $("#popup-window").css("display", "unset");

    $("#top-stripe").click(() => {
        closePopup();
    });

    $("#submit-word-button").click(() => {
        $("#window-words").append("<div id='adding-spinner' class='spinner-border text-dark' style='margin-top: 1rem;' role='status'><span class='sr-only'>Loading...</span></div>");

        let newAddedWord = {
            wordEng: $("#wordEng").val(),
            wordFor: $("#wordForeign").val(),
            exSentEng: $("#exSentEng").val(),
            exSentForeign: $("#exSentForeign").val(),
            vocabExId: exId
        };

        if(newAddedWord.wordEng == "" || newAddedWord.wordFor == "" || newAddedWord.exSentEng == "" || newAddedWord.exSentForeign == "") {
            $("#adding-spinner").remove();
            alert("Please fill in all the fields to add a new word!");
        } else {
            $.ajax({
                url: "/enterprise/exercises/vocab/add-word",
                method: "GET",
                data: newAddedWord,
                success: data => {
                    let success = data.success;
                    
                    if(success) {
                        document.getElementById("add-word-form").reset();
                        $("#adding-spinner").remove();
    
                        wordCount++;
                        if(wordCount==1) {
                            $("#word-counter").text(wordCount + " new word added");
                        } else {
                            $("#word-counter").text(wordCount + " new words added");
                        }
                    }
                }
            });
        }
    }); 
});

$("#window-cover").click(() => {
    closePopup();
})

$(".edit-btn").click(event => {
    let exId = event.originalEvent.toElement.value;

    $("body").append("<div id='popup-window' style='width: 80%; left: 10%;'><div id='top-stripe'><p id='close-popup'>&#10005;</p></div>" + 
    "<div id='window-words'><div id='word-spinner' class='spinner-border text-dark' role='status'><span class='sr-only'>Loading...</span></div></div></div>");
    
    $("#window-cover").css("display", "unset");
    $("#popup-window").css("display", "unset");

    let exerciseId = { id: exId };

    $.ajax({
        url: "/enterprise/exercises/vocab/get-words",
        method: "GET",
        data: exerciseId,
        success: function(data){
            let wordList = data.words;

            let table = '<h2>WORD LIST</h2><table class="table table-striped"><thead><tr><th style="width: 15%;" scope="col">Word</th><th style="width: 15%;" scope="col">Translation</th><th scope="col">Example Sentence</th><th scope="col">Sentence Translation</th><th scope="col"> </th><th scope="col"> </th></tr></thead><tbody>';

            for(let i=0; i<wordList.length; i++) {
                table = table + "<tr><td><input type='text' class='engEdit form-control' value='" + wordList[i].wordEnglish.replace(/\'/g, "&apos;") + "'></td><td><input type='text' class='foreignEdit form-control' value='" + wordList[i].wordForeign.replace(/\'/g, "&apos;") + "'></td><td><input type='text' class='engSentEdit form-control' value='" + wordList[i].exSentenceEng.replace(/\'/g, "&apos;") + "'></td><td><input type='text' class='forSentEdit form-control' value='" + wordList[i].exSentenceForeign.replace(/\'/g, "&apos;") + "'></td><td><input type='hidden' class='id-word-edit' value='" + wordList[i].id + "'><button type='button' id='" + "update-word-" + i + "' class='btn btn-success save-word-edit'>Save</button></td><td><img src='/media/icons/trash.png' id='remove-word-" + i + "' alt='Bin' class='remove-word' value='" + wordList[i].id + "'></td></tr>";
            }

            table.concat("</tbody></table>");

            $("#word-spinner").remove();
            $("#window-words").css("justify-content", "unset");
            $("#window-words").append(table);

            // This function removes a word from the database and from the table
            $(".remove-word").click(event => {
                $("#" + event.target.getAttribute("id")).parent().append("<div id='update-word-spinner' class='spinner-border text-dark' role='status'><span class='sr-only'>Loading...</span></div>");

                let exId = event.target.getAttribute("value");
                let row = event.target.parentElement.parentElement;
                let exerciseId = { id: exId };

                $.ajax({
                    url: "/enterprise/exercises/vocab/remove-word",
                    method: "GET",
                    data: exerciseId,
                    success: function(data){
                        row.remove();
                    }
                });
            })

            // This function updates a word in the database and in the table
            $(".save-word-edit").click(event => {
                
                let ourButton = event.currentTarget.id;
                let formColumns = $("#" + ourButton).parent().closest("tr").children();

                $("#" + ourButton).parent().append("<div id='update-word-spinner' class='spinner-border text-dark' role='status'><span class='sr-only'>Loading...</span></div>");

                const wordUpdate = {
                    wordId: formColumns[4].childNodes[0].value,
                    wordEng: formColumns[0].childNodes[0].value,
                    wordForeign: formColumns[1].childNodes[0].value,
                    sentEng: formColumns[2].childNodes[0].value,
                    sentFor: formColumns[3].childNodes[0].value
                };

                if(wordUpdate.wordEng == "" || wordUpdate.wordForeign == "" || wordUpdate.sentEng == "" || wordUpdate.sentFor == "") {
                    $(".spinner-border").remove();
                    alert("Please fill in all the fields of the word.");
                } else {
                    $.ajax({
                        url: "/enterprise/exercises/vocab/update-word",
                        method: "GET",
                        data: wordUpdate,
                        success: function(data){
                            $(".spinner-border").remove();
                        }
                    });
                }
            })
        }
    });

    $("#top-stripe").click(() => {
        document.getElementById("popup-window").animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], 300);
        setTimeout(() => { $("#popup-window").remove(); $("#window-cover").css("display", "none"); }, 300);
    })
});

const closePopup = () => {
    document.getElementById("popup-window").animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], 300);
    setTimeout(() => { $("#popup-window").remove(); $("#window-cover").css("display", "none"); }, 300);
};

const getCompanyName = () => {
    $.ajax({
        url: "/enterprise/current-company-name",
        method: "GET",
        data: null,
        success: function(data){
            $("#bar-company-name").html(data.name);
        }
    });
};

getCompanyName();

const disableEx = event => {
    $.ajax({
        url: "/enterprise/disable-vocab-ex",
        method: "GET",
        data: { id: event.target.value },
        success: () => {
            event.target.parentNode.parentNode.classList.toggle("disabled-row");
            let newButton = document.createElement("button");
            newButton.classList = "btn btn-success enable-ex";
            newButton.value = event.target.value;
            newButton.innerHTML = "Enable";
            event.target.parentNode.appendChild(newButton);
            event.target.remove();

            $(".enable-ex").click(enableEx);
        }
    });
};

const enableEx = event => {
    $.ajax({
        url: "/enterprise/enable-vocab-ex",
        method: "GET",
        data: { id: event.target.value },
        success: () => {
            event.target.parentNode.parentNode.classList.remove("disabled-row");
            let newButton = document.createElement("button");
            newButton.classList = "btn btn-warning disable-ex";
            newButton.value = event.target.value;
            newButton.innerHTML = "Disable";
            event.target.parentNode.appendChild(newButton);
            event.target.remove();

            $(".disable-ex").click(disableEx);
        }
    });
};

$(".disable-ex").click(disableEx);
$(".enable-ex").click(enableEx);