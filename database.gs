
/**
 * TMSS Bill Splitter - Database Backend
 * 
 * INSTRUCTIONS:
 * 1. Open a Google Spreadsheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code and paste this script.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select type 'Web App'.
 * 6. Set 'Execute as' to 'Me'.
 * 7. Set 'Who has access' to 'Anyone' (IMPORTANT).
 * 8. Copy the Web App URL and paste it into the Cloud Setup modal in the app.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var payload = data.payload;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'saveBill') {
      var sheet = getOrCreateSheet(ss, 'saveBill', ['Timestamp', 'ID', 'Data']);
      sheet.appendRow([new Date(), payload.id, JSON.stringify(payload)]);
      return jsonResponse({ status: 'success', message: 'Bill saved' });
    } 
    
    if (action === 'saveSettings') {
      var sheet = getOrCreateSheet(ss, 'saveSettings', ['Key', 'Data', 'Last Updated']);
      updateOrInsertSetting(sheet, payload.key, JSON.stringify(payload.data));
      return jsonResponse({ status: 'success', message: 'Settings updated' });
    }

    return jsonResponse({ status: 'error', message: 'Unknown action' }, 400);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getBills') {
      var sheet = ss.getSheetByName('saveBill');
      if (!sheet) return jsonResponse([]);
      var values = sheet.getDataRange().getValues();
      return jsonResponse(values); // Returns all rows including headers
    }
    
    if (action === 'getSettings') {
      var key = e.parameter.key;
      var sheet = ss.getSheetByName('saveSettings');
      if (!sheet) return jsonResponse(null);
      var data = getSettingByKey(sheet, key);
      return jsonResponse(data ? JSON.parse(data) : null);
    }

    return jsonResponse({ status: 'error', message: 'Invalid GET action' }, 400);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Helper: Find or create a sheet with specific headers
 */
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Helper: Upsert logic for settings sheet
 */
function updateOrInsertSetting(sheet, key, data) {
  var values = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == key) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 2).setValue(data);
    sheet.getRange(rowIndex, 3).setValue(new Date());
  } else {
    sheet.appendRow([key, data, new Date()]);
  }
}

/**
 * Helper: Retrieve specific setting
 */
function getSettingByKey(sheet, key) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == key) return values[i][1];
  }
  return null;
}

/**
 * Helper: Standard JSON output
 */
function jsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
