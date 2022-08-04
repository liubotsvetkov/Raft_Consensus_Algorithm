const election_service = require("../consensus-module/services/election-service");

function timeoutHandler() {
    election_service.startElection();
}

function generateRandomInterval() {
    //random interval between 150ms and 300ms
    return Math.floor(Math.random() * (300 - 150 + 1) + 150);
}

let timerHandle;

module.exports = {
    startTimer: function () {
        timerHandle = setInterval(timeoutHandler, generateRandomInterval());
    },
    resetTimer: function () {
        timerHandle.clearTimeout(timerHandle);
        timerHandle = setInterval(timeoutHandler, generateRandomInterval());
    }
}