// ==UserScript==
// @name        UPPASSN
// @namespace   de.hu-berlin.smuks.uppassn
// @description 
// @include     
// @exclude     
// @version     1
// @grant       none
// ==/UserScript==

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
unsafeWindow.UP_init = function()
{
    if (_UP_INITIALIZED) {
        return;
    }
    
    var button = _UP_SUBMIT_BUTTON = UP_findSubmitButton();
    if (button == null) {
        console.log("UP_init postponed.");
        return;
    }
    var textarea = _UP_INPUT_FIELD = UP_findTextArea(button);
    UP_setSubmitButtonState(button, _UP_BUTTONSTATE_INACTIVE);
    console.log("UP_init ok");
}

/**
 * @brief Locate the "Submit" button on the current page.
 * @return HTML_Element
 */
unsafeWindow.UP_findSubmitButton = function()
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
unsafeWindow.UP_findTextArea = function(button)
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
unsafeWindow.UP_setSubmitButtonState = function(button, state)
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
unsafeWindow.UP_submitButtonHandler = function(event)
{
    text = _UP_INPUT_FIELD.value.toLowerCase();
    var badword = UP_containsBadWords(text);
    if (badword != null) {
        UP_displayMessage("Du hast das Wort <strong>" + badword + "</strong> "
            + "verwendet. Bist du dir sicher, dass du diesen Text so absenden "
            + "möchtest?");
        return;
    }
    
    // Commented for Facebook-test: If data shall be sent, no real sending!
    /*UP_setSubmitButtonState(_UP_SUBMIT_BUTTON, _UP_BUTTONSTATE_ACTIVE);
    _UP_SUBMIT_BUTTON.click();*/
    alert("The text now would have been sent.");
    _UP_INPUT_FIELD.value = "";
}

/**
 * @brief Extract possible sent text from URI string.
 * Will only work for empty hostname (=> file needs to be opened directly).
 */
unsafeWindow.UP_getSentText = function()
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

unsafeWindow.UP_containsBadWords = function(text)
{
    if (typeof(text) != "string" || text == "") {
        return null;
    }
    
    for (var i = 0; i < _BADWORDS.length; ++i) {
        // Check for exact match
        if (text.indexOf(_BADWORDS[i]) > -1) {
            return _BADWORDS[i];
        }
        
        // Replace special chars, search again
        var word = _BADWORDS[i].replace("ä", "ae");
        word = word.replace("ö", "oe");
        word = word.replace("ü", "ue");
        word = word.replace("ß", "ss");
        word = word.replace("_", " ");
        if (text.indexOf(word) > -1) {
            return _BADWORDS[i];
        }
        
        word = word.replace(" ", "");
        if (text.indexOf(word) > -1) {
            return _BADWORDS[i];
        }
        
        // Find similar words using edit-distance
        var tmp = text.split(" ");
        for (var j = 0; j < tmp.length; ++j) {
            if (Math.abs(tmp[j].length - _BADWORDS[i].length) > 2) {
                continue;
            }
            
            if (UP_wordDifference(tmp[j], _BADWORDS[i]) < 2) {
                return _BADWORDS[i];
            }
        }
    }
    
    return null;
}

unsafeWindow.UP_displayMessage = function(text)
{
    var html = '<div style="display: hidden; position: fixed; top: 0; bottom: 0; left: 0; right: 0; background: rgba(0, 0, 0, 0.4); z-index: 500;">\n'
        + '<div style="position: absolute; top: 25%; left: 25%; right: 25%; background: #fff; box-shadow: 0px 2px 26px rgba(0, 0, 0, 0.3), 0px 0px 0px 1px rgba(0, 0, 0, 0.1);">\n'
        + '    <div style="background: #F5F6F7; color: #4E5665; font-size: 12pt; font-weight: bold; padding: 10px 12px 10px 12px; border-bottom: 1px solid #e5e5e5;">\n'
        + '        Das möchtest Du vielleicht nicht veröffentlichen ...\n'
        + '    </div>\n'
        + '    <div id="UP_messageContent" style="padding: 12px; font-size: 14px; color: #4E5665; background: #fff;">\n'
        + '        '+text+'\n'
        + '    </div>\n'
        + '    <div style="background: #fff; border-top: 1px solid #DADCE0; font-size: 10pt; padding: 12px 0 12px 0; margin: 0 12px 0 12px;">\n'
        + '        powered by <a href="#" style="color: #6D84B4; text-decoration: none;">UPPASSN</a>\n'
        + '        <div style="float: right;">\n'
        + '            <button style="background: #4E69A2; color: #fff; font-weight: bold; font-size: 12px; border: 1px solid #3C5488; padding: 0 8px 0 8px; line-height: 22px; border-radius: 2px; cursor: pointer;" onclick="UP_hideMessage();">Überarbeiten</button>\n'
        + '            <button style="background: #fff; color: #000; font-weight: bold; font-size: 12px; border: 1px solid #B6B7B9; padding: 0 8px 0 8px; line-height: 22px; border-radius: 2px; cursor: pointer;" onclick="UP_sendAnyway();">Senden</button>\n'
        + '        </div>\n'
        + '    </div>\n'
        + '</div>\n'
        + '</div>\n\n';
    
    var elem = document.createElement("div");
    elem.id = "UP_message";
    elem.innerHTML = html;
    document.body.appendChild(elem);
}

