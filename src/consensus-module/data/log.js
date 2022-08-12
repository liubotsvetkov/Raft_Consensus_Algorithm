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
    getLogDataReadOnly: function (startIndex = 0, endIndex = log.length) {
        return Object.freeze(log.slice(startIndex, endIndex));
    },
    insertFromIndex: function (startIndex, entries) {
        if (index && entries) {
            log.splice(startIndex, log.legth - startIndex, ...entries);
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