consts={grain_boardid:"4f76f66783817e5055281d88",web_controls:"5012b90b58bd2a9f549f62ea",drivers:"5012b94458bd2a9f549f7188",destinations:"5012bacf237d94497770abfd",crops:"5012bb95237d944977715b04"};$(document).ready(function(){setupLoginLogoutRefresh();$("#i_submit").click(function(a){a.preventDefault();debug("Submit clicked.");submitClicked()});$("#d_trello_link").html('<a href="https://trello.com/board/grain-hauling/'+consts.grain_boardid+'">View Grain Hauling Board in Trello</a>');updateLoggedIn()});
var populateFields=function(){$("#d_driver").text("Loading boards...");populateDrivers();populateDestinations();populateDate();populateNetBu();populateCrops();populateSellers();populateTicketNum();populateNotes()},populateDrivers=function(){$("#d_drivers").html("Loading drivers...");getWebControl(consts.drivers,"s_driver",function(a){$("#d_drivers").html("Driver: "+a);$("#s_driver").val(localStorage["aultfarms.grain.driver"]);$("#s_driver").change(function(){var a=$("#s_driver").children(":selected").val();
localStorage["aultfarms.grain.driver"]=a})})},populateDestinations=function(){$("#d_destinations").html("Loading destinations...");getWebControl(consts.destinations,"s_destination",function(a){$("#d_destinations").html("Destination: "+a);$("#s_destination").val(localStorage["aultfarms.grain.destination"]);$("#s_destination").change(function(){var a=$("#s_destination").children(":selected").val();localStorage["aultfarms.grain.destination"]=a})})},populateDate=function(){$("#d_date").html('Date: <input type="date" id="i_date" name="i_date" value="'+
today()+'"/>')},populateNetBu=function(){$("#d_net_bu").html('Net Bu: <input type="number" id="i_net_bu" name="i_net_bu" />')},populateNotes=function(){$("#d_notes").html('Notes: <input type="text" id="i_notes" name="i_notes" />')},populateCrops=function(){$("#d_crops").html("Loading crops...");getWebControl(consts.crops,"s_crop",function(a){$("#d_crops").html("Crop: "+a);$("#s_crop").val(localStorage["aultfarms.grain.crop"]);$("#s_crop").change(function(){var a=$("#s_crop").children(":selected").val();
localStorage["aultfarms.grain.crop"]=a})})},populateSellers=function(){$("#d_sellers").html("Loading sellers...");getLists(consts.grain_boardid,"s_seller",function(a){$("#d_sellers").html("Seller/List: "+a);$("#s_seller").val(localStorage["aultfarms.grain.seller"]);$("#s_seller").change(function(){var a=$("#s_seller").children(":selected").val();localStorage["aultfarms.grain.seller"]=a})})},populateTicketNum=function(){$("#d_ticket_num").html('Ticket #: <input type="number" id="i_ticket_num" name="i_ticket_num" />')},
submitClicked=function(){debug("Inside submitClicked, about to clear user message");clearUserMsg();debug("User message cleared.  Building card.");cur_card=buildCardFromFields();debug("Card built.  Validating...");if(msg=validateCard(cur_card))$("#d_msg").html("Error: "+msg);else{debug("Current card validated.  It is:<pre>"+JSON.stringify(cur_card)+"</pre>");debug("checking cur_card.net_bu > 2000...  It is = ",cur_card.net_bu);2E3<cur_card.net_bu&&(debug("dividing current net bushels by 100 because it is greater than 2000.  Before it was: ",
cur_card.net_bu),cur_card.net_bu/=100,debug("dividing current net bushels by 100 because it is greater than 2000.  After it is now: ",cur_card.net_bu));name=cur_card.date+": ";name+=addCommasToInt(cur_card.net_bu)+" bu ";name+=cur_card.crop.data.toUpperCase()+".  ";name+=cur_card.destination.data+" - ";name+="Tkt #"+cur_card.ticket_num+" - ";name+=cur_card.driver.data;name+=".";0<cur_card.notes.length&&(name+="  Notes: "+cur_card.notes);listid=cur_card.seller_list.id;list_name=cur_card.seller_list.data;
var a=function(){debug("ERROR: ",error)};$("d_logged_in").scrollTop();userMsg("Creating new card in "+list_name+" ...");Trello.post("lists/"+listid+"/cards",{name:name,desc:"",idList:listid},function(b){if(b.name!=name)debug("ERROR: failed to create new card.");else{cardid=b.id;userMsg("Done.<br>");userMsg("Moving card to bottom of list...");trello_put("cards/"+cardid+"?pos=bottom",function(a){cache.reset();clearUserMsg();userMsg("Successfully created card: <br>",a.name)},a)}},a)}},buildCardFromFields=
function(){var a={};a.destination=getCurrentDataItem("#s_destination",consts.destinations);a.date=$("#i_date").val().toString().trim();a.driver=getCurrentDataItem("#s_driver",consts.drivers);a.net_bu=$("#i_net_bu").val();a.crop=getCurrentDataItem("#s_crop",consts.crops);a.ticket_num=$("#i_ticket_num").val();a.seller_list=getCurrentDataItem("#s_seller",consts.grain_boardid);a.notes=$.trim($("#i_notes").val());return a},validateCard=function(a){msg="";debug("Inside validateCard.  checking destination. card is:"+
JSON.stringify(a));0>inArrayOfDataItems(a.destination,cache.get(consts.destinations))&&(msg+="Destination invalid.  Internal Error.<br>");debug("Inside validateCard.  checking net bushels.");isNaN(parseInt(a.net_bu))&&(msg+="Net Bushels invalid: Try something like 953 or 1,100 or 1038<br>");debug("Inside validateCard.  checking date.");a.date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)||(msg+="Date invalid: must be YYYY-MM-DD format.<br>");debug("Inside validateCard.  checking driver.");0>inArrayOfDataItems(a.driver,
cache.get(consts.drivers))&&(msg+="Driver invalid: internal error<br>");debug("Inside validateCard.  checking seller.");0>inArrayOfDataItems(a.seller_list,cache.get(consts.grain_boardid))&&(msg+="Seller invalid: internal error<br>");debug("Inside validateCard.  checking crop.");0>inArrayOfDataItems(a.crop,cache.get(consts.crops))&&(msg+="Crop invalid: internal error<br>");debug("Inside validateCard.  checking ticket number.");1>$.trim(a.ticket_num).length&&(msg+="Ticket number invalid: cannot be blank.");
debug("validateCarddone.  returning msg: "+msg);return msg};