unsafeWindow.UP_hideMessage = function()
{
    document.getElementById("UP_message").remove();
}

unsafeWindow.UP_sendAnyway = function()
{
    UP_hideMessage();
    alert("Message would be sent now.");
}

/**
 * @brief Calculate the difference between two words.
 * This means NOT the levenshtein distance but simply how many characters are 
 * different. If one argument is no string, empty or equal the other the 
 * algorithm returns 0.
 * @param s First string to compare
 * @param t Second string to compare
 * @return Number of differenct characters
 */
unsafeWindow.UP_wordDifference = function(s, t)
{
    if (typeof(s) != "string" || s == "") {
        return t.length;
    }
    if (typeof(t) != "string" || t == "") {
        return s.length;
    }
    if (s == t) {
        return 0;
    }
    
    short = (s.length < t.length) ? s.toLowerCase() : t.toLowerCase();
    long = (s.length >= t.length) ? s.toLowerCase() : t.toLowerCase();
    
    var diff = 0;
    for (var i = 0, j = 0; i < short.length, j < long.length; ++i, ++j) {
        while(short[i] != long[j] && j < long.length) {
            ++diff;
            ++j;
        }
    }
    
    return diff;
}

/**
 * @brief Calculate the levenshtein distance between two words.
 * If one argument is no string, empty or equal the other the algorithm 
 * returns 0. This is a optimized version of the algorithm - references:
 * - https://en.wikipedia.org/wiki/Levenshtein_distance#Iterative_with_two_matrix_rows: 
 * Pseudocode implementation
 * - http://www.codeproject.com/Articles/13525/Fast-memory-efficient-Levenshtein-algorithm: 
 * Original article by Sten Hjelmqvist
 * @param s First string to compare
 * @param t Second string to compare
 * @return Number of differenct characters
 */
unsafeWindow.UP_levenshteinDistance = function(s, t)
{
    if (typeof(s) != "string" || s == "") {
        return t.length;
    }
    if (typeof(t) != "string" || t == "") {
        return s.length;
    }
    if (s == t) {
        return 0;
    }
    
    var v0 = [];
    var v1 = [];
    
    // init v0
    for (var i = 0; i <= t.length; ++i) {
        v0[i] = i;
    }
    
    // calculate v1
    for (var i = 0; i < s.length; ++i) {
        v1[0] = i + 1;
        
        for (var j = 0; j < t.length; ++j) {
            var cost = (s[i] == t[i]) ? 0 : 1;
            v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
        }
        
        for (var j = 0; j < v0.length; ++j) {
            v0[j] = v1[j];
        }
    }
    
    return v1[t.length];
}

//==============================================================================
// AUTOSTART UPPASSN

setTimeout("UP_init();", 500);

//==============================================================================
// BAD WORDS DICTIONARY
// Source: http://forum.chip.de/programmierung-allgemein/badwordliste-fuer-gaestebuch-1119380.html#post6739239

