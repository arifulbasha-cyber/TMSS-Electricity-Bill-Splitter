
/**
 * TMSS Bill Splitter - Backend Service
 * Updated for better reliability and concurrency.
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
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for other processes to finish
    lock.waitLock(30000); 
    
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var action = data.action;
    var payload = data.payload;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!ss) throw new Error("Spreadsheet not found. Please ensure the script is bound to a Google Sheet.");

    if (action === 'saveBill') {
      var sheet = getOrCreateSheet(ss, 'saveBill', ['Timestamp', 'ID', 'Data']);
      sheet.appendRow([new Date(), payload.id, JSON.stringify(payload)]);
      return jsonResponse({ status: 'success' });
    } 

    if (action === 'saveHistory') {
      var sheet = getOrCreateSheet(ss, 'saveBill', ['Timestamp', 'ID', 'Data']);
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      if (Array.isArray(payload) && payload.length > 0) {
        // Prepare data rows
        var rows = payload.map(function(bill) {
          return [new Date(), bill.id, JSON.stringify(bill)];
        });
        sheet.getRange(2, 1, rows.length, 3).setValues(rows);
      }
      return jsonResponse({ status: 'success' });
    }
    
    if (action === 'saveSettings') {
      var sheet = getOrCreateSheet(ss, 'saveSettings', ['Key', 'Data', 'Last Updated']);
      updateOrInsertSetting(sheet, payload.key, JSON.stringify(payload.data));
      return jsonResponse({ status: 'success' });
    }
    
    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Spreadsheet context missing.");

    if (action === 'getBills') {
      var sheet = ss.getSheetByName('saveBill');
      if (!sheet) return jsonResponse([]);
      var values = sheet.getDataRange().getValues();
      return jsonResponse(values); 
    }
    
    if (action === 'getSettings') {
      var key = e.parameter.key;
      var sheet = ss.getSheetByName('saveSettings');
      if (!sheet) return jsonResponse(null);
      var data = getSettingByKey(sheet, key);
      return jsonResponse(data ? JSON.parse(data) : null);
    }
    
    return jsonResponse({ status: 'error', message: 'Invalid action' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

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

function updateOrInsertSetting(sheet, key, data) {
  var values = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == key) { rowIndex = i + 1; break; }
  }
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 2).setValue(data);
    sheet.getRange(rowIndex, 3).setValue(new Date());
  } else {
    sheet.appendRow([key, data, new Date()]);
  }
}

function getSettingByKey(sheet, key) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == key) return values[i][1];
  }
  return null;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
