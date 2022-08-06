const election_service = require("../consensus-module/services/election-service");

async function timeoutHandler() {
    election_service.startElection();
}

function generateRandomInterval() {
    //random interval between 200ms and 400ms
    return Math.floor(Math.random() * (400 - 200 + 1) + 200);
}

let timerHandle;

module.exports = {
    startTimer: function () {
        timerHandle = setInterval(timeoutHandler, generateRandomInterval());
    },
    stopTimer: function () {
        clearInterval(timerHandle);
    },
    restartTimer: function () {
        if (timerHandle) {
            clearInterval(timerHandle);
        }
        timerHandle = setInterval(timeoutHandler, generateRandomInterval());
    }
}