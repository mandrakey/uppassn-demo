/**
 * @brief UPPASSN demonstration.
 * This file is intended to be used for demonstration purposes on the 
 * Facebook timeline page with GreaseMonkey and Firefox OR for use 
 * with the attached "index.html" demo file.
 * @package de.hu-berlin.uppassn
 * @version 1.0
 * @author Maurice Bleuel <maurice.bleuel@student.hu-berlin.de>
 */

//==============================================================================
// CONSTANTS

const _UP_BUTTONSTATE_ACTIVE = 0;
const _UP_BUTTONSTATE_INACTIVE = 1;

//==============================================================================
// GLOBALS

_UP_INITIALIZED = false;
_UP_SUBMIT_BUTTON = null;
_UP_INPUT_FIELD = null;

//==============================================================================
// FUNCTIONS

/**
 * @brief Initialize the UPPASSN demonstration.
 * Should work on Facebook.
 */
function UP_init()
{
    if (_UP_INITIALIZED) {
        return;
    }
    
    UP_getSentText();
    var button = _UP_SUBMIT_BUTTON = UP_findSubmitButton();
    var textarea = _UP_INPUT_FIELD = UP_findTextArea(button);
    UP_setSubmitButtonState(button, _UP_BUTTONSTATE_INACTIVE);
}

/**
 * @brief Locate the "Submit" button on the current page.
 * @return HTML_Element
 */
function UP_findSubmitButton()
{
    var btns = document.getElementsByTagName("button");
    for (var i = 0; i < btns.length; ++i) {
        // todo: Change fixed string to variable ...
        if (btns[i].innerHTML == "Posten") {
            return btns[i];
        }
    }
    
    return null;
}

/**
 * @brief Locate the textarea containing the status message text for button.
 * @param button The HTML element reference to the submit button.
 * @return HTML_Element
 */
function UP_findTextArea(button)
{
    if (typeof(button) != "object") {
        throw "Illegal button object reference";
    }
    
    textareas = button.form.getElementsByTagName("textarea");
    for (var i = 0; i < textareas.length; ++i) {
        if (textareas[i].hasAttribute("aria-label") 
                && textareas[i].getAttribute("aria-label") == "Was machst du gerade?") {
            // GOTCHA!
            return textareas[i];
        }
    }
    
    return null;
}

/**
 * @brief Set the submit button state.
 * Either activates the submit button, allowing standard Facebook behaviour, or 
 * deactivates the button (runs UPPASSN script handlers).
 * @param button Reference to the button HTML object
 * @param state The state to set the button to. Must be one of
 * - _UP_BUTTONSTATE_ACTIVE
 * - _UP_BUTTONSTATE_INACTIVE
 */
function UP_setSubmitButtonState(button, state)
{
    if ([_UP_BUTTONSTATE_ACTIVE, _UP_BUTTONSTATE_INACTIVE].indexOf(state) == -1) {
        throw "Illegal button state '" + state + "'";
    }
    
    switch (state) {
    case _UP_BUTTONSTATE_INACTIVE:
        button.type = "button";
        button.onclick = UP_submitButtonHandler;
        break;
    case _UP_BUTTONSTATE_ACTIVE:
    default:
        button.type = "submit";
        button.onclick = null;
    }
}

/**
 * @brief Replacement submit button action.
 * Checks entered text againt _BADWORDS "database" (see at end of script file). 
 * If a bad word is found, the user is asked wether to continue or not. If 
 * no bad word was found or the user chooses to ignore the warning, the 
 * submit button is reactivated and it's action executed.
 * @param event Event object. Unused.
 */
function UP_submitButtonHandler(event)
{
    text = _UP_INPUT_FIELD.value.toLowerCase();
    for (var i = 0; i < _BADWORDS.length; ++i) {
        if (text.indexOf(_BADWORDS[i]) > -1) {
            var post = confirm("ACHTUNG\n\nDu hast das Wort '" + _BADWORDS[i]
                + "' verwendet. Bist du dir sicher, dass du diesen Text so "
                + "absenden möchtest?");
            
            if (!post) {
                return;
            }
        }
    }
    
    UP_setSubmitButtonState(_UP_SUBMIT_BUTTON, _UP_BUTTONSTATE_ACTIVE);
    _UP_SUBMIT_BUTTON.click();
}

/**
 * @brief Extract possible sent text from URI string.
 * Will only work for empty hostname (=> file needs to be opened directly).
 */
function UP_getSentText()
{
    if (document.location.search.length == 0
            || document.location.hostname != "") {
        return;
    }
    
    var paramString = document.location.search.substr(1);
    var parts = paramString.split("&");
    var params = {};
    
    for (var i = 0; i < parts.length; ++i) {
        var tmp = parts[i].split("=");
        params[tmp[0]] = tmp[1];
    }
    
    if (typeof(params["text"]) == "string" && params["text"] != "") {
        var div = document.getElementById("sentText");
        div.innerHTML = params["text"];
    }
}

//==============================================================================
// AUTOSTART UPPASSN

setTimeout("UP_init();", 500);

//==============================================================================
// BAD WORDS DICTIONARY

_BADWORDS = [
"dumm",
"scheiße",
"saufen",
"besoffen",
"nackt",
"porno"
];