_BADWORDS = [
"dumm",
"scheiße",
"saufen",
"besoffen",
"nackt",
"porno",
"analdrilling",
"offer",
"offers",
"cheap",
"buy",
"tramadol",
"20six",
"ndsfrwudG",
"Tadalafil",
"hosting",
"avacor",
"gation",
"ruptcy",
"obli",
"morta",
"remoV",
"fffd5",
"ffffd5",
"Wavefrt",
"Cialis",
"eyebrow-upper-left-corner",
"B0000AZJVC",
"right-topnav-default-2",
"edit1",
"display-variation",
"erection",
"wvvvvv",
"mpage.jp",
"20six.de",
"o o o o o o o o o o o o o",
"aasgeier",
"abspritzer",
"sdfds",
"ackerfresse",
"affenarsch",
"affenhirn",
"affenkotze",
"afterlecker",
"aktivex.info",
"almosenarsch",
"amazing",
"am-sperma-riecher",
"anal*",
"analadmiral",
"analbesamer",
"analbohrer",
"analdrill",
"analentjungferer",
"analerotiker",
"analfetischist",
"analförster",
"anal-frosch",
"analnegerdildo",
"analratte",
"analritter",
"aok-chopper",
"armleuchter",
"arsch",
"arschaufreißer",
"arschbackenschänder",
"arschbesamer",
"ärsche",
"arschentjungferer",
"arschficker",
"arschgeburt",
"arschgefickte gummifotze",
"arschgeige",
"arschgesicht",
"arschhaarfetischist",
"arschhaarrasierer",
"arschhöhlenforscher",
"arschkrampe",
"arschkratzer",
"arschlecker",
"arschloch",
"arschlöcher",
"arschmade",
"arschratte",
"arschzapfen",
"arsebandit",
"arsehole",
"arsejockey",
"arselicker",
"arsenuts",
"arsewipe",
"assel",
"assfuck",
"assfucking",
"assgrabber",
"asshol",
"asshole",
"asshole",
"assi",
"assrammer",
"assreamer",
"asswipe",
"astlochficker",
"auspufflutscher",
"bad motherfucker",
"badass",
"badenutte",
"bananenstecker",
"bastard",
"bastard",
"bauernschlampe",
"beating the meat",
"beef curtains",
"beef flaps",
"behindis",
"bekloppter",
"muttergeficktes",
"beklopter",
"bettnässer",
"******er",
"******er",
"bettpisser",
"bettspaltenficker",
"biatch",
"bimbo",
"bitch",
"bitches",
"bitchnutte",
"bitsch",
"bizzach",
"blechfotze",
"blödmann",
"blogspoint",
"blow job",
"bohnenfresser",
"boob",
"boobes",
"boobie",
"boobies",
"boobs",
"booby",
"boy love",
"breasts",
"brechfurz",
"bückfleisch",
"bückstück",
"bückvieh",
"buggery",
"bullensohn",
"bullshit",
"bummsen",
"bumsen",
"bumsklumpen",
"buschnutte",
"busty",
"butt pirate",
"buttfuc",
"buttfuck",
"buttfucker",
"buttfucking",
"carpet muncher",
"carpet munchers",
"carpetlicker",
"carpetlickers",
"chausohn",
"clitsuck",
"clitsucker",
"clitsucking",
"cock",
"cock sucker",
"cockpouch",
"cracka",
"crap",
"craper",
"crapers",
"crapping",
"craps",
"cunt",
"cunt",
"cunts",
"dachlattengesicht",
"dackelficker",
"dickhead",
"dicklicker",
"diplomarschloch",
"doofi",
"douglette",
"drecksack",
"drecksau",
"dreckschlitz",
"dreckschüppengesicht",
"drecksfotze",
"drecksmösendagmar",
"drecksnigger",
"drecksnutte",
"dreckspack",
"dreckstürke",
"dreckvotze",
"dumbo",
"dummschwätzer",
"dumpfbacke",
"dünnpfifftrinker",
"eichellecker",
"eierkopf",
"eierlutscher",
"eiswürfelpisser",
"ejaculate",
"entenfisterer",
"epilepi",
"epilepis",
"epileppis",
"fagette",
"fagitt",
"fäkalerotiker",
"faltenficker",
"fatass",
"ferkelficker",
"ferkel-ficker",
"fettarsch",
"fettsack",
"fettsau",
"feuchtwichser",
"fick",
"fick*",
"fickarsch",
"fickdreck",
"ficken",
"ficker",
"fickfehler",
"fickfetzen",
"fickfresse",
"fickfrosch",
"fickfucker",
"fickgelegenheit",
"fickgesicht",
"fickmatratze",
"ficknudel",
"ficksau",
"fickschlitz",
"fickschnitte",
"fickschnitzel",
"fingerfuck",
"fingerfucking",
"fisch-stinkender hodenfresser",
"fistfuck",
"fistfucking",
"flachtitte",
"flussfotze",
"fotze",
"fotzenforscher",
"fotzenfresse",
"fotzenknecht",
"fotzenkruste",
"fotzenkuchen",
"fotzenlecker",
"fotzenlöckchen",
"fotzenpisser",
"fotzenschmuser",
"fotzhobel",
"frisösenficker",
"frisösenfotze",
"fritzfink",
"froschfotze",
"froschfotzenficker",
"froschfotzenleder",
"****",
"fucked",
"fucker",
"fucker",
"fucking",
"fuckup",
"fudgepacker",
"futtgesicht",
"gay lord",
"geilriemen",
"gesichtsfotze",
"göring",
"großmaul",
"gummifotzenficker",
"gummipuppenbumser",
"gummisklave",
"hackfresse",
"hafensau",
"hartgeldhure",
"heil hitler",
"hi hoper",
"hinterlader",
"hirni",
"hitler",
"hodenbeißer",
"hodensohn",
"homo",
"hosenpisser",
"hosenscheißer",
"hühnerficker",
"huhrensohn",
"hundeficker",
"hundesohn",
"hurenlecker",
"hurenpeter",
"hurensohn",
"hurentocher",
"idiot",
"idioten",
"itakker",
"ittaker",
"jack off",
"jackass",
"jackshit",
"jerk off",
"jizz",
"judensau",
"kackarsch",
"kacke",
"kacken",
"kackfass",
"kackfresse",
"kacknoob",
"kaktusficker",
"kanacke",
"kanake",
"kanaken",
"kanaldeckelbefruchter",
"kartoffelficker",
"kinderficken",
"kinderficker",
"kinderporno",
"kitzler fresser",
"klapposkop",
"klolecker",
"klötenlutscher",
"knoblauchfresser",
"konzentrationslager",
"kotgeburt",
"kotnascher",
"kümmeltürke",
"kümmeltürken",
"lackaffe",
"lebensunwert",
"lesbian",
"lurchi",
"lustbolzen",
"lutscher",
"magerschwanz",
"manwhore",
"masturbate",
"meat puppet",
"missgeburt",
"mißgeburt",
"mistsau",
"miststück",
"mitternachtsficker",
"mohrenkopf",
"mokkastübchenveredler",
"mongo",
"möse",
"mösenficker",
"mösenlecker",
"mösenputzer",
"möter",
"mother fucker",
"mother fucking",
"motherfucker",
"muschilecker",
"muschischlitz",
"mutterficker",
"nazi",
"nazis",
"neger",
"nigga",
"nigger",
"niggerlover",
"niggers",
"niggerschlampe",
"nignog",
"nippelsauger",
"nutte",
"nuttensohn",
"nuttenstecher",
"nuttentochter",
"ochsenpimmel",
"ölauge",
"oral sex",
"penis licker",
"penis licking",
"penis sucker",
"penis sucking",
"penis",
"peniskopf",
"penislecker",
"penislutscher",
"penissalat",
"penner",
"pferdearsch",
"phentermine",
"pimmel",
"pimmelkopf",
"pimmellutscher",
"pimmelpirat",
"pimmelprinz",
"pimmelschimmel",
"pimmelvinni",
"pindick",
"piss off",
"piss",
"pissbirne",
"pissbotte",
"pisse",
"pisser",
"pissetrinker",
"pissfisch",
"pissflitsche",
"pissnelke",
"polacke",
"polacken",
"poop",
"popellfresser",
"popostecker",
"popunterlage",
"porn",
"porno",
"pornografie",
"pornoprengel",
"pottsau",
"prärieficker",
"prick",
"quiff",
"randsteinwichser",
"rasierte votzen",
"rimjob",
"rindsriemen",
"ritzenfummler",
"rollbrooden",
"roseten putzer",
"roseten schlemmer",
"rosettenhengst",
"rosettenkönig",
"rosettenlecker",
"rosettentester",
"sackfalter",
"sackgesicht",
"sacklutscher",
"sackratte",
"saftarsch",
"sakfalter",
"schamhaarlecker",
"schamhaarschädel",
"schandmaul",
"scheisse",
"scheisser",
"scheissgesicht",
"scheisshaufen",
"scheißhaufen",
"schlammfotze",
"schlampe",
"schleimmöse",
"schlitzpisser",
"schmalspurficker",
"schmeue",
"schmuckbert",
"schnuddelfresser",
"schnurbeltatz",
"schrumpelfotze",
"schwanzlurch",
"schwanzlutscher",
"schweinepriester",
"schweineschwanzlutscher",
"schwuchtel",
"schwutte",
"sex",
"shiter",
"shiting",
"shitlist",
"shitomatic",
"shits",
"shitty",
"shlong",
"shut the fuckup",
"sieg heil",
"sitzpisser",
"skullfuck",
"skullfucker",
"skullfucking",
"slut",
"smegmafresser",
"spack",
"spacko",
"spaghettifresser",
"spastard",
"spasti",
"spastis",
"spermafresse",
"spermarutsche",
"spritzer",
"stinkschlitz",
"stricher",
"suck my cock",
"suck my dick",
"threesome",
"tittenficker",
"tittenspritzer",
"titties",
"titty",
"tunte",
"untermensch",
"vagina",
"vergasen",
"viagra",
"volldepp",
"volldeppen",
"vollhorst",
"vollidiot",
"vollpfosten",
"vollspack",
"vollspacken",
"vollspasti",
"vorhaut",
"votze",
"votzenkopf",
"wanker",
"wankers",
"weichei",
"whoar",
"whore",
"wichsbart",
"wichsbirne",
"wichser",
"wichsfrosch",
"wichsgriffel",
"wichsvorlage",
"wickspickel",
"wixa",
"wixen",
"wixer",
"wixxer",
"wixxxer",
"wixxxxer",
"wurstsemmelfresser",
"yankee",
"zappler",
"zyclon b",
"zyklon b",
"x x x"
];
