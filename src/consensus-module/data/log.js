const fs = require('fs');
const Constants = require("../../utils/constants");

const log = loadPersistentLog();

function loadPersistentLog() {
    try {
        const dataBuffer = fs.readFileSync(Constants.LOG_FILE_NAME);
        const dataJSON = dataBuffer.toString();
        return JSON.parse(dataJSON);
    } catch (error) {
        console.log(error.message);
        return [];
    }
}

function persistLog() {
    const logJSON = JSON.stringify(log);
    fs.writeFileSync(Constants.LOG_FILE_NAME, logJSON);
}

module.exports = {
    length: function () {
        return log.length;
    },
    findByIndex: function (index) {
        return log[index];
    },
    insertAtIndex: function (index, value) {
        if (value) {
            log[index] = value;
            persistLog();
        }
    },
    deleteRange: function (startIndex, endIndex) {
        if (startIndex || startIndex === 0 && endIndex) {
            log.splice(startIndex, endIndex - startIndex);
            persistLog();
        }
    }
};