
// Pulled this from example at http://jsfiddle.net/nNesx/.

////////////////////////////////////////////////////
// Setup:
////////////////////////////////////////////////////

consts = {

           grain_boardid: "4f76f66783817e5055281d88", // Board in Ault Farms org.
            web_controls: "5012b90b58bd2a9f549f62ea", // List in Grain Hauling board
                 drivers: "5012b94458bd2a9f549f7188", // Card in Web Controls
            destinations: "5012bacf237d94497770abfd", // Card in Web Controls
                   crops: "5012bb95237d944977715b04", // Card in Web Controls
};

$(document).ready(function() {
  $('#d_msg').html('Setting up login/logout/refresh');
  setupLoginLogoutRefresh();

  // Update the DOM based on login status
  updateLoggedIn();
});


//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

var populateFields = function() {
  $('#d_msg').html('Getting cards and lists from grain board....');
  Trello.get('/boards/'+consts.grain_boardid+'/cards', function(cards) {
    Trello.get('/boards/'+consts.grain_boardid+'/lists', function(lists) {
      var str = '';
      _.each(lists, function(l) {
        var totals = {};
        str += '<h1>'+l.name+'</h1>';
        str += '<table border="1">'
             + '  <tr>'
             + '    <th>Date</th>'
             + '    <th>Tkt #</th>'
             + '    <th>Bu</th>'
             + '    <th>Crop</th>'
             + '    <th>Location</th>'
             + '  </tr>';
        var cards_for_list = _.filter(cards, function(c) {
          return (c.idList === l.id);
        });
        _.each(cards_for_list, function(c) {
          var date = c.name.replace(/^([0-9]{4}-[0-9]{2}-[0-9]{2}).*$/, '$1');
          var bu   = c.name.replace(/^.*: *([0-9,.]+) +bu.*$/, '$1');
          var crop = c.name.replace(/^.*bu +([A-Z]+)\..*$/, '$1');
          var tkt  = c.name.replace(/^.*Tkt #([0-9]+) *-.*$/, '$1');
          var loc  = c.name.replace(/^.*\.([^\-]+) +- +Tkt +#.*$/, '$1');
          if ( !date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
            || !bu.match(/^[0-9,.]+$/)
            || !crop.match(/^[A-Z]+$/)
            || !tkt.match(/^[a-zA-Z0-9\-]+$/)
            || !loc.match(/^[^0-9]+$/)) {
             str += '<tr><td colspan=5><font color="red">COULD NOT PARSE CARD: <pre>'+c.name+'</pre>';
             str += 'date = ' + date + ', bu = ' + bu + ', crop = ' + crop + ', tkt = ' + tkt + ', loc = ' + loc;
             str += '</font></td></tr>';
             return;
          }
          if (!totals[crop]) totals[crop] = 0;
          totals[crop] += +(bu.replace(',',''));
          str += '<tr>'
               + '  <td align="right"><pre>'+date+'</pre></td>'
               + '  <td align="right"><pre>'+tkt +'</pre></td>'
               + '  <td align="right"><pre>'+bu  +'</pre></td>'
               + '  <td align="right"><pre>'+crop+'</pre></td>'
               + '  <td align="right"><pre>'+loc +'</pre></td>'
               + '</tr>';
        });
        _.each(totals, function(total, crop) {
          str += '<tr>'
               + '  <td colspan=2 align="right">TOTAL:</td>'
               + '  <td>'+total+'</td>'
               + '  <td>'+crop+'</td>'
               + '</tr>';
        });
        str += '</table>';
      });
      $('#d_msg').html('');
      $('#d_summaries').html(str);
    }, function(err) {
    debug('populatFields: unable to get lists.  Error = <pre>' + JSON.stringify(err, false, '  ') + '</pre>');
    });
  }, function(err) {
    debug('populatFields: unable to get cards.  Error = <pre>' + JSON.stringify(err, false, '  ') + '</pre>');
  });
};


